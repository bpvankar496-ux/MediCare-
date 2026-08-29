// Realtime layer: mirrors the Supabase Realtime `channel()` API used by the
// frontend (broadcast messages + presence) for video-call signaling and
// consultation chat. Rooms map 1:1 to Supabase channel names.
export function attachRealtime(io) {
  const presenceByRoom = new Map() // room -> Map<presenceKey, data>
  const socketPresence = new Map() // socket.id -> Map<room, presenceKey>  (for cleanup on disconnect)

  function syncPresence(room) {
    const state = presenceByRoom.get(room)
    io.to(room).emit('presence:sync', { room, state: state ? Object.fromEntries(state) : {} })
  }

  io.on('connection', (socket) => {
    socket.on('channel:join', ({ room }, ack) => {
      socket.join(room)
      if (typeof ack === 'function') ack()
    })

    socket.on('channel:leave', ({ room }) => {
      socket.leave(room)
      const key = socketPresence.get(socket.id)?.get(room)
      if (key) {
        presenceByRoom.get(room)?.delete(key)
        socketPresence.get(socket.id)?.delete(room)
        syncPresence(room)
      }
    })

    socket.on('broadcast', ({ room, event, payload, excludeSelf }) => {
      if (!room || !event) return
      if (excludeSelf) socket.to(room).emit('broadcast', { room, event, payload })
      else io.to(room).emit('broadcast', { room, event, payload })
    })

    // `key` is the caller-supplied identity for this peer within the room
    // (e.g. VideoCall's per-tab random id) so both sides of a call can find
    // "the other participant" in the synced presence state. Falls back to
    // the socket id if the caller didn't supply one.
    socket.on('presence:track', ({ room, key, data }) => {
      if (!room) return
      const presenceKey = key || socket.id
      if (!presenceByRoom.has(room)) presenceByRoom.set(room, new Map())
      presenceByRoom.get(room).set(presenceKey, data)

      if (!socketPresence.has(socket.id)) socketPresence.set(socket.id, new Map())
      socketPresence.get(socket.id).set(room, presenceKey)

      syncPresence(room)
    })

    socket.on('disconnecting', () => {
      const rooms = socketPresence.get(socket.id)
      if (rooms) {
        for (const [room, key] of rooms) {
          presenceByRoom.get(room)?.delete(key)
          syncPresence(room)
        }
        socketPresence.delete(socket.id)
      }
    })
  })

  return io
}
