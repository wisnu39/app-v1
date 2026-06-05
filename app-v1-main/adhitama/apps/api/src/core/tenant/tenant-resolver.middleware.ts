import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { NextFunction } from 'express';
import type { RequestWithTenant } from '@common/types/request-tenant.type';
import { TenantResolverService } from './tenant-resolver.service';

@Injectable()
export class TenantResolverMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);

  constructor(
    private readonly tenantResolverService: TenantResolverService,
  ) {}

  async use(req: RequestWithTenant, _res: unknown, next: NextFunction): Promise<void> {
    if (this.isHealthCheck(req)) {
      next();
      return;
    }

    const requestHost = req.headers.host as string | string[] | undefined;
    const hostname = req.hostname ?? requestHost;
    const hostHeader =
      typeof hostname === 'string'
        ? hostname
        : Array.isArray(hostname)
          ? hostname[0]
          : undefined;

    if (!hostHeader) {
      next(new UnauthorizedException());
      return;
    }

    try {
      req.tenant = await this.tenantResolverService.resolveTenantId(hostHeader);
      next();
    } catch (error) {
      this.logger.warn(
        `Tenant resolution failed — host=${hostHeader}, path=${req.originalUrl}`,
      );
      next(
        error instanceof UnauthorizedException
          ? error
          : new UnauthorizedException(),
      );
    }
  }

  private isHealthCheck(req: RequestWithTenant): boolean {
    return req.originalUrl === '/health' || req.originalUrl === '/api/v1/health';
  }
}
