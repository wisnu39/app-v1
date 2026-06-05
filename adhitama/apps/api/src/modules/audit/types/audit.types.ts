import type { AuditEvent } from '../constants/audit-event.constants';

export interface AuditLogCreateInput {
  tenantId: string;
  actorUserId?: string | null;
  action: AuditEvent;
  entityType: string;
  entityId: string;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogRecord {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  action: AuditEvent;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogQuery {
  limit?: number;
  action?: AuditEvent;
  entityType?: string;
  entityId?: string;
}
