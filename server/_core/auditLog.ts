import { Request } from 'express';

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId?: number;
  email?: string;
  ipAddress?: string;
  status: 'success' | 'failure';
  details?: Record<string, unknown>;
}

/**
 * Log authentication events
 */
export function logAuthEvent(
  action: 'login' | 'login_requested' | 'login_verified' | 'logout' | 'session_created' | 'session_expired',
  userId: number | undefined,
  email: string,
  req?: Request,
  status: 'success' | 'failure' = 'success'
) {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: `auth.${action}`,
    userId,
    email,
    ipAddress: req?.ip || 'unknown',
    status,
  };

  console.log('[Audit Log]', JSON.stringify(entry));
}

/**
 * Log wallet events
 */
export function logWalletEvent(
  action: 'wallet_connected' | 'wallet_disconnected' | 'wallet_verified' | 'private_key_exported',
  userId: number,
  email: string,
  walletAddress: string,
  req?: Request,
  status: 'success' | 'failure' = 'success'
) {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: `wallet.${action}`,
    userId,
    email,
    ipAddress: req?.ip || 'unknown',
    status,
    details: {
      walletAddress, // full address — this is a server-side audit log, not a public response
    },
  };

  console.log('[Audit Log]', JSON.stringify(entry));
}

/**
 * Log mint events
 */
export function logMintEvent(
  action: 'request_generated' | 'request_executed' | 'request_expired' | 'request_failed' | 'request_minted' | 'refund_required',
  userId: number,
  email: string,
  requestId: string,
  req?: Request,
  status: 'success' | 'failure' = 'success',
  details?: Record<string, unknown>
) {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: `mint.${action}`,
    userId,
    email,
    ipAddress: req?.ip || 'unknown',
    status,
    details: {
      requestId, // full request ID — server-side audit log
      ...details,
    },
  };

  console.log('[Audit Log]', JSON.stringify(entry));
}

/**
 * Log transaction events
 */
export function logTransactionEvent(
  action: 'transaction_initiated' | 'transaction_confirmed' | 'transaction_failed',
  userId: number,
  email: string,
  txHash?: string,
  req?: Request,
  status: 'success' | 'failure' = 'success',
  details?: Record<string, unknown>
) {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: `transaction.${action}`,
    userId,
    email,
    ipAddress: req?.ip || 'unknown',
    status,
    details: {
      txHash, // full tx hash — server-side audit log
      ...details,
    },
  };

  console.log('[Audit Log]', JSON.stringify(entry));
}

/**
 * Log security events
 */
export function logSecurityEvent(
  action: 'rate_limit_exceeded' | 'invalid_input' | 'unauthorized_access' | 'suspicious_activity',
  req?: Request,
  details?: Record<string, unknown>
) {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: `security.${action}`,
    ipAddress: req?.ip || 'unknown',
    status: 'failure',
    details,
  };

  console.warn('[Audit Log]', JSON.stringify(entry));
}
