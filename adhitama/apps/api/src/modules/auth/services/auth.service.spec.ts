import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuditService } from '@modules/audit/services';
import { SessionService } from './session.service';
import { AuthSecurityService } from './auth-security.service';
import { AuthRepository } from '../repositories/auth.repository';
import { PasswordService } from '@infrastructure/password';
import { TokenService, type TokenPair } from '@core/auth';

const mockAuthRepository = {
  findByEmail: jest.fn(),
  findByNip: jest.fn(),
  updateLastLogin: jest.fn(),
  findProfileById: jest.fn(),
} as unknown as jest.Mocked<AuthRepository>;

const mockSessionService = {
  createSession: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllSessions: jest.fn(),
  verifyRefreshTokenOwnership: jest.fn(),
  rotateSession: jest.fn(),
} as unknown as jest.Mocked<SessionService>;

const mockTokenService = {
  signTokenPair: jest.fn< TokenPair, [any] >(),
  verifyRefreshToken: jest.fn(),
} as unknown as jest.Mocked<TokenService>;

const mockPasswordService = {
  verify: jest.fn(),
} as unknown as jest.Mocked<PasswordService>;

const mockAuthSecurityService = {
  preflightLogin: jest.fn(),
  recordLoginFailure: jest.fn(),
  recordLoginSuccess: jest.fn(),
  preflightRefresh: jest.fn(),
  recordRefreshFailure: jest.fn(),
  recordRefreshSuccess: jest.fn(),
} as unknown as jest.Mocked<AuthSecurityService>;

const mockAuditService = {
  fireAndForget: jest.fn(),
} as unknown as jest.Mocked<AuditService>;

describe('AuthService', () => {
  let service: AuthService;

  const activeUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    roleId: 'role-1',
    email: 'user@example.com',
    nip: '12345',
    passwordHash: 'hashed-password',
    status: 'ACTIVE',
    deletedAt: null,
    mustChangePassword: false,
    emailVerifiedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthRepository.findByEmail.mockResolvedValue(null);
    mockAuthRepository.findByNip.mockResolvedValue(null);
    mockAuthRepository.updateLastLogin.mockResolvedValue(1);
    mockAuthRepository.findProfileById.mockResolvedValue(null);
    mockSessionService.createSession.mockResolvedValue({
      id: 'session-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });
    mockSessionService.revokeSession.mockResolvedValue(undefined);
    mockSessionService.revokeAllSessions.mockResolvedValue(0);
    mockTokenService.signTokenPair.mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    mockTokenService.verifyRefreshToken.mockImplementation(() => ({
      sub: 'user-1',
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      roleId: 'role-1',
    }));
    mockPasswordService.verify.mockResolvedValue(true);
    service = new AuthService(
      mockAuthRepository,
      mockSessionService,
      mockTokenService,
      mockPasswordService,
      mockAuthSecurityService,
      mockAuditService,
    );
  });

  it('should record failure and reject when login user is not found via email', async () => {
    mockAuthRepository.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        identifier: 'missing@example.com',
        password: 'password',
        tenantId: 'tenant-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(
      'missing@example.com',
      'tenant-1',
    );
    expect(mockAuthRepository.findByNip).not.toHaveBeenCalled();
    expect(mockAuthSecurityService.recordLoginFailure).toHaveBeenCalledWith({
      identifier: 'missing@example.com',
      tenantId: 'tenant-1',
      ipAddress: null,
      userAgent: null,
    });
    expect(mockAuditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        metadata: expect.objectContaining({
          reason: 'not_found',
          authMethod: 'email',
        }),
      }),
    );
  });

  it('should record failure and reject when login user is inactive', async () => {
    mockAuthRepository.findByEmail.mockResolvedValue({
      ...activeUser,
      status: 'INACTIVE',
    });

    await expect(
      service.login({
        identifier: 'user@example.com',
        password: 'password',
        tenantId: 'tenant-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockAuthSecurityService.recordLoginFailure).toHaveBeenCalledWith({
      identifier: 'user@example.com',
      tenantId: 'tenant-1',
      ipAddress: null,
      userAgent: null,
    });
    expect(mockAuditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        metadata: expect.objectContaining({
          reason: 'not_active',
        }),
      }),
    );
  });

  it('should record failure and reject when login password is invalid for NIP auth', async () => {
    mockAuthRepository.findByNip.mockResolvedValue(activeUser);
    mockPasswordService.verify.mockResolvedValue(false);

    await expect(
      service.login({
        identifier: '12345',
        password: 'wrong-password',
        tenantId: 'tenant-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockAuthRepository.findByNip).toHaveBeenCalledWith('12345', 'tenant-1');
    expect(mockAuthRepository.findByEmail).not.toHaveBeenCalled();
    expect(mockAuthSecurityService.recordLoginFailure).toHaveBeenCalledWith({
      identifier: '12345',
      tenantId: 'tenant-1',
      ipAddress: null,
      userAgent: null,
    });
    expect(mockAuditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        metadata: expect.objectContaining({
          reason: 'bad_credentials',
          authMethod: 'nip',
        }),
      }),
    );
  });

  it('should return an empty name when displayUser falls back to null', async () => {
    mockAuthRepository.findByEmail.mockResolvedValue(activeUser);
    mockAuthRepository.findProfileById.mockResolvedValue(null);

    const result = await service.login({
      identifier: 'user@example.com',
      password: 'password',
      tenantId: 'tenant-1',
    });

    expect(result.user.name).toBe('');
    expect(mockAuthSecurityService.recordLoginSuccess).toHaveBeenCalledWith({
      identifier: 'user@example.com',
      tenantId: 'tenant-1',
      ipAddress: null,
      userAgent: null,
    });
  });

  it('should call recordRefreshFailure and propagate the error when refresh token verification fails', async () => {
    mockTokenService.verifyRefreshToken.mockImplementation(() => {
      throw new Error('invalid refresh token');
    });

    await expect(
      service.refreshTokens({ rawRefreshToken: 'invalid-token' }),
    ).rejects.toThrow('invalid refresh token');

    expect(mockAuthSecurityService.recordRefreshFailure).toHaveBeenCalledWith({
      ipAddress: null,
      userAgent: null,
    });
  });

  it('should support logout with null audit metadata', async () => {
    await service.logout('session-1', 'user-1', 'tenant-1');

    expect(mockSessionService.revokeSession).toHaveBeenCalledWith({
      sessionId: 'session-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
    });
    expect(mockAuditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          sessionsRevoked: 1,
        }),
        ipAddress: null,
        userAgent: null,
      }),
    );
  });

  it('should support logoutAll with null audit metadata', async () => {
    mockSessionService.revokeAllSessions.mockResolvedValue(2);

    const count = await service.logoutAll('user-1', 'tenant-1');

    expect(count).toBe(2);
    expect(mockAuditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          sessionsRevoked: 2,
        }),
        ipAddress: null,
        userAgent: null,
      }),
    );
  });

  it('should throw UnauthorizedException when getMe cannot find a user', async () => {
    mockAuthRepository.findProfileById.mockResolvedValue(null);

    await expect(service.getMe('user-1', 'tenant-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
