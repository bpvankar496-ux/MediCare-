import { useEffect, useRef, useState } from 'react'
import { db } from './db'

export interface IncomingCall {
  consultationId: string
  fromName: string
}

// Subscribes to a lightweight "is anyone calling about this consultation"
// channel for every scheduled consultation id passed in, so a Join Now click
// on one side pops a visible "X is calling" banner (+ browser notification,
// if permitted) on the other side - even before they've opened the call.
export function useIncomingCallInvites(consultationIds: string[], myName: string) {
  const [incoming, setIncoming] = useState<IncomingCall | null>(null)
  const idsKey = consultationIds.join(',')

  useEffect(() => {
    if (!idsKey) return
    const ids = idsKey.split(',')
    const channels = ids.map((id) => {
      const chan = db.channel(`invite-${id}`, { config: { broadcast: { self: false } } })
      chan.on('broadcast', { event: 'ring' }, ({ payload }) => {
        if (payload.from === myName) return
        setIncoming({ consultationId: id, fromName: payload.from })
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`${payload.from} is calling`, { body: 'Tap to join your consultation', icon: '/favicon.svg' })
        }
      })
      chan.subscribe()
      return chan
    })
    return () => channels.forEach((c) => db.removeChannel(c))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, myName])

  return { incoming, dismiss: () => setIncoming(null), clear: () => setIncoming(null) }
}

// Fire-and-forget: lets the other side's useIncomingCallInvites know someone
// just clicked "Join Now" for this consultation.
export function sendCallInvite(consultationId: string, fromName: string) {
  const chan = db.channel(`invite-${consultationId}`, { config: { broadcast: { self: false } } })
  chan.subscribe(() => {
    chan.send({ type: 'broadcast', event: 'ring', payload: { from: fromName } })
    setTimeout(() => db.removeChannel(chan), 1500)
  })
}

// Small helper so pages can offer the same "Enable call notifications" toggle
// the Reminders page already has, without duplicating the permission logic.
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )
  const requested = useRef(false)
  const request = async () => {
    if (typeof Notification === 'undefined' || requested.current) return
    requested.current = true
    const result = await Notification.requestPermission()
    setPermission(result)
  }
  return { permission, request }
}
