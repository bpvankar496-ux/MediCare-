import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

// Mirrors the `profiles` table: one row per user, keyed by the same id as
// the User document. Auto-created on signup.
const profileSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // same id as User
  email: { type: String, required: true },
  full_name: { type: String, required: true, default: '' },
  role: { type: String, required: true, enum: ['patient', 'doctor', 'receptionist'], default: 'patient' },
  // New feature: profile picture, stored as a base64 data URL (no cloud
  // storage/CDN wired up in this project, so this keeps everything in
  // MongoDB alongside the rest of the profile - fine for a small avatar,
  // capped client-side before upload). Null/empty means "show initials".
  avatar: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(profileSchema)

export default mongoose.model('Profile', profileSchema)
