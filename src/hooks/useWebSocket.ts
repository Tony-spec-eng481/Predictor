import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export const useWebSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
    })

    s.on('connect', () => {
      console.log('WS Connected')
      setConnected(true)
    })

    s.on('disconnect', () => {
      console.log('WS Disconnected')
      setConnected(false)
    })

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [])

  return { socket, connected }
}
