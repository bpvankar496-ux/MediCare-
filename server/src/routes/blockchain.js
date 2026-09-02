import { Router } from 'express'
import HealthRecord from '../models/HealthRecord.js'
import { requireAuth } from '../middleware/auth.js'
import * as chain from '../lib/blockchain.js'
import * as ipfs from '../lib/ipfs.js'

const router = Router()
router.use(requireAuth)

// GET /api/blockchain/status - lets the frontend know whether real
// blockchain features are usable yet (contract deployed + env configured),
// and share the contract address so the UI can link to it on Etherscan.
router.get('/status', (_req, res) => {
  res.json({ ...chain.getPublicConfig(), ipfsConfigured: ipfs.isConfigured() })
})

// Loads a health record and makes sure the caller actually owns it - the
// blockchain routes are not part of the generic /api/:collection layer, so
// we enforce the same ownership rule explicitly here.
async function loadOwnedRecord(req, res) {
  const record = await HealthRecord.findOne({ _id: req.params.id, user_id: req.userId })
  if (!record) {
    res.status(404).json({ error: 'Health record not found' })
    return null
  }
  return record
}

// POST /api/blockchain/upload-ipfs/:id - takes the record's locally-stored
// file (a base64 data: URL, same format the "Attach file" picker in the UI
// already produces) and pins it to IPFS, then stores the resulting CID and
// a gateway URL on the record. This runs *before* anchoring: anchoring
// afterwards will include this CID on-chain (see chain.anchorRecord).
router.post('/upload-ipfs/:id', async (req, res) => {
  try {
    if (!ipfs.isConfigured()) {
      return res.status(503).json({
        error: 'IPFS uploading is not configured yet. Set PINATA_JWT in server/.env (see blockchain/README.md).',
      })
    }
    const record = await loadOwnedRecord(req, res)
    if (!record) return

    const { fileBase64, fileName } = req.body || {}
    if (!fileBase64) {
      return res.status(400).json({ error: 'fileBase64 (a data: URL) is required' })
    }

    const { buffer, mimeType } = ipfs.decodeDataUrl(fileBase64)
    const { cid, gatewayUrl } = await ipfs.uploadFile(buffer, fileName, mimeType)

    record.ipfs_cid = cid
    record.file_url = gatewayUrl
    await record.save()

    res.json({ cid, gatewayUrl, record: record.toJSON() })
  } catch (err) {
    console.error('uploadIpfs error', err)
    res.status(500).json({ error: err.message || 'Failed to upload file to IPFS' })
  }
})

// POST /api/blockchain/anchor/:id - computes a hash of the record and
// submits a real transaction to Sepolia anchoring it, then stores the
// resulting tx hash/block number back on the record.
router.post('/anchor/:id', async (req, res) => {
  try {
    if (!chain.isConfigured()) {
      return res.status(503).json({
        error: 'Blockchain is not configured yet. Deploy the contract and set SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY and CONTRACT_ADDRESS in server/.env (see blockchain/README.md).',
      })
    }
    const record = await loadOwnedRecord(req, res)
    if (!record) return

    const result = await chain.anchorRecord(record.id, record.toJSON())

    record.content_hash = result.contentHash
    record.chain_tx_hash = result.txHash
    record.chain_block_number = result.blockNumber
    record.chain_network = result.network
    record.chain_contract_address = result.contractAddress
    record.anchored_at = new Date()
    await record.save()

    res.json({ ...result, record: record.toJSON() })
  } catch (err) {
    console.error('anchorRecord error', err)
    res.status(500).json({ error: err.message || 'Failed to anchor record on-chain' })
  }
})

// GET /api/blockchain/verify/:id - recomputes the hash of the record as it
// exists right now and compares it against what's anchored on-chain.
router.get('/verify/:id', async (req, res) => {
  try {
    if (!chain.isConfigured()) {
      return res.status(503).json({
        error: 'Blockchain is not configured yet. Deploy the contract and set SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY and CONTRACT_ADDRESS in server/.env (see blockchain/README.md).',
      })
    }
    const record = await loadOwnedRecord(req, res)
    if (!record) return

    const result = await chain.verifyRecord(record.id, record.toJSON())
    res.json(result)
  } catch (err) {
    console.error('verifyRecord error', err)
    res.status(500).json({ error: err.message || 'Failed to verify record on-chain' })
  }
})

export default router
