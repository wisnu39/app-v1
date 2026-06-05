import { jest } from '@jest/globals';
import type { AuthRepository } from '@modules/auth/repositories/auth.repository';
import type { ForgotPasswordRepository } from '@modules/auth/repositories/forgot-password.repository';
import type { EmailVerificationRepository } from '@modules/auth/repositories/email-verification.repository';
import type { Mockify } from '../../types/mockify.type';

export function createAuthRepositoryMock(): Mockify<AuthRepository> {
  return {
    findByEmail: jest.fn(),
    findByNip: jest.fn(),
    updateLastLogin: jest.fn(),
    findProfileById: jest.fn(),
    markEmailVerified: jest.fn(),
  } as unknown as Mockify<AuthRepository>;
}

export function createForgotPasswordRepositoryMock(): Mockify<ForgotPasswordRepository> {
  return {
    createToken: jest.fn(),
    findTokenByHash: jest.fn(),
    findLatestTokenByUserId: jest.fn(),
    invalidateUnusedTokensForUser: jest.fn(),
    markTokenUsedAndResetPassword: jest.fn(),
    removeExpiredTokens: jest.fn(),
  } as unknown as Mockify<ForgotPasswordRepository>;
}

export function createEmailVerificationRepositoryMock(): Mockify<EmailVerificationRepository> {
  return {
    createToken: jest.fn(),
    findTokenByHash: jest.fn(),
    findLatestTokenByUserId: jest.fn(),
    invalidateUnusedTokensForUser: jest.fn(),
    markTokenUsedAndVerifyUser: jest.fn(),
    removeExpiredTokens: jest.fn(),
    findValidTokenByHash: jest.fn(),
  } as unknown as Mockify<EmailVerificationRepository>;
}
