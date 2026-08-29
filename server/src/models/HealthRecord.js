import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const healthRecordSchema = new mongoose.Schema({
  // Owner of this record. Always set server-side from the logged-in user's
  // token (see collections.js) - never trust a client-supplied value here,
  // otherwise anyone could read/write anyone else's health records.
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { type: String, default: 'document' },
  date: { type: String, required: true },
  doctor: { type: String, default: null },
  hospital: { type: String, default: null },
  notes: { type: String, default: null },
  file_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(healthRecordSchema)

export default mongoose.model('HealthRecord', healthRecordSchema)
