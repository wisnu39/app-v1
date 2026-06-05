import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorResponse, ValidationError } from '@common/interfaces/api-response.interface';
import {
  INTERNAL_SERVER_ERROR_MESSAGE,
  PRISMA_ERROR_CODES,
  REQUEST_ID_HEADER,
} from '@common/constants/app.constants';

/**
 * Minimal Prisma error shape — only the fields we inspect.
 * We use a structural check rather than importing Prisma types
 * to keep this filter infrastructure-agnostic.
 */
interface PrismaErrorLike {
  code: string;
  meta?: Record<string, unknown>;
}

/**
 * NestJS class-validator error shape (returned by ValidationPipe).
 * Each item has `property` (field name) and `constraints` (rule → message map).
 */
interface ClassValidatorError {
  property: string;
  constraints?: Record<string, string>;
  children?: ClassValidatorError[];
}

/**
 * GlobalExceptionFilter — catches ALL unhandled exceptions.
 *
 * Responsibilities:
 *   - Map HttpException → structured error response
 *   - Map ValidationPipe errors → field-level error array
 *   - Map known Prisma errors → user-friendly messages (HTTP 409/422/404)
 *   - Map unknown errors → generic 500 (no internal details in production)
 *   - Attach requestId from header (future tracing placeholder)
 *   - Suppress stack trace in production
 *
 * Rules (CODING_STANDARDS.md):
 *   - MUST NOT expose stack traces in production
 *   - MUST NOT expose Prisma internals (table names, field names)
 *   - MUST produce consistent ApiErrorResponse shape
 *   - MUST log all 5xx errors for observability
 *
 * Not in scope:
 *   - Custom business exception hierarchy (Phase 2+)
 *   - Request correlation ID generation (future tracing task)
 *   - Sentry / error reporting integration (future task)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction = process.env['NODE_ENV'] === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = (request.headers[REQUEST_ID_HEADER] as string | undefined) ?? undefined;
    const timestamp = new Date().toISOString();
    const path = request.url;

    // ─── Resolve status and body ──────────────────────────────
    let status: number;
    let message: string;
    let errors: ValidationError[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resolved = this.resolveHttpException(exception);
      message = resolved.message;
      errors = resolved.errors;
    } else if (this.isPrismaError(exception)) {
      const resolved = this.resolvePrismaError(exception);
      status = resolved.status;
      message = resolved.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = INTERNAL_SERVER_ERROR_MESSAGE;
      // Log 5xx for observability — include stack only in non-production
      this.logger.error(
        `Unhandled exception on ${request.method} ${path}`,
        this.isProduction
          ? String(exception)
          : exception instanceof Error
            ? exception.stack
            : String(exception),
      );
    }

    // ─── Log 5xx (non-Prisma) ─────────────────────────────────
    if (status >= 500) {
      this.logger.error(`${status} ${request.method} ${path} — ${message}`);
    }

    // ─── Build response body ──────────────────────────────────
    const body: ApiErrorResponse = {
      success: false,
      message,
      ...(errors && errors.length > 0 ? { errors } : {}),
      meta: {
        timestamp,
        ...(requestId ? { requestId } : {}),
      },
    };

    response.status(status).json(body);
  }

  // ─── HttpException resolution ─────────────────────────────────

  private resolveHttpException(exception: HttpException): {
    message: string;
    errors?: ValidationError[];
  } {
    const response = exception.getResponse();

    // class-validator ValidationPipe produces an object with `message` array
    if (this.isValidationErrorResponse(response)) {
      return {
        message: 'Validation failed',
        errors: this.flattenValidationErrors(response.message),
      };
    }

    // Standard NestJS HttpException string or object
    if (typeof response === 'string') {
      return { message: response };
    }

    if (typeof response === 'object' && response !== null && 'message' in response) {
      const msg = (response as Record<string, unknown>)['message'];
      return { message: typeof msg === 'string' ? msg : exception.message };
    }

    return { message: exception.message };
  }

  // ─── Prisma error resolution ──────────────────────────────────

  private isPrismaError(exception: unknown): exception is PrismaErrorLike {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof (exception as Record<string, unknown>)['code'] === 'string' &&
      ((exception as Record<string, unknown>)['code'] as string).startsWith('P')
    );
  }

  private resolvePrismaError(error: PrismaErrorLike): {
    status: number;
    message: string;
  } {
    // Log Prisma errors at warn level — they indicate data issues, not app bugs
    this.logger.warn(`Prisma error code: ${error.code}`);

    switch (error.code) {
      case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT:
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
        };

      case PRISMA_ERROR_CODES.NOT_FOUND:
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested record was not found',
        };

      case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT:
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'Operation failed due to a related record constraint',
        };

      case PRISMA_ERROR_CODES.REQUIRED_FIELD_MISSING:
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'A required field is missing',
        };

      default:
        // Unknown Prisma error — log with code for debugging, generic message for client
        this.logger.error(`Unhandled Prisma error: ${error.code}`);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: INTERNAL_SERVER_ERROR_MESSAGE,
        };
    }
  }

  // ─── Validation error flattening ─────────────────────────────

  /**
   * Checks if the HttpException response is from class-validator ValidationPipe.
   * ValidationPipe produces: { statusCode, message: string[], error: string }
   */
  private isValidationErrorResponse(
    response: unknown,
  ): response is { message: string[] | ClassValidatorError[] } {
    return (
      typeof response === 'object' &&
      response !== null &&
      'message' in response &&
      Array.isArray((response as Record<string, unknown>)['message'])
    );
  }

  /**
   * Flattens class-validator errors into our ValidationError[] shape.
   *
   * ValidationPipe with `transform: true` produces either:
   *   - string[]  (default error messages from class-validator)
   *   - ClassValidatorError[] (when exceptionFactory is customized)
   *
   * We handle both cases.
   */
  private flattenValidationErrors(
    messages: string[] | ClassValidatorError[],
  ): ValidationError[] {
    if (messages.length === 0) return [];

    // String array — simple format from default ValidationPipe
    if (typeof messages[0] === 'string') {
      return (messages as string[]).map((msg) => ({
        field: this.extractFieldFromMessage(msg),
        message: msg,
      }));
    }

    // ClassValidatorError array — nested format
    return this.flattenClassValidatorErrors(messages as ClassValidatorError[]);
  }

  private flattenClassValidatorErrors(
    errors: ClassValidatorError[],
    parentField = '',
  ): ValidationError[] {
    const result: ValidationError[] = [];

    for (const error of errors) {
      const field = parentField ? `${parentField}.${error.property}` : error.property;

      if (error.constraints) {
        for (const message of Object.values(error.constraints)) {
          result.push({ field, message });
        }
      }

      if (error.children && error.children.length > 0) {
        result.push(...this.flattenClassValidatorErrors(error.children, field));
      }
    }

    return result;
  }

  /**
   * Attempts to extract field name from a flat validation message string.
   * Example: "email must be an email" → "email"
   * Falls back to "unknown" if pattern doesn't match.
   */
  private extractFieldFromMessage(message: string): string {
    const parts = message.split(' ');
    return parts[0] ?? 'unknown';
  }
}
