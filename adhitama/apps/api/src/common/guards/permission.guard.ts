import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '@infrastructure/prisma';
import type { AuthUser } from '@core/auth';
import { REQUIRED_PERMISSION_KEY } from '@common/constants/permission.constants';

/**
 * PermissionGuard — RBAC permission enforcement.
 *
 * Checks whether the authenticated user's role has the required permission(s).
 * Must be used AFTER JwtAuthGuard — requires request.user to be populated.
 *
 * Usage pattern:
 *   @UseGuards(JwtAuthGuard, PermissionGuard)
 *   @Permission('inventory.read')
 *   @Get('items')
 *   getItems(@CurrentUser() user: AuthUser) { ... }
 *
 * Behavior:
 *   - No @Permission() metadata on route → ALLOW (pass through)
 *   - Empty permissions array          → ALLOW (pass through)
 *   - User has ANY required permission → ALLOW (OR logic)
 *   - User has NO required permission  → THROW ForbiddenException (403)
 *
 * Why ForbiddenException (403) not UnauthorizedException (401):
 *   401 = not authenticated (no valid token / session)
 *   403 = authenticated but not authorized (valid identity, insufficient permissions)
 *   PermissionGuard only runs after JwtAuthGuard validates identity —
 *   identity is confirmed, authorization is what fails here.
 *
 * Query discipline:
 *   - Reads roleId from req.user (populated by JwtStrategy — no extra lookup)
 *   - Queries RolePermission JOIN Permission for matching key — minimal select
 *   - Does NOT load the full Role entity
 *   - Does NOT load all permissions for the role (only checks required ones)
 *
 * Tenant isolation:
 *   - Roles are tenant-scoped (Role.tenantId)
 *   - Permission keys are global (Permission table has no tenantId)
 *   - Query uses req.user.roleId which was validated as belonging to req.user.tenantId
 *     by JwtStrategy — tenant isolation is already guaranteed
 *
 * Stateless design:
 *   - No class-level mutable state
 *   - No in-memory cache (see TODO below)
 *   - Every request performs a fresh DB lookup
 *   - Safe for concurrent requests and horizontal scaling
 *
 * Future awareness:
 *   // TODO: Add Redis permission cache in future phase
 *   // Cache key pattern: perm:{tenantId}:{roleId}:{permissionKey}
 *   // TTL: short (e.g. 60s) to respect permission changes without full restart
 *   // Invalidation: on RolePermission create/delete events
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * canActivate() — called by NestJS for every request hitting a guarded route.
   *
   * Stateless per-request logic:
   *   1. Read required permissions from route/controller metadata
   *   2. If none required → allow
   *   3. Read roleId from req.user (set by JwtAuthGuard)
   *   4. Query DB: does this role have ANY of the required permissions?
   *   5. Allow if match found, throw ForbiddenException if not
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ── Step 1: Read required permissions from metadata ─────
    // Checks handler first, then controller (handler takes precedence)
    const requiredPermissions = this.reflector.getAllAndOverride<
      string[] | undefined
    >(REQUIRED_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    // ── Step 2: No permissions declared → allow ─────────────
    // Routes protected only by JwtAuthGuard (no @Permission) pass through.
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // ── Step 3: Get roleId from authenticated user ──────────
    const request = context.switchToHttp().getRequest<
      Request & { user: AuthUser }
    >();
    const user = request.user;

    // Defensive: should not happen if JwtAuthGuard runs first
    if (!user?.roleId) {
      this.logger.warn(
        'PermissionGuard: request.user or roleId is missing. ' +
          'Ensure JwtAuthGuard runs before PermissionGuard.',
      );
      throw new ForbiddenException();
    }

    // ── Step 4: Query DB — does role have ANY required permission? ──
    // ANY match (OR logic) — user needs at least one of the required permissions.
    // Query counts matching RolePermission rows — no need to load full entities.
    //
    // TODO: Add Redis permission cache in future phase
    // Cache key pattern: perm:{tenantId}:{roleId}:{permissionKey[]}
    const matchingCount = await this.prismaService.rolePermission.count({
      where: {
        roleId: user.roleId,
        permission: {
          key: {
            // 'in' operator implements OR logic:
            // role has this permission if ANY of the required keys match
            in: requiredPermissions,
          },
        },
      },
    });

    // ── Step 5: Allow or deny ───────────────────────────────
    if (matchingCount > 0) {
      return true;
    }

    this.logger.warn(
      `Permission denied — userId=${user.id}, roleId=${user.roleId}, ` +
        `required=[${requiredPermissions.join(', ')}]`,
    );

    // ForbiddenException (403) — authenticated but not authorized
    throw new ForbiddenException();
  }
}
