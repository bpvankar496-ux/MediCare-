import { API_URL, getToken } from './db'

export interface ChainStatus {
  configured: boolean
  network: string
  contractAddress: string | null
  explorerBase: string
  ipfsConfigured?: boolean
}

export interface AnchorResult {
  contentHash: string
  fileCID?: string
  txHash: string
  blockNumber: number
  network: string
  contractAddress: string
  explorerUrl: string
}

export interface VerifyResult {
  anchored: boolean
  matches: boolean
  onChainHash?: string
  onChainFileCID?: string
  currentHash: string
  anchoredBy?: string
  anchoredAt?: string
  network?: string
  explorerAddressUrl?: string
}

export interface IpfsUploadResult {
  cid: string
  gatewayUrl: string
}

async function chainFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((body && body.error) || `Request failed (${res.status})`)
  }
  return body as T
}

export function getChainStatus() {
  return chainFetch<ChainStatus>('/api/blockchain/status')
}

export function anchorHealthRecord(recordId: string) {
  return chainFetch<AnchorResult>(`/api/blockchain/anchor/${recordId}`, { method: 'POST' })
}

export function verifyHealthRecord(recordId: string) {
  return chainFetch<VerifyResult>(`/api/blockchain/verify/${recordId}`)
}

// Pins the record's currently-attached file (a base64 data: URL, as produced
// by the "Attach file" picker) to IPFS via the backend, and stores the
// resulting CID/gateway URL on the record. Do this *before* anchoring so the
// anchor transaction includes the CID on-chain.
export function uploadHealthRecordFileToIpfs(recordId: string, fileBase64: string, fileName: string) {
  return chainFetch<IpfsUploadResult>(`/api/blockchain/upload-ipfs/${recordId}`, {
    method: 'POST',
    body: JSON.stringify({ fileBase64, fileName }),
  })
}
