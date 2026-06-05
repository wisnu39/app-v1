import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma';
import type { AuditLogCreateInput, AuditLogQuery, AuditLogRecord } from '../types/audit.types';
import type { AuditEvent } from '../constants/audit-event.constants';

@Injectable()
export class AuditRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(input: AuditLogCreateInput): Promise<void> {
    await this.prismaService.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async findByTenant(
    tenantId: string,
    query: AuditLogQuery = {},
  ): Promise<AuditLogRecord[]> {
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));

    const logs = await this.prismaService.auditLog.findMany({
      where: {
        tenantId,
        ...(query.action ? { action: query.action } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
      },
      select: {
        id: true,
        tenantId: true,
        actorUserId: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      tenantId: log.tenantId,
      actorUserId: log.actorUserId,
      action: log.action as AuditEvent,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: (log.metadata as Record<string, unknown> | null) ?? null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    }));
  }
}
