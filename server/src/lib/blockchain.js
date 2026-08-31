// Real Sepolia-testnet blockchain integration for health record integrity.
//
// What this does (and doesn't do):
// - It NEVER puts patient data on-chain. It computes a keccak256 hash of the
//   record's fields and anchors just that hash in a small smart contract
//   (see /blockchain/contracts/HealthRecordRegistry.sol). Anyone can later
//   recompute the hash from the current database row and compare it against
//   what's on-chain - if they differ, the record was altered after anchoring.
// - This is genuine on-chain interaction against Ethereum Sepolia (a public
//   test network) via your own RPC provider (Alchemy) and your own wallet
//   (SEPOLIA_PRIVATE_KEY). It is not a simulation/mock.
//
// Configuration (server/.env):
//   SEPOLIA_RPC_URL      - your Alchemy/Infura Sepolia RPC URL
//   SEPOLIA_PRIVATE_KEY  - private key of a throwaway wallet funded with
//                          free Sepolia test ETH (see blockchain/README.md)
//   CONTRACT_ADDRESS     - address printed by `npm run deploy:sepolia`
//                          inside the /blockchain folder
//
// If any of these are missing, every function below fails gracefully
// (isConfigured() returns false) instead of crashing the server - so the
// rest of the app keeps working even before you've deployed the contract.

import { ethers } from 'ethers'

const CONTRACT_ABI = [
  'function anchorRecord(bytes32 recordId, bytes32 dataHash) external',
  'function getAnchor(bytes32 recordId) external view returns (bytes32 dataHash, uint256 timestamp, address anchoredBy, bool exists)',
  'event RecordAnchored(bytes32 indexed recordId, bytes32 dataHash, address indexed anchoredBy, uint256 timestamp)',
]

const NETWORK_NAME = 'sepolia'
const EXPLORER_BASE = 'https://sepolia.etherscan.io'

let cachedProvider = null
let cachedWallet = null
let cachedContract = null

function getEnv() {
  return {
    rpcUrl: process.env.SEPOLIA_RPC_URL || '',
    privateKey: process.env.SEPOLIA_PRIVATE_KEY || '',
    contractAddress: process.env.CONTRACT_ADDRESS || '',
  }
}

export function isConfigured() {
  const { rpcUrl, privateKey, contractAddress } = getEnv()
  return Boolean(rpcUrl && privateKey && contractAddress)
}

function getContract() {
  if (cachedContract) return cachedContract
  const { rpcUrl, privateKey, contractAddress } = getEnv()
  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error(
      'Blockchain is not configured: set SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY and CONTRACT_ADDRESS in server/.env'
    )
  }
  cachedProvider = cachedProvider || new ethers.JsonRpcProvider(rpcUrl)
  cachedWallet = cachedWallet || new ethers.Wallet(privateKey, cachedProvider)
  cachedContract = new ethers.Contract(contractAddress, CONTRACT_ABI, cachedWallet)
  return cachedContract
}

/// Turns a Mongo ObjectId (or any string) into the bytes32 the contract
/// expects, so we don't need a separate id-registry on-chain.
export function recordIdToBytes32(recordId) {
  return ethers.keccak256(ethers.toUtf8Bytes(String(recordId)))
}

/// Canonical hash of the record's clinically-relevant fields. Only fields a
/// doctor/patient could actually edit are included (not `_id`, timestamps
/// the server sets, or other bookkeeping) so the hash reflects real content
/// changes, not incidental metadata.
export function computeRecordHash(record) {
  const canonical = JSON.stringify({
    title: record.title ?? null,
    type: record.type ?? null,
    date: record.date ?? null,
    doctor: record.doctor ?? null,
    hospital: record.hospital ?? null,
    notes: record.notes ?? null,
    file_url: record.file_url ?? null,
  })
  return ethers.keccak256(ethers.toUtf8Bytes(canonical))
}

/// Sends a real transaction to Sepolia anchoring this record's hash.
/// Returns tx hash + block number once mined, plus a ready-to-use explorer link.
export async function anchorRecord(recordId, record) {
  const contract = getContract()
  const dataHash = computeRecordHash(record)
  const idBytes32 = recordIdToBytes32(recordId)

  const tx = await contract.anchorRecord(idBytes32, dataHash)
  const receipt = await tx.wait()

  return {
    contentHash: dataHash,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    network: NETWORK_NAME,
    contractAddress: await contract.getAddress(),
    explorerUrl: `${EXPLORER_BASE}/tx/${receipt.hash}`,
  }
}

/// Reads back what's on-chain for a record and tells you whether it matches
/// the hash of the record's *current* content (i.e. hasn't been tampered
/// with/edited since it was anchored).
export async function verifyRecord(recordId, record) {
  const contract = getContract()
  const idBytes32 = recordIdToBytes32(recordId)
  const currentHash = computeRecordHash(record)

  const [onChainHash, timestamp, anchoredBy, exists] = await contract.getAnchor(idBytes32)

  if (!exists) {
    return { anchored: false, matches: false, currentHash }
  }

  return {
    anchored: true,
    matches: onChainHash.toLowerCase() === currentHash.toLowerCase(),
    onChainHash,
    currentHash,
    anchoredBy,
    anchoredAt: new Date(Number(timestamp) * 1000).toISOString(),
    network: NETWORK_NAME,
    explorerAddressUrl: `${EXPLORER_BASE}/address/${await contract.getAddress()}`,
  }
}

export function getPublicConfig() {
  const { contractAddress } = getEnv()
  return {
    configured: isConfigured(),
    network: NETWORK_NAME,
    contractAddress: contractAddress || null,
    explorerBase: EXPLORER_BASE,
  }
}
