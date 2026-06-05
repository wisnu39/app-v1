import { AuthRepository } from './auth.repository';
import type { PrismaService } from '@infrastructure/prisma';

const mockPrismaService: Partial<PrismaService> = {
  user: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  } as any,
} as unknown as Partial<PrismaService>;

describe('AuthRepository', () => {
  let repo: AuthRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new AuthRepository(mockPrismaService as PrismaService);
  });

  describe('findByEmail()', () => {
    it('should return user when email found', async () => {
      const userData = {
        id: 'user-1',
        tenantId: 'tenant-1',
        roleId: 'role-1',
        email: 'test@example.com',
        nip: null,
        passwordHash: 'hash-1',
        status: 'ACTIVE',
        deletedAt: null,
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
      };

      (mockPrismaService.user!.findFirst as jest.Mock).mockResolvedValue(userData);

      const result = await repo.findByEmail('test@example.com', 'tenant-1');

      expect(result).toEqual(userData);
      expect((mockPrismaService.user!.findFirst as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: 'test@example.com',
            tenantId: 'tenant-1',
            deletedAt: null,
          },
        }),
      );
    });

    it('should return null when email not found', async () => {
      (mockPrismaService.user!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findByEmail('notfound@example.com', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should return null for soft-deleted user', async () => {
      (mockPrismaService.user!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findByEmail('deleted@example.com', 'tenant-1');

      expect(result).toBeNull();
    });
  });

  describe('findByNip()', () => {
    it('should return user when NIP found', async () => {
      const userData = {
        id: 'user-2',
        tenantId: 'tenant-1',
        roleId: 'role-1',
        email: 'emp@example.com',
        nip: 'EMP-0001',
        passwordHash: 'hash-2',
        status: 'ACTIVE',
        deletedAt: null,
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
      };

      (mockPrismaService.user!.findFirst as jest.Mock).mockResolvedValue(userData);

      const result = await repo.findByNip('EMP-0001', 'tenant-1');

      expect(result).toEqual(userData);
      expect((mockPrismaService.user!.findFirst as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            nip: 'EMP-0001',
            tenantId: 'tenant-1',
            deletedAt: null,
          },
        }),
      );
    });

    it('should return null when NIP not found', async () => {
      (mockPrismaService.user!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findByNip('NOTFOUND', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should return null for user with null NIP', async () => {
      (mockPrismaService.user!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findByNip('NULL', 'tenant-1');

      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin()', () => {
    it('should return count when user found and updated', async () => {
      (mockPrismaService.user!.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await repo.updateLastLogin('user-1', 'tenant-1');

      expect(result).toBe(1);
      expect((mockPrismaService.user!.updateMany as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1', tenantId: 'tenant-1' },
          data: expect.objectContaining({
            lastLoginAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should return 0 when user not found', async () => {
      (mockPrismaService.user!.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await repo.updateLastLogin('nonexistent', 'tenant-1');

      expect(result).toBe(0);
    });

    it('should update lastLoginAt to current time', async () => {
      (mockPrismaService.user!.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const before = Date.now();
      await repo.updateLastLogin('user-1', 'tenant-1');
      const after = Date.now();

      const call = (mockPrismaService.user!.updateMany as jest.Mock).mock.calls[0][0];
      const updatedTime = call.data.lastLoginAt.getTime();

      expect(updatedTime).toBeGreaterThanOrEqual(before);
      expect(updatedTime).toBeLessThanOrEqual(after);
    });
  });

  describe('findProfileById()', () => {
    it('should return user profile when found', async () => {
      const profileData = {
        id: 'user-1',
        tenantId: 'tenant-1',
        roleId: 'role-1',
        name: 'John Doe',
        email: 'john@example.com',
        nip: 'EMP-0001',
        emailVerifiedAt: new Date(),
        mustChangePassword: false,
        avatarUrl: 'https://example.com/avatar.jpg',
        contact: '081234567890',
        address: 'Jl. Example No. 1',
      };

      (mockPrismaService.user!.findFirst as jest.Mock).mockResolvedValue(profileData);

      const result = await repo.findProfileById('user-1', 'tenant-1');

      expect(result).toEqual(profileData);
      expect((mockPrismaService.user!.findFirst as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'user-1',
            tenantId: 'tenant-1',
            deletedAt: null,
          },
        }),
      );
    });

    it('should return null when user not found', async () => {
      (mockPrismaService.user!.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repo.findProfileById('nonexistent', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should exclude sensitive fields and include presentation fields', async () => {
      const profileData = {
        id: 'user-1',
        tenantId: 'tenant-1',
        roleId: 'role-1',
        name: 'John Doe',
        email: 'john@example.com',
        nip: 'EMP-0001',
        emailVerifiedAt: new Date(),
        mustChangePassword: true,
        avatarUrl: null,
        contact: null,
        address: null,
      };

      (mockPrismaService.user!.findFirst as jest.Mock).mockResolvedValue(profileData);

      const result = await repo.findProfileById('user-1', 'tenant-1');

      expect(result).toEqual(profileData);
      // Verify the select statement includes expected fields
      const call = (mockPrismaService.user!.findFirst as jest.Mock).mock.calls[0][0];
      expect(call.select).toHaveProperty('name');
      expect(call.select).toHaveProperty('avatarUrl');
      expect(call.select).toHaveProperty('contact');
      expect(call.select).toHaveProperty('address');
    });
  });

  describe('markEmailVerified()', () => {
    it('should return true when email verified successfully', async () => {
      (mockPrismaService.user!.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await repo.markEmailVerified('user-1', 'tenant-1');

      expect(result).toBe(true);
      expect((mockPrismaService.user!.updateMany as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'user-1',
            tenantId: 'tenant-1',
            deletedAt: null,
          },
          data: expect.objectContaining({
            emailVerifiedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should return false when user not found (count = 0)', async () => {
      (mockPrismaService.user!.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await repo.markEmailVerified('nonexistent', 'tenant-1');

      expect(result).toBe(false);
    });

    it('should return false when count > 1 (unexpected)', async () => {
      (mockPrismaService.user!.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await repo.markEmailVerified('user-1', 'tenant-1');

      expect(result).toBe(false);
    });

    it('should set emailVerifiedAt to current time', async () => {
      (mockPrismaService.user!.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const before = Date.now();
      await repo.markEmailVerified('user-1', 'tenant-1');
      const after = Date.now();

      const call = (mockPrismaService.user!.updateMany as jest.Mock).mock.calls[0][0];
      const verifiedTime = call.data.emailVerifiedAt.getTime();

      expect(verifiedTime).toBeGreaterThanOrEqual(before);
      expect(verifiedTime).toBeLessThanOrEqual(after);
    });
  });
});
