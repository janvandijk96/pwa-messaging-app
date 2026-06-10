import io from 'socket.io-client'

let socket = null

export const initSocket = (token) => {
  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('Connected to server')
  })

  socket.on('disconnect', () => {
    console.log('Disconnected from server')
  })

  socket.on('error', (error) => {
    console.error('Socket error:', error)
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const socketClient = {
  sendMessage: (recipientId, encryptedContent, encryptedKey, nonce) => {
    if (socket) {
      socket.emit('message:send', {
        recipientId,
        encryptedContent,
        encryptedKey,
        nonce
      })
    }
  },
  sendTyping: (recipientId) => {
    if (socket) {
      socket.emit('user:typing', { recipientId })
    }
  },
  on: (event, callback) => {
    if (socket) {
      socket.on(event, callback)
    }
  },
  off: (event, callback) => {
    if (socket) {
      socket.off(event, callback)
    }
  }
}

export default socketClient