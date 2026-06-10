const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ollamaService = require('../services/ollamaService');
const { pool } = require('../db/pool');

// Check Ollama status
router.get('/status', async (req, res, next) => {
  try {
    const { available, models } = await ollamaService.checkStatus();
    res.json({
      success: true,
      data: { available, models }
    });
  } catch (err) {
    next(err);
  }
});

// Get chats
router.get('/chats', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, title, model, is_active, created_at FROM ollama_chats WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// Create chat
router.post('/chats', authenticateToken, async (req, res, next) => {
  try {
    const { model = 'mistral' } = req.body;

    const result = await pool.query(
      'INSERT INTO ollama_chats (user_id, model) VALUES ($1, $2) RETURNING id, title, model, is_active, created_at',
      [req.user.id, model]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// Get chat messages
router.get('/chats/:chatId', authenticateToken, async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    // Verify chat belongs to user
    const chatResult = await pool.query(
      'SELECT id, title FROM ollama_chats WHERE id = $1 AND user_id = $2',
      [req.params.chatId, req.user.id]
    );

    if (chatResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found' }
      });
    }

    const messagesResult = await pool.query(
      'SELECT id, role, content, created_at FROM ollama_messages WHERE chat_id = $1 ORDER BY created_at ASC LIMIT $2',
      [req.params.chatId, limit]
    );

    res.json({
      success: true,
      data: {
        chatId: req.params.chatId,
        title: chatResult.rows[0].title,
        messages: messagesResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;