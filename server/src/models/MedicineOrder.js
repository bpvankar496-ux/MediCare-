import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const medicineOrderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  items: { type: [mongoose.Schema.Types.Mixed], default: [] },
  total: { type: Number, default: 0 },
  delivery_address: { type: String, default: null },
  status: { type: String, default: 'placed' },
  payment_method: { type: String, default: 'cod' },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(medicineOrderSchema)

export default mongoose.model('MedicineOrder', medicineOrderSchema)
