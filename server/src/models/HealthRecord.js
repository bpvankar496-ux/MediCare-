import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const healthRecordSchema = new mongoose.Schema({
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
