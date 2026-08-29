import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

// Mirrors the `profiles` table: one row per user, keyed by the same id as
// the User document. Auto-created on signup.
const profileSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // same id as User
  email: { type: String, required: true },
  full_name: { type: String, required: true, default: '' },
  role: { type: String, required: true, enum: ['patient', 'doctor', 'receptionist'], default: 'patient' },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(profileSchema)

export default mongoose.model('Profile', profileSchema)
