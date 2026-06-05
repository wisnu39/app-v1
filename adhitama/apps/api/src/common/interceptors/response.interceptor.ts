import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  ApiSuccessResponse,
  ResponseMeta,
} from '@common/interfaces/api-response.interface';
import {
  DEFAULT_SUCCESS_MESSAGE,
  REQUEST_ID_HEADER,
} from '@common/constants/app.constants';

/**
 * ResponseInterceptor — wraps all success responses in the standard API envelope.
 *
 * Sesuai API_STANDARD.md:
 * {
 *   "success": true,
 *   "message": "Success",
 *   "data": <original response>,
 *   "meta": { "timestamp": "..." }
 * }
 *
 * Skip conditions — response is passed through unchanged when:
 *   1. Response is already wrapped (has `success` boolean field)
 *      → HealthController uses @Res() and formats its own response
 *   2. Response is null or undefined
 *      → 204 No Content responses
 *   3. Response is a Buffer or Stream
 *      → File downloads, PDF responses (future)
 *
 * Message extraction:
 *   If the controller returns an object with a `message` field,
 *   that message is hoisted to the envelope and removed from `data`.
 *   Otherwise, DEFAULT_SUCCESS_MESSAGE ('Success') is used.
 *
 * Rules (CODING_STANDARDS.md):
 *   - MUST NOT double-wrap already-formatted responses
 *   - MUST NOT wrap stream/buffer responses
 *   - MUST attach timestamp to meta
 *   - requestId is a placeholder — populated from header when present
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request.headers[REQUEST_ID_HEADER] as string | undefined) ?? undefined;

    return next.handle().pipe(
      map((data): ApiSuccessResponse<T> => {
        // ─── Skip: already formatted ────────────────────────
        // Controllers using @Res() (e.g. HealthController) send their
        // own response directly. NestJS returns null from the handler
        // in that case, so we pass null through without wrapping.
        if (data === null || data === undefined) {
          return data as unknown as ApiSuccessResponse<T>;
        }

        // ─── Skip: stream or buffer ──────────────────────────
        if (this.isStreamOrBuffer(data)) {
          return data as unknown as ApiSuccessResponse<T>;
        }

        // ─── Skip: already wrapped ───────────────────────────
        // Guard against double-wrapping if a controller returns
        // a pre-built ApiSuccessResponse for any reason
        if (this.isAlreadyWrapped(data)) {
          return data as unknown as ApiSuccessResponse<T>;
        }

        // ─── Extract message from payload ────────────────────
        // Convention: controllers may return { message, ...rest }
        // The interceptor hoists `message` to the envelope level
        const { message, payload } = this.extractMessage(data);

        // ─── Build meta ──────────────────────────────────────
        const meta: ResponseMeta = {
          timestamp: new Date().toISOString(),
          ...(requestId ? { requestId } : {}),
        };

        return {
          success: true,
          message,
          data: payload as T,
          meta,
        };
      }),
    );
  }

  // ─── Private helpers ─────────────────────────────────────────

  private isStreamOrBuffer(data: unknown): boolean {
    if (data instanceof Buffer) return true;

    // Duck-type check for Node.js Readable stream
    if (
      typeof data === 'object' &&
      data !== null &&
      'pipe' in data &&
      typeof (data as Record<string, unknown>)['pipe'] === 'function'
    ) {
      return true;
    }

    return false;
  }

  private isAlreadyWrapped(data: unknown): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      typeof (data as Record<string, unknown>)['success'] === 'boolean'
    );
  }

  /**
   * Extracts the `message` field from the data payload if present.
   * Returns the message and the remaining payload separately.
   *
   * Example:
   *   Input:  { message: 'Customer created', id: '123', name: 'Budi' }
   *   Output: message = 'Customer created', payload = { id: '123', name: 'Budi' }
   *
   * If no message field: uses DEFAULT_SUCCESS_MESSAGE, payload = original data.
   */
  private extractMessage(data: unknown): { message: string; payload: unknown } {
    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as Record<string, unknown>)['message'] === 'string'
    ) {
      const { message, ...rest } = data as Record<string, unknown>;
      return {
        message: message as string,
        payload: Object.keys(rest).length > 0 ? rest : null,
      };
    }

    return {
      message: DEFAULT_SUCCESS_MESSAGE,
      payload: data,
    };
  }
}
