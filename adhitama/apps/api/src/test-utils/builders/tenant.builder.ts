export type TenantShape = {
  id: string;
  name: string;
  slug: string;
};

export function buildTenant(overrides?: Partial<TenantShape>): TenantShape {
  return {
    id: 'tenant-1',
    name: 'Default Tenant',
    slug: 'default',
    ...overrides,
  };
}
