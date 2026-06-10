# API Documentation

## Base URL

- **Production**: `https://yourdomain.com/api`
- **Development**: `http://localhost:3000/api`

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Passkey authentication uses WebAuthn flow with challenge/response.

## Response Format

All responses are JSON:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2024-06-10T12:00:00Z"
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {}
  },
  "timestamp": "2024-06-10T12:00:00Z"
}
```

## Endpoints

### Authentication

#### POST /auth/register

Create a new account (invite-only).

**Request:**
```json
{
  "email": "user@example.com",
  "inviteToken": "one-time-invite-link",
  "nickname": "john_doe"
}
```

**Response:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "requiresEmailVerification": true,
  "verificationSent": true
}
```

**Status:** 201 Created

---

#### POST /auth/verify-email

Verify email with token.

**Request:**
```json
{
  "userId": "uuid",
  "token": "verification-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Status:** 200 OK

---

#### POST /auth/register-passkey

Register WebAuthn passkey.

**Request:**
```json
{
  "userId": "uuid",
  "credential": {
    "id": "credential-id",
    "rawId": "base64-encoded-raw-id",
    "response": {
      "clientDataJSON": "base64",
      "attestationObject": "base64"
    },
    "type": "public-key"
  }
}
```

**Response:**
```json
{
  "success": true,
  "passkeyId": "uuid",
  "message": "Passkey registered"
}
```

**Status:** 201 Created

---

#### POST /auth/login-challenge

Get WebAuthn challenge for login.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "challenge": "base64-challenge",
  "timeout": 60000,
  "rpId": "yourdomain.com",
  "userVerification": "preferred"
}
```

**Status:** 200 OK

---

#### POST /auth/login-verify

Verify WebAuthn assertion and authenticate.

**Request:**
```json
{
  "email": "user@example.com",
  "assertion": {
    "id": "credential-id",
    "rawId": "base64",
    "response": {
      "clientDataJSON": "base64",
      "authenticatorData": "base64",
      "signature": "base64"
    }
  }
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "john_doe",
    "avatar": "base64-or-null"
  },
  "expiresIn": 86400
}
```

**Status:** 200 OK

---

#### POST /auth/logout

Logout user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Status:** 200 OK

---

### Users

#### GET /users/profile

Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "nickname": "john_doe",
  "avatar": "base64-string-or-null",
  "emailVerified": true,
  "canInvite": false,
  "lastActive": "2024-06-10T12:00:00Z",
  "createdAt": "2024-06-10T12:00:00Z"
}
```

**Status:** 200 OK

---

#### PUT /users/profile

Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "nickname": "new_nickname",
  "avatar": "base64-image-data"
}
```

**Response:** Same as GET /users/profile

**Status:** 200 OK

---

#### GET /users/:userId

Get public user info (for UI display).

**Response:**
```json
{
  "id": "uuid",
  "nickname": "john_doe",
  "avatar": "base64-or-null",
  "isOnline": true
}
```

**Status:** 200 OK

---

#### GET /users/search

Search for users by nickname.

**Query Parameters:**
- `q`: Search query (min 3 chars)
- `limit`: Max results (default 20)

**Response:**
```json
[
  {
    "id": "uuid",
    "nickname": "john_doe",
    "avatar": "base64-or-null",
    "isOnline": true
  }
]
```

**Status:** 200 OK

---

### Messages

#### GET /messages/conversations

Get list of conversations.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit`: Results per page (default 20)
- `offset`: Pagination offset (default 0)

**Response:**
```json
[
  {
    "conversationId": "uuid",
    "withUser": {
      "id": "uuid",
      "nickname": "john_doe",
      "avatar": "base64-or-null",
      "isOnline": true
    },
    "lastMessage": "Latest encrypted message",
    "lastMessageAt": "2024-06-10T12:00:00Z",
    "unreadCount": 0
  }
]
```

**Status:** 200 OK

---

#### GET /messages/:userId

Get conversation with specific user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit`: Messages to fetch (default 50)
- `before`: Fetch messages before this timestamp (pagination)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "senderId": "uuid",
      "recipientId": "uuid",
      "encryptedContent": "base64",
      "encryptedKey": "base64",
      "nonce": "base64",
      "createdAt": "2024-06-10T12:00:00Z"
    }
  ],
  "hasMore": true
}
```

**Status:** 200 OK

---

#### POST /messages

Send a message.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "recipientId": "uuid",
  "encryptedContent": "base64",
  "encryptedKey": "base64",
  "nonce": "base64"
}
```

**Response:**
```json
{
  "id": "uuid",
  "senderId": "uuid",
  "recipientId": "uuid",
  "createdAt": "2024-06-10T12:00:00Z"
}
```

**Status:** 201 Created

---

#### DELETE /messages/:messageId

Delete a message.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Message deleted"
}
```

**Status:** 200 OK

---

### Invites

#### POST /invites/create

Generate a new invite link.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "token": "unique-invite-token",
  "link": "https://yourdomain.com/invite/unique-invite-token",
  "expiresAt": "2024-07-10T12:00:00Z"
}
```

**Status:** 201 Created

---

#### GET /invites/validate/:token

Validate an invite token.

**Response:**
```json
{
  "valid": true,
  "createdBy": "john_doe",
  "expiresAt": "2024-07-10T12:00:00Z"
}
```

**Status:** 200 OK

---

### Ollama Chatbot

#### GET /ollama/status

Check Ollama availability.

**Response:**
```json
{
  "available": true,
  "models": [
    {
      "name": "mistral",
      "size": "4.1gb",
      "modifiedAt": "2024-06-10T12:00:00Z"
    }
  ]
}
```

**Status:** 200 OK

---

#### GET /ollama/chats

Get all chat sessions.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Project Ideas",
    "model": "mistral",
    "isActive": true,
    "createdAt": "2024-06-10T12:00:00Z"
  }
]
```

**Status:** 200 OK

---

#### POST /ollama/chats

Create new chat.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "model": "mistral"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": null,
  "model": "mistral",
  "isActive": true,
  "createdAt": "2024-06-10T12:00:00Z"
}
```

**Status:** 201 Created

---

#### GET /ollama/chats/:chatId

Get chat messages.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit`: Messages to fetch (default 50)

**Response:**
```json
{
  "chatId": "uuid",
  "title": "Project Ideas",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Tell me about Vue.js",
      "createdAt": "2024-06-10T12:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Vue.js is a progressive...",
      "createdAt": "2024-06-10T12:00:01Z"
    }
  ]
}
```

**Status:** 200 OK

---

#### POST /ollama/chats/:chatId/message

Send message to chatbot.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "content": "What is Vue.js?"
}
```

**Response (SSE - Server-Sent Events):**
```
data: {"role":"assistant","content":"Vue.js "}
data: {"role":"assistant","content":"is a "}
data: [DONE]
```

**Status:** 200 OK

---

### Blocked Users

#### POST /users/block/:userId

Block a user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "blockedUserId": "uuid"
}
```

**Status:** 200 OK

---

#### DELETE /users/block/:userId

Unblock a user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true
}
```

**Status:** 200 OK

---

#### GET /users/blocked

Get list of blocked users.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "uuid",
    "nickname": "spammer",
    "blockedAt": "2024-06-10T12:00:00Z"
  }
]
```

**Status:** 200 OK

---

## WebSocket Events

Socket.io events for real-time communication.

### Client → Server

#### `message:send`
Send a message via WebSocket (faster than HTTP).
```javascript
socket.emit('message:send', {
  recipientId: 'uuid',
  encryptedContent: 'base64',
  encryptedKey: 'base64',
  nonce: 'base64'
});
```

#### `user:online`
Announce user is online.
```javascript
socket.emit('user:online');
```

#### `user:typing`
Send typing indicator.
```javascript
socket.emit('user:typing', { recipientId: 'uuid' });
```

#### `ollama:message`
Send message to Ollama (streaming).
```javascript
socket.emit('ollama:message', {
  chatId: 'uuid',
  content: 'What is AI?'
});
```

### Server → Client

#### `message:received`
New message received.
```javascript
socket.on('message:received', {
  id: 'uuid',
  senderId: 'uuid',
  encryptedContent: 'base64',
  createdAt: '2024-06-10T12:00:00Z'
});
```

#### `user:online`
User came online.
```javascript
socket.on('user:online', { userId: 'uuid' });
```

#### `user:offline`
User went offline.
```javascript
socket.on('user:offline', { userId: 'uuid' });
```

#### `user:typing`
User is typing.
```javascript
socket.on('user:typing', { userId: 'uuid' });
```

#### `ollama:chunk`
Streaming response from Ollama.
```javascript
socket.on('ollama:chunk', {
  chatId: 'uuid',
  content: 'Vue.js is a '
});
```

#### `ollama:done`
Ollama response complete.
```javascript
socket.on('ollama:done', {
  chatId: 'uuid',
  messageId: 'uuid'
});
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_EMAIL` | 400 | Email format invalid |
| `EMAIL_ALREADY_EXISTS` | 409 | Email already registered |
| `INVALID_INVITE_TOKEN` | 400 | Invite token invalid or expired |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `INVALID_CREDENTIALS` | 401 | Credentials verification failed |
| `PASSKEY_NOT_FOUND` | 404 | Passkey not registered |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `MESSAGE_NOT_FOUND` | 404 | Message not found |
| `UNAUTHORIZED` | 401 | Token missing or invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **Message endpoints**: 100 messages per minute per user

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1623341280
```

---

## Examples

### JavaScript/Fetch

```javascript
// Login with passkey
const challenge = await fetch('/api/auth/login-challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
}).then(r => r.json());

// Verify assertion
const { token } = await fetch('/api/auth/login-verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, assertion })
}).then(r => r.json());

// Authenticated request
const profile = await fetch('/api/users/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

### cURL

```bash
# Get status
curl https://yourdomain.com/api/ollama/status

# Get profile (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://yourdomain.com/api/users/profile
```
