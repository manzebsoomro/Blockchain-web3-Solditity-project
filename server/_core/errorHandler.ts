import { TRPCError } from '@trpc/server';
import { ZodError } from 'zod';

/**
 * Generic error response that doesn't leak sensitive information
 */
export function createSafeErrorResponse(error: unknown): { message: string; code: string } {
  // Log detailed error server-side
  console.error('[Error Handler] Detailed error:', error);

  // Return generic message to client
  if (error instanceof TRPCError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof ZodError) {
    return {
      message: 'Invalid input provided',
      code: 'BAD_REQUEST',
    };
  }

  if (error instanceof Error) {
    // Don't expose internal error messages
    return {
      message: 'An error occurred. Please try again.',
      code: 'INTERNAL_SERVER_ERROR',
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'INTERNAL_SERVER_ERROR',
  };
}

/**
 * Sanitize error for logging (remove sensitive data)
 */
export function sanitizeErrorForLogging(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Check if error is a TRPC error
 */
export function isTRPCError(error: unknown): error is TRPCError {
  return error instanceof TRPCError;
}

/**
 * Create a TRPC error with a safe message
 */
export function createTRPCError(
  code: 'PARSE_ERROR' | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'PRECONDITION_FAILED' | 'PAYLOAD_TOO_LARGE' | 'UNPROCESSABLE_CONTENT' | 'TOO_MANY_REQUESTS' | 'CLIENT_CLOSED_REQUEST' | 'INTERNAL_SERVER_ERROR',
  message: string,
  cause?: unknown
) {
  // Log the cause server-side
  if (cause) {
    console.error('[TRPC Error]', code, ':', cause);
  }

  return new TRPCError({
    code,
    message,
  });
}
