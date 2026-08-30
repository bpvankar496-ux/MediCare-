import { Router } from 'express'
import mongoose from 'mongoose'
import { registry, readOnlyViaGenericApi } from '../models/registry.js'
import { requireAuth, attachRole } from '../middleware/auth.js'

const router = Router()

// Every collection in this app requires a logged-in user, same as the
// Supabase "authenticated" RLS policies did.
router.use(requireAuth)
router.use(attachRole)

// Collections that belong to exactly one user (health data, reminders, family
// circle, orders, bookings). No role can ever see another user's rows here -
// every request is forcibly filtered/tagged with `user_id = req.userId` below.
// Without this, ANY logged-in account could read or edit ANY other patient's
// health records simply by hitting the generic /api/:collection route.
const OWNED_COLLECTIONS = new Set([
  'health_records',
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

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

// Merges the base query-string filter with a forced ownership filter, so a
// spoofed `?user_id=someoneElse` (or no filter at all) can never widen access
// beyond what the caller is allowed to see. The forced value always wins.
function scopeFilter(filter, req) {
  if (OWNED_COLLECTIONS.has(req.collectionName)) {
    return { ...filter, user_id: new mongoose.Types.ObjectId(req.userId) }
  }
  if (PATIENT_SCOPED_COLLECTIONS.has(req.collectionName) && req.userRole === 'patient') {
    return { ...filter, patient_id: new mongoose.Types.ObjectId(req.userId) }
  }
  if (req.collectionName === 'profiles' && req.userRole === 'patient') {
    // Patients can only ever look up their own profile through this generic
    // route (staff still need to browse profiles to manage patients).
    return { ...filter, _id: new mongoose.Types.ObjectId(req.userId) }
  }
  return filter
}

// Stamps the right ownership field onto a document being created, ignoring
// whatever the client sent for that field.
function scopeCreatePayload(doc, req) {
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
    const payload = req.body
    if (Array.isArray(payload)) {
      const scoped = payload.map((doc) => scopeCreatePayload(doc, req))
      const created = await req.Model.insertMany(scoped)
      return res.status(201).json(created.map((d) => d.toJSON()))
    }
    const created = await req.Model.create(scopeCreatePayload(payload, req))
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
    const filter = scopeFilter(buildFilter(req.query), req)
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
    const filter = scopeFilter(buildFilter(req.query), req)
    const result = await req.Model.deleteMany(filter)
    res.json({ deletedCount: result.deletedCount })
  } catch (err) {
    console.error('delete error', err)
    res.status(400).json({ error: err.message || 'Failed to delete data' })
  }
})

export default router
