export type RoleFixture = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
};

export function buildRoleFixture(overrides?: Partial<RoleFixture>): RoleFixture {
  return {
    id: 'role-user',
    tenantId: 'tenant-1',
    name: 'USER',
    description: 'Standard user role',
    ...overrides,
  };
}
