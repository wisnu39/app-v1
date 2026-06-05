import { jest } from '@jest/globals';
import type { AuditService } from '@modules/audit/services/audit.service';
import type { Mockify } from '../../types/mockify.type';

export function createAuditMock(): Mockify<AuditService> {
  return {
    fireAndForget: jest.fn(),
    log: jest.fn(),
  } as unknown as Mockify<AuditService>;
}
