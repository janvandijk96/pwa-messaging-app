const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { pool } = require('../db/pool');
const logger = require('../utils/logger');

const sendVerificationEmail = async (email, userId) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    await pool.query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    // Send email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?userId=${userId}&token=${token}`;

    const subject = 'Verify your email';
    const html = `
      <h2>Welcome to Messaging!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>Or copy this link: ${verificationLink}</p>
      <p>This link expires in 24 hours.</p>
    `;

    logger.info(`Email verification link ready for ${email}`);
    // In production, use actual email service
    // await mailService.send(email, subject, html);
  } catch (err) {
    logger.error('Failed to send verification email:', err);
  }
};

module.exports = { sendVerificationEmail };