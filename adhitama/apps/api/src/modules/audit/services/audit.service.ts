import { Injectable, Logger } from '@nestjs/common';
import type { AuditLogCreateInput } from '../types/audit.types';
import { AuditRepository } from '../repositories/audit.repository';
import { buildAuditMetadata } from '../helpers/audit-metadata.helper';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  async log(input: AuditLogCreateInput): Promise<void> {
    try {
      await this.auditRepository.create({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: buildAuditMetadata({
          sessionId: input.sessionId ?? null,
          metadata: input.metadata,
        }),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Audit log write failed — action=${input.action}, tenantId=${input.tenantId}, entityId=${input.entityId}: ${message}`,
      );
    }
  }

  fireAndForget(input: AuditLogCreateInput): void {
    void this.log(input);
  }
}
