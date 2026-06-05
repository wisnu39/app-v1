import type { AuditService } from '@modules/audit/services/audit.service';

export const expectAuditEvent = (auditService: AuditService, action: string): void => {
  const fireAndForgetMock = Reflect.get(auditService, 'fireAndForget') as jest.Mock;

  expect(fireAndForgetMock).toHaveBeenCalledWith(
    expect.objectContaining({
      action,
    }),
  );
};
