import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const consultationSchema = new mongoose.Schema({
  // Which patient this consultation belongs to - set server-side when a
  // patient books it (see collections.js). Doctors/receptionists keep full
  // access since they need to manage every patient's consultations.
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
