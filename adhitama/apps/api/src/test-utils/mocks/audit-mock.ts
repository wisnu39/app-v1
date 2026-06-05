import { jest } from '@jest/globals';
import { AuditService } from '@modules/audit/services/audit.service';

export function createAuditServiceMock(): jest.Mocked<AuditService> {
  return {
    fireAndForget: jest.fn(),
    log: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
}
