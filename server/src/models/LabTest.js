import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const labTestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  description: { type: String, default: null },
  fasting_required: { type: Boolean, default: false },
  report_time: { type: String, default: null },
  sample_type: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(labTestSchema)

export default mongoose.model('LabTest', labTestSchema)
