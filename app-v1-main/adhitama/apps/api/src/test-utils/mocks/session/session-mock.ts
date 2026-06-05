import { jest } from '@jest/globals';
import type { SessionService } from '@modules/auth/services/session.service';
import type { Mockify } from '../../types/mockify.type';

export function createSessionServiceMock(): Mockify<SessionService> {
  return {
    createSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllSessions: jest.fn(),
    verifyRefreshTokenOwnership: jest.fn(),
    rotateSession: jest.fn(),
  } as unknown as Mockify<SessionService>;
}
