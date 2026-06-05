import crypto from 'crypto';

export function generateRandomToken(length = 96): string {
  return crypto.randomBytes(length / 2).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
