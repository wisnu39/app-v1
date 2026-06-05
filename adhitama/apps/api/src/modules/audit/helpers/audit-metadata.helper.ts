const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'refreshToken',
  'authorization',
  'authorizationHeader',
  'accessToken',
  'token',
  'secret',
  'cookie',
  'apiKey',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 8) {
    return '[truncated]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, depth + 1));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        isSensitiveKey(key) ? '[REDACTED]' : sanitizeValue(entry, depth + 1),
      ]),
    );
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  }

  if (typeof value === 'symbol') {
    return value.toString();
  }

  if (typeof value === 'function') {
    return value.toString();
  }

  const primitive = value as string | number | boolean | symbol;
  return String(primitive);
}

export function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      isSensitiveKey(key) ? '[REDACTED]' : sanitizeValue(value),
    ]),
  );
}

export function buildAuditMetadata(input: {
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}): Record<string, unknown> {
  const metadata = sanitizeMetadata(input.metadata);

  if (input.sessionId) {
    metadata.sessionId = input.sessionId;
  }

  return metadata;
}
