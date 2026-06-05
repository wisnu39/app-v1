/**
 * API Response Interfaces — Adhitama ERP
 *
 * Defines the standard response envelope for all API endpoints.
 * Sesuai API_STANDARD.md:
 *
 * Success:
 * {
 *   "success": true,
 *   "message": "...",
 *   "data": {},
 *   "meta": {}
 * }
 *
 * Error:
 * {
 *   "success": false,
 *   "message": "...",
 *   "errors": [...],
 *   "meta": {}
 * }
 */

/** Pagination metadata — used in list responses */
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/** Response metadata — extended per use case */
export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
}

/** Standard success response envelope */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: ResponseMeta;
}

/** Single field validation error */
export interface ValidationError {
  field: string;
  message: string;
}

/** Standard error response envelope */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ValidationError[];
  meta?: ResponseMeta;
}

/** Union type for any API response */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
