const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const logger = require('../utils/logger');

module.exports = function(io) {
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    const token = socket.handshake.auth.token;
    if (!token) {
      socket.disconnect();
      return;
    }

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = user.id;
      connectedUsers.set(user.id, socket.id);

      // Create user session
      pool.query(
        'INSERT INTO user_sessions (user_id, socket_id, is_active) VALUES ($1, $2, true) ON CONFLICT DO NOTHING',
        [user.id, socket.id]
      );

      // Broadcast user online
      io.emit('user:online', { userId: user.id });

      // Message event
      socket.on('message:send', async (data) => {
        try {
          const { recipientId, encryptedContent, encryptedKey, nonce } = data;
          
          // Save message
          const result = await pool.query(
            'INSERT INTO messages (sender_id, recipient_id, encrypted_content, encrypted_key, nonce) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
            [user.id, recipientId, encryptedContent, encryptedKey, nonce]
          );

          // Emit to recipient
          const recipientSocketId = connectedUsers.get(recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message:received', {
              id: result.rows[0].id,
              senderId: user.id,
              recipientId,
              encryptedContent,
              encryptedKey,
              nonce,
              createdAt: result.rows[0].created_at
            });
          }
        } catch (err) {
          logger.error('Message error:', err);
          socket.emit('error', 'Failed to send message');
        }
      });

      // Typing indicator
      socket.on('user:typing', (data) => {
        const { recipientId } = data;
        const recipientSocketId = connectedUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('user:typing', { userId: user.id });
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        connectedUsers.delete(user.id);
        pool.query('DELETE FROM user_sessions WHERE socket_id = $1', [socket.id]);
        io.emit('user:offline', { userId: user.id });
        logger.info(`Client disconnected: ${socket.id}`);
      });
    } catch (err) {
      logger.error('Socket authentication error:', err);
      socket.disconnect();
    }
  });
};