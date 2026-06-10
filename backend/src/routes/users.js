const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../db/pool');

// Get current user profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, nickname, avatar_base64, email_verified, can_invite, last_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { nickname, avatar } = req.body;

    const result = await pool.query(
      'UPDATE users SET nickname = COALESCE($1, nickname), avatar_base64 = COALESCE($2, avatar_base64) WHERE id = $3 RETURNING id, email, nickname, avatar_base64',
      [nickname, avatar, req.user.id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// Get public user info
router.get('/:userId', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, nickname, avatar_base64 FROM users WHERE id = $1',
      [req.params.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // Check if user is online
    const sessionResult = await pool.query(
      'SELECT id FROM user_sessions WHERE user_id = $1 AND is_active = true',
      [req.params.userId]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        isOnline: sessionResult.rows.length > 0
      }
    });
  } catch (err) {
    next(err);
  }
});

// Search users
router.get('/search/query', async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 3) {
      return res.status(400).json({
        success: false,
        error: { code: 'QUERY_TOO_SHORT', message: 'Query must be at least 3 characters' }
      });
    }

    const result = await pool.query(
      'SELECT id, nickname, avatar_base64 FROM users WHERE nickname ILIKE $1 LIMIT $2',
      [`%${q}%`, limit]
    );

    // Check online status for each user
    const usersWithStatus = await Promise.all(
      result.rows.map(async (user) => {
        const sessionResult = await pool.query(
          'SELECT id FROM user_sessions WHERE user_id = $1 AND is_active = true',
          [user.id]
        );
        return {
          ...user,
          isOnline: sessionResult.rows.length > 0
        };
      })
    );

    res.json({
      success: true,
      data: usersWithStatus
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;