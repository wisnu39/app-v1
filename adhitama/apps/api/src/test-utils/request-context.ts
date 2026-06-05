export type RequestContext = {
  ipAddress: string;
  userAgent: string;
};

export function buildRequestContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    ipAddress: '127.0.0.1',
    userAgent: 'jest-agent/1.0',
    ...overrides,
  };
}
