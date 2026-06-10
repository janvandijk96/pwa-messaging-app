# Production Deployment Guide

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] SSL/TLS certificate obtained (Let's Encrypt)
- [ ] Database backups tested
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Monitoring & logging configured
- [ ] Incident response plan documented
- [ ] Firewall rules configured
- [ ] Domain DNS configured
- [ ] Email service API keys set

## Ubuntu Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git gnupg2 software-properties-common

# Set timezone
sudo timedatectl set-timezone UTC

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Install Docker & Docker Compose

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose (already included in newer Docker versions)
docker compose version

# Reboot for group changes
sudo reboot
```

### 3. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Automatic renewal (already set up by certbot)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Copy certificates to app directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./certs/certificate.crt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./certs/private.key
sudo chown $USER:$USER ./certs/*.pem
```

### 4. Clone Repository

```bash
# Clone repo
git clone https://github.com/janvandijk96/pwa-messaging-app.git
cd pwa-messaging-app

# Create necessary directories
mkdir -p certs backups logs

# Set permissions
chmod 700 certs
```

## Environment Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Server
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messaging_app
DB_USER=messaging_user
DB_PASSWORD=VERY_SECURE_PASSWORD_HERE
DB_POOL_MAX=20

# Authentication
JWT_SECRET=VERY_LONG_RANDOM_SECRET_HERE_MIN_32_CHARS
JWT_EXPIRY=24h
PASSKEY_RP_ID=yourdomain.com
PASSKEY_RP_NAME=Your App Name
PASSKEY_ORIGIN=https://yourdomain.com

# Frontend
FRONTEND_URL=https://yourdomain.com

# Email Service (SendGrid)
EMAIL_SERVICE=sendgrid
EMAIL_FROM=noreply@yourdomain.com
SENDGRID_API_KEY=SG.your_sendgrid_key_here

# Ollama Chatbot
OLLAMA_API_URL=http://ollama:11434
OLLAMA_MODEL=mistral
OLLAMA_TIMEOUT=30000

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=https://yourdomain.com/api
VITE_SOCKET_URL=https://yourdomain.com
VITE_APP_NAME=Your App Name
VITE_APP_SHORT_NAME=YourApp
VITE_APP_DESCRIPTION=Your app description
VITE_ENABLE_NOTIFICATIONS=true
VITE_RP_ID=yourdomain.com
VITE_RP_NAME=Your App Name
VITE_ORIGIN=https://yourdomain.com
VITE_INACTIVITY_TIMEOUT=3600000
```

## Docker Deployment

### 1. Prepare docker-compose.yml

```bash
# Ensure docker-compose.yml is correct for production
# (provided in repo, minimal changes needed)
```

### 2. Initialize Database

```bash
# Start only database first
docker compose up -d postgres

# Wait for database to be ready
sleep 10

# Check database
docker compose logs postgres
```

### 3. Deploy Application

```bash
# Build and start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```

### 4. Verify Deployment

```bash
# Check health endpoints
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health

# Check logs for errors
docker compose logs backend | grep ERROR

# Test API
curl -X GET https://yourdomain.com/api/ollama/status
```

## Backup & Restore

### Automated Database Backups

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DB_CONTAINER="pwa-messaging-db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec $DB_CONTAINER pg_dump \
  -U messaging_user \
  messaging_app | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"
EOF

chmod +x backup.sh

# Schedule with cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/user/backup.sh") | crontab -

# Or use systemd timer
sudo tee /etc/systemd/system/db-backup.service << EOF
[Unit]
Description=Database Backup
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/home/user/backup.sh
User=user
EOF

sudo tee /etc/systemd/system/db-backup.timer << EOF
[Unit]
Description=Daily Database Backup
Requires=db-backup.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable db-backup.timer
sudo systemctl start db-backup.timer
```

### Restore from Backup

```bash
# Restore database
gunzip < backups/backup_20240610_020000.sql.gz | \
  docker exec -i pwa-messaging-db psql -U messaging_user -d messaging_app

# Verify restoration
docker compose exec postgres psql -U messaging_user -d messaging_app \
  -c "SELECT COUNT(*) as user_count FROM users;"
```

## Monitoring & Logging

### System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Real-time monitoring
docker compose stats

# Resource limits in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Log Aggregation

```bash
# View all logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# Filter by service
docker compose logs backend -f --tail=100

# Export logs
docker compose logs > logs/app.log

# Setup log rotation
cat > /etc/logrotate.d/docker-compose << EOF
/home/user/pwa-messaging-app/logs/*.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  missingok
}
EOF
```

### Application Logs

```bash
# Inside container, logs go to /app/logs/app.log
# Mount as volume: ./logs:/app/logs

# View logs on host
tail -f logs/app.log
tail -f logs/app.log | grep ERROR
```

## Performance Optimization

### Database Optimization

```bash
# Connect to database
docker compose exec postgres psql -U messaging_user -d messaging_app

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM messages WHERE sender_id = 'uuid';

# Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0;

# Vacuum and analyze
VACUUM ANALYZE;
```

### Caching Strategy

```nginx
# In nginx.conf - cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# API responses (typically not cached)
location /api/ {
  add_header Cache-Control "no-cache, must-revalidate";
}
```

### WebSocket Optimization

```javascript
// Adjust Socket.io settings for production
io.set('transports', ['websocket', 'polling']);
io.set('pingInterval', 25000);
io.set('pingTimeout', 60000);

// Redis adapter for multi-server scaling
const redis = require('socket.io-redis');
io.adapter(redis({ host: 'localhost', port: 6379 }));
```

## Scaling for Production

### Horizontal Scaling

```yaml
# docker-compose.yml with multiple backend instances
version: '3.8'

services:
  nginx:
    # Load balancer routing to multiple backends
    depends_on:
      - backend-1
      - backend-2
      - backend-3

  backend-1:
    build: ./backend
    environment:
      PORT: 3001
    depends_on:
      - postgres
      - redis

  backend-2:
    build: ./backend
    environment:
      PORT: 3002
    depends_on:
      - postgres
      - redis

  backend-3:
    build: ./backend
    environment:
      PORT: 3003
    depends_on:
      - postgres
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

```nginx
# nginx.conf load balancing
upstream backend {
  least_conn;
  server backend-1:3001;
  server backend-2:3002;
  server backend-3:3003;
}

server {
  location /api/ {
    proxy_pass http://backend;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Verify network
docker network ls
docker network inspect pwa-messaging-app_app-network

# Check disk space
df -h

# Restart services
docker compose down
docker compose up -d
```

### Database Connection Errors

```bash
# Check database health
docker compose exec postgres pg_isready -U messaging_user

# Verify credentials
docker compose exec postgres psql -U messaging_user -d messaging_app -c "SELECT 1;"

# Check network connectivity
docker compose exec backend ping postgres
```

### High Memory Usage

```bash
# Check memory usage
docker compose stats

# Find memory leaks
docker compose logs backend | grep -i memory

# Increase limits or restart
docker compose down
docker compose up -d
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in certs/certificate.crt -text -noout

# Check certificate expiry
openssl x509 -in certs/certificate.crt -noout -dates

# Test SSL
curl -I https://yourdomain.com
openssl s_client -connect yourdomain.com:443

# Renew certificate
sudo certbot renew --force-renewal
```

## Maintenance

### Regular Tasks

```bash
# Weekly
docker compose logs | tail -100 | grep ERROR
df -h  # Check disk space

# Monthly
docker image prune -a  # Remove unused images
docker volume prune    # Remove unused volumes
docker system df       # Check Docker usage

# Quarterly
npm audit (in backend and frontend)
Update dependencies if needed
Security audit

# Yearly
Penetration testing
Performance review
Disaster recovery drill
```

### Update Strategy

```bash
# Test updates on staging first
# Then update production during maintenance window

# Update application
git fetch origin
git checkout main
git pull origin main

# Rebuild containers
docker compose down
docker compose build
docker compose up -d

# Verify
docker compose logs backend | head -20
curl https://yourdomain.com/api/health
```

## Disaster Recovery Plan

### Backup Verification

```bash
# Monthly backup restore test
# On test server:
docker compose down
docker compose up -d postgres
gunzip < backups/backup_latest.sql.gz | \
  docker exec -i test-db psql -U messaging_user -d messaging_app
# Verify data integrity
docker compose exec postgres psql -U messaging_user -d messaging_app \
  -c "SELECT COUNT(*) FROM users;"
```

### Recovery Time Objectives (RTO)

- **Total failure**: < 4 hours (from backup)
- **Database corruption**: < 1 hour
- **Service crash**: < 5 minutes (auto-restart)

### Recovery Point Objectives (RPO)

- **Database**: 6-hour backups (can improve with WAL archiving)
- **Files**: Real-time with persistent volumes

## Security Hardening

### Additional Security Measures

```bash
# Fail2Ban for DDoS protection
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# UFW rules with rate limiting
sudo ufw limit 22/tcp
sudo ufw limit 80/tcp
sudo ufw limit 443/tcp

# Regular security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Metrics & Reporting

### Key Metrics to Monitor

- Uptime: > 99.5%
- API response time: < 200ms p95
- Database query time: < 50ms p95
- WebSocket latency: < 100ms
- Error rate: < 0.1%
- Concurrent users: Scale as needed

### Monthly Report Template

```markdown
# Production Deployment Report - June 2024

## Uptime
- Total uptime: 99.8%
- Incidents: 0
- Planned maintenance: 2 hours

## Performance
- Avg API response: 45ms
- Avg DB query: 12ms
- P95 response: 180ms

## Capacity
- Avg concurrent users: 250
- Peak concurrent users: 450
- Database size: 2.3GB

## Security
- Failed logins blocked: 127
- Rate limits triggered: 8
- Vulnerabilities found: 0

## Backups
- Daily backups: 30 successful
- Backup size: 450MB/day
- Restore tested: Yes

## Recommendations
- Consider horizontal scaling if users exceed 500 concurrent
- Database optimization for message queries showing in slow log
```

---

For more detailed information, see:
- [Architecture Documentation](ARCHITECTURE.md)
- [Database Documentation](DATABASE.md)
- [Security Guidelines](SECURITY.md)
