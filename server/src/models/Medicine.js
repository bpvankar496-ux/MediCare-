import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  prescription_required: { type: Boolean, default: false },
  in_stock: { type: Boolean, default: true },
  description: { type: String, default: null },
  pack_size: { type: String, default: null },
  image_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(medicineSchema)

export default mongoose.model('Medicine', medicineSchema)
