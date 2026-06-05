import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from '@modules/auth/repositories/auth.repository';
import { ForgotPasswordRepository } from '@modules/auth/repositories/forgot-password.repository';
import { NotificationService } from '@modules/notification/services/notification.service';
import { AuditService } from '@modules/audit/services/audit.service';
import { PasswordService } from '@infrastructure/password';
import { SessionService } from '@modules/auth/services/session.service';
import { EmailVerificationService } from '@modules/auth/services/email-verification.service';
import { EmailVerificationRepository } from '@modules/auth/repositories/email-verification.repository';
import { ForgotPasswordService } from '@modules/auth/services/forgot-password.service';

type ConfigServiceMock = {
  get: jest.Mock<unknown, [string]>;
};

export type AuthMocks = {
  authRepository: jest.Mocked<AuthRepository>;
  forgotPasswordRepository: jest.Mocked<ForgotPasswordRepository>;
  notificationService: jest.Mocked<NotificationService>;
  auditService: jest.Mocked<AuditService>;
  passwordService: jest.Mocked<PasswordService>;
  sessionService: jest.Mocked<SessionService>;
  configService: ConfigServiceMock;
};

export function createAuthMocks(): AuthMocks {
  const authRepository = {
    findByEmail: jest.fn(),
    findByNip: jest.fn(),
    updateLastLogin: jest.fn(),
    findProfileById: jest.fn(),
    markEmailVerified: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>;

  const forgotPasswordRepository = {
    createToken: jest.fn(),
    findTokenByHash: jest.fn(),
    findLatestTokenByUserId: jest.fn(),
    invalidateUnusedTokensForUser: jest.fn(),
    markTokenUsedAndResetPassword: jest.fn(),
    removeExpiredTokens: jest.fn(),
  } as unknown as jest.Mocked<ForgotPasswordRepository>;

  const notificationService = {
    sendEmail: jest.fn(),
    fireAndForgetEmail: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>;

  const auditService = {
    fireAndForget: jest.fn(),
    log: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;

  const passwordService = {
    hash: jest.fn(),
    verify: jest.fn(),
  } as unknown as jest.Mocked<PasswordService>;

  const sessionService = {
    createSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllSessions: jest.fn(),
    verifyRefreshTokenOwnership: jest.fn(),
    rotateSession: jest.fn(),
  } as unknown as jest.Mocked<SessionService>;

  const configService: ConfigServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'mail') {
        return {
          from: 'noreply@adhitama.com',
          passwordResetUrl: 'https://app.adhitama.com/reset?token={{token}}',
        };
      }
      return null;
    }),
  };

  return {
    authRepository,
    forgotPasswordRepository,
    notificationService,
    auditService,
    passwordService,
    sessionService,
    configService,
  };
}

export type EmailVerificationMocks = {
  authRepository: jest.Mocked<AuthRepository>;
  emailVerificationRepository: jest.Mocked<EmailVerificationRepository>;
  notificationService: jest.Mocked<NotificationService>;
  auditService: jest.Mocked<AuditService>;
  configService: ConfigServiceMock;
};

export function createEmailVerificationMocks(): EmailVerificationMocks {
  const authRepository = {
    findByEmail: jest.fn(),
    findByNip: jest.fn(),
    updateLastLogin: jest.fn(),
    findProfileById: jest.fn(),
    markEmailVerified: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>;

  const emailVerificationRepository = {
    createToken: jest.fn(),
    findTokenByHash: jest.fn(),
    findLatestTokenByUserId: jest.fn(),
    invalidateUnusedTokensForUser: jest.fn(),
    markTokenUsedAndVerifyUser: jest.fn(),
    removeExpiredTokens: jest.fn(),
    findValidTokenByHash: jest.fn(),
  } as unknown as jest.Mocked<EmailVerificationRepository>;

  const notificationService = {
    sendEmail: jest.fn(),
    fireAndForgetEmail: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>;

  const auditService = {
    fireAndForget: jest.fn(),
    log: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;

  const configService: ConfigServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'mail') {
        return {
          from: 'noreply@adhitama.com',
          emailVerificationUrl: 'https://example.com/verify?token={{token}}',
        };
      }
      return null;
    }),
  };

  return {
    authRepository,
    emailVerificationRepository,
    notificationService,
    auditService,
    configService,
  };
}

export async function buildForgotPasswordModule(
  mocks?: Partial<AuthMocks>,
): Promise<{ module: TestingModule; service: ForgotPasswordService; mocks: AuthMocks }> {
  const defaults = createAuthMocks();
  const merged: AuthMocks = { ...defaults, ...(mocks || {}) };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ForgotPasswordService,
      { provide: AuthRepository, useValue: merged.authRepository },
      { provide: ForgotPasswordRepository, useValue: merged.forgotPasswordRepository },
      { provide: NotificationService, useValue: merged.notificationService },
      { provide: AuditService, useValue: merged.auditService },
      { provide: PasswordService, useValue: merged.passwordService },
      { provide: SessionService, useValue: merged.sessionService },
      { provide: ConfigService, useValue: merged.configService },
    ],
  }).compile();

  const service = module.get<ForgotPasswordService>(ForgotPasswordService);

  return { module, service, mocks: merged } as const;
}

export async function buildEmailVerificationModule(
  mocks?: Partial<EmailVerificationMocks>,
): Promise<{ module: TestingModule; service: EmailVerificationService; mocks: EmailVerificationMocks }> {
  const defaults = createEmailVerificationMocks();
  const merged: EmailVerificationMocks = { ...defaults, ...(mocks || {}) };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      EmailVerificationService,
      { provide: AuthRepository, useValue: merged.authRepository },
      { provide: EmailVerificationRepository, useValue: merged.emailVerificationRepository },
      { provide: NotificationService, useValue: merged.notificationService },
      { provide: AuditService, useValue: merged.auditService },
      { provide: ConfigService, useValue: merged.configService },
    ],
  }).compile();

  const service = module.get<EmailVerificationService>(EmailVerificationService);

  return { module, service, mocks: merged } as const;
}
