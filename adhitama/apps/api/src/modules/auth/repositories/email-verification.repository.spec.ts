import { EmailVerificationRepository } from './email-verification.repository';
import type { PrismaService } from '@infrastructure/prisma';

const mockTx = {
  emailVerificationToken: {
    updateMany: jest.fn(),
  },
  user: {
    updateMany: jest.fn(),
  },
};

const mockPrismaService: Partial<PrismaService> = {
  emailVerificationToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  } as any,
  $transaction: jest.fn().mockImplementation(async (fn: any) => fn(mockTx)),
} as unknown as Partial<PrismaService>;

describe('EmailVerificationRepository', () => {
  let repo: EmailVerificationRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new EmailVerificationRepository(mockPrismaService as PrismaService);
  });

  describe('createToken()', () => {
    it('should create and return email verification token', async () => {
      const tokenData = {
        id: 'token-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        tokenHash: 'hash-abc',
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: null,
        createdAt: new Date(),
      };

      (mockPrismaService.emailVerificationToken!.create as jest.Mock).mockResolvedValue(tokenData);

      const result = await repo.createToken({
        tenantId: 'tenant-1',
        userId: 'user-1',
        tokenHash: 'hash-abc',
        expiresAt: tokenData.expiresAt,
      });

      expect(result).toEqual(tokenData);
      expect((mockPrismaService.emailVerificationToken!.create as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            tenantId: 'tenant-1',
            userId: 'user-1',
            tokenHash: 'hash-abc',
            expiresAt: tokenData.expiresAt,
          },
        }),
      );
    });

    it('should set usedAt to null on creation', async () => {
      const tokenData = {
        id: 'token-2',
        tenantId: 'tenant-1',
        userId: 'user-1',
        tokenHash: 'hash-xyz',
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: null,
        createdAt: new Date(),
      };

      (mockPrismaService.emailVerificationToken!.create as jest.Mock).mockResolvedValue(tokenData);

      const result = await repo.createToken({
        tenantId: 'tenant-1',
        userId: 'user-1',
        tokenHash: 'hash-xyz',
        expiresAt: tokenData.expiresAt,
      });

      expect(result.usedAt).toBeNull();
    });
  });

  describe('findValidTokenByHash()', () => {
    it('should return valid (unused) token when found and not expired', async () => {
      const tokenData = {
        id: 'token-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        tokenHash: 'hash-abc',
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: null,
        createdAt: new Date(),
      };

      (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mockResolvedValue(tokenData);

      const result = await repo.findValidTokenByHash('hash-abc', 'tenant-1');

      expect(result).toEqual(tokenData);
      expect((mockPrismaService.emailVerificationToken!.findFirst as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tokenHash: 'hash-abc',
            tenantId: 'tenant-1',
            usedAt: null,
            expiresAt: expect.objectContaining({
              gt: expect.any(Date),
            }),
          },
        }),
      );
    });

    it('should return null when token already used', async () => {
      (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findValidTokenByHash('hash-used', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should return null when token expired', async () => {
      (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findValidTokenByHash('hash-expired', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should return null when hash not found', async () => {
      (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findValidTokenByHash('hash-notfound', 'tenant-1');

      expect(result).toBeNull();
    });
  });

  describe('findTokenByHash()', () => {
    it('should return token regardless of used/expired status when hash found', async () => {
      const tokenData = {
        id: 'token-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        tokenHash: 'hash-abc',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
      };

      (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mockResolvedValue(tokenData);

      const result = await repo.findTokenByHash('hash-abc', 'tenant-1');

      expect(result).toEqual(tokenData);
      expect((mockPrismaService.emailVerificationToken!.findFirst as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tokenHash: 'hash-abc',
            tenantId: 'tenant-1',
          },
        }),
      );
    });

    it('should return null when hash not found', async () => {
      (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findTokenByHash('hash-notfound', 'tenant-1');

      expect(result).toBeNull();
    });
  });

  describe('findLatestTokenByUserId()', () => {
    it('should return latest token for user when found', async () => {
      const tokenData = {
        id: 'token-latest',
        tenantId: 'tenant-1',
        userId: 'user-1',
        tokenHash: 'hash-latest',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      };

      (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mockResolvedValue(tokenData);

      const result = await repo.findLatestTokenByUserId('user-1', 'tenant-1');

      expect(result).toEqual(tokenData);
      expect((mockPrismaService.emailVerificationToken!.findFirst as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            tenantId: 'tenant-1',
          },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return null when no token exists for user', async () => {
      (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findLatestTokenByUserId('user-new', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should order by createdAt descending', async () => {
      const tokenData = {
        id: 'token-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        tokenHash: 'hash-1',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      };

      (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mockResolvedValue(tokenData);

      await repo.findLatestTokenByUserId('user-1', 'tenant-1');

      const call = (mockPrismaService.emailVerificationToken!.findFirst as jest.Mock).mock.calls[0][0];
      expect(call.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  describe('invalidateUnusedTokensForUser()', () => {
    it('should invalidate unused tokens and return count', async () => {
      (mockPrismaService.emailVerificationToken!.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await repo.invalidateUnusedTokensForUser('user-1', 'tenant-1');

      expect(result).toBe(3);
      expect((mockPrismaService.emailVerificationToken!.updateMany as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            tenantId: 'tenant-1',
            usedAt: null,
            expiresAt: expect.objectContaining({
              gt: expect.any(Date),
            }),
          },
          data: expect.objectContaining({
            usedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should return 0 when no unused tokens exist', async () => {
      (mockPrismaService.emailVerificationToken!.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await repo.invalidateUnusedTokensForUser('user-no-tokens', 'tenant-1');

      expect(result).toBe(0);
    });

    it('should only invalidate non-expired tokens', async () => {
      (mockPrismaService.emailVerificationToken!.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repo.invalidateUnusedTokensForUser('user-1', 'tenant-1');

      const call = (mockPrismaService.emailVerificationToken!.updateMany as jest.Mock).mock.calls[0][0];
      expect(call.where.expiresAt).toHaveProperty('gt');
    });
  });

  describe('markTokenUsedAndVerifyUser()', () => {
    it('should mark token as used and verify user email atomically', async () => {
      mockTx.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
      mockTx.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await repo.markTokenUsedAndVerifyUser('token-1', 'user-1', 'tenant-1');

      expect(result).toBe(true);
      expect(mockTx.emailVerificationToken.updateMany).toHaveBeenCalled();
      expect(mockTx.user.updateMany).toHaveBeenCalled();
    });

    it('should return false when token update fails (count !== 1)', async () => {
      mockTx.emailVerificationToken.updateMany.mockResolvedValue({ count: 0 });
      mockTx.user.updateMany.mockResolvedValue({ count: 0 });

      const result = await repo.markTokenUsedAndVerifyUser('token-notfound', 'user-1', 'tenant-1');

      expect(result).toBe(false);
    });

    it('should return false when user update fails', async () => {
      mockTx.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
      mockTx.user.updateMany.mockResolvedValue({ count: 0 });

      const result = await repo.markTokenUsedAndVerifyUser('token-1', 'user-deleted', 'tenant-1');

      expect(result).toBe(false);
    });

    it('should verify both token and user in transaction', async () => {
      mockTx.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
      mockTx.user.updateMany.mockResolvedValue({ count: 1 });

      await repo.markTokenUsedAndVerifyUser('token-1', 'user-1', 'tenant-1');

      expect((mockPrismaService.$transaction as jest.Mock)).toHaveBeenCalled();
      const calls = (mockPrismaService.$transaction as jest.Mock).mock.calls[0];
      expect(calls).toHaveLength(1);
    });
  });

  describe('removeExpiredTokens()', () => {
    it('should remove expired tokens for specific tenant', async () => {
      (mockPrismaService.emailVerificationToken!.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await repo.removeExpiredTokens('tenant-1');

      expect(result).toBe(5);
      expect((mockPrismaService.emailVerificationToken!.deleteMany as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'tenant-1',
            expiresAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
          },
        }),
      );
    });

    it('should remove expired tokens globally when tenantId not provided', async () => {
      (mockPrismaService.emailVerificationToken!.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });

      const result = await repo.removeExpiredTokens();

      expect(result).toBe(10);
      const call = (mockPrismaService.emailVerificationToken!.deleteMany as jest.Mock).mock.calls[0][0];
      expect(call.where.tenantId).toBeUndefined();
    });

    it('should return 0 when no expired tokens exist', async () => {
      (mockPrismaService.emailVerificationToken!.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await repo.removeExpiredTokens('tenant-1');

      expect(result).toBe(0);
    });

    it('should only delete tokens with expiresAt < now', async () => {
      (mockPrismaService.emailVerificationToken!.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const before = Date.now();
      await repo.removeExpiredTokens('tenant-1');
      const after = Date.now();

      const call = (mockPrismaService.emailVerificationToken!.deleteMany as jest.Mock).mock.calls[0][0];
      const expiresAtTime = call.where.expiresAt.lt.getTime();

      expect(expiresAtTime).toBeGreaterThanOrEqual(before);
      expect(expiresAtTime).toBeLessThanOrEqual(after);
    });
  });
});
