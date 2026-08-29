import jwt from 'jsonwebtoken'
import Profile from '../models/Profile.js'

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
// scoped to "my own records only" (patients) or allowed broader access
// (doctor/receptionist), since that decision can't be trusted from the client.
export async function attachRole(req, res, next) {
  try {
    const profile = await Profile.findById(req.userId)
    req.userRole = profile ? profile.role : 'patient'
    next()
  } catch (err) {
    console.error('attachRole error', err)
    req.userRole = 'patient'
    next()
  }
}
