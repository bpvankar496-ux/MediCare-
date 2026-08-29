import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, default: null },
  read_time: { type: String, default: null },
  image_url: { type: String, default: null },
  published_at: { type: Date, default: Date.now },
})

applyIdTransform(articleSchema)

export default mongoose.model('Article', articleSchema)
