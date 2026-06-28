# Deployment & Configuration Guide

## Overview

This guide covers deploying the Mint Experiment Site to production with proper security, privacy, and performance configurations.

---

## 1. Pre-Deployment Checklist

### 1.1 Security Review
- [ ] All secrets removed from code
- [ ] All environment variables configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] HTTPS certificate installed
- [ ] Database backups enabled
- [ ] Audit logging enabled
- [ ] Error handling configured

### 1.2 Testing
- [ ] All 51 unit tests passing
- [ ] Integration tests passing
- [ ] Security tests passing
- [ ] Load testing completed
- [ ] Performance testing completed
- [ ] Accessibility testing completed

### 1.3 Documentation
- [ ] Security documentation complete
- [ ] Privacy policy published
- [ ] API documentation complete
- [ ] Deployment runbook prepared
- [ ] Incident response plan ready
- [ ] Disaster recovery plan ready

---

## 2. Environment Configuration

### 2.1 Required Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=mysql://user:password@host:3306/database

# Email Service
EMAIL_SERVICE_PROVIDER=sendgrid
EMAIL_API_KEY=sg_xxxxx
EMAIL_FROM_ADDRESS=noreply@example.com

# Blockchain
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/xxxxx
CONTRACT_ADDRESS=0x...
MINTING_PRIVATE_KEY=0x...

# Security
JWT_SECRET=xxxxx (generate with: openssl rand -hex 32)
SESSION_TIMEOUT=1800
RATE_LIMIT_WINDOW=3600
RATE_LIMIT_MAX_REQUESTS=100

# OAuth
OAUTH_SERVER_URL=https://oauth.example.com

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### 2.2 Generate Secure Secrets

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate database password
openssl rand -base64 32

# Generate API keys (use your service provider)
# SendGrid: https://app.sendgrid.com/settings/api_keys
# Alchemy: https://dashboard.alchemy.com/
```

### 2.3 Environment-Specific Configuration

#### Development
```bash
NODE_ENV=development
HTTPS_ONLY=false
RATE_LIMIT_MAX_REQUESTS=1000
LOG_LEVEL=debug
```

#### Staging
```bash
NODE_ENV=production
HTTPS_ONLY=true
RATE_LIMIT_MAX_REQUESTS=500
LOG_LEVEL=info
```

#### Production
```bash
NODE_ENV=production
HTTPS_ONLY=true
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=warn
```

---

## 3. Database Setup

### 3.1 MySQL Configuration

```sql
-- Create database
CREATE DATABASE mint_experiment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'mint_user'@'localhost' IDENTIFIED BY 'strong_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON mint_experiment.* TO 'mint_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3.2 Run Migrations

```bash
# Generate migrations
pnpm db:push

# Verify migrations
mysql -u mint_user -p mint_experiment < drizzle/migrations.sql
```

### 3.3 Backup Configuration

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mysqldump -u mint_user -p mint_experiment > $BACKUP_DIR/mint_$TIMESTAMP.sql
gzip $BACKUP_DIR/mint_$TIMESTAMP.sql

# Retention: Keep last 30 days
find $BACKUP_DIR -name "mint_*.sql.gz" -mtime +30 -delete
```

---

## 4. HTTPS & SSL Configuration

### 4.1 SSL Certificate

#### Using Let's Encrypt
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d example.com -d www.example.com

# Certificate location
# /etc/letsencrypt/live/example.com/fullchain.pem
# /etc/letsencrypt/live/example.com/privkey.pem
```

#### Using Commercial Certificate
```bash
# Copy certificate files
cp /path/to/certificate.crt /etc/ssl/certs/
cp /path/to/private.key /etc/ssl/private/
```

### 4.2 Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}
```

### 4.3 Certificate Renewal

```bash
# Automatic renewal with Certbot
sudo certbot renew --quiet --no-eff-email

# Add to crontab
0 3 * * * /usr/bin/certbot renew --quiet --no-eff-email
```

---

## 5. Application Deployment

### 5.1 Build Process

```bash
# Install dependencies
pnpm install

# Run type checking
pnpm check

# Run tests
pnpm test

# Build application
pnpm build
```

### 5.2 Systemd Service

```ini
# /etc/systemd/system/mint-experiment.service
[Unit]
Description=Mint Experiment Site
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mint-experiment
Environment="NODE_ENV=production"
EnvironmentFile=/opt/mint-experiment/.env
ExecStart=/usr/bin/node /opt/mint-experiment/dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 5.3 Start Service

```bash
# Enable service
sudo systemctl enable mint-experiment

# Start service
sudo systemctl start mint-experiment

# Check status
sudo systemctl status mint-experiment

# View logs
sudo journalctl -u mint-experiment -f
```

---

## 6. Monitoring & Logging

### 6.1 Application Logs

```bash
# View application logs
tail -f /var/log/mint-experiment/app.log

# View error logs
tail -f /var/log/mint-experiment/error.log

# View audit logs
tail -f /var/log/mint-experiment/audit.log
```

### 6.2 System Monitoring

```bash
# CPU and Memory
top -u www-data

# Disk usage
df -h

# Network connections
netstat -tulpn | grep node

# Open files
lsof -p $(pgrep -f "node.*index.js")
```

### 6.3 Sentry Integration (Optional)

```typescript
// server/_core/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

## 7. Performance Optimization

### 7.1 Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_wallets_userId ON wallets(userId);
CREATE INDEX idx_mint_requests_userId ON mint_requests(userId);
CREATE INDEX idx_transactions_requestId ON transactions(requestId);

-- Analyze tables
ANALYZE TABLE users;
ANALYZE TABLE verification_codes;
ANALYZE TABLE wallets;
ANALYZE TABLE mint_requests;
ANALYZE TABLE transactions;
```

### 7.2 Caching

```typescript
// Redis caching (optional)
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

// Cache user data
const cacheKey = `user:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

### 7.3 Load Balancing

```nginx
# Nginx upstream configuration
upstream mint_app {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    location / {
        proxy_pass http://mint_app;
    }
}
```

---

## 8. Backup & Disaster Recovery

### 8.1 Database Backups

```bash
#!/bin/bash
# Daily backup script
BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
mysqldump -u mint_user -p${DB_PASSWORD} mint_experiment | gzip > $BACKUP_DIR/mint_$TIMESTAMP.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/mint_$TIMESTAMP.sql.gz s3://backups/mint/

# Cleanup old backups
find $BACKUP_DIR -name "mint_*.sql.gz" -mtime +30 -delete
```

### 8.2 Application Backups

```bash
# Backup application code
tar -czf /backups/app/mint_$(date +%Y%m%d).tar.gz /opt/mint-experiment

# Upload to S3
aws s3 cp /backups/app/mint_$(date +%Y%m%d).tar.gz s3://backups/app/
```

### 8.3 Disaster Recovery Plan

1. **Database Failure**
   - Restore from latest backup
   - Verify data integrity
   - Update DNS if needed
   - Monitor for issues

2. **Application Failure**
   - Restart service
   - Check logs for errors
   - Rollback if necessary
   - Notify users

3. **Security Breach**
   - Isolate affected systems
   - Investigate incident
   - Reset credentials
   - Notify users
   - Deploy patch

---

## 9. Monitoring & Alerting

### 9.1 Health Checks

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

### 9.2 Monitoring Script

```bash
#!/bin/bash
# Monitor application health
while true; do
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
  
  if [ "$response" != "200" ]; then
    echo "Health check failed: $response"
    systemctl restart mint-experiment
    # Send alert
    curl -X POST https://alerts.example.com/notify \
      -d "service=mint-experiment&status=down"
  fi
  
  sleep 60
done
```

---

## 10. Rollback Procedure

### 10.1 Version Control

```bash
# Tag releases
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# View tags
git tag -l

# Checkout specific version
git checkout v1.0.0
```

### 10.2 Rollback Steps

```bash
# 1. Stop current version
sudo systemctl stop mint-experiment

# 2. Checkout previous version
cd /opt/mint-experiment
git checkout v0.9.9

# 3. Install dependencies
pnpm install

# 4. Build application
pnpm build

# 5. Start service
sudo systemctl start mint-experiment

# 6. Verify
curl http://localhost:3000/health
```

---

## 11. Scaling Strategy

### 11.1 Horizontal Scaling

```bash
# Run multiple instances
NODE_ENV=production node dist/index.js &
NODE_ENV=production node dist/index.js &
NODE_ENV=production node dist/index.js &

# Load balance with Nginx
# See section 7.3
```

### 11.2 Vertical Scaling

- Increase server RAM
- Upgrade CPU
- Increase disk space
- Upgrade network bandwidth

### 11.3 Database Scaling

```sql
-- Read replicas
-- Master-slave replication for read scaling

-- Partitioning
-- Partition large tables by date or user ID

-- Sharding
-- Distribute data across multiple database servers
```

---

## 12. Maintenance Schedule

### 12.1 Daily Tasks
- [ ] Monitor application logs
- [ ] Check system health
- [ ] Verify backups completed
- [ ] Monitor security alerts

### 12.2 Weekly Tasks
- [ ] Review audit logs
- [ ] Check database performance
- [ ] Update security patches
- [ ] Test disaster recovery

### 12.3 Monthly Tasks
- [ ] Security audit
- [ ] Performance review
- [ ] Dependency updates
- [ ] Capacity planning

### 12.4 Quarterly Tasks
- [ ] Full security assessment
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Architecture review

---

## 13. Troubleshooting

### 13.1 Application Won't Start

```bash
# Check logs
journalctl -u mint-experiment -n 50

# Check environment variables
env | grep MINT

# Check port availability
netstat -tulpn | grep 3000

# Check file permissions
ls -la /opt/mint-experiment
```

### 13.2 Database Connection Issues

```bash
# Test connection
mysql -u mint_user -p -h localhost mint_experiment

# Check MySQL status
systemctl status mysql

# Check network connectivity
telnet localhost 3306
```

### 13.3 High CPU Usage

```bash
# Identify process
top -u www-data

# Check for infinite loops
strace -p $(pgrep -f "node.*index.js")

# Restart service
systemctl restart mint-experiment
```

---

## 14. Support & Escalation

### 14.1 Support Contacts
- **Technical Support**: support@example.com
- **Security Issues**: security@example.com
- **Emergency**: +1-XXX-XXX-XXXX

### 14.2 Escalation Procedure
1. Contact support team
2. Provide error details and logs
3. Escalate to senior engineer if needed
4. Escalate to management if critical

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-11 | Initial deployment guide |

---

**Last Updated**: 2026-05-11
**Status**: Production Ready
