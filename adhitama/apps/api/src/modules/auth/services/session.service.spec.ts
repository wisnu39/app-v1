import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from '@infrastructure/password';
import type { SessionRepository } from '../repositories/session.repository';
/* eslint-disable @typescript-eslint/unbound-method */
import { SessionService } from './session.service';

const mockSessionRepository: jest.Mocked<SessionRepository> = {
  findActiveSessionById: jest.fn(),
  findSessionById: jest.fn(),
  revokeAll: jest.fn(),
  revoke: jest.fn(),
  create: jest.fn(),
  revokeSessionChain: jest.fn(),
} as unknown as jest.Mocked<SessionRepository>;

const mockPasswordService: jest.Mocked<PasswordService> = {
  hash: jest.fn(),
  verify: jest.fn(),
} as unknown as jest.Mocked<PasswordService>;

const mockConfigService: Partial<ConfigService> = {
  get: jest.fn().mockReturnValue({ refreshTokenExpiresIn: '7d' }),
};

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new SessionService(
      mockSessionRepository,
      mockPasswordService,
      mockConfigService as ConfigService,
    );

    // Mock the internal logger
    (service as any).logger = mockLogger;
  });

  describe('verifyRefreshTokenOwnership()', () => {
    it('should return the active session when the raw token matches the stored hash', async () => {
      mockSessionRepository.findActiveSessionById.mockResolvedValue({
        id: 'session-id',
        tenantId: 'tenant-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 1000 * 60),
        revokedAt: null,
        createdAt: new Date(),
        refreshTokenHash: 'stored-hash',
      });
      mockPasswordService.verify.mockResolvedValue(true);

      const session = await service.verifyRefreshTokenOwnership(
        'raw-refresh-token',
        'session-id',
        'user-id',
        'tenant-id',
      );

      expect(session.id).toBe('session-id');
      expect(mockSessionRepository.findActiveSessionById).toHaveBeenCalledWith(
        'session-id',
        'user-id',
        'tenant-id',
      );
      expect(mockPasswordService.verify).toHaveBeenCalledWith(
        'raw-refresh-token',
        'stored-hash',
      );
    });

    it('should revoke all sessions and throw when the session is stale but present', async () => {
      mockSessionRepository.findActiveSessionById.mockResolvedValue(null);
      mockSessionRepository.findSessionById.mockResolvedValue({
        id: 'session-id',
        tenantId: 'tenant-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: new Date(Date.now() - 2000),
        createdAt: new Date(Date.now() - 5000),
        refreshTokenHash: 'stored-hash',
      });
      mockSessionRepository.revokeAll.mockResolvedValue(1);

      await expect(
        service.verifyRefreshTokenOwnership(
          'raw-refresh-token',
          'session-id',
          'user-id',
          'tenant-id',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockSessionRepository.revokeAll).toHaveBeenCalledWith(
        'user-id',
        'tenant-id',
      );
    });

    it('should revoke all sessions and throw when the token does not match', async () => {
      mockSessionRepository.findActiveSessionById.mockResolvedValue({
        id: 'session-id',
        tenantId: 'tenant-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 1000 * 60),
        revokedAt: null,
        createdAt: new Date(),
        refreshTokenHash: 'stored-hash',
      });
      mockPasswordService.verify.mockResolvedValue(false);
      mockSessionRepository.revokeAll.mockResolvedValue(1);

      await expect(
        service.verifyRefreshTokenOwnership(
          'raw-refresh-token',
          'session-id',
          'user-id',
          'tenant-id',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockSessionRepository.revokeAll).toHaveBeenCalledWith(
        'user-id',
        'tenant-id',
      );
    });
  });

  describe('rotateSession()', () => {
    it('should rotate an active session and return the new session record', async () => {
      mockPasswordService.hash.mockResolvedValue('new-token-hash');
      mockSessionRepository.revokeSessionChain.mockResolvedValue({
        id: 'new-session-id',
        tenantId: 'tenant-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
        createdAt: new Date(),
      });

      const result = await service.rotateSession(
        'old-session-id',
        'user-id',
        'tenant-id',
        'new-session-id',
        'raw-refresh-token',
        'device-info',
        '127.0.0.1',
        'user-agent',
      );

      expect(result.id).toBe('new-session-id');
      expect(mockPasswordService.hash).toHaveBeenCalledWith('raw-refresh-token');
      expect(mockSessionRepository.revokeSessionChain).toHaveBeenCalledWith(
        'old-session-id',
        'user-id',
        'tenant-id',
        expect.objectContaining({
          id: 'new-session-id',
          tenantId: 'tenant-id',
          userId: 'user-id',
          refreshTokenHash: 'new-token-hash',
        }),
      );
    });

    it('should revoke all sessions and throw when rotation fails due to a concurrent refresh', async () => {
      mockPasswordService.hash.mockResolvedValue('new-token-hash');
      mockSessionRepository.revokeSessionChain.mockResolvedValue(null);
      mockSessionRepository.revokeAll.mockResolvedValue(2);

      await expect(
        service.rotateSession(
          'old-session-id',
          'user-id',
          'tenant-id',
          'new-session-id',
          'raw-refresh-token',
          'device-info',
          '127.0.0.1',
          'user-agent',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockSessionRepository.revokeAll).toHaveBeenCalledWith(
        'user-id',
        'tenant-id',
      );
    });
  });

  describe('createSession()', () => {
    it('should create a session with provided id and metadata', async () => {
      (mockPasswordService.hash as jest.Mock).mockResolvedValue('token-hash');
      (mockSessionRepository.create as jest.Mock).mockResolvedValue({
        id: 'created-session',
        tenantId: 'tenant-1',
        userId: 'user-1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      });

      const result = await service.createSession({
        id: 'provided-id',
        userId: 'user-1',
        tenantId: 'tenant-1',
        rawRefreshToken: 'raw-token',
        deviceInfo: 'device-xyz',
        ipAddress: '10.0.0.1',
        userAgent: 'jest',
      });

      expect((mockPasswordService.hash as jest.Mock)).toHaveBeenCalledWith('raw-token');
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'provided-id',
          tenantId: 'tenant-1',
          userId: 'user-1',
          deviceInfo: 'device-xyz',
          ipAddress: '10.0.0.1',
          userAgent: 'jest',
        }),
      );
      expect(result.id).toBe('created-session');
    });

    it('should set null metadata when none provided', async () => {
      (mockPasswordService.hash as jest.Mock).mockResolvedValue('token-hash');
      (mockSessionRepository.create as jest.Mock).mockResolvedValue({
        id: 'created-session-2',
        tenantId: 'tenant-1',
        userId: 'user-1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      });

      await service.createSession({
        userId: 'user-1',
        tenantId: 'tenant-1',
        rawRefreshToken: 'raw-token',
      });

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceInfo: null,
          ipAddress: null,
          userAgent: null,
        }),
      );
    });

    it('should fall back to 7d expiry when config value is invalid', async () => {
      const badConfig = { get: jest.fn().mockReturnValue({ refreshTokenExpiresIn: '0x' }) } as unknown as ConfigService;
      const svc = new (require('./session.service').SessionService)(
        mockSessionRepository,
        mockPasswordService,
        badConfig,
      );

      (mockPasswordService.hash as jest.Mock).mockResolvedValue('token-hash');

      let capturedArg: any = null;
      (mockSessionRepository.create as jest.Mock).mockImplementation(async (input) => {
        capturedArg = input;
        return {
          id: 'created-session-3',
          tenantId: input.tenantId,
          userId: input.userId,
          expiresAt: input.expiresAt,
          revokedAt: null,
          createdAt: new Date(),
        };
      });

      const before = Date.now();
      await svc.createSession({
        userId: 'user-1',
        tenantId: 'tenant-1',
        rawRefreshToken: 'raw-token',
      });
      const after = Date.now();

      expect(capturedArg).not.toBeNull();
      // fallback should be ~7 days in ms
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(capturedArg.expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
      expect(capturedArg.expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
    });
  });

  describe('revokeSession()', () => {
    it('should revoke a single session and log', async () => {
      mockSessionRepository.revoke.mockResolvedValue({
        id: 'session-123',
        revokedAt: new Date(),
      });

      await service.revokeSession({
        sessionId: 'session-123',
        userId: 'user-1',
        tenantId: 'tenant-1',
      });

      expect(mockSessionRepository.revoke).toHaveBeenCalledWith(
        'session-123',
        'user-1',
        'tenant-1',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Session revoked'),
      );
    });
  });

  describe('revokeAllSessions()', () => {
    it('should revoke all user sessions and return count', async () => {
      mockSessionRepository.revokeAll.mockResolvedValue(3);

      const count = await service.revokeAllSessions('user-1', 'tenant-1');

      expect(count).toBe(3);
      expect(mockSessionRepository.revokeAll).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('All sessions revoked'),
      );
    });

    it('should handle zero sessions revoked', async () => {
      mockSessionRepository.revokeAll.mockResolvedValue(0);

      const count = await service.revokeAllSessions('user-1', 'tenant-1');

      expect(count).toBe(0);
      expect(mockSessionRepository.revokeAll).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
      );
    });
  });
});
