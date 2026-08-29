import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const labTestBookingSchema = new mongoose.Schema({
  // Owner of this booking - always set server-side, see collections.js
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  test_ids: { type: [mongoose.Schema.Types.Mixed], default: [] },
  total: { type: Number, default: 0 },
  patient_name: { type: String, required: true },
  date: { type: String, required: true },
  time_slot: { type: String, required: true },
  home_collection: { type: Boolean, default: true },
  address: { type: String, default: null },
  status: { type: String, default: 'booked' },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(labTestBookingSchema)

export default mongoose.model('LabTestBooking', labTestBookingSchema)
