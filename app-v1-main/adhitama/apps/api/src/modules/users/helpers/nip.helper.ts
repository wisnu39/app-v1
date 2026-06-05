import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';

/**
 * NipHelper — NIP (Nomor Induk Pegawai) generation for employee users.
 *
 * Isolated in its own file so the generation format and strategy
 * can evolve without touching UserService or UserController.
 *
 * Current format (v1):
 *   EMP-000001
 *   EMP-000002
 *   ...
 *   Prefix: "EMP-"
 *   Sequence: zero-padded 6-digit integer, incremental per tenant
 *
 * Future format changes:
 *   - Could include branch code: "JKT-EMP-000001"
 *   - Could include year: "2026-EMP-000001"
 *   - Could include department code: "OPS-000001"
 *   - Format is opaque to callers — they only receive the final string
 *
 * Tenant scope:
 *   NIP sequence is scoped per tenant.
 *   Two tenants can both have EMP-000001 — they are different employees.
 *   The uniqueness constraint in DB is @@unique([tenantId, nip]).
 *
 * Owner rule:
 *   Owner-type users do not receive a NIP.
 *   Caller (UserService) decides whether to call generateNip() based on role.
 *   This helper has no knowledge of user roles.
 *
 * Concurrency note:
 *   Current implementation uses findFirst + count to determine next number.
 *   Under high concurrency, two calls may generate the same NIP before insert.
 *   The DB unique constraint will catch this — caller should retry on ConflictException.
 *   A future phase may use a DB sequence or advisory lock for strict ordering.
 *
 * TODO: Future phases may move to DB-generated sequences for strict uniqueness.
 */
@Injectable()
export class NipHelper {
  private readonly PREFIX = 'EMP-' as const;
  private readonly PAD_LENGTH = 6 as const;

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Generate the next available NIP for a given tenant.
   *
   * Finds the highest existing NIP number in the tenant,
   * then returns PREFIX + (maxNumber + 1) zero-padded.
   *
   * Returns 'EMP-000001' if no NIP exists yet in the tenant.
   *
   * @param tenantId - Scope NIP sequence to this tenant
   * @returns NIP string in format 'EMP-000001'
   */
  async generateNip(tenantId: string): Promise<string> {
    // Find the highest existing NIP number for this tenant
    // NIP format: EMP-NNNNNN — we sort descending and take the first
    const latestUser = await this.prismaService.user.findFirst({
      where: {
        tenantId,
        nip: {
          startsWith: this.PREFIX,
        },
        deletedAt: null,
      },
      orderBy: {
        nip: 'desc',
      },
      select: {
        nip: true,
      },
    });

    const nextNumber = latestUser?.nip
      ? this.extractNumber(latestUser.nip) + 1
      : 1;

    return this.format(nextNumber);
  }

  // ─── Private Helpers ───────────────────────────────────────

  /**
   * Extract the numeric part from a NIP string.
   * 'EMP-000042' → 42
   * Returns 0 if parsing fails (treated as no existing NIP).
   */
  private extractNumber(nip: string): number {
    const numericPart = nip.replace(this.PREFIX, '');
    const parsed = parseInt(numericPart, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Format a sequence number into NIP string.
   * 1 → 'EMP-000001'
   * 42 → 'EMP-000042'
   */
  private format(n: number): string {
    return `${this.PREFIX}${String(n).padStart(this.PAD_LENGTH, '0')}`;
  }
}
