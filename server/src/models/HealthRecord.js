import mongoose from 'mongoose'
import { applyIdTransform } from './plugin.js'

const healthRecordSchema = new mongoose.Schema({
  // Owner of this record - i.e. whose medical history this belongs to.
  // Always set server-side (see collections.js): to the logged-in patient
  // when they add their own record, or to the target patient a doctor is
  // adding a record FOR (validated against that doctor's own patients -
  // never trust a client-supplied value here).
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

  // New feature: who actually created this record, so a doctor can add a
  // prescription/report to a patient's history (and the patient can still
  // see it and know it came from a doctor, not just typed in by themselves).
  // Kept separate from the free-text `doctor` field above, which is just a
  // display label and was never a reliable link to an account.
  added_by_role: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  added_by_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },

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
