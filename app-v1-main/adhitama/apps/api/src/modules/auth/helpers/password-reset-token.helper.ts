import { createHash, randomBytes } from 'crypto';

const PASSWORD_RESET_TOKEN_BYTES = 48;

export function generatePasswordResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
}

export function hashPasswordResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function isLikelyPasswordResetToken(token: string): boolean {
  return /^[0-9a-f]{96}$/.test(token);
}
