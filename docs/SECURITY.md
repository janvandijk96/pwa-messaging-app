# Security Guidelines & Best Practices

## Overview

This document outlines security considerations and best practices for the PWA Messaging App.

## 1. Data Encryption

### End-to-End Encryption (E2EE)

**Implementation:**
- Algorithm: NaCl (TweetNaCl.js)
- Cipher: XSalsa20 (stream cipher)
- Authentication: Poly1305 (MAC)
- Key Size: 256-bit (32 bytes)

**Flow:**
```
User A's plaintext message
  ↓
Generate random nonce (24 bytes)
  ↓
Encrypt with User B's public key + nonce
  ↓
Encrypt session key with passkey
  ↓
Send: {encryptedContent, encryptedKey, nonce}
  ↓
Database stores encrypted data only
```

**Server Never Sees:**
- Message plaintext
- Decryption keys
- Session keys

### Nonce Handling

```javascript
// CRITICAL: Each message must use unique nonce
const nonce = window.crypto.getRandomValues(new Uint8Array(24));

// NEVER reuse nonce with same key
// If reused, encryption is completely broken
```

### Key Management

```javascript
// Public key cryptography
User A: private_key (stored locally, never leaves device)
User B: public_key (stored in database, used by User A to encrypt)

// During encryption
const encrypted = nacl.secretbox(message, nonce, sharedSecret);

// Session keys
// Each message uses different random session key
// Session key encrypted with recipient's passkey
```

## 2. Authentication

### Passkey (WebAuthn)

**Never storing passwords.** Using passkey/WebAuthn instead:

```javascript
// Registration
1. User clicks "Create Passkey"
2. Browser/device creates public/private key pair
3. Private key stored securely (TPM, Secure Enclave)
4. Public key sent to server
5. Public key stored in database

// Login
1. Backend generates random challenge
2. User proves possession of private key
3. Browser signs challenge with private key
4. Signature verified server-side
5. JWT token issued
```

**Security Features:**
- Phishing resistant (origin binding)
- Hardware backed (TPM/Secure Enclave)
- No password to compromise
- Multi-device passkey support

### JWT Token Handling

```javascript
// Token stored in sessionStorage (cleared on tab close)
sessionStorage.setItem('auth_token', token);

// Never in localStorage (persistent across tabs, XSS risk)
// Never in cookies (unless httpOnly, Secure flags set)

// Token structure
Header.Payload.Signature
  ↓
{alg: "HS256"}
{sub: user_id, email, exp: ...}
HMAC-SHA256(secret)
```

**Token Expiry:**
- Access token: 24 hours
- Refresh token: 7 days (optional)
- Passkey re-required after 1 hour inactivity

```javascript
// Check token expiration
const decoded = jwt_decode(token);
if (Date.now() >= decoded.exp * 1000) {
  // Token expired, require re-authentication with passkey
  logout();
  redirectToLogin();
}
```

### Session Management

```javascript
// Automatic logout on inactivity
const INACTIVITY_TIMEOUT = 3600000; // 1 hour

document.addEventListener('mousemove', resetTimeout);
document.addEventListener('keypress', resetTimeout);

function resetTimeout() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    // Logout user, require passkey
    performPasskeyLogin();
  }, INACTIVITY_TIMEOUT);
}
```

## 3. Input Validation

### Frontend Validation

```javascript
// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw new Error('Invalid email');
}

// Nickname validation (alphanumeric, underscore, dash)
const nicknameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
if (!nicknameRegex.test(nickname)) {
  throw new Error('Invalid nickname');
}

// UUID validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Message length (prevent storage abuse)
if (message.length > 10000) {
  throw new Error('Message too long');
}
```

### Backend Validation

```javascript
// Express middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb' }));

// Validator library
const { body, validationResult } = require('express-validator');

app.post('/api/messages', [
  body('recipientId').isUUID(),
  body('encryptedContent').isString().trim().notEmpty(),
  body('encryptedKey').isBase64(),
  body('nonce').isBase64()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
});
```

## 4. Access Control

### JWT Verification

```javascript
// Every authenticated endpoint requires valid JWT
app.use('/api/protected', authenticateToken, handler);

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
```

### User Data Isolation

```javascript
// Verify user owns resource before returning
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  // req.user.id comes from verified JWT
  const profile = await getUserProfile(req.user.id);
  
  // Never return data for different user
  if (profile.id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json(profile);
});

// Messages - verify sender or recipient
app.get('/api/messages/:userId', authenticateToken, async (req, res) => {
  const messages = await getConversation(req.user.id, req.params.userId);
  
  // Only return if user is sender or recipient
  const userIsParticipant = messages.every(m => 
    m.senderId === req.user.id || m.recipientId === req.user.id
  );
  
  if (!userIsParticipant) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json(messages);
});
```

## 5. Network Security

### HTTPS/TLS

```nginx
# Nginx config
server {
  listen 443 ssl http2;
  
  ssl_certificate /etc/nginx/certs/certificate.crt;
  ssl_certificate_key /etc/nginx/certs/private.key;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  
  # Redirect HTTP to HTTPS
  error_page 497 https://$host$request_uri;
}
```

**Certificate:**
- Use Let's Encrypt (free, auto-renewing)
- Certificate pinning (optional, for mobile)

### CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### CSRF Protection

```javascript
// Token-based CSRF prevention
const csrfProtection = csrf({ cookie: false });

app.post('/api/messages', csrfProtection, (req, res) => {
  // CSRF token validated
});
```

### Security Headers

```nginx
# Nginx headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval';" always;
```

## 6. Rate Limiting

### API Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// General rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.body.email // Rate limit by email
});

app.use('/api/', limiter);
app.post('/api/auth/login-verify', authLimiter, handler);
```

### WebSocket Rate Limiting

```javascript
io.on('connection', (socket) => {
  const userMessagesPerMinute = new Map();
  
  socket.on('message:send', (data) => {
    const userId = socket.handshake.auth.userId;
    const count = userMessagesPerMinute.get(userId) || 0;
    
    if (count >= 60) { // Max 60 messages per minute
      socket.emit('error', 'Rate limited');
      return;
    }
    
    userMessagesPerMinute.set(userId, count + 1);
    
    // Reset counter after 1 minute
    setTimeout(() => {
      userMessagesPerMinute.delete(userId);
    }, 60000);
    
    // Process message
    handleMessage(socket, data);
  });
});
```

## 7. Database Security

### SQL Injection Prevention

```javascript
// ALWAYS use prepared statements
const query = 'SELECT * FROM users WHERE email = $1';
const values = [userEmail];
const result = await pool.query(query, values);

// NEVER concatenate user input
const badQuery = `SELECT * FROM users WHERE email = '${userEmail}'`; // ❌ NEVER
```

### Password Hashing (if stored)

```javascript
// For passkey app, no passwords stored
// But if backup auth is added:
const bcrypt = require('bcryptjs');

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);
```

### Database Encryption

```sql
-- Transparent Data Encryption (TDE)
-- PostgreSQL: pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive columns
ALTER TABLE users ADD COLUMN avatar_encrypted BYTEA;
UPDATE users SET avatar_encrypted = pgp_sym_encrypt(avatar, 'encryption_key');

-- Or use full database encryption at OS level
-- Or use managed database services with encryption at rest
```

## 8. Third-Party Security

### Email Service (SendGrid)

```javascript
// Store API key in environment variable
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Verify email configuration
const msg = {
  to: userEmail,
  from: process.env.EMAIL_FROM,
  subject: 'Verify your email',
  html: `<a href="${verificationLink}">Verify email</a>`,
  trackingSettings: { // Privacy consideration
    clickTracking: { enabled: false },
    openTracking: { enabled: false }
  }
};

await sgMail.send(msg);
```

### Ollama Integration

```javascript
// Only trust Ollama on same network/localhost
const ollamaUrl = 'http://localhost:11434';

// Timeout to prevent hanging
const timeout = 30000;
const response = await axios.post(
  `${ollamaUrl}/api/generate`,
  { model: 'mistral', prompt: userMessage },
  { timeout }
).catch(err => {
  // Ollama unavailable, set status to offline
  return { data: { status: 'offline' } };
});
```

## 9. Error Handling

### Don't Leak Information

```javascript
// ❌ BAD: Reveals database structure
catch (err) {
  res.status(500).json({ error: err.message });
  // "foreign key constraint violation"
}

// ✅ GOOD: Generic error message
catch (err) {
  logger.error(err);
  res.status(500).json({ error: 'An error occurred' });
  // Log details server-side for debugging
}

// ✅ GOOD: Specific safe errors
if (!user) {
  return res.status(401).json({ error: 'Invalid credentials' });
  // Same response for "user not found" and "wrong password"
}
```

### Logging Sensitive Data

```javascript
// ❌ BAD: Logging passwords, tokens
logger.info(`User logged in: ${req.body.password}`);

// ✅ GOOD: Log only safe identifiers
logger.info(`User ${userId} authenticated`);
logger.info(`Message sent from ${senderId} to ${recipientId}`);

// Redact sensitive data
const sanitized = JSON.stringify(user)
  .replace(/"password":"[^"]*"/, '"password":"***"')
  .replace(/"token":"[^"]*"/, '"token":"***"');
logger.info(sanitized);
```

## 10. Security Checklist

### Before Production Deployment

- [ ] All passwords/secrets in environment variables
- [ ] HTTPS/TLS enabled with valid certificate
- [ ] CORS properly configured (whitelist frontend domain)
- [ ] Rate limiting enabled on auth endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] Passkey authentication working
- [ ] Email verification required before access
- [ ] End-to-end encryption implemented
- [ ] Database backups configured
- [ ] Error messages don't leak information
- [ ] Logging doesn't store sensitive data
- [ ] Dependencies updated to latest patches
- [ ] Security audit completed
- [ ] Incident response plan documented

### Ongoing Monitoring

- [ ] Monitor for failed login attempts
- [ ] Track API error rates
- [ ] Alert on unusual database queries
- [ ] Monitor rate limit triggers
- [ ] Check for dependency vulnerabilities
- [ ] Review security logs weekly
- [ ] Update dependencies monthly

## 11. Incident Response

### If Compromised

1. **Immediate:**
   - Revoke all JWT tokens
   - Force re-authentication with passkey
   - Invalidate all sessions

2. **Investigation:**
   - Check logs for unauthorized access
   - Identify compromised accounts
   - Determine what data was accessed

3. **Recovery:**
   - Patch vulnerability
   - Notify affected users
   - Restore from clean backup if needed
   - Reset compromised credentials

4. **Prevention:**
   - Post-mortem analysis
   - Implement additional monitoring
   - Update security practices

## 12. Privacy Considerations

### GDPR Compliance

```javascript
// User data export
app.get('/api/users/export', authenticateToken, async (req, res) => {
  const userData = await getUserDataPortability(req.user.id);
  res.json(userData);
});

// Account deletion
app.delete('/api/users/account', authenticateToken, async (req, res) => {
  // Delete user and all associated data
  await deleteUserAndData(req.user.id);
  res.json({ message: 'Account deleted' });
});

// Only keep necessary logs
// Auto-delete old sessions after 90 days
```

### Data Minimization

- Don't store read receipts (no tracking)
- Don't store IP addresses (except for security logs)
- Don't collect analytics without consent
- Only store email verification tokens, not email confirmation logs

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [WebAuthn Standard](https://webauthn.io/)
- [TweetNaCl.js Documentation](https://tweetnacl.js.org/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)
