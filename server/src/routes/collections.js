import { Router } from 'express'
import mongoose from 'mongoose'
import { registry, readOnlyViaGenericApi } from '../models/registry.js'
import { requireAuth, attachRole } from '../middleware/auth.js'
import { sendMail, appointmentConfirmationEmail, consultationConfirmationEmail } from '../lib/mailer.js'

const router = Router()

// Every collection in this app requires a logged-in user, same as the
// Supabase "authenticated" RLS policies did.
router.use(requireAuth)
router.use(attachRole)

// Collections that belong to exactly one user (vitals, family circle,
// reminders, orders, bookings). No role can ever see another user's rows
// here - every request is forcibly filtered/tagged with `user_id =
// req.userId` below. Without this, ANY logged-in account could read or edit
// ANY other patient's data simply by hitting the generic /api/:collection
// route. (health_records is scoped separately below - a doctor legitimately
// needs to read/add records for their own patients, not just their own.)
const OWNED_COLLECTIONS = new Set([
  'vitals',
  'family_members',
  'reminders',
  'medicine_orders',
  'lab_test_bookings',
])

// Collections shared between a patient and clinical staff. Patients may only
// see/edit rows where they are the patient (`patient_id`); doctors and
// receptionists keep full access since managing every patient's appointment
// is their job.
const PATIENT_SCOPED_COLLECTIONS = new Set(['appointments', 'consultations'])

// Bug fix: previously ANY logged-in user (including patients) could POST/
// PATCH/DELETE directly against /api/articles, so the "Health Library" had
// no real access control even though only doctors were meant to publish to
// it. Only doctor/receptionist accounts may write; everyone (including
// patients) can still read it.
const STAFF_ONLY_WRITE_COLLECTIONS = new Set(['articles'])

export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// New feature: doctors' `rating`/`reviews_count` used to be fixed numbers
// set once at signup and never updated. Now, any time a review is
// added/removed for a doctor, we recompute both fields as the live
// average/count over that doctor's `reviews` documents.
async function recomputeDoctorRating(doctorId) {
  if (!doctorId) return
  const Review = registry.reviews
  const Doctor = registry.doctors
  const stats = await Review.aggregate([
    { $match: { doctor_id: new mongoose.Types.ObjectId(String(doctorId)) } },
    { $group: { _id: '$doctor_id', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  if (stats.length === 0) {
    // No reviews left - leave rating as-is (don't wipe out a doctor's
    // rating just because the last review was deleted) but zero the count.
    await Doctor.findByIdAndUpdate(doctorId, { reviews_count: 0 })
    return
  }
  const { avg, count } = stats[0]
  await Doctor.findByIdAndUpdate(doctorId, { rating: Math.round(avg * 10) / 10, reviews_count: count })
}

// Turns query-string filters into a Mongo filter object.
// - `id` maps to `_id` (the frontend keeps using `row.id` like it did with Supabase)
// - values that look like a Mongo ObjectId are cast to one (covers *_id ref fields)
// - `col__ilike=value` does a case-insensitive exact match (mirrors .ilike() usage)
// - `_order` / `_dir` control sorting, not filtering
function buildFilter(query) {
  const filter = {}
  for (const [rawKey, rawVal] of Object.entries(query)) {
    if (rawKey === '_order' || rawKey === '_dir') continue

    if (rawKey.endsWith('__ilike')) {
      const key = rawKey.slice(0, -'__ilike'.length)
      filter[key] = { $regex: `^${escapeRegex(rawVal)}$`, $options: 'i' }
      continue
    }

    const key = rawKey === 'id' ? '_id' : rawKey
    // Only treat 24-char hex strings as ObjectIds (mongoose.isValid() also
    // accepts arbitrary 12-char strings, which would wrongly catch things
    // like patient names or statuses of that length).
    if (/^[0-9a-fA-F]{24}$/.test(String(rawVal))) {
      filter[key] = new mongoose.Types.ObjectId(String(rawVal))
    } else {
      filter[key] = rawVal
    }
  }
  return filter
}

// A filter that can never match any real document - used to force an empty
// result set (rather than an unscoped, wide-open one) when a doctor has no
// reliable way to be matched to their own records yet.
const NOTHING_MATCHES = { _id: new mongoose.Types.ObjectId('000000000000000000000000') }

// Merges the base query-string filter with a forced ownership filter, so a
// spoofed `?user_id=someoneElse` (or no filter at all) can never widen access
// beyond what the caller is allowed to see. The forced value always wins.
function scopeFilter(filter, req) {
  // New feature: health_records used to be a plain OWNED_COLLECTION (only
  // the logged-in user's own user_id), which meant a doctor could never see
  // or add to a patient's records at all - not even for a patient they're
  // actively treating. Now: patients see their own; a doctor sees/manages
  // records for their own patients only (never anyone else's); every other
  // role (e.g. receptionist) gets no clinical record access at all.
  if (req.collectionName === 'health_records') {
    if (req.userRole === 'patient') {
      const f = { ...filter, user_id: new mongoose.Types.ObjectId(req.userId) }
      // A patient may view a doctor-added record, but only ever edit/delete
      // ones they added themselves - a doctor's note stays authoritative.
      if (req.method !== 'GET') f.added_by_role = 'patient'
      return f
    }
    if (req.userRole === 'doctor') {
      const ids = (req.myPatientIds || []).map((id) => new mongoose.Types.ObjectId(id))
      if (ids.length === 0) return { ...filter, ...NOTHING_MATCHES }
      const f = { ...filter, user_id: { $in: ids } }
      // A doctor may view all of their patients' records (needed for
      // treatment), but only edit/delete records they personally added.
      if (req.method !== 'GET') f.added_by_id = new mongoose.Types.ObjectId(req.userId)
      return f
    }
    // Receptionist or any other role - no clinical record access.
    return { ...filter, ...NOTHING_MATCHES }
  }
  if (OWNED_COLLECTIONS.has(req.collectionName)) {
    return { ...filter, user_id: new mongoose.Types.ObjectId(req.userId) }
  }
  if (PATIENT_SCOPED_COLLECTIONS.has(req.collectionName) && req.userRole === 'patient') {
    return { ...filter, patient_id: new mongoose.Types.ObjectId(req.userId) }
  }
  // Bug fix: a doctor account used to get full, unscoped access to
  // appointments/consultations (same as receptionists), so any doctor could
  // read every other doctor's patients by simply calling this route with no
  // filter. A specific doctor may only see appointments/consultations
  // assigned to them - matched by doctor_id (set at booking time), with a
  // name-match fallback only for older consultation rows booked before
  // doctor_id was tracked. Receptionists still get full access below, since
  // managing every patient's booking is their job.
  if (PATIENT_SCOPED_COLLECTIONS.has(req.collectionName) && req.userRole === 'doctor') {
    const orConditions = []
    if (req.doctorId) orConditions.push({ doctor_id: req.doctorId })
    if (req.userName) {
      orConditions.push({ doctor_id: null, doctor_name: new RegExp(`^${escapeRegex(req.userName.trim())}$`, 'i') })
    }
    if (orConditions.length === 0) return { ...filter, ...NOTHING_MATCHES }
    return { ...filter, $or: orConditions }
  }
  if (req.collectionName === 'profiles' && req.userRole === 'patient') {
    // Patients can only ever look up their own profile through this generic
    // route (staff still need to browse profiles to manage patients).
    return { ...filter, _id: new mongoose.Types.ObjectId(req.userId) }
  }
  // Bug fix: reviews are meant to be publicly readable (anyone can see a
  // doctor's reviews) but had no owner check at all on PATCH/DELETE, so any
  // logged-in account could edit or delete someone else's review just by
  // calling the API directly - no UI exposed it, but the route itself
  // allowed it. GET stays unscoped (public); writes are restricted to the
  // review's own author.
  if (req.collectionName === 'reviews' && req.method !== 'GET') {
    return { ...filter, user_id: new mongoose.Types.ObjectId(req.userId) }
  }
  return filter
}

// Stamps the right ownership field onto a document being created, ignoring
// whatever the client sent for that field.
function scopeCreatePayload(doc, req) {
  // health_records: a patient adding their own record is stamped as the
  // owner + creator. A doctor adding a record FOR a patient keeps whatever
  // `user_id` (target patient) the client sent - the POST route handler
  // below validates that id is actually one of this doctor's own patients
  // before this is ever called, so it can't be spoofed to write into an
  // unrelated patient's history.
  if (req.collectionName === 'health_records') {
    if (req.userRole === 'patient') {
      return { ...doc, user_id: req.userId, added_by_role: 'patient', added_by_id: req.userId, doctor_id: null }
    }
    if (req.userRole === 'doctor') {
      return { ...doc, added_by_role: 'doctor', added_by_id: req.userId, doctor_id: req.doctorId || null }
    }
    return doc
  }
  if (OWNED_COLLECTIONS.has(req.collectionName)) {
    return { ...doc, user_id: req.userId }
  }
  if (PATIENT_SCOPED_COLLECTIONS.has(req.collectionName) && req.userRole === 'patient') {
    return { ...doc, patient_id: req.userId }
  }
  // Reviews are publicly readable (anyone can see a doctor's reviews), but we
  // still stamp who wrote it server-side for auditing/anti-abuse purposes -
  // the client can never spoof this.
  if (req.collectionName === 'reviews') {
    return { ...doc, user_id: req.userId }
  }
  return doc
}

// New feature: email the patient a confirmation when they book an
// appointment or a consultation. No-ops quietly if SMTP isn't configured
// (see server/src/lib/mailer.js) and never blocks/fails the API response.
async function notifyBooking(collectionName, doc, req) {
  try {
    const patientId = doc.patient_id || (req.userRole === 'patient' ? req.userId : null)
    if (!patientId) return
    const profile = await registry.profiles.findById(patientId)
    if (!profile?.email) return

    if (collectionName === 'appointments') {
      const doctor = doc.doctor_id ? await registry.doctors.findById(doc.doctor_id) : null
      const { subject, html } = appointmentConfirmationEmail({
        patientName: doc.patient_name,
        doctorName: doctor?.name || 'your doctor',
        date: doc.date,
        timeSlot: doc.time_slot,
        type: doc.type,
      })
      await sendMail({ to: profile.email, subject, html })
    } else if (collectionName === 'consultations') {
      const { subject, html } = consultationConfirmationEmail({
        patientName: doc.patient_name,
        doctorName: doc.doctor_name,
        date: doc.date,
        timeSlot: doc.time_slot,
        mode: doc.mode,
      })
      await sendMail({ to: profile.email, subject, html })
    }
  } catch (err) {
    console.error('notifyBooking failed (continuing anyway):', err.message)
  }
}

router.param('collection', (req, res, next, collection) => {
  const Model = registry[collection]
  if (!Model) {
    return res.status(404).json({ error: `Unknown collection: ${collection}` })
  }
  req.Model = Model
  req.collectionName = collection
  next()
})

// GET /api/:collection?col=val&_order=col&_dir=asc|desc
router.get('/:collection', async (req, res) => {
  try {
    const filter = scopeFilter(buildFilter(req.query), req)
    let q = req.Model.find(filter)
    if (req.query._order) {
      q = q.sort({ [req.query._order]: req.query._dir === 'desc' ? -1 : 1 })
    }
    const docs = await q.exec()
    res.json(docs.map((d) => d.toJSON()))
  } catch (err) {
    console.error('list error', err)
    res.status(500).json({ error: 'Failed to fetch data' })
  }
})

// POST /api/:collection - body is a single object or an array of objects
router.post('/:collection', async (req, res) => {
  try {
    if (readOnlyViaGenericApi.has(req.collectionName)) {
      return res.status(403).json({ error: 'This collection is managed automatically and cannot be inserted into directly' })
    }
    if (STAFF_ONLY_WRITE_COLLECTIONS.has(req.collectionName) && !['doctor', 'receptionist'].includes(req.userRole)) {
      return res.status(403).json({ error: 'Only doctors can publish to the Health Library' })
    }
    // New feature: a doctor adding a health record must target one of their
    // own patients (never an arbitrary user_id); anyone who isn't a patient
    // or doctor (e.g. receptionist) has no business writing clinical records
    // at all. Checked here, before scopeCreatePayload/insert, since it needs
    // to reject the request outright rather than just narrow a filter.
    if (req.collectionName === 'health_records') {
      if (req.userRole === 'doctor') {
        const targetPatientId = String((req.body || {}).user_id || '')
        if (!targetPatientId || !(req.myPatientIds || []).includes(targetPatientId)) {
          return res.status(403).json({ error: 'You can only add records for your own patients' })
        }
      } else if (req.userRole !== 'patient') {
        return res.status(403).json({ error: 'Only patients and their doctors can add health records' })
      }
    }
    const payload = req.body
    if (Array.isArray(payload)) {
      const scoped = payload.map((doc) => scopeCreatePayload(doc, req))
      const created = await req.Model.insertMany(scoped)
      return res.status(201).json(created.map((d) => d.toJSON()))
    }
    const created = await req.Model.create(scopeCreatePayload(payload, req))
    if (req.collectionName === 'reviews') {
      await recomputeDoctorRating(created.doctor_id)
    }
    if (req.collectionName === 'appointments' || req.collectionName === 'consultations') {
      notifyBooking(req.collectionName, created.toJSON(), req) // fire-and-forget
    }
    return res.status(201).json(created.toJSON())
  } catch (err) {
    console.error('insert error', err)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A record with that unique value already exists' })
    }
    res.status(400).json({ error: err.message || 'Failed to insert data' })
  }
})

// PATCH /api/:collection?col=val - updates every doc matching the filter
router.patch('/:collection', async (req, res) => {
  try {
    if (readOnlyViaGenericApi.has(req.collectionName)) {
      return res.status(403).json({ error: 'This collection is managed automatically and cannot be updated directly' })
    }
    if (STAFF_ONLY_WRITE_COLLECTIONS.has(req.collectionName) && !['doctor', 'receptionist'].includes(req.userRole)) {
      return res.status(403).json({ error: 'Only doctors can edit the Health Library' })
    }
    let filter = scopeFilter(buildFilter(req.query), req)
    // Bug fix: previously ANY logged-in account (including patients) could
    // PATCH any doctor's catalog listing - fee, rating, availability, even
    // whose account it's linked to - simply by hitting this generic route.
    // A doctor may now only edit their own listing; only receptionists keep
    // full access (managing the doctor directory is their job).
    if (req.collectionName === 'doctors' && req.userRole !== 'receptionist') {
      if (req.userRole !== 'doctor' || !req.doctorId) {
        return res.status(403).json({ error: 'You can only edit your own doctor profile' })
      }
      filter = { ...filter, _id: req.doctorId }
    }
    // Never let an update reassign a row to a different owner.
    const { user_id: _uid, patient_id: _pid, ...safeUpdate } = req.body || {}
    await req.Model.updateMany(filter, { $set: safeUpdate })
    const docs = await req.Model.find(filter)
    res.json(docs.map((d) => d.toJSON()))
  } catch (err) {
    console.error('update error', err)
    res.status(400).json({ error: err.message || 'Failed to update data' })
  }
})

// DELETE /api/:collection?col=val - deletes every doc matching the filter
router.delete('/:collection', async (req, res) => {
  try {
    if (readOnlyViaGenericApi.has(req.collectionName)) {
      return res.status(403).json({ error: 'This collection is managed automatically and cannot be deleted from directly' })
    }
    if (STAFF_ONLY_WRITE_COLLECTIONS.has(req.collectionName) && !['doctor', 'receptionist'].includes(req.userRole)) {
      return res.status(403).json({ error: 'Only doctors can remove Health Library articles' })
    }
    // Same guard as PATCH above - removing a doctor catalog listing is
    // reception's job only, never a patient's and never another doctor's.
    if (req.collectionName === 'doctors' && req.userRole !== 'receptionist') {
      return res.status(403).json({ error: 'Only reception can remove a doctor from the catalog' })
    }
    const filter = scopeFilter(buildFilter(req.query), req)
    let affectedDoctorIds = []
    if (req.collectionName === 'reviews') {
      affectedDoctorIds = (await req.Model.find(filter).select('doctor_id')).map((r) => r.doctor_id)
    }
    const result = await req.Model.deleteMany(filter)
    if (affectedDoctorIds.length > 0) {
      await Promise.all([...new Set(affectedDoctorIds.map(String))].map((id) => recomputeDoctorRating(id)))
    }
    res.json({ deletedCount: result.deletedCount })
  } catch (err) {
    console.error('delete error', err)
    res.status(400).json({ error: err.message || 'Failed to delete data' })
  }
})

export default router
