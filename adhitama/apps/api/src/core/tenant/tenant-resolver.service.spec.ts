import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '@infrastructure/prisma';
import { TenantResolverService } from './tenant-resolver.service';

const mockPrismaService = {
  tenant: {
    findUnique: jest.fn(),
  },
};

describe('TenantResolverService', () => {
  let service: TenantResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DEFAULT_TENANT_SLUG;
    delete process.env.SEED_TENANT_SLUG;
    service = new TenantResolverService(
      mockPrismaService as unknown as PrismaService,
    );
  });

  it('resolves an active tenant by hostname slug', async () => {
    mockPrismaService.tenant.findUnique.mockResolvedValue({
      id: 'tenant-id',
      slug: 'acme',
      status: 'ACTIVE',
    });

    const tenant = await service.resolveTenantId('acme.example.com');

    expect(tenant).toEqual({
      tenantId: 'tenant-id',
      slug: 'acme',
    });
    expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: 'acme' },
      select: { id: true, slug: true, status: true },
    });
  });

  it('uses the default tenant slug for localhost requests', async () => {
    process.env.DEFAULT_TENANT_SLUG = 'adhitama';
    mockPrismaService.tenant.findUnique.mockResolvedValue({
      id: 'tenant-id',
      slug: 'adhitama',
      status: 'ACTIVE',
    });

    const tenant = await service.resolveTenantId('localhost');

    expect(tenant).toEqual({
      tenantId: 'tenant-id',
      slug: 'adhitama',
    });
  });

  it('throws when the hostname cannot be resolved to an active tenant', async () => {
    mockPrismaService.tenant.findUnique.mockResolvedValue(null);

    await expect(service.resolveTenantId('unknown.example.com')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
