import { Module } from '@nestjs/common';
import { CoreAuthModule } from '@core/auth';
import { PasswordModule } from '@infrastructure/password';
import { AuditModule } from '@modules/audit/audit.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthSecurityService } from './services/auth-security.service';
import { EmailVerificationService } from './services/email-verification.service';
import { ForgotPasswordService } from './services/forgot-password.service';
import { SessionService } from './services/session.service';
import { AuthRepository } from './repositories/auth.repository';
import { EmailVerificationRepository } from './repositories/email-verification.repository';
import { ForgotPasswordRepository } from './repositories/forgot-password.repository';
import { SessionRepository } from './repositories/session.repository';

/**
 * AuthModule — business authentication module.
 *
 * Wires together the full authentication flow:
 *   Controller → Service → Repository + Infrastructure
 *
 * Dependency graph (no circular dependencies):
 *   AuthModule
 *     imports CoreAuthModule    → provides JwtAuthGuard, TokenService
 *     imports PasswordModule    → provides PasswordService (Argon2id)
 *     provides AuthController   → 5 auth endpoints
 *     provides AuthService      → orchestration (login, logout, refresh, me)
 *     provides SessionService   → session lifecycle
 *     provides AuthRepository   → user lookup (email, NIP)
 *     provides SessionRepository→ session CRUD
 *
 * Global dependencies (no import needed — provided by @Global modules):
 *   PrismaService  → DatabaseModule @Global
 *   ConfigService  → ConfigModule @Global
 *
 * NOT @Global — auth endpoints are specific to this module.
 * JwtAuthGuard is already global via CoreAuthModule.
 *
 * Import in AppModule only.
 */
@Module({
  imports: [
    // Provides: JwtAuthGuard, TokenService, JwtStrategy
    CoreAuthModule,
    // Provides: PasswordService (Argon2id hash + verify)
    PasswordModule,
    AuditModule,
    NotificationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSecurityService,
    EmailVerificationService,
    ForgotPasswordService,
    SessionService,
    AuthRepository,
    EmailVerificationRepository,
    ForgotPasswordRepository,
    SessionRepository,
  ],
  exports: [
    // Export AuthService for potential use in UserModule (password change)
    // Export SessionService for future admin/session management module
    AuthService,
    EmailVerificationService,
    ForgotPasswordService,
    SessionService,
  ],
})
export class AuthModule {}
