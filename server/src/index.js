import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);


import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import blockchainRoutes from './routes/blockchain.js'
import authRoutes from './routes/auth.js'
import collectionRoutes from './routes/collections.js'
import aiRoutes from './routes/ai.js'
import { seedCatalog, seedReceptionist } from './seed.js'
import { attachRealtime } from './realtime.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4000
const MONGODB_URI = process.env.MONGODB_URI
// In local dev it's easy for the client to end up on a different port/host
// than CLIENT_ORIGIN expects (Vite auto-bumping the port, opening via a LAN
// IP, etc). Reflecting the request's own origin avoids CORS silently
// blocking everything with no visible error on the frontend. Set
// CLIENT_ORIGIN to a specific value if you want to lock this down.
const corsOptions = { origin: true, credentials: true }

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env - paste your MongoDB Atlas connection string in server/.env')
  process.exit(1)
}

const app = express()
app.use(cors(corsOptions))
app.use(express.json({ limit: '8mb' })) // headroom for base64-encoded health-record file attachments (see routes/blockchain.js)

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/blockchain', blockchainRoutes) 
app.use('/api', collectionRoutes)

// Serves the built frontend so the whole app can run as ONE process/deployment:
// `npm run build` (root) builds client/dist, then this same server serves it
// directly alongside the API - no separate frontend host/deploy needed.
// In local dev (npm run dev), client/dist won't exist yet, so this is skipped
// and Vite's own dev server (port 5173) handles the frontend instead.
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist')
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(clientDistPath, 'index.html'))
  })
  console.log('Serving built frontend from client/dist alongside the API (single-process mode)')
}

app.use((req, res) => res.status(404).json({ error: 'Not found' }))
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const httpServer = createServer(app)

// Realtime layer: mirrors the Supabase Realtime `channel()` API used by the
// frontend (broadcast messages + presence) for the video-call signaling and
// consultation chat. Rooms map 1:1 to Supabase channel names.
const io = new Server(httpServer, { cors: corsOptions })
attachRealtime(io)

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB')
    try {
      await seedCatalog()
      await seedReceptionist()
    } catch (err) {
      console.error('Auto-seed failed (continuing anyway):', err.message)
    }
    httpServer.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message)
    process.exit(1)
  })
