import { io, type Socket } from 'socket.io-client'

export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000'

export function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('auth_token', token)
  else localStorage.removeItem('auth_token')
}

interface ApiError {
  message: string
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const message = (body && (body as { error?: string }).error) || `Request failed (${res.status})`
    throw new Error(message)
  }
  return body
}

type OrderOpts = { ascending?: boolean }

// A small subset of the Supabase-js query builder, backed by REST calls to
// the Node/Express API instead of the Supabase client. Supports the exact
// chain of calls this app uses: select/insert/update/delete, eq, ilike,
// order, single/maybeSingle, and is awaitable (`await db.from(t)...`).
class QueryBuilder<T = any> {
  private table: string
  private method: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private filters: Array<[string, 'eq' | 'ilike', unknown]> = []
  private orderCol: string | null = null
  private orderAscending = true
  private payload: unknown = null
  private wantSingle = false

  constructor(table: string) {
    this.table = table
  }

  select(_cols = '*') {
    this.method = this.method === 'insert' || this.method === 'update' ? this.method : 'select'
    return this
  }

  insert(payload: unknown) {
    this.method = 'insert'
    this.payload = payload
    return this
  }

  update(payload: unknown) {
    this.method = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.method = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, 'eq', value])
    return this
  }

  ilike(column: string, value: unknown) {
    this.filters.push([column, 'ilike', value])
    return this
  }

  order(column: string, opts: OrderOpts = {}) {
    this.orderCol = column
    this.orderAscending = opts.ascending ?? true
    return this
  }

  single() {
    this.wantSingle = true
    return this
  }

  maybeSingle() {
    this.wantSingle = true
    return this
  }

  private buildQuery(): string {
    const qs = new URLSearchParams()
    for (const [col, op, val] of this.filters) {
      if (op === 'eq') qs.set(col, String(val))
      else qs.set(`${col}__ilike`, String(val))
    }
    if (this.method === 'select' && this.orderCol) {
      qs.set('_order', this.orderCol)
      qs.set('_dir', this.orderAscending ? 'asc' : 'desc')
    }
    const s = qs.toString()
    return s ? `?${s}` : ''
  }

  private async exec(): Promise<{ data: T | T[] | null; error: ApiError | null }> {
    try {
      const url = `/api/${this.table}${this.buildQuery()}`
      let result: unknown
      if (this.method === 'select') {
        result = await apiFetch(url, { method: 'GET' })
      } else if (this.method === 'insert') {
        result = await apiFetch(`/api/${this.table}`, { method: 'POST', body: JSON.stringify(this.payload) })
      } else if (this.method === 'update') {
        result = await apiFetch(url, { method: 'PATCH', body: JSON.stringify(this.payload) })
      } else {
        result = await apiFetch(url, { method: 'DELETE' })
      }

      let data = result as T | T[] | null
      if (this.wantSingle) {
        data = Array.isArray(data) ? ((data[0] as T) ?? null) : (data as T)
      }
      return { data, error: null }
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : 'Request failed' } }
    }
  }

  // Makes the builder awaitable: `await db.from('x').select()`
  then<TResult1 = { data: T | T[] | null; error: ApiError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T | T[] | null; error: ApiError | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected)
  }
}

// ---- Realtime (replaces supabase.channel / removeChannel) ----

let socket: Socket | null = null
function getSocket(): Socket {
  if (!socket) socket = io(API_URL, { autoConnect: true })
  return socket
}

type BroadcastHandler = (msg: { payload: any }) => void
type PresenceHandler = () => void

class RealtimeChannel {
  name: string
  private opts: { config?: { broadcast?: { self?: boolean }; presence?: { key?: string } } }
  private broadcastHandlers = new Map<string, BroadcastHandler[]>()
  private presenceHandlers: PresenceHandler[] = []
  private presenceStateMap: Record<string, unknown[]> = {}
  private onBroadcast = (msg: { room: string; event: string; payload: any }) => {
    if (msg.room !== this.name) return
    const handlers = this.broadcastHandlers.get(msg.event) || []
    handlers.forEach((h) => h({ payload: msg.payload }))
  }
  private onPresenceSync = (msg: { room: string; state: Record<string, unknown> }) => {
    if (msg.room !== this.name) return
    this.presenceStateMap = Object.fromEntries(Object.entries(msg.state).map(([k, v]) => [k, [v]]))
    this.presenceHandlers.forEach((h) => h())
  }

  constructor(name: string, opts: { config?: { broadcast?: { self?: boolean }; presence?: { key?: string } } } = {}) {
    this.name = name
    this.opts = opts
    const s = getSocket()
    s.on('broadcast', this.onBroadcast)
    s.on('presence:sync', this.onPresenceSync)
  }

  on(
    type: 'broadcast' | 'presence',
    filter: { event: string },
    callback: BroadcastHandler | PresenceHandler,
  ) {
    if (type === 'broadcast') {
      const list = this.broadcastHandlers.get(filter.event) || []
      list.push(callback as BroadcastHandler)
      this.broadcastHandlers.set(filter.event, list)
    } else {
      this.presenceHandlers.push(callback as PresenceHandler)
    }
    return this
  }

  subscribe(callback?: (status: string) => void) {
    const s = getSocket()
    s.emit('channel:join', { room: this.name }, () => {
      callback?.('SUBSCRIBED')
    })
    return this
  }

  send(msg: { type: 'broadcast'; event: string; payload: unknown }) {
    const s = getSocket()
    s.emit('broadcast', {
      room: this.name,
      event: msg.event,
      payload: msg.payload,
      excludeSelf: this.opts.config?.broadcast?.self === false,
    })
  }

  track(data: unknown) {
    const s = getSocket()
    s.emit('presence:track', { room: this.name, key: this.opts.config?.presence?.key, data })
  }

  presenceState(): Record<string, unknown[]> {
    return this.presenceStateMap
  }

  unsubscribe() {
    const s = getSocket()
    s.emit('channel:leave', { room: this.name })
    s.off('broadcast', this.onBroadcast)
    s.off('presence:sync', this.onPresenceSync)
  }
}

export const db = {
  from<T = any>(table: string) {
    return new QueryBuilder<T>(table)
  },
  channel(name: string, opts: { config?: { broadcast?: { self?: boolean }; presence?: { key?: string } } } = {}) {
    return new RealtimeChannel(name, opts)
  },
  removeChannel(channel: RealtimeChannel) {
    channel.unsubscribe()
  },
}
