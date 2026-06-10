const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../db/pool');

// Get conversations
router.get('/conversations', authenticateToken, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT DISTINCT ON (
        CASE 
          WHEN sender_id = $1 THEN recipient_id 
          ELSE sender_id 
        END
      )
      m.id,
      CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END as conversation_user_id,
      m.encrypted_content,
      m.created_at
      FROM messages m
      WHERE m.sender_id = $1 OR m.recipient_id = $1
      ORDER BY 
        CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END,
        m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, offset]);

    const conversations = await Promise.all(
      result.rows.map(async (msg) => {
        const userResult = await pool.query(
          'SELECT id, nickname, avatar_base64 FROM users WHERE id = $1',
          [msg.conversation_user_id]
        );
        const sessionResult = await pool.query(
          'SELECT id FROM user_sessions WHERE user_id = $1 AND is_active = true',
          [msg.conversation_user_id]
        );
        return {
          conversationId: msg.conversation_user_id,
          withUser: {
            ...userResult.rows[0],
            isOnline: sessionResult.rows.length > 0
          },
          lastMessage: msg.encrypted_content,
          lastMessageAt: msg.created_at
        };
      })
    );

    res.json({
      success: true,
      data: conversations
    });
  } catch (err) {
    next(err);
  }
});

// Get messages with specific user
router.get('/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query;

    let query = `
      SELECT id, sender_id, recipient_id, encrypted_content, encrypted_key, nonce, created_at
      FROM messages
      WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
    `;
    const params = [req.user.id, req.params.userId];

    if (before) {
      query += ` AND created_at < $${params.length + 1}`;
      params.push(new Date(before));
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        messages: result.rows.reverse(),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Send message
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { recipientId, encryptedContent, encryptedKey, nonce } = req.body;

    if (!recipientId || !encryptedContent || !encryptedKey || !nonce) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'All fields required' }
      });
    }

    // Check if recipient blocked sender
    const blockedResult = await pool.query(
      'SELECT id FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
      [recipientId, req.user.id]
    );

    if (blockedResult.rows.length > 0) {
      return res.status(403).json({
        success: false,
        error: { code: 'USER_BLOCKED', message: 'User has blocked you' }
      });
    }

    const result = await pool.query(
      'INSERT INTO messages (sender_id, recipient_id, encrypted_content, encrypted_key, nonce) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
      [req.user.id, recipientId, encryptedContent, encryptedKey, nonce]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// Delete message
router.delete('/:messageId', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM messages WHERE id = $1 AND sender_id = $2',
      [req.params.messageId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found' }
      });
    }

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;