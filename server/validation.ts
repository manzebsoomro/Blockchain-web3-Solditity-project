import { z } from 'zod';
import { ALLOWED_TOKEN_AMOUNTS } from '../shared/mintTiers';

// Email validation
export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();

// Ethereum address validation
export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format')
  .toLowerCase();

// OTP code validation
export const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'OTP must be 6 digits');

// Wallet address validation
export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format');

// Mint request ID validation
export const requestIdSchema = z
  .string()
  .min(1)
  .max(100);

// Amount validation
export const amountSchema = z
  .number()
  .positive('Amount must be positive')
  .finite('Amount must be a finite number');

// Chain ID validation
export const chainIdSchema = z
  .number()
  .int('Chain ID must be an integer')
  .positive('Chain ID must be positive');

// Status validation — only `failed` is acceptable from the client (cancellation). All other
// transitions are owned by the payment watcher server-side.
export const statusSchema = z.enum(['failed']);

// Limit validation
export const limitSchema = z
  .number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(100, 'Limit cannot exceed 100')
  .default(10);

// Auth schemas
export const requestCodeSchema = z.object({
  email: emailSchema,
});

export const verifyCodeSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

export const connectWalletSchema = z.object({
  address: ethereumAddressSchema,
});

export const generateMintRequestSchema = z.object({
  amount: z
    .number()
    .int()
    .refine((n) => (ALLOWED_TOKEN_AMOUNTS as readonly number[]).includes(n), {
      message: `Amount must be one of: ${ALLOWED_TOKEN_AMOUNTS.join(", ")}`,
    }),
});

export const getLatestRequestsSchema = z.object({
  limit: limitSchema,
});

export const updateRequestStatusSchema = z.object({
  requestId: requestIdSchema,
  status: statusSchema,
});

export const executeMintTransactionSchema = z.object({
  requestId: requestIdSchema,
  walletAddress: ethereumAddressSchema,
});

export const getTransactionHistorySchema = z.object({
  limit: limitSchema,
});

// Sanitization helper
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 1000); // Limit length
}

// Validate and sanitize email
export function validateAndSanitizeEmail(email: string): string {
  const validated = emailSchema.parse(email);
  return sanitizeString(validated);
}

// Validate wallet address
export function validateWalletAddress(address: string): string {
  return ethereumAddressSchema.parse(address);
}
