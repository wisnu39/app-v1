export type AuditRecordFixture = {
  action: string;
  entityId: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
};

export function buildAuditRecordFixture(overrides?: Partial<AuditRecordFixture>): AuditRecordFixture {
  return {
    action: 'AUTH_LOGIN',
    entityId: 'user-1',
    tenantId: 'tenant-1',
    metadata: {},
    ...overrides,
  };
}
