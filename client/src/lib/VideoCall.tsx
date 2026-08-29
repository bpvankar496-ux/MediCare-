import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, MessageSquare, Send } from 'lucide-react'
import { db } from './db'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

interface ChatMessage {
  from: string
  text: string
  at: number
}

export function VideoCall({
  roomId,
  displayName,
  withVideo = true,
  onLeave,
}: {
  roomId: string
  displayName: string
  withVideo?: boolean
  onLeave: () => void
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const channelRef = useRef<ReturnType<typeof db.channel> | null>(null)
  const myIdRef = useRef<string>(Math.random().toString(36).slice(2))
  const makingOfferRef = useRef(false)
  const politeRef = useRef(false)

  const [status, setStatus] = useState<'connecting' | 'waiting' | 'connected' | 'error'>('connecting')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(withVideo)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')

  useEffect(() => {
    let cancelled = false

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: withVideo, audio: true })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream

        const pc = new RTCPeerConnection(ICE_SERVERS)
        pcRef.current = pc
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
          setStatus('connected')
        }

        const channel = db.channel(`call-${roomId}`, {
          config: { broadcast: { self: false }, presence: { key: myIdRef.current } },
        })
        channelRef.current = channel

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({ type: 'broadcast', event: 'ice-candidate', payload: { candidate: event.candidate, from: myIdRef.current } })
          }
        }

        pc.onnegotiationneeded = async () => {
          try {
            makingOfferRef.current = true
            await pc.setLocalDescription()
            channel.send({ type: 'broadcast', event: 'description', payload: { description: pc.localDescription, from: myIdRef.current } })
          } catch (e) {
            console.error(e)
          } finally {
            makingOfferRef.current = false
          }
        }

        channel
          .on('broadcast', { event: 'description' }, async ({ payload }) => {
            if (payload.from === myIdRef.current) return
            const description = payload.description as RTCSessionDescriptionInit
            const offerCollision = description.type === 'offer' && (makingOfferRef.current || pc.signalingState !== 'stable')
            const ignoreOffer = !politeRef.current && offerCollision
            if (ignoreOffer) return
            await pc.setRemoteDescription(description)
            if (description.type === 'offer') {
              await pc.setLocalDescription()
              channel.send({ type: 'broadcast', event: 'description', payload: { description: pc.localDescription, from: myIdRef.current } })
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            if (payload.from === myIdRef.current) return
            try {
              await pc.addIceCandidate(payload.candidate)
            } catch (e) {
              console.error('ICE candidate error', e)
            }
          })
          .on('broadcast', { event: 'chat' }, ({ payload }) => {
            if (payload.from === myIdRef.current) return
            setMessages((prev) => [...prev, { from: payload.name, text: payload.text, at: Date.now() }])
          })
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState()
            const ids = Object.keys(state)
            const otherId = ids.find((id) => id !== myIdRef.current)
            if (ids.length >= 2 && otherId) {
              // Deterministic polite/impolite assignment so both sides don't both offer at once.
              // Both peers compare their own id against the *other* peer's id, so exactly one
              // side ends up polite and the other impolite.
              politeRef.current = myIdRef.current > otherId
              setStatus((s) => (s === 'connecting' ? 'waiting' : s))
            }
          })
          .subscribe(async (subStatus) => {
            if (subStatus === 'SUBSCRIBED') {
              await channel.track({ name: displayName, joined_at: Date.now() })
              setStatus('waiting')
            }
          })
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          let detail = 'Could not access camera/microphone.'
          if (err instanceof DOMException) {
            if (err.name === 'NotReadableError') detail = 'Your camera or mic is already being used by another app or browser tab. Close it and try again.'
            else if (err.name === 'NotAllowedError') detail = 'Camera/mic permission was denied. Allow access in your browser and try again.'
            else if (err.name === 'NotFoundError') detail = 'No camera/microphone was found on this device.'
          }
          setErrorDetail(detail)
          setStatus('error')
        }
      }
    }

    setup()

    return () => {
      cancelled = true
      pcRef.current?.close()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      if (channelRef.current) db.removeChannel(channelRef.current)
    }
  }, [roomId, displayName, withVideo])

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled))
    setMicOn((v) => !v)
  }

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled))
    setCamOn((v) => !v)
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    const msg = { from: myIdRef.current, name: displayName, text: chatInput.trim() }
    channelRef.current?.send({ type: 'broadcast', event: 'chat', payload: msg })
    setMessages((prev) => [...prev, { from: displayName, text: chatInput.trim(), at: Date.now() }])
    setChatInput('')
  }

  const leave = () => {
    pcRef.current?.close()
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    if (channelRef.current) db.removeChannel(channelRef.current)
    onLeave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0c1117', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {status === 'connecting' && 'Setting up camera/mic...'}
          {status === 'waiting' && 'Waiting for the other person to join...'}
          {status === 'connected' && 'Connected'}
          {status === 'error' && (errorDetail || 'Could not access camera/microphone')}
        </span>
        <button onClick={() => setChatOpen((v) => !v)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px 12px', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={16} /> Chat
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
        <video ref={remoteVideoRef} autoPlay playsInline style={{ flex: 1, width: '100%', height: '100%', objectFit: 'cover', background: '#151b24' }} />
        {status !== 'connected' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                <VideoIcon size={28} />
              </div>
              <p style={{ fontSize: 14 }}>Share this consultation's room and have the other side click Join at the same time.</p>
            </div>
          </div>
        )}
        <video ref={localVideoRef} autoPlay playsInline muted style={{
          position: 'absolute', bottom: 20, right: 20, width: 160, height: 120,
          objectFit: 'cover', borderRadius: 12, border: '2px solid rgba(255,255,255,0.2)',
          background: '#000', display: camOn ? 'block' : 'none',
        }} />

        {chatOpen && (
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 300, maxWidth: '80vw', background: 'rgba(21,27,36,0.97)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No messages yet</p>}
              {messages.map((m, i) => (
                <div key={i} style={{ fontSize: 13, color: 'white' }}>
                  <span style={{ fontWeight: 600, color: 'var(--primary-300)' }}>{m.from}: </span>{m.text}
                </div>
              ))}
            </div>
            <div style={{ padding: 12, display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Type a message..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '8px 10px', color: 'white', fontSize: 13 }}
              />
              <button onClick={sendChat} style={{ background: 'var(--primary-500)', border: 'none', borderRadius: 8, padding: '8px 10px', color: 'white' }}><Send size={15} /></button>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 20, display: 'flex', justifyContent: 'center', gap: 14 }}>
        <button onClick={toggleMic} style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: micOn ? 'rgba(255,255,255,0.15)' : 'var(--error-500)', color: 'white', display: 'grid', placeItems: 'center' }}>
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        {withVideo && (
          <button onClick={toggleCam} style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: camOn ? 'rgba(255,255,255,0.15)' : 'var(--error-500)', color: 'white', display: 'grid', placeItems: 'center' }}>
            {camOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
          </button>
        )}
        <button onClick={leave} style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: 'var(--error-500)', color: 'white', display: 'grid', placeItems: 'center' }}>
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  )
}
