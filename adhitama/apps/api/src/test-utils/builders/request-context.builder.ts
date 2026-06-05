export type RequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  forwardedFor?: string | null;
};

export function buildRequestContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    ipAddress: '127.0.0.1',
    userAgent: 'jest-tests',
    forwardedFor: null,
    ...(overrides || {}),
  };
}
