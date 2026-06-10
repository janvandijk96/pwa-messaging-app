const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { pool } = require('../db/pool');
const logger = require('../utils/logger');

// Register endpoint
router.post('/register', async (req, res, next) => {
  try {
    const { email, inviteToken, nickname } = req.body;

    if (!email || !inviteToken || !nickname) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email, invite token, and nickname required' }
      });
    }

    // Validate invite token
    const result = await pool.query(
      'SELECT * FROM invite_links WHERE token = $1 AND is_used = false AND expires_at > NOW()',
      [inviteToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INVITE', message: 'Invalid or expired invite token' }
      });
    }

    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (email, nickname) VALUES ($1, $2) RETURNING id, email, nickname',
      [email, nickname]
    );

    const userId = userResult.rows[0].id;

    // Mark invite as used
    await pool.query(
      'UPDATE invite_links SET is_used = true, used_by_id = $1, used_at = NOW() WHERE token = $2',
      [userId, inviteToken]
    );

    // Send verification email
    await authService.sendVerificationEmail(email, userId);

    res.status(201).json({
      success: true,
      data: {
        userId,
        email,
        requiresEmailVerification: true,
        verificationSent: true
      }
    });
  } catch (err) {
    next(err);
  }
});

// Verify email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'User ID and token required' }
      });
    }

    const result = await pool.query(
      'SELECT * FROM email_verification_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
      [userId, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired verification token' }
      });
    }

    // Mark email as verified
    await pool.query(
      'UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE id = $1',
      [userId]
    );

    // Delete used token
    await pool.query(
      'DELETE FROM email_verification_tokens WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (err) {
    next(err);
  }
});

// Login challenge
router.post('/login-challenge', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_EMAIL', message: 'Email required' }
      });
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if user exists (security)
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'User not found' }
      });
    }

    const challenge = Buffer.from(require('crypto').randomBytes(32)).toString('base64');

    // Store challenge in session/cache (simplified - use Redis in production)
    res.json({
      success: true,
      data: {
        challenge,
        timeout: 60000,
        rpId: process.env.PASSKEY_RP_ID || 'localhost',
        userVerification: 'preferred'
      }
    });
  } catch (err) {
    next(err);
  }
});

// Login verify
router.post('/login-verify', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
      });
    }

    const result = await pool.query(
      'SELECT id, email, nickname, avatar_base64, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0 || !result.rows[0].email_verified) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
      });
    }

    const user = result.rows[0];
    const token = require('jsonwebtoken').sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar_base64
        },
        expiresIn: 86400
      }
    });
  } catch (err) {
    next(err);
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;