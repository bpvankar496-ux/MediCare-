import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const consultationSchema = new mongoose.Schema({
  // Which patient this consultation belongs to - set server-side when a
  // patient books it (see collections.js). Receptionists keep full access
  // since front-desk staff manage every patient's booking; a specific
  // doctor, however, may only see consultations booked with them - see
  // scopeFilter() in collections.js.
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Which doctor this consultation is booked with - set client-side at
  // booking time (see Consultations.tsx) so a doctor's own dashboard can be
  // scoped reliably, instead of matching on the free-text doctor_name below
  // (kept for display and as a fallback for consultations booked before
  // this field existed).
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
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
