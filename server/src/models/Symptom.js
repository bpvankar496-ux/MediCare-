import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const symptomSchema = new mongoose.Schema({
  symptom: { type: String, required: true },
  possible_conditions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  body_part: { type: String, default: null },
  severity: { type: String, default: 'mild' },
})

applyIdTransform(symptomSchema)

export default mongoose.model('Symptom', symptomSchema)
