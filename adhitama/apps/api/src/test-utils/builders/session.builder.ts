export type SessionShape = {
  id: string;
  userId: string;
  tenantId: string;
  refreshTokenHash: string;
  revokedAt: Date | null;
  expiresAt: Date;
};

export function buildSession(overrides?: Partial<SessionShape>): SessionShape {
  return {
    id: 'session-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    refreshTokenHash: 'refresh-hash',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    ...overrides,
  };
}
