import { useState, useEffect, useRef } from 'react'
import { db } from './db'

export function ChatOnly({ roomId, displayName }: { roomId: string; displayName: string }) {
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([])
  const [input, setInput] = useState('')
  const channelRef = useRef<ReturnType<typeof db.channel> | null>(null)

  useEffect(() => {
    const chan = db.channel(`chat-${roomId}`, { config: { broadcast: { self: false } } })
    chan.on('broadcast', { event: 'msg' }, ({ payload }) => {
      setMessages((prev) => [...prev, payload])
    }).subscribe()
    channelRef.current = chan
    return () => { db.removeChannel(chan) }
  }, [roomId])

  const send = () => {
    if (!input.trim() || !channelRef.current) return
    channelRef.current.send({ type: 'broadcast', event: 'msg', payload: { from: displayName, text: input.trim() } })
    setMessages((prev) => [...prev, { from: displayName, text: input.trim() }])
    setInput('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)' }}>
        {messages.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Say hello to start the consultation.</p>}
        {messages.map((m, i) => (
          <div key={i} style={{ fontSize: 14 }}><strong>{m.from}:</strong> {m.text}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message..." />
        <button className="btn btn-primary" onClick={send}>Send</button>
      </div>
    </div>
  )
}
