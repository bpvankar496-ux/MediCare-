import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const consultationSchema = new mongoose.Schema({
  doctor_name: { type: String, required: true },
  patient_name: { type: String, required: true },
  date: { type: String, required: true },
  time_slot: { type: String, required: true },
  mode: { type: String, default: 'video' },
  status: { type: String, default: 'scheduled' },
  symptoms: { type: String, default: null },
  prescription: { type: String, default: null },
  follow_up: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(consultationSchema)

export default mongoose.model('Consultation', consultationSchema)
