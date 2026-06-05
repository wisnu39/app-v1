import type { Request } from 'express';

export interface TenantContext {
  tenantId: string;
  slug: string;
}

export interface RequestWithTenant extends Request {
  tenant: TenantContext;
}
