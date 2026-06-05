import { jest } from '@jest/globals';
import { PasswordService } from '@infrastructure/password';
import type { Mockify } from '../../types/mockify.type';

export function createPasswordServiceMock(): Mockify<PasswordService> {
  return {
    hash: jest.fn(),
    verify: jest.fn(),
  } as unknown as Mockify<PasswordService>;
}
