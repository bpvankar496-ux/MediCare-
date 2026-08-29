import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const familyMemberSchema = new mongoose.Schema({
  // Owner of this family circle - always set server-side, see collections.js
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  relation: { type: String, required: true },
  age: { type: Number, default: null },
  gender: { type: String, default: null },
  blood_group: { type: String, default: null },
  conditions: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
  phone: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

applyIdTransform(familyMemberSchema)

export default mongoose.model('FamilyMember', familyMemberSchema)
