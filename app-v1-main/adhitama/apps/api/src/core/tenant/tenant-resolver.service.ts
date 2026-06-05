import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';
import type { TenantContext } from '@common/types/request-tenant.type';

@Injectable()
export class TenantResolverService {
  constructor(private readonly prismaService: PrismaService) {}

  async resolveTenantId(hostname: string): Promise<TenantContext> {
    const normalizedHostname = this.normalizeHostname(hostname);
    const slug = this.extractTenantSlug(normalizedHostname);

    const tenant = await this.prismaService.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    return {
      tenantId: tenant.id,
      slug: tenant.slug,
    };
  }

  private normalizeHostname(hostname: string): string {
    return hostname.toLowerCase().trim().replace(/\.$/, '');
  }

  private extractTenantSlug(hostname: string): string {
    if (this.isLocalHost(hostname)) {
      const fallbackSlug =
        process.env['DEFAULT_TENANT_SLUG'] ?? process.env['SEED_TENANT_SLUG'];

      if (!fallbackSlug) {
        throw new UnauthorizedException();
      }

      return fallbackSlug.toLowerCase().trim();
    }

    const firstLabel = hostname.split('.')[0]?.trim();

    if (!firstLabel || firstLabel === 'www') {
      throw new UnauthorizedException();
    }

    return firstLabel.toLowerCase();
  }

  private isLocalHost(hostname: string): boolean {
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  }
}
