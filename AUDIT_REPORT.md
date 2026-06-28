# Comprehensive Audit Report - Mint Experiment Site

**Date**: May 11, 2026  
**Status**: CRITICAL ISSUES FOUND  
**Priority**: HIGH - Blocks Email Authentication

---

## Executive Summary

The mint-experiment-site has **critical issues preventing successful email authentication**. While the backend infrastructure is well-designed, there are **4 critical bugs** and **multiple missing features** that prevent users from completing the login flow and using the application.

### Critical Issues Found: 4
### Missing Features: 8+
### Database Issues: 2
### Overall Risk: HIGH ⚠️

---

## CRITICAL ISSUES (Blocks Authentication)

### 🔴 CRITICAL #1: Session Verification Requires Non-Empty `name` Field

**Location**: `server/_core/sdk.ts:215-222`

**Problem**: The `verifySession()` method requires `openId`, `appId`, AND `name` to all be non-empty strings. However, when creating a session token for email-verified users, the `name` field can be empty.

```typescript
// Line 175 in createSessionToken
name: options.name || "",  // Can be empty string!

// Line 215-222 in verifySession - FAILS if name is empty
if (
  !isNonEmptyString(openId) ||
  !isNonEmptyString(appId) ||
  !isNonEmptyString(name)  // ❌ FAILS if name is ""
) {
  console.warn("[Auth] Session payload missing required fields");
  return null;
}
```

**Impact**: After email verification, the session cookie is created but cannot be verified, causing authentication to fail silently.

**Fix Required**: 
```typescript
// Option 1: Ensure name is never empty
name: options.name || "User",  // Default to "User"

// Option 2: Make name optional in verification
if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) {
  // name can be optional
}
```

---

### 🔴 CRITICAL #2: Missing Session Cookie Refresh After Email Verification

**Location**: `client/src/App.tsx:51-53` and `client/src/_core/hooks/useAuth.ts`

**Problem**: After email verification succeeds, the client advances to the wallet connection step but **never refreshes the authentication state**. The `useAuth()` hook queries `auth.me` only once on mount, so it doesn't know the session cookie was set.

```typescript
// App.tsx - Line 51-53
if (loginState === "verify") {
  return (
    <VerifyCodePage
      email={verifyEmail}
      onSuccess={() => {
        setLoginState("wallet");  // ❌ No auth refresh!
      }}
      onBack={() => setLoginState("email")}
    />
  );
}
```

**Impact**: Even if session verification works, the client doesn't know the user is authenticated and keeps showing the login screen.

**Fix Required**: Refresh auth state after email verification
```typescript
onSuccess={() => {
  utils.auth.me.invalidate();  // Refresh auth state
  setLoginState("wallet");
}}
```

---

### 🔴 CRITICAL #3: Incorrect User Lookup After Email Verification

**Location**: `server/routers.ts:169`

**Problem**: After creating a new user with `openId = email_${nanoid()}`, the code tries to look up the user with `openId = email_${userId}`, which is incorrect.

```typescript
// Line 142-159: Create user with openId = email_${nanoid()}
const newOpenId = `email_${nanoid()}`;
await db.upsertUser({
  openId: newOpenId,  // e.g., "email_abc123xyz"
  email,
  name: email.split("@")[0],
  loginMethod: "email",
});

// Line 169: Try to look up with WRONG openId
const user = await db.getUserByOpenId(`email_${userId}`);  // ❌ WRONG!
// This looks for "email_1", "email_2", etc., not the actual openId
```

**Impact**: User lookup fails, session creation fails, authentication fails.

**Fix Required**: Store and reuse the correct openId
```typescript
let user: typeof newUser;
if (existingVerification) {
  user = await db.getUserByOpenId(existingVerification.openId);
} else {
  user = newUser;
}

// Use the correct openId
const sessionToken = await sdk.createSessionToken(user.openId, {
  name: user.name || email.split('@')[0],
});
```

---

### 🔴 CRITICAL #4: Missing Database Connection Check

**Location**: `server/db.ts:9-19`

**Problem**: Database connection is lazy-loaded and can silently fail. If `DATABASE_URL` is not set or invalid, queries return undefined/null without clear errors.

```typescript
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;  // ❌ Silently fails
    }
  }
  return _db;
}
```

**Impact**: All database operations silently fail if DATABASE_URL is missing or invalid.

**Fix Required**: Add startup validation
```typescript
// In server startup
const db = await getDb();
if (!db) {
  throw new Error("DATABASE_URL not configured or connection failed");
}
```

---

## MISSING FEATURES (Blocks Full Functionality)

### 🟡 MISSING #1: Email Service Integration

**Location**: `server/routers.ts:63-65`

**Issue**: OTP codes are only logged to console, not sent to users.

```typescript
// Line 63-65
// TODO: Send email with OTP code
// For now, log it (remove in production)
console.log(`[Email Verification] OTP for ${email}: ${code}`);
```

**Impact**: Users cannot receive OTP codes. Email verification is non-functional.

**Required Implementation**:
- SendGrid or Mailgun integration
- Email template for OTP
- Retry logic for failed sends
- Email delivery tracking

---

### 🟡 MISSING #2: Real Ethereum Integration

**Location**: `server/transactionService.ts` (mock implementation)

**Issue**: All blockchain operations are mocked. No actual token minting occurs.

**Impact**: Mint requests are stored but never executed on blockchain.

**Required Implementation**:
- Web3.js or Ethers.js integration
- Smart contract interaction
- Gas estimation
- Transaction signing
- Block confirmation tracking

---

### 🟡 MISSING #3: Real Token Balance Queries

**Location**: `client/src/pages/Profile.tsx:30`

**Issue**: Token balance is hardcoded to `245.3M`.

```typescript
const tokenBalance = "245.3M";  // ❌ Hardcoded
```

**Impact**: Users see fake balance data.

**Required Implementation**:
- Web3.js contract call to get balance
- tRPC endpoint to query balance
- Real-time balance updates

---

### 🟡 MISSING #4: Transaction Execution Endpoint

**Location**: `server/routers.ts:540-560`

**Issue**: `transaction.execute` endpoint is incomplete (stub only).

```typescript
execute: protectedProcedure
  .input(executeMintTransactionSchema)
  .mutation(async ({ input, ctx }) => {
    // TODO: Implement actual transaction execution
    return {
      success: true,
      txHash: "0x...",
    };
  }),
```

**Impact**: Users cannot execute mint transactions.

**Required Implementation**:
- Request validation
- Ownership verification
- Smart contract call
- Gas fee estimation
- Transaction submission

---

### 🟡 MISSING #5: Email Sending on Mint Request

**Location**: `server/routers.ts:255-265`

**Issue**: Mint request email is generated but not sent.

```typescript
// Line 255-265
try {
  await notifyOwner({
    title: "New Mint Request",
    content: `User ${email} (ID: ${userId}) generated a mint request...`,
  });
} catch (error) {
  console.error("[Mint] Failed to notify owner:", error);
  // Silently fails
}
```

**Impact**: Owner is not notified of mint requests.

**Required Implementation**:
- Email service integration
- HTML email template
- Request details in email
- Action links

---

### 🟡 MISSING #6: Token Transfer Functionality

**Location**: `client/src/pages/Profile.tsx:handleSendTokens()`

**Issue**: Send tokens form exists but has no backend implementation.

```typescript
const handleSendTokens = async () => {
  // TODO: Implement token transfer
  toast.success("Tokens sent successfully!");
  setRecipient("");
  setAmount("");
};
```

**Impact**: Users cannot transfer tokens.

**Required Implementation**:
- tRPC endpoint for token transfer
- Recipient validation
- Amount validation
- Smart contract call
- Transaction confirmation

---

### 🟡 MISSING #7: Settings Persistence

**Location**: `client/src/pages/Settings.tsx`

**Issue**: Settings page exists but has no backend persistence.

```typescript
const handleSave = () => {
  setSaved(true);
  setTimeout(() => setSaved(false), 2000);
  // ❌ No server call, no persistence
};
```

**Impact**: User settings are lost on page refresh.

**Required Implementation**:
- User settings table in database
- tRPC endpoints for get/update settings
- Settings UI integration

---

### 🟡 MISSING #8: Transaction History Real Data

**Location**: `server/routers.ts:502-512`

**Issue**: Transaction history returns empty array (no transactions in database).

```typescript
const transactions = await db.getTransactionsByUserId(ctx.user.id, input.limit);
// Returns empty array for new users
```

**Impact**: Users see empty transaction history.

**Required Implementation**:
- Real transaction execution (see #2)
- Transaction confirmation tracking
- Block explorer integration

---

## DATABASE ISSUES

### 🟠 ISSUE #1: Missing Indexes

**Problem**: No database indexes on frequently queried columns.

```sql
-- Missing indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_wallets_userId ON wallets(userId);
CREATE INDEX idx_mint_requests_userId ON mint_requests(userId);
CREATE INDEX idx_transactions_requestId ON transactions(requestId);
```

**Impact**: Slow queries as data grows.

---

### 🟠 ISSUE #2: No Foreign Key Constraints

**Problem**: Database schema lacks foreign key relationships.

```sql
-- Missing constraints
ALTER TABLE wallets ADD CONSTRAINT fk_wallets_userId 
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE mint_requests ADD CONSTRAINT fk_mint_requests_userId 
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE email_verifications ADD CONSTRAINT fk_email_verifications_userId 
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;
```

**Impact**: Data integrity issues, orphaned records.

---

## AUTHENTICATION FLOW ISSUES

### Issue: No Session Refresh After Email Verification

**Current Flow**:
```
1. User enters email
2. OTP sent (logged to console)
3. User enters OTP
4. Backend: Creates user + session cookie
5. Frontend: Advances to wallet step (❌ No auth refresh!)
6. Frontend: Still thinks user is unauthenticated
7. User cannot proceed
```

**Required Fix**:
```
1. User enters email
2. OTP sent to email
3. User enters OTP
4. Backend: Creates user + session cookie
5. Frontend: Invalidates auth cache (✅ NEW)
6. Frontend: Waits for auth refresh (✅ NEW)
7. Frontend: Advances to wallet step
8. User can proceed
```

---

## MISSING ENVIRONMENT VARIABLES

The following environment variables are required but may not be configured:

```bash
# Email Service (CRITICAL)
EMAIL_SERVICE_PROVIDER=sendgrid|mailgun
EMAIL_API_KEY=xxx
EMAIL_FROM_ADDRESS=noreply@example.com

# Blockchain (CRITICAL)
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/xxx
CONTRACT_ADDRESS=0x...
MINTING_PRIVATE_KEY=0x...

# Database (CRITICAL)
DATABASE_URL=mysql://user:password@host/database

# OAuth (REQUIRED)
OAUTH_SERVER_URL=https://oauth.example.com

# Application (REQUIRED)
VITE_APP_ID=xxx
JWT_SECRET=xxx
```

---

## RECOMMENDED FIXES (Priority Order)

### PHASE 1: Fix Critical Authentication Issues (1-2 hours)

1. **Fix session name validation** - Allow empty name or provide default
2. **Fix user lookup bug** - Use correct openId after creation
3. **Add auth refresh after email verification** - Invalidate cache and refetch
4. **Add database connection validation** - Fail fast on startup

### PHASE 2: Implement Email Service (2-3 hours)

1. Integrate SendGrid or Mailgun
2. Create email templates
3. Send OTP codes to users
4. Send mint request notifications
5. Test email delivery

### PHASE 3: Implement Blockchain Integration (4-6 hours)

1. Install Web3.js or Ethers.js
2. Connect to Ethereum RPC
3. Implement token minting contract calls
4. Implement balance queries
5. Implement transaction confirmation tracking

### PHASE 4: Complete Missing Features (4-6 hours)

1. Implement token transfer endpoint
2. Implement settings persistence
3. Implement real transaction history
4. Add transaction confirmation UI
5. Add error handling and retries

### PHASE 5: Database Optimization (1 hour)

1. Add missing indexes
2. Add foreign key constraints
3. Add data validation triggers
4. Test data integrity

---

## TESTING CHECKLIST

### Authentication Flow
- [ ] User can request OTP code
- [ ] OTP code is sent to email
- [ ] User can verify OTP code
- [ ] Session cookie is created
- [ ] Frontend detects authentication
- [ ] User can connect wallet
- [ ] User can access authenticated pages
- [ ] Logout clears session

### Database
- [ ] Database connection works
- [ ] Users table has data
- [ ] Verification codes table works
- [ ] Email verifications table works
- [ ] Wallets table works
- [ ] Mint requests table works
- [ ] Transactions table works

### Features
- [ ] Email service sends OTP
- [ ] Blockchain integration works
- [ ] Token balance queries work
- [ ] Mint requests execute
- [ ] Transaction history shows data
- [ ] Token transfers work
- [ ] Settings persist

---

## DEPLOYMENT BLOCKERS

❌ **BLOCKED**: Cannot deploy to production until:

1. Email service is integrated and tested
2. All 4 critical authentication bugs are fixed
3. Database connection is validated
4. Environment variables are configured
5. Blockchain integration is tested
6. All tests pass

---

## CONCLUSION

The mint-experiment-site has a solid foundation with good security practices, but **cannot be used by end users** until the critical authentication issues are resolved. The architecture is sound, but implementation is incomplete.

**Estimated Time to Production Ready**: 12-16 hours

**Current Status**: ❌ NOT PRODUCTION READY

**Recommendation**: Address PHASE 1 issues immediately, then proceed with remaining phases.

---

**Report Generated**: May 11, 2026  
**Auditor**: System Audit  
**Next Review**: After PHASE 1 fixes
