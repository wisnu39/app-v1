/**
 * App Constants — Adhitama ERP
 *
 * Shared constants used across filters, interceptors, and guards.
 * Centralized here to prevent magic string duplication.
 */

/** Header key for request tracing — injected by gateway or generated locally */
export const REQUEST_ID_HEADER = 'x-request-id' as const;

/** Default fallback message for unhandled errors */
export const INTERNAL_SERVER_ERROR_MESSAGE =
  'An unexpected error occurred. Please try again later.' as const;

/** Default fallback message when no message is provided */
export const DEFAULT_SUCCESS_MESSAGE = 'Success' as const;

/**
 * Prisma error codes that should be mapped to user-friendly messages.
 * Reference: https://www.prisma.io/docs/reference/api-reference/error-reference
 */
export const PRISMA_ERROR_CODES = {
  /** Unique constraint violation */
  UNIQUE_CONSTRAINT: 'P2002',
  /** Record not found */
  NOT_FOUND: 'P2025',
  /** Foreign key constraint violation */
  FOREIGN_KEY_CONSTRAINT: 'P2003',
  /** Required field missing */
  REQUIRED_FIELD_MISSING: 'P2012',
} as const;
