// Uploads health-record attachments to IPFS (via Pinata's pinning API) so the
// *actual file* - not just its hash - ends up addressable by a permanent,
// content-derived identifier (a CID). The CID is then anchored on-chain
// alongside the record's hash (see lib/blockchain.js), so anyone can fetch
// the exact anchored file straight from IPFS without trusting this app's
// database.
//
// Why Pinata and not "raw" IPFS: uploading straight to the public IPFS
// network requires running your own node (or paying a remote pinning
// service) - Pinata is a free-tier-friendly pinning service reachable over
// plain HTTPS, so no extra infrastructure is needed here. Swap this file out
// if you'd rather use web3.storage, nft.storage, a self-hosted node, etc -
// nothing outside this file needs to know which pinning service is used.
//
// Configuration (server/.env):
//   PINATA_JWT - a Pinata "JWT" API key (Account -> API Keys -> New Key).
//                Only needs the `pinFileToIPFS` permission.
//
// If this isn't set, isConfigured() returns false and the rest of the app
// keeps working without file-on-IPFS support (same fallback pattern as
// lib/blockchain.js).

const PINATA_PIN_FILE_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
const DEFAULT_GATEWAY = 'https://gateway.pinata.cloud/ipfs'

function getEnv() {
  return {
    jwt: process.env.PINATA_JWT || '',
    gateway: process.env.IPFS_GATEWAY_URL || DEFAULT_GATEWAY,
  }
}

export function isConfigured() {
  return Boolean(getEnv().jwt)
}

export function gatewayUrlForCid(cid) {
  const { gateway } = getEnv()
  return `${gateway.replace(/\/$/, '')}/${cid}`
}

/// Decodes a `data:<mime>;base64,<data>` URL (the same format the client
/// already produces via FileReader.readAsDataURL) into a Buffer + mime type,
/// so the client can keep using the exact same file-reading code it already
/// has, and just additionally offer to push that file to IPFS.
export function decodeDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || '')
  if (!match) {
    throw new Error('Expected a base64 data: URL')
  }
  const [, mimeType, base64] = match
  return { buffer: Buffer.from(base64, 'base64'), mimeType }
}

/// Uploads a file buffer to IPFS via Pinata and returns its CID + a ready-to-
/// use gateway URL for viewing it in a browser.
export async function uploadFile(buffer, filename, mimeType) {
  const { jwt } = getEnv()
  if (!jwt) {
    throw new Error(
      'IPFS is not configured: set PINATA_JWT in server/.env (see blockchain/README.md).'
    )
  }

  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), filename || 'file')
  form.append('pinataMetadata', JSON.stringify({ name: filename || 'health-record-file' }))

  const res = await fetch(PINATA_PIN_FILE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((body && (body.error?.reason || body.error)) || `IPFS upload failed (${res.status})`)
  }

  const cid = body.IpfsHash
  return { cid, gatewayUrl: gatewayUrlForCid(cid) }
}

export function getPublicConfig() {
  return { configured: isConfigured() }
}
