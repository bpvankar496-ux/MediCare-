import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, default: 'hospital' },
  address: { type: String, default: null },
  city: { type: String, default: null },
  phone: { type: String, default: null },
  emergency: { type: Boolean, default: false },
  open_24x7: { type: Boolean, default: false },
  rating: { type: Number, default: 4.0 },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  services: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(hospitalSchema)

export default mongoose.model('Hospital', hospitalSchema)
