import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const reviewSchema = new mongoose.Schema({
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patient_name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: null },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(reviewSchema)

export default mongoose.model('Review', reviewSchema)
