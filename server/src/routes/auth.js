import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Profile from '../models/Profile.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const VALID_ROLES = ['patient', 'doctor', 'receptionist']

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

async function buildProfilePayload(userId) {
  const profile = await Profile.findById(userId)
  return profile ? profile.toJSON() : null
}

// POST /api/auth/signup - equivalent of supabase.auth.signUp()
// Creates the User (credentials) + Profile (role/full_name) rows, the same
// split Supabase used (auth.users trigger -> public.profiles).
router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const normalizedRole = VALID_ROLES.includes(role) ? role : 'patient'
    const normalizedEmail = String(email).toLowerCase().trim()

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    const passwordHash = await bcrypt.hash(String(password), 10)
    const user = await User.create({ email: normalizedEmail, passwordHash })
    const profile = await Profile.create({
      _id: user._id,
      email: normalizedEmail,
      full_name: (full_name || '').trim(),
      role: normalizedRole,
    })

    const token = signToken(user._id)
    return res.status(201).json({
      token,
      user: { id: user._id.toString(), email: user.email },
      profile: profile.toJSON(),
    })
  } catch (err) {
    console.error('signup error', err)
    return res.status(500).json({ error: 'Could not create account' })
  }
})

// POST /api/auth/login - equivalent of supabase.auth.signInWithPassword()
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    const normalizedEmail = String(email).toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const ok = await bcrypt.compare(String(password), user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const token = signToken(user._id)
    const profile = await buildProfilePayload(user._id)
    return res.json({
      token,
      user: { id: user._id.toString(), email: user.email },
      profile,
    })
  } catch (err) {
    console.error('login error', err)
    return res.status(500).json({ error: 'Could not sign in' })
  }
})

// GET /api/auth/me - equivalent of supabase.auth.getSession() + profile load
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(401).json({ error: 'User not found' })
    const profile = await buildProfilePayload(user._id)
    return res.json({
      user: { id: user._id.toString(), email: user.email },
      profile,
    })
  } catch (err) {
    console.error('me error', err)
    return res.status(500).json({ error: 'Could not load session' })
  }
})

export default router
