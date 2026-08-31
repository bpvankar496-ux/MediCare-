import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'
import Profile from '../models/Profile.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Bug fix: previously ANY role including 'receptionist' could be picked on
// the public signup form, so any random visitor could give themselves the
// reception/admin desk. Reception accounts are now fixed and created only by
// the server itself (see seedReceptionist() in seed.js, driven by
// RECEPTION_EMAIL/RECEPTION_PASSWORD in server/.env) - the public signup
// form and this endpoint only ever create patients or doctors.
const VALID_ROLES = ['patient', 'doctor']
const PUBLIC_SIGNUP_ROLES = new Set(['patient', 'doctor'])

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
export function isStrongPassword(password) {
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
    if (role && !PUBLIC_SIGNUP_ROLES.has(role)) {
      return res.status(403).json({ error: 'Receptionist accounts are managed by the clinic admin and cannot be self-registered. Please contact your administrator.' })
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

// Roughly caps a base64 data URL to ~1.5MB of actual image bytes, so a
// patient can't stuff an oversized image into every profile document.
const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024
function isValidAvatarDataUrl(value) {
  if (typeof value !== 'string') return false
  const match = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(value)
  if (!match) return false
  const approxBytes = (match[2].length * 3) / 4
  return approxBytes <= MAX_AVATAR_BYTES
}

// PATCH /api/auth/profile - new feature: lets a logged-in user update their
// own display name and/or profile picture without going through the (now
// owner-locked) generic /api/profiles route. Either field is optional so
// the client can save name and avatar independently or together.
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, avatar } = req.body || {}
    const update = {}

    if (full_name !== undefined) {
      if (typeof full_name !== 'string' || !full_name.trim()) {
        return res.status(400).json({ error: 'full_name cannot be empty' })
      }
      update.full_name = full_name.trim()
    }

    if (avatar !== undefined) {
      if (avatar === null) {
        update.avatar = null // explicit removal
      } else if (!isValidAvatarDataUrl(avatar)) {
        return res.status(400).json({ error: 'Avatar must be a PNG/JPEG/WEBP/GIF image under 1.5MB' })
      } else {
        update.avatar = avatar
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' })
    }

    const profile = await Profile.findByIdAndUpdate(req.userId, update, { new: true })
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

// POST /api/auth/google - "Sign in with Google". The client sends the
// `credential` JWT it gets from Google Identity Services (see
// client/src/pages/Login.tsx) plus the role the person picked on the
// signup form. We verify the token directly against Google's tokeninfo
// endpoint (no extra SDK/dependency needed) and check the `aud` claim
// matches our own GOOGLE_CLIENT_ID so a token issued for some other app
// can't be replayed here.
//
// Bug fix: this used to hardcode role: 'patient' for every first-time
// Google sign-in, so a doctor who chose "Doctor" on the signup form and
// then used the Google button ended up with a patient account instead.
// The role picker on the form now applies to Google sign-ups too - still
// restricted to PUBLIC_SIGNUP_ROLES (patient/doctor), same as normal
// signup; receptionist accounts still can't be self-created.
//
// Requires GOOGLE_CLIENT_ID in server/.env (and the same ID as
// VITE_GOOGLE_CLIENT_ID in client/.env) - get one at
// https://console.cloud.google.com/apis/credentials.
router.post('/google', authLimiter, async (req, res) => {
  try {
    const { credential, role } = req.body || {}
    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential' })
    }
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return res.status(503).json({ error: 'Google sign-in isn\'t configured yet. Add GOOGLE_CLIENT_ID to server/.env (see README).' })
    }

    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
    if (!verifyRes.ok) {
      return res.status(401).json({ error: 'Invalid Google credential' })
    }
    const payload = await verifyRes.json()
    if (payload.aud !== clientId) {
      return res.status(401).json({ error: 'Google credential was not issued for this app' })
    }
    if (!payload.email || payload.email_verified !== 'true') {
      return res.status(401).json({ error: 'Google account has no verified email' })
    }

    const normalizedEmail = String(payload.email).toLowerCase().trim()
    const normalizedRole = PUBLIC_SIGNUP_ROLES.has(role) ? role : 'patient'
    let user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      // No password on Google-only accounts - store an unusable random hash
      // so the schema's requirement is satisfied but password login can
      // never succeed for this account.
      const randomPassword = await bcrypt.hash(`google-oauth:${normalizedEmail}:${Date.now()}:${Math.random()}`, 10)
      user = await User.create({ email: normalizedEmail, passwordHash: randomPassword })
      await Profile.create({
        _id: user._id,
        email: normalizedEmail,
        full_name: (payload.name || '').trim(),
        role: normalizedRole,
      })
    }

    const token = signToken(user._id)
    const profile = await buildProfilePayload(user._id)
    return res.json({
      token,
      user: { id: user._id.toString(), email: user.email },
      profile,
    })
  } catch (err) {
    console.error('google auth error', err)
    return res.status(500).json({ error: 'Could not sign in with Google' })
  }
})

export default router
