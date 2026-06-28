# Mint Experiment Site - Completion & Security Plan

## Phase 1: Critical Bug Fixes (BLOCKING)

### 1.1 Fix User Lookup Bug in verifyCode (Line 158)
**Issue:** Incorrect openId construction causing session creation to fail
```typescript
// WRONG (line 158):
const user = await db.getUserByOpenId(`email_${userId}`);

// CORRECT:
const user = await db.getUserByOpenId(openId);
```
**Impact:** Users cannot complete email verification

### 1.2 Implement Real Email Service
**Current:** OTP logged to console only
**Required:** Integration with SendGrid or Mailgun
**Steps:**
1. Add email service environment variables
2. Create email sending function
3. Update `requestCode` to actually send OTP

### 1.3 Implement Transaction History
**Current:** Returns empty array
**Required:** Query database for user transactions
**Steps:**
1. Implement `transaction.getHistory` query
2. Return formatted transaction data

---

## Phase 2: Security Hardening

### 2.1 Authentication & Session Security
- [ ] Fix `SameSite` cookie policy (change from `'none'` to `'Strict'`)
- [ ] Add `Secure` flag enforcement in production
- [ ] Implement session timeout (30 minutes)
- [ ] Add CSRF token protection
- [ ] Remove `localStorage` user info persistence

### 2.2 Input Validation & Sanitization
- [ ] Add comprehensive input validation schemas
- [ ] Validate wallet addresses more strictly
- [ ] Sanitize all user inputs
- [ ] Add request size limits

### 2.3 Rate Limiting
- [ ] Rate limit email verification requests (3 per hour per email)
- [ ] Rate limit wallet connection attempts (5 per hour)
- [ ] Rate limit mint request generation (10 per hour)
- [ ] Rate limit transaction execution (5 per hour)

### 2.4 Secrets Management
- [ ] Move all secrets to environment variables
- [ ] Add secret validation on startup
- [ ] Implement secure secret rotation

### 2.5 Security Headers
- [ ] Add Content-Security-Policy header
- [ ] Add X-Frame-Options header
- [ ] Add X-Content-Type-Options header
- [ ] Add Strict-Transport-Security header
- [ ] Add Referrer-Policy header

### 2.6 Error Handling
- [ ] Remove stack traces from error responses
- [ ] Log detailed errors server-side only
- [ ] Return generic error messages to clients
- [ ] Implement error tracking (Sentry integration)

---

## Phase 3: Privacy Measures

### 3.1 Data Minimization
- [ ] Remove user info from localStorage
- [ ] Store only session token in httpOnly cookie
- [ ] Implement data retention policies
- [ ] Add user data deletion endpoint

### 3.2 Encryption
- [ ] Encrypt sensitive data at rest (wallet addresses)
- [ ] Ensure HTTPS-only communication
- [ ] Implement field-level encryption for PII

### 3.3 Audit Logging
- [ ] Log all authentication events
- [ ] Log all wallet connections
- [ ] Log all mint requests
- [ ] Implement audit log retention policy

---

## Phase 4: Blockchain Integration

### 4.1 Web3 Setup
- [ ] Install Web3.js or Ethers.js
- [ ] Configure Ethereum RPC endpoint
- [ ] Set up contract ABI for minting

### 4.2 Transaction Execution
- [ ] Implement actual token minting
- [ ] Add transaction signing
- [ ] Implement transaction confirmation tracking
- [ ] Add gas estimation

### 4.3 Wallet Verification
- [ ] Implement wallet signature verification
- [ ] Add wallet balance checking
- [ ] Implement transaction history from blockchain

---

## Phase 5: Feature Completion

### 5.1 Profile Page
- [ ] Fetch real token balance from blockchain
- [ ] Implement token transfer functionality
- [ ] Add transaction history display
- [ ] Implement wallet export

### 5.2 Email Integration
- [ ] Send mint prompt emails
- [ ] Send transaction confirmation emails
- [ ] Implement email templates
- [ ] Add email delivery tracking

### 5.3 Admin Dashboard (Optional)
- [ ] View all mint requests
- [ ] View transaction history
- [ ] Manage user accounts
- [ ] View system statistics

---

## Phase 6: Testing & Deployment

### 6.1 Security Testing
- [ ] OWASP Top 10 vulnerability scan
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF testing
- [ ] Rate limiting testing

### 6.2 Integration Testing
- [ ] End-to-end auth flow
- [ ] Wallet connection flow
- [ ] Mint request generation
- [ ] Transaction execution

### 6.3 Performance Testing
- [ ] Load testing (100+ concurrent users)
- [ ] Database query optimization
- [ ] API response time validation

### 6.4 Deployment
- [ ] Environment configuration
- [ ] Database migrations
- [ ] SSL/TLS setup
- [ ] Monitoring setup

---

## Implementation Priority

### CRITICAL (Do First)
1. Fix user lookup bug in verifyCode
2. Implement email sending
3. Add rate limiting
4. Fix cookie security settings

### HIGH (Do Second)
1. Add security headers
2. Implement input validation
3. Remove localStorage persistence
4. Add error handling

### MEDIUM (Do Third)
1. Implement transaction history
2. Add blockchain integration
3. Complete profile page
4. Add audit logging

### LOW (Optional)
1. Admin dashboard
2. Email templates
3. Advanced analytics
4. User preferences

---

## Security Checklist

- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] All queries parameterized
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Rate limiting active
- [ ] HTTPS enforced
- [ ] Security headers set
- [ ] Error messages generic
- [ ] Sensitive data not logged
- [ ] Dependencies up to date
- [ ] No known vulnerabilities

---

## Environment Variables Required

```
# Email Service
EMAIL_SERVICE_PROVIDER=sendgrid|mailgun
EMAIL_API_KEY=xxx
EMAIL_FROM_ADDRESS=xxx

# Blockchain
ETHEREUM_RPC_URL=xxx
CONTRACT_ADDRESS=xxx
CONTRACT_ABI=xxx
MINTING_PRIVATE_KEY=xxx

# Security
JWT_SECRET=xxx
SESSION_TIMEOUT=1800
RATE_LIMIT_WINDOW=3600
RATE_LIMIT_MAX_REQUESTS=10

# Database
DATABASE_URL=xxx

# Monitoring
SENTRY_DSN=xxx
```

---

## Testing Strategy

### Unit Tests
- Email verification logic
- Wallet address validation
- Mint request signing
- Transaction status updates

### Integration Tests
- Auth flow (email -> verify -> wallet)
- Mint request generation
- Transaction execution
- Email sending

### Security Tests
- SQL injection attempts
- XSS payload injection
- CSRF token validation
- Rate limit enforcement

### Load Tests
- 100+ concurrent users
- 1000+ requests per minute
- Database connection pooling
- Memory leak detection

---

## Success Criteria

1. ✅ All critical bugs fixed
2. ✅ All security measures implemented
3. ✅ All features fully functional
4. ✅ 100% test coverage for critical paths
5. ✅ No known vulnerabilities
6. ✅ Performance meets SLAs
7. ✅ Ready for production deployment
