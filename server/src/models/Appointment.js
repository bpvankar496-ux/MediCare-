import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const appointmentSchema = new mongoose.Schema({
  // Which patient this appointment belongs to - always set server-side for
  // patients booking their own appointment (see collections.js). Doctors and
  // receptionists can still see/manage every appointment, since that's part
  // of their job, but a patient can only see/edit their own.
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  patient_name: { type: String, required: true },
  patient_age: { type: Number, default: null },
  patient_gender: { type: String, default: null },
  date: { type: String, required: true },
  time_slot: { type: String, required: true },
  type: { type: String, default: 'in-person' },
  reason: { type: String, default: null },
  status: { type: String, default: 'upcoming' },
  notes: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(appointmentSchema)

export default mongoose.model('Appointment', appointmentSchema)
