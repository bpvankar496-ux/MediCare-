import jwt from 'jsonwebtoken'
import Profile from '../models/Profile.js'
import Doctor from '../models/Doctor.js'
import Appointment from '../models/Appointment.js'
import Consultation from '../models/Consultation.js'

// Verifies the Bearer token on every request and attaches req.userId.
// Mirrors Supabase's "authenticated" role requirement - every table in this
// app requires a logged-in user (see the require_auth migration).
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Loads the caller's role onto req.userRole ('patient' | 'doctor' | 'receptionist').
// Used by the generic collections API to decide whether a request should be
// scoped to "my own records only" (patients), scoped to "my own patients
// only" (doctors), or allowed broader access (receptionist), since that
// decision can't be trusted from the client.
//
// For doctors, also loads req.doctorId (their own Doctor document's id),
// req.userName (their profile name), and req.myPatientIds (every patient
// they have an appointment or consultation with) so scopeFilter() in
// collections.js can restrict appointments/consultations/health_records to
// what's actually theirs to manage - without this, any doctor account could
// read every other doctor's patients (or every patient's health records)
// simply by hitting the generic /api/appointments, /api/consultations, or
// /api/health_records route with no filter.
export async function attachRole(req, res, next) {
  try {
    const profile = await Profile.findById(req.userId)
    req.userRole = profile ? profile.role : 'patient'
    req.userName = profile?.full_name || null
    if (req.userRole === 'doctor') {
      const doctorRow = await Doctor.findOne({ profile_id: req.userId }).select('_id')
      req.doctorId = doctorRow ? doctorRow._id : null

      // New feature: a doctor may view/add a patient's health records, but
      // only for patients they've actually had an appointment or
      // consultation with - never anyone in the system. Precompute that
      // patient list once per request here (rather than re-deriving it
      // inside every route) since it's needed by both the GET/POST scoping
      // in collections.js and the "which of my patients" checks there.
      if (req.doctorId) {
        const [apptPatients, consultPatients] = await Promise.all([
          Appointment.find({ doctor_id: req.doctorId, patient_id: { $ne: null } }).distinct('patient_id'),
          Consultation.find({ doctor_id: req.doctorId, patient_id: { $ne: null } }).distinct('patient_id'),
        ])
        req.myPatientIds = [...new Set([...apptPatients, ...consultPatients].map(String))]
      } else {
        req.myPatientIds = []
      }
    }
    next()
  } catch (err) {
    console.error('attachRole error', err)
    req.userRole = 'patient'
    next()
  }
}
