const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../db/pool');
const crypto = require('crypto');

// Create invite
router.post('/create', authenticateToken, async (req, res, next) => {
  try {
    // Check if user can invite
    const userResult = await pool.query(
      'SELECT can_invite FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].can_invite) {
      return res.status(403).json({
        success: false,
        error: { code: 'CANNOT_INVITE', message: 'You do not have permission to invite' }
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const result = await pool.query(
      'INSERT INTO invite_links (created_by_id, token, expires_at) VALUES ($1, $2, $3) RETURNING token',
      [req.user.id, token, expiresAt]
    );

    res.status(201).json({
      success: true,
      data: {
        token: result.rows[0].token,
        link: `${process.env.FRONTEND_URL}/invite/${result.rows[0].token}`,
        expiresAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// Validate invite
router.get('/validate/:token', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT il.token, il.expires_at, u.nickname FROM invite_links il JOIN users u ON il.created_by_id = u.id WHERE il.token = $1 AND il.is_used = false AND il.expires_at > NOW()',
      [req.params.token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INVITE', message: 'Invalid or expired invite' }
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        createdBy: result.rows[0].nickname,
        expiresAt: result.rows[0].expires_at
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;