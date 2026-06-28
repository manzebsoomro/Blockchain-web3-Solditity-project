/**
 * Email verification utilities for OTP-based authentication
 */

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320;
}

/**
 * Validate OTP code format (6 digits)
 */
export function isValidOTP(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Maximum failed verification attempts before a code is rejected.
 */
export const MAX_VERIFICATION_ATTEMPTS = 3;

/**
 * Check if code has expired
 */
export function isCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Check if max attempts exceeded
 */
export function isMaxAttemptsExceeded(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts;
}
