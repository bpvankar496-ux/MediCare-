import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const vitalSchema = new mongoose.Schema({
  // Owner of this vital reading - always set server-side, see collections.js
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  value: { type: String, required: true },
  unit: { type: String, required: true },
  recorded_at: { type: Date, default: Date.now },
  notes: { type: String, default: null },
})

applyIdTransform(vitalSchema)

export default mongoose.model('Vital', vitalSchema)
