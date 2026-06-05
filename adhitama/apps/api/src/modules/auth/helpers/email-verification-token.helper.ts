import { createHash, randomBytes } from 'crypto';

const VERIFICATION_TOKEN_BYTES = 48;

export function generateEmailVerificationToken(): string {
  return randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
}

export function hashEmailVerificationToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function isLikelyEmailVerificationToken(token: string): boolean {
  return /^[0-9a-f]{96}$/.test(token);
}
