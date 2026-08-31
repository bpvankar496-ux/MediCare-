import { API_URL, getToken } from './db'

export interface ChainStatus {
  configured: boolean
  network: string
  contractAddress: string | null
  explorerBase: string
}

export interface AnchorResult {
  contentHash: string
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
  currentHash: string
  anchoredBy?: string
  anchoredAt?: string
  network?: string
  explorerAddressUrl?: string
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
