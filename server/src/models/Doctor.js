import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  qualification: { type: String, required: true },
  experience_years: { type: Number, default: 0 },
  fee: { type: Number, default: 0 },
  rating: { type: Number, default: 4.5 },
  reviews_count: { type: Number, default: 0 },
  hospital: { type: String, default: null },
  city: { type: String, default: null },
  availability: { type: [String], default: [] },
  about: { type: String, default: null },
  image_url: { type: String, default: null },
  languages: { type: [String], default: [] },
  profile_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(doctorSchema)

export default mongoose.model('Doctor', doctorSchema)
