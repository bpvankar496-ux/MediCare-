import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const reminderSchema = new mongoose.Schema({
  // Owner of this reminder - always set server-side, see collections.js
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { type: String, default: 'medicine' },
  time: { type: String, required: true },
  frequency: { type: String, default: 'daily' },
  days: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  notes: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(reminderSchema)

export default mongoose.model('Reminder', reminderSchema)
