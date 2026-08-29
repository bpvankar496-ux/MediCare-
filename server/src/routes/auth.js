import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'
import Profile from '../models/Profile.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const VALID_ROLES = ['patient', 'doctor', 'receptionist']

// Bug fix: login/signup had no brute-force protection at all - anyone could
// script thousands of password guesses per second against any email. Caps
// each IP to 10 attempts per 15 minutes on the sensitive auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
})

// Bug fix: the only password rule was "6+ characters", so "123456" or
// "aaaaaa" were accepted. Now requires at least one letter and one number too.
function isStrongPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  )
}

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
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include a letter and a number' })
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
router.post('/login', authLimiter, async (req, res) => {
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

// PATCH /api/auth/profile - new feature: lets a logged-in user update their
// own display name without going through the (now owner-locked) generic
// /api/profiles route.
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { full_name } = req.body || {}
    if (typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({ error: 'full_name is required' })
    }
    const profile = await Profile.findByIdAndUpdate(
      req.userId,
      { full_name: full_name.trim() },
      { new: true },
    )
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    return res.json(profile.toJSON())
  } catch (err) {
    console.error('update profile error', err)
    return res.status(500).json({ error: 'Could not update profile' })
  }
})

// POST /api/auth/change-password - new feature: users previously had no way
// to change their password after signing up.
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {}
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' })
    }
    if (!isStrongPassword(new_password)) {
      return res.status(400).json({ error: 'New password must be at least 8 characters and include a letter and a number' })
    }
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const ok = await bcrypt.compare(String(current_password), user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })

    user.passwordHash = await bcrypt.hash(String(new_password), 10)
    await user.save()
    return res.json({ ok: true })
  } catch (err) {
    console.error('change password error', err)
    return res.status(500).json({ error: 'Could not change password' })
  }
})

export default router
