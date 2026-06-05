import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CurrentUser } from '@core/auth';
import type { AuthUser } from '@core/auth';
import type { RequestWithTenant } from '@common/types/request-tenant.type';
import { AuthService } from '../services/auth.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { ForgotPasswordService } from '../services/forgot-password.service';
import type { LoginResponse, RefreshResponse, MeResponse } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

/**
 * AuthController — HTTP layer for authentication endpoints.
 *
 * Responsibilities (per CODING_STANDARDS.md controller rules):
 *   - Route definition
 *   - DTO validation (delegated to ValidationPipe via class-validator)
 *   - Guard application
 *   - Delegate to AuthService
 *   - Format HTTP response
 *
 * Controller MUST NOT contain:
 *   - Business logic
 *   - Password hashing
 *   - Token signing
 *   - Session management
 *   - Direct DB access
 *
 * Guard placement:
 *   - login  : NO guard (public endpoint)
 *   - refresh: NO guard (uses refresh token, not access token)
 *   - logout : @UseGuards(JwtAuthGuard) — must be authenticated
 *   - logout-all: @UseGuards(JwtAuthGuard) — must be authenticated
 *   - me     : @UseGuards(JwtAuthGuard) — must be authenticated
 *
 * Device metadata:
 *   Extracted from request headers and passed to AuthService for session storage.
 *   AuthService and SessionService handle null/fallback gracefully.
 *
 * ResponseInterceptor wraps all return values in standard ApiSuccessResponse.
 * GlobalExceptionFilter handles UnauthorizedException → 401 response.
 *
 * TODO markers indicate future AuditModule integration points.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly forgotPasswordService: ForgotPasswordService,
  ) {}

  // ─── POST /auth/login ──────────────────────────────────────

  /**
   * Login with email or NIP + password.
   * Returns token pair and user display info.
   * No authentication required — public endpoint.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: RequestWithTenant,
  ): Promise<LoginResponse> {
    const result = await this.authService.login({
      identifier: dto.identifier,
      password: dto.password,
      tenantId: req.tenant.tenantId,
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      deviceInfo: req.headers['x-device-info'] as string | null ?? null,
    });
    return result;
  }

  // ─── POST /auth/refresh ────────────────────────────────────

  /**
   * Rotate refresh token — returns new token pair.
   * No JwtAuthGuard — refresh token IS the credential here.
   * TokenService verifies the refresh token's signature and expiry.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<RefreshResponse> {
    const result = await this.authService.refreshTokens({
      rawRefreshToken: dto.refreshToken,
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      deviceInfo: req.headers['x-device-info'] as string | null ?? null,
    });
    return result;
  }

  // ─── POST /auth/logout ─────────────────────────────────────

  /**
   * Revoke the current session (single-device logout).
   * Requires valid access token — JwtAuthGuard validates session.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.sessionId, user.id, user.tenantId, {
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      sessionId: user.sessionId,
    });
    return { message: 'Logged out successfully' };
  }

  // ─── POST /auth/logout-all ─────────────────────────────────

  /**
   * Revoke ALL sessions for this user (logout all devices).
   * Requires valid access token — JwtAuthGuard validates session.
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<{ message: string; sessionsRevoked: number }> {
    const count = await this.authService.logoutAll(user.id, user.tenantId, {
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      sessionId: user.sessionId,
    });
    return {
      message: 'All sessions revoked successfully',
      sessionsRevoked: count,
    };
  }

  // ─── GET /auth/me ──────────────────────────────────────────

  /**
   * Get current user's profile and onboarding/security state.
   * Requires valid access token — JwtAuthGuard validates session.
   *
   * Response includes derived booleans (emailVerified, profileCompleted)
   * rather than raw timestamps — see MeResponse in AuthService.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    return this.authService.getMe(user.id, user.tenantId);
  }

  // ─── POST /auth/verify-email ───────────────────────────────

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: RequestWithTenant,
  ): Promise<{ message: string }> {
    await this.emailVerificationService.verifyEmail(dto.token, req.tenant.tenantId, {
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      sessionId: null,
    });
    return { message: 'Email verified successfully' };
  }

  // ─── POST /auth/resend-verification ───────────────────────

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() req: RequestWithTenant,
  ): Promise<{ message: string }> {
    await this.emailVerificationService.resendVerification(dto.email, req.tenant.tenantId, {
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      sessionId: null,
    });
    return { message: 'Verification email resent successfully' };
  }

  // ─── POST /auth/request-password-reset ─────────────────────

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: RequestWithTenant,
  ): Promise<{ message: string }> {
    await this.forgotPasswordService.requestPasswordReset(dto.email, req.tenant.tenantId, {
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      sessionId: null,
    });
    return {
      message:
        'If an account with that email exists, a password reset email has been sent.',
    };
  }

  // ─── POST /auth/reset-password ────────────────────────────

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: RequestWithTenant,
  ): Promise<{ message: string }> {
    await this.forgotPasswordService.resetPassword(dto.token, dto.password, req.tenant.tenantId, {
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      sessionId: null,
    });
    return { message: 'Password has been reset successfully' };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  /**
   * Extract client IP address from request.
   * Handles common proxy headers (X-Forwarded-For, X-Real-IP).
   */
  private extractIpAddress(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return (ip ?? '').trim() || null;
    }
    return req.socket.remoteAddress ?? null;
  }
}
