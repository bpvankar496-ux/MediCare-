import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const healthRecordSchema = new mongoose.Schema({
  // Owner of this record. Always set server-side from the logged-in user's
  // token (see collections.js) - never trust a client-supplied value here,
  // otherwise anyone could read/write anyone else's health records.
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { type: String, default: 'document' },
  date: { type: String, required: true },
  doctor: { type: String, default: null },
  hospital: { type: String, default: null },
  notes: { type: String, default: null },
  file_url: { type: String, default: null },
  ipfs_cid: { type: String, default: null }, // IPFS CID if the file has been pushed on-chain-verifiably to IPFS
  created_at: { type: Date, default: Date.now },

  // --- Blockchain anchoring (Ethereum Sepolia testnet) ---
  // We never put patient data itself on-chain (that would be a serious privacy
  // problem on a public, permanent ledger). Instead we anchor a keccak256 hash
  // of the record's fields, so anyone can later prove the record shown by the
  // app hasn't been silently altered, without ever exposing the PHI on-chain.
  content_hash: { type: String, default: null }, // 0x-prefixed keccak256 hash that was anchored
  chain_tx_hash: { type: String, default: null }, // Sepolia transaction hash
  chain_block_number: { type: Number, default: null },
  chain_network: { type: String, default: null }, // e.g. 'sepolia'
  chain_contract_address: { type: String, default: null },
  anchored_at: { type: Date, default: null },
})

applyIdTransform(healthRecordSchema)

export default mongoose.model('HealthRecord', healthRecordSchema)
