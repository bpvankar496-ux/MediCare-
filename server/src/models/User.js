import mongoose from 'mongoose'

// Equivalent of Supabase's `auth.users` table - stores login credentials only.
// Profile info (full name, role) lives in the separate Profile model, same
// split Supabase used (auth.users + public.profiles).
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('User', userSchema)
