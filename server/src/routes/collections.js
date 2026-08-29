import { Router } from 'express'
import mongoose from 'mongoose'
import { registry, readOnlyViaGenericApi } from '../models/registry.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Every collection in this app requires a logged-in user, same as the
// Supabase "authenticated" RLS policies did.
router.use(requireAuth)

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Turns query-string filters into a Mongo filter object.
// - `id` maps to `_id` (the frontend keeps using `row.id` like it did with Supabase)
// - values that look like a Mongo ObjectId are cast to one (covers *_id ref fields)
// - `col__ilike=value` does a case-insensitive exact match (mirrors .ilike() usage)
// - `_order` / `_dir` control sorting, not filtering
function buildFilter(query) {
  const filter = {}
  for (const [rawKey, rawVal] of Object.entries(query)) {
    if (rawKey === '_order' || rawKey === '_dir') continue

    if (rawKey.endsWith('__ilike')) {
      const key = rawKey.slice(0, -'__ilike'.length)
      filter[key] = { $regex: `^${escapeRegex(rawVal)}$`, $options: 'i' }
      continue
    }

    const key = rawKey === 'id' ? '_id' : rawKey
    // Only treat 24-char hex strings as ObjectIds (mongoose.isValid() also
    // accepts arbitrary 12-char strings, which would wrongly catch things
    // like patient names or statuses of that length).
    if (/^[0-9a-fA-F]{24}$/.test(String(rawVal))) {
      filter[key] = new mongoose.Types.ObjectId(String(rawVal))
    } else {
      filter[key] = rawVal
    }
  }
  return filter
}

router.param('collection', (req, res, next, collection) => {
  const Model = registry[collection]
  if (!Model) {
    return res.status(404).json({ error: `Unknown collection: ${collection}` })
  }
  req.Model = Model
  req.collectionName = collection
  next()
})

// GET /api/:collection?col=val&_order=col&_dir=asc|desc
router.get('/:collection', async (req, res) => {
  try {
    const filter = buildFilter(req.query)
    let q = req.Model.find(filter)
    if (req.query._order) {
      q = q.sort({ [req.query._order]: req.query._dir === 'desc' ? -1 : 1 })
    }
    const docs = await q.exec()
    res.json(docs.map((d) => d.toJSON()))
  } catch (err) {
    console.error('list error', err)
    res.status(500).json({ error: 'Failed to fetch data' })
  }
})

// POST /api/:collection - body is a single object or an array of objects
router.post('/:collection', async (req, res) => {
  try {
    if (readOnlyViaGenericApi.has(req.collectionName)) {
      return res.status(403).json({ error: 'This collection is managed automatically and cannot be inserted into directly' })
    }
    const payload = req.body
    if (Array.isArray(payload)) {
      const created = await req.Model.insertMany(payload)
      return res.status(201).json(created.map((d) => d.toJSON()))
    }
    const created = await req.Model.create(payload)
    return res.status(201).json(created.toJSON())
  } catch (err) {
    console.error('insert error', err)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A record with that unique value already exists' })
    }
    res.status(400).json({ error: err.message || 'Failed to insert data' })
  }
})

// PATCH /api/:collection?col=val - updates every doc matching the filter
router.patch('/:collection', async (req, res) => {
  try {
    if (readOnlyViaGenericApi.has(req.collectionName)) {
      return res.status(403).json({ error: 'This collection is managed automatically and cannot be updated directly' })
    }
    const filter = buildFilter(req.query)
    await req.Model.updateMany(filter, { $set: req.body })
    const docs = await req.Model.find(filter)
    res.json(docs.map((d) => d.toJSON()))
  } catch (err) {
    console.error('update error', err)
    res.status(400).json({ error: err.message || 'Failed to update data' })
  }
})

// DELETE /api/:collection?col=val - deletes every doc matching the filter
router.delete('/:collection', async (req, res) => {
  try {
    if (readOnlyViaGenericApi.has(req.collectionName)) {
      return res.status(403).json({ error: 'This collection is managed automatically and cannot be deleted from directly' })
    }
    const filter = buildFilter(req.query)
    const result = await req.Model.deleteMany(filter)
    res.json({ deletedCount: result.deletedCount })
  } catch (err) {
    console.error('delete error', err)
    res.status(400).json({ error: err.message || 'Failed to delete data' })
  }
})

export default router
