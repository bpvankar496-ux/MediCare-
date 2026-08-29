import jwt from 'jsonwebtoken'

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
