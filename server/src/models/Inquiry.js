import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const inquirySchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  patient_name: { type: String, required: true },
  patient_email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'open', enum: ['open', 'in_progress', 'resolved'] },
  reply: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
})

applyIdTransform(inquirySchema)

export default mongoose.model('Inquiry', inquirySchema)
