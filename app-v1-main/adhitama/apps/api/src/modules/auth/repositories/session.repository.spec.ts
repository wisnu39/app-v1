import { SessionRepository } from './session.repository';
import type { PrismaService } from '@infrastructure/prisma';

const mockTx = {
  session: {
    updateMany: jest.fn(),
    create: jest.fn(),
  },
};

const mockPrismaService: Partial<PrismaService> = {
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  } as any,
  $transaction: jest.fn().mockImplementation(async (fn: any) => fn(mockTx)),
} as unknown as Partial<PrismaService>;

describe('SessionRepository', () => {
  let repo: SessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new SessionRepository(mockPrismaService as PrismaService);
  });

  it('create() should include provided id and metadata', async () => {
    (mockPrismaService.session!.create as jest.Mock).mockResolvedValue({
      id: 'created',
      tenantId: 't1',
      userId: 'u1',
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    const input = {
      id: 'provided-id',
      tenantId: 't1',
      userId: 'u1',
      refreshTokenHash: 'h',
      expiresAt: new Date(),
      deviceInfo: 'device',
      ipAddress: '1.2.3.4',
      userAgent: 'agent',
    };

    const res = await repo.create(input as any);

    expect((mockPrismaService.session!.create as jest.Mock)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: 'provided-id', deviceInfo: 'device', ipAddress: '1.2.3.4', userAgent: 'agent' }),
        select: expect.any(Object),
      }),
    );
    expect(res.id).toBe('created');
  });

  it('create() should set null metadata when not provided', async () => {
    (mockPrismaService.session!.create as jest.Mock).mockResolvedValue({
      id: 'created-2',
      tenantId: 't1',
      userId: 'u1',
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    const input = {
      tenantId: 't1',
      userId: 'u1',
      refreshTokenHash: 'h',
      expiresAt: new Date(),
    };

    await repo.create(input as any);

    expect((mockPrismaService.session!.create as jest.Mock)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deviceInfo: null, ipAddress: null, userAgent: null }),
      }),
    );
  });

  it('revokeSessionChain() should return null when updateMany count !== 1', async () => {
    mockTx.session.updateMany.mockResolvedValue({ count: 0 });

    const result = await repo.revokeSessionChain('old-id', 'u1', 't1', { refreshTokenHash: 'h' } as any);

    expect(mockTx.session.updateMany).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('revokeSessionChain() should return created session when updateMany succeeded', async () => {
    mockTx.session.updateMany.mockResolvedValue({ count: 1 });
    mockTx.session.create.mockResolvedValue({ id: 'new-id', tenantId: 't1', userId: 'u1', expiresAt: new Date(), revokedAt: null, createdAt: new Date() });

    const result = await repo.revokeSessionChain('old-id', 'u1', 't1', { refreshTokenHash: 'h' } as any);

    expect(mockTx.session.updateMany).toHaveBeenCalled();
    expect(mockTx.session.create).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.id).toBe('new-id');
  });

  it('revoke() should proceed even when updateMany count !== 1', async () => {
    (mockPrismaService.session!.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const res = await repo.revoke('s1', 'u1', 't1');

    expect((mockPrismaService.session!.updateMany as jest.Mock)).toHaveBeenCalled();
    expect(res).toHaveProperty('id', 's1');
    expect(res.revokedAt).toBeInstanceOf(Date);
  });

  describe('findById()', () => {
    it('should return session when found', async () => {
      const sessionData = {
        id: 'session-1',
        tenantId: 't1',
        userId: 'u1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      };
      (mockPrismaService.session!.findFirst as jest.Mock).mockResolvedValue(sessionData);

      const result = await repo.findById('session-1', 'u1', 't1');

      expect(result).toEqual(sessionData);
      expect((mockPrismaService.session!.findFirst as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'session-1',
            userId: 'u1',
            tenantId: 't1',
          },
        }),
      );
    });

    it('should return null when session not found', async () => {
      (mockPrismaService.session!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findById('nonexistent', 'u1', 't1');

      expect(result).toBeNull();
    });
  });

  describe('findByHash()', () => {
    it('should return session when hash matches', async () => {
      const sessionData = {
        id: 'session-1',
        tenantId: 't1',
        userId: 'u1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      };
      (mockPrismaService.session!.findFirst as jest.Mock).mockResolvedValue(sessionData);

      const result = await repo.findByHash('hash-abc', 'u1');

      expect(result).toEqual(sessionData);
      expect((mockPrismaService.session!.findFirst as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            refreshTokenHash: 'hash-abc',
            userId: 'u1',
          },
        }),
      );
    });

    it('should return null when hash not found', async () => {
      (mockPrismaService.session!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findByHash('nonexistent-hash', 'u1');

      expect(result).toBeNull();
    });
  });

  describe('findSessionById()', () => {
    it('should return session with hash when found', async () => {
      const sessionData = {
        id: 'session-1',
        tenantId: 't1',
        userId: 'u1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
        refreshTokenHash: 'hash-value',
      };
      (mockPrismaService.session!.findFirst as jest.Mock).mockResolvedValue(sessionData);

      const result = await repo.findSessionById('session-1', 'u1', 't1');

      expect(result).toEqual(sessionData);
      expect(result?.refreshTokenHash).toBe('hash-value');
    });
  });

  describe('findActiveSessionById()', () => {
    it('should return active session when not revoked and not expired', async () => {
      const futureDate = new Date(Date.now() + 1000000);
      const sessionData = {
        id: 'session-1',
        tenantId: 't1',
        userId: 'u1',
        expiresAt: futureDate,
        revokedAt: null,
        createdAt: new Date(),
        refreshTokenHash: 'hash-value',
      };
      (mockPrismaService.session!.findFirst as jest.Mock).mockResolvedValue(sessionData);

      const result = await repo.findActiveSessionById('session-1', 'u1', 't1');

      expect(result).toEqual(sessionData);
      expect((mockPrismaService.session!.findFirst as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'session-1',
            userId: 'u1',
            tenantId: 't1',
            revokedAt: null,
            expiresAt: {
              gt: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should return null when session is revoked', async () => {
      (mockPrismaService.session!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findActiveSessionById('session-1', 'u1', 't1');

      expect(result).toBeNull();
    });
  });

  describe('revokeAll()', () => {
    it('should revoke all active sessions for user and return count', async () => {
      (mockPrismaService.session!.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await repo.revokeAll('u1', 't1');

      expect(result).toBe(5);
      expect((mockPrismaService.session!.updateMany as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'u1',
            tenantId: 't1',
            revokedAt: null,
          },
          data: {
            revokedAt: expect.any(Date),
          },
        }),
      );
    });

    it('should return 0 when no sessions to revoke', async () => {
      (mockPrismaService.session!.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await repo.revokeAll('u1', 't1');

      expect(result).toBe(0);
    });
  });
});
