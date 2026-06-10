# Database Schema Documentation

## Overview

The application uses PostgreSQL with the following core entities:

```
Users
├── Passkeys (WebAuthn credentials)
├── Email Verification Tokens
├── Invite Links
├── User Sessions (online status)
├── Blocked Users
├── Messages (with encryption)
├── Ollama Chats
└── Ollama Messages
```

## Tables

### users

Core user account information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  avatar_base64 TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  can_invite BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id`: Unique user identifier (UUID)
- `email`: User email (unique, verified before access)
- `nickname`: Display name (unique)
- `avatar_base64`: Profile picture as base64 string
- `email_verified`: Email verification status
- `is_active`: Account status
- `can_invite`: Permission to create invite links
- `last_active`: Last activity timestamp for presence

**Indexes:**
- email
- nickname

### passkeys

WebAuthn credentials for passwordless authentication.

```sql
CREATE TABLE passkeys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  credential_id BYTEA UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  sign_count INTEGER DEFAULT 0,
  transports TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `credential_id`: Public key credential ID
- `public_key`: Stored public key for verification
- `sign_count`: Counter for cloned credential detection
- `transports`: Available transports (usb, nfc, ble, internal)

**Indexes:**
- user_id
- credential_id (unique for rapid lookup)

### email_verification_tokens

One-time tokens for email verification.

```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `token`: Random verification token
- `expires_at`: Token expiration (typically 24 hours)

**Indexes:**
- user_id
- token (unique for quick lookup)

**Lifecycle:** Deleted after verification or expiration.

### invite_links

One-time use invite links for account creation.

```sql
CREATE TABLE invite_links (
  id UUID PRIMARY KEY,
  created_by_id UUID NOT NULL REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by_id UUID REFERENCES users(id),
  used_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `token`: Unique invite code
- `is_used`: Link consumed
- `used_by_id`: User who registered with link
- `expires_at`: Link expiration (typically 30 days)

**Indexes:**
- created_by_id
- token (unique)

### messages

End-to-end encrypted messages between users.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  encrypted_content TEXT NOT NULL,
  encrypted_key BYTEA NOT NULL,
  nonce BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `encrypted_content`: Message encrypted with recipient's public key
- `encrypted_key`: Session key encrypted with recipient's passkey
- `nonce`: Random nonce for encryption (NaCl format)

**Security Notes:**
- Content is encrypted using TweetNaCl.js (NaCl)
- Each message uses unique nonce to prevent replay attacks
- Only sender and recipient can decrypt content

**Indexes:**
- sender_id
- recipient_id
- (sender_id, recipient_id) for conversation queries
- created_at for chronological ordering

**Data Retention:** Messages are never auto-deleted (user decision).

### user_sessions

Tracks active user sessions for online status.

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  socket_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `socket_id`: Socket.io connection ID
- `is_active`: Session active status
- `last_activity`: Last activity timestamp (for timeout detection)

**Indexes:**
- user_id
- is_active (for presence queries)

**Lifecycle:** Session created on login, deleted on logout or timeout (> 1 hour).

### blocked_users

Users blocked from messaging.

```sql
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  blocked_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);
```

**Fields:**
- `user_id`: User doing the blocking
- `blocked_user_id`: Blocked user ID

**Indexes:**
- user_id

**Notes:**
- Prevents receiving messages from blocked users
- Bidirectional blocking not required (A blocks B ≠ B blocked)

### ollama_chats

Chat sessions with Ollama chatbot.

```sql
CREATE TABLE ollama_chats (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  model VARCHAR(100) DEFAULT 'mistral',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `title`: Chat session title (auto-generated from first message)
- `model`: Ollama model used
- `is_active`: Archive status

**Indexes:**
- user_id

### ollama_messages

Messages in Ollama chat sessions.

```sql
CREATE TABLE ollama_messages (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES ollama_chats(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `role`: 'user' or 'assistant'
- `content`: Message text (not encrypted, local to user)

**Indexes:**
- chat_id

## Encryption Details

### Message Encryption (NaCl)

Messages use NaCl secret-box encryption:

```
plaintext → [sealed with recipient's public key] → encrypted_content
session_key → [encrypted with passkey] → encrypted_key
random_nonce → [stored] → nonce
```

Recipient decryption:
```
nonce + encrypted_content → [open with shared secret] → plaintext
```

**Security:**
- XSalsa20 stream cipher
- Poly1305 authenticator
- 256-bit keys

## Migrations

Database migrations are managed in `backend/db/migrations/`:

```bash
# Run migrations
npm run migrate

# Create new migration
node src/db/createMigration.js description-of-change
```

## Backup & Recovery

### Backup PostgreSQL

```bash
# Full backup
pg_dump -U messaging_user messaging_app > backup.sql

# Docker backup
docker exec pwa-messaging-db pg_dump -U messaging_user messaging_app > backup.sql

# Restore
psql -U messaging_user messaging_app < backup.sql
```

### Automated Backups (Docker)

Add to `docker-compose.yml`:

```yaml
backup:
  image: postgres:15-alpine
  command: >
    sh -c 'pg_dump -h postgres -U $$DB_USER $$DB_NAME > /backups/dump-$(date +\%Y\%m\%d-\%H\%M\%S).sql'
  environment:
    DB_USER: ${DB_USER}
    DB_NAME: ${DB_NAME}
    PGPASSWORD: ${DB_PASSWORD}
  volumes:
    - ./backups:/backups
```

## Performance Optimization

### Connection Pooling

Use PgBouncer for production:

```ini
[databases]
messaging_app = host=localhost port=5432 dbname=messaging_app

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
```

### Slow Query Logging

```sql
SET log_min_duration_statement = 1000; -- Log queries > 1 second
```

### Index Analysis

```sql
-- Find unused indexes
SELECT indexrelname, idx_scan FROM pg_stat_user_indexes 
WHERE idx_scan = 0 ORDER BY pg_relation_size(indexrelid) DESC;

-- Analyze table
ANALYZE users;

-- Check index size
SELECT schemaname, tablename, indexname, 
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_indexes
WHERE schemaname != 'pg_catalog'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Data Retention Policy

| Table | Retention | Notes |
|-------|-----------|-------|
| messages | Indefinite | User can delete |
| user_sessions | 1 hour | Auto-cleanup on timeout |
| email_verification_tokens | 24 hours | Auto-delete after expiration |
| invite_links | 30 days | Auto-delete after expiration |
| ollama_messages | Indefinite | User can delete chat |

## Privacy Considerations

- Messages encrypted at rest
- User IPs not logged
- No read receipts tracking
- Minimal metadata logged
- GDPR compliant (with adjustments per jurisdiction)

## Disaster Recovery

### Point-in-Time Recovery

```sql
-- Restore as of specific time
pg_ctl -D /path/to/pgdata stop
cp wal_archive/000000010000000000000001 pg_wal/
pg_ctl -D /path/to/pgdata start
```

### Common Issues

**Corrupted index:**
```sql
REINDEX INDEX index_name;
```

**Full disk:**
```sql
-- Find largest tables
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum to reclaim space
VACUUM FULL ANALYZE;
```
