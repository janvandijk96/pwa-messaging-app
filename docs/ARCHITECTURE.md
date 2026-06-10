# System Architecture

## Overview

The PWA Messaging App uses a modern, scalable architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Devices                               │
│  (iOS, Android, macOS, Windows, ChromeOS, Web Browser)      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       │ WebSocket/WSS
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  Nginx Reverse Proxy                          │
│  (SSL/TLS, gzip, caching, static files, API proxy)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
┌─────────────────┐          ┌──────────────────┐
│   Vue.js PWA    │          │  Node.js Backend │
│   (SPA)         │          │  (Express)       │
│                 │          │                  │
│ • Service       │          │ • REST API       │
│   Worker       │          │ • WebSocket      │
│ • Crypto       │          │ • JWT Auth       │
│ • Offline      │          │ • Business Logic │
└─────────────────┘          └────────┬─────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ↓                 ↓                 ↓
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │ PostgreSQL   │   │  Ollama      │   │  SendGrid    │
            │ Database     │   │  Chatbot     │   │  Email       │
            │              │   │  (Optional)  │   │              │
            └──────────────┘   └──────────────┘   └──────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: Vue.js 3 (Composition API)
- **Routing**: Vue Router 4
- **State Management**: Pinia
- **Real-time**: Socket.io Client
- **Styling**: TailwindCSS + custom pastel theme
- **Build**: Vite
- **PWA**: Service Worker + Web App Manifest

### Key Components

```
src/
├── App.vue                    # Root component
├── main.js                    # Entry point
├── pages/
│   ├── LoginPage.vue         # Passkey login
│   ├── RegisterPage.vue      # Invite-only signup
│   ├── ChatPage.vue          # Main messaging UI
│   ├── ProfilePage.vue       # User profile
│   └── ChatbotPage.vue       # Ollama chat
├── components/
│   ├── MessageList.vue       # Message display
│   ├── MessageInput.vue      # Message composer
│   ├── UserList.vue          # Conversation list
│   ├── UserCard.vue          # User profile card
│   └── OnlineIndicator.vue   # Online status
├── stores/
│   ├── authStore.js          # Auth state & actions
│   ├── messageStore.js       # Messages & conversations
│   ├── userStore.js          # User data
│   └── uiStore.js            # UI state
├── services/
│   ├── api.js                # HTTP client (axios)
│   ├── socket.js             # WebSocket client
│   ├── crypto.js             # NaCl encryption
│   ├── storage.js            # IndexedDB & localStorage
│   └── notification.js       # Push notifications
├── sw.js                      # Service worker
├── manifest.json              # PWA manifest
└── styles/
    ├── globals.css           # Global styles
    └── tailwind.config.js    # Tailwind config
```

### Encryption Flow

```
User A Message
        ↓
[User A] → Compose message → Generate session key
        ↓
Serialize message with TweetNaCl
        ↓
Encrypt with session key (XSalsa20 + Poly1305)
        ↓
Encrypt session key with User B's public key
        ↓
Send encrypted_content + encrypted_key + nonce to server
        ↓
[Database] → Store encrypted data
        ↓
        ↓ WebSocket notification
[User B] → Receive encrypted message
        ↓
Decrypt session key with private key
        ↓
Decrypt message content
        ↓
Display plaintext message
```

### Offline Support

```
Online
  ↓
Fetch messages, users → Store in IndexedDB
  ↓
User goes offline
  ↓
Service Worker intercepts requests
  ↓
Display cached messages from IndexedDB
  ↓
Queue outgoing messages locally
  ↓
User goes back online
  ↓
Sync queued messages
  ↓
Clear local queue
```

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Real-time**: Socket.io
- **Auth**: JWT + WebAuthn
- **Encryption**: TweetNaCl.js
- **Email**: SendGrid/Nodemailer

### Project Structure

```
backend/src/
├── index.js                   # Express & Socket.io setup
├── config/
│   ├── database.js           # PostgreSQL connection
│   ├── env.js                # Environment validation
│   └── auth.js               # JWT & passkey config
├── routes/
│   ├── auth.js               # /auth/* endpoints
│   ├── users.js              # /users/* endpoints
│   ├── messages.js           # /messages/* endpoints
│   ├── invites.js            # /invites/* endpoints
│   └── ollama.js             # /ollama/* endpoints
├── models/
│   ├── User.js               # User model & queries
│   ├── Message.js            # Message model
│   ├── Passkey.js            # Passkey model
│   ├── InviteLink.js         # Invite model
│   └── OllamaChat.js         # Chat model
├── middleware/
│   ├── auth.js               # JWT verification
│   ├── validation.js         # Input validation
│   ├── errorHandler.js       # Error handling
│   ├── rateLimiter.js        # Rate limiting
│   └── cors.js               # CORS setup
├── services/
│   ├── authService.js        # Auth logic
│   ├── userService.js        # User operations
│   ├── messageService.js     # Message encryption/decryption
│   ├── emailService.js       # Email sending
│   ├── ollamaService.js      # Ollama API client
│   └── socketService.js      # Socket.io events
├── db/
│   ├── init.sql              # Schema
│   └── pool.js               # Connection pool
└── utils/
    ├── logger.js             # Winston logger
    ├── jwt.js                # JWT utilities
    └── validators.js         # Input validators
```

### Request Handling Flow

```
HTTP Request / WebSocket Connection
  ↓
Express/Socket.io middleware
  ↓
Rate limit check
  ↓
CORS validation
  ↓
JWT verification (if authenticated)
  ↓
Input validation
  ↓
Route handler
  ↓
Service layer (business logic)
  ↓
Database queries (via models)
  ↓
Response/Event emission
  ↓
Error handling (if needed)
  ↓
Client response
```

### Database Connection Pool

```javascript
// Connection pooling configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,              // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Data Flow Diagrams

### Message Sending

```
User A (Frontend)
  ↓ Message typed
1. Encrypt message with User B's public key
2. Serialize with NaCl
3. Generate nonce
4. Socket emit: "message:send"
  ↓
Backend (messageService.js)
  ↓
5. Validate sender & recipient
6. Check if recipient blocked sender
7. Store encrypted message in database
8. Find User B's active sessions
  ↓
User B (Frontend)
  ↓
9. Socket event: "message:received"
10. Decrypt message with private key
11. Display message
12. Update conversation list
```

### User Authentication

```
Register:
1. User enters email + nickname
2. Click "Sign Up with Passkey"
3. Use invite token
4. WebAuthn credential creation
  ↓
5. POST /auth/register (invite validation)
6. Create user record
7. Send verification email
8. POST /auth/verify-email (token validation)
9. Mark email as verified
10. POST /auth/register-passkey (credential registration)
  ↓
11. User can now login

Login:
1. POST /auth/login-challenge (email)
2. Backend generates WebAuthn challenge
  ↓
3. Browser: WebAuthn assertion prompt
4. User completes passkey assertion
  ↓
5. POST /auth/login-verify (assertion)
6. Backend verifies assertion with stored passkey
7. Return JWT token
  ↓
8. Store token in sessionStorage
9. User authenticated
```

### Online Status

```
User A Login
  ↓
1. Create user_session record
2. Socket.io connection ID stored
3. Broadcast "user:online" to friends
  ↓
All listening clients
  ↓
4. Add User A to online list
5. Show green indicator
6. Update presence UI

User A Logout / Timeout
  ↓
7. Delete user_session record
8. Broadcast "user:offline"
  ↓
All listening clients
  ↓
9. Remove User A from online list
10. Hide green indicator
```

### Ollama Chatbot Integration

```
Available:
1. Backend polls Ollama API: GET http://ollama:11434/api/tags
2. Store available models in memory
3. When user sends message to chatbot:
  ↓
4. POST http://ollama:11434/api/generate (streaming)
5. Stream response chunks to frontend via WebSocket
6. Frontend displays streaming response
7. Save completed message to database

Unavailable:
1. Ollama API not responding (timeout or 500 error)
2. Set ollama_available = false
3. Show "Chatbot Offline" in UI
4. Disable message input to chatbot
```

## Security Architecture

### Encryption Layers

```
Message Content
  ↓ (TweetNaCl XSalsa20)
Encrypted Plaintext
  ↓
Session Key
  ↓ (TweetNaCl Box - asymmetric)
Encrypted Session Key
  ↓
Database (at rest encryption optional)
Encrypted Message
```

### Authentication & Authorization

```
Passkey Registration
  ↓
Store public key in database
Credential ID stored (unique per device)
  ↓
Login Challenge
  ↓ Backend generates random challenge
  ↓
Browser + Passkey Hardware
  ↓
Sign challenge with private key
  ↓
Backend verifies signature
Increment sign_count (clone detection)
Return JWT token
```

## Scaling Considerations

### Horizontal Scaling

```
Load Balancer (Nginx)
  ↓
├── Backend Server 1
├── Backend Server 2
└── Backend Server 3
  ↓
PostgreSQL (Primary)
  ├── Read Replicas
  └── Backup

Socket.io with Redis Adapter:
Server 1 <-- Redis Pub/Sub --> Server 2
    ↑                              ↑
    └──── Shared Session State ────┘
```

### Database Optimization

```
Indexing Strategy:
- users.email (unique, frequently queried)
- messages.sender_id, recipient_id (conversation lookups)
- messages.created_at (pagination)
- user_sessions.user_id (online status)

Connection Pooling:
- Min: 5
- Max: 20
- Idle timeout: 30s

Query Optimization:
- Use prepared statements
- Batch inserts/updates
- Pagination for large datasets
```

## Deployment Architecture

```
┌──────────────────────────────────────┐
│      Ubuntu Server 20.04+            │
├──────────────────────────────────────┤
│         Docker & Docker Compose      │
│                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐│
│  │ Nginx  │  │Node.js │  │Postgres││
│  │ (Port  │  │Backend │  │Database ││
│  │80/443) │  │(3000)  │  │(5432)  ││
│  └────────┘  └────────┘  └────────┘│
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Optional: Ollama Container    │ │
│  │  (GPU support available)       │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## Performance Targets

- **API Response Time**: < 200ms (p95)
- **WebSocket Latency**: < 100ms
- **Message Delivery**: < 500ms end-to-end
- **Database Query**: < 50ms (p95)
- **Service Worker Load**: < 1s
- **Concurrent Users**: 1000+ per instance

## Monitoring & Logging

```
Application Logs → Winston Logger
  ↓
├── Console (development)
├── File (production)
└── Elasticsearch (optional)

Metrics → Prometheus (optional)
  ↓
├── API response times
├── Database query times
├── WebSocket connections
└── Error rates

Tracing → Open Telemetry (optional)
  ↓
Track request flow through system
Identify bottlenecks
```
