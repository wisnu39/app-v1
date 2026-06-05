import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PasswordService } from '@infrastructure/password';
import { AUDIT_EVENT } from '@modules/audit/constants';
import { AuditService } from '@modules/audit/services';
import { UserRepository } from '../repositories/user.repository';
import type { CreateUserData, UpdateUserData } from '../repositories/user.repository';
import { NipHelper } from '../helpers/nip.helper';
import type {
  UserRecord,
  UserResponse,
  PaginatedUsers,
  UserListQuery,
} from '../types/user.types';

// ─── Service-level Types ──────────────────────────────────────

/**
 * CreateUserInput — caller-facing input for UserService.createUser().
 * plaintext password is NOT accepted — generated internally.
 */
export interface CreateUserInput {
  tenantId: string;
  /** ID of the requesting user — for audit awareness */
  requestedById: string;
  roleId: string;
  name: string;
  email: string;
  address?: string | null;
  contact?: string | null;
  avatarUrl?: string | null;
  auditContext?: AuditRequestContext;
}

/**
 * CreateUserResult — response from UserService.createUser().
 *
 * temporaryPassword is exposed ONCE here so caller (controller) can
 * deliver it to the admin who created the user (e.g. display on screen,
 * future: send via email onboarding flow).
 *
 * Rules:
 *   - temporaryPassword is the raw plaintext — NEVER log it
 *   - NEVER store it — only the hash goes to DB
 *   - After this call returns, it is unrecoverable
 */
export interface CreateUserResult {
  user: UserResponse;
  /**
   * Temporary plaintext password — visible ONCE.
   * mustChangePassword is true, so user must change on first login.
   * TODO: send verification email + password setup link in future phase
   */
  temporaryPassword: string;
}

/**
 * UpdateUserInput — partial update fields for UserService.updateUser().
 */
export interface UpdateUserInput {
  name?: string;
  roleId?: string;
  address?: string | null;
  contact?: string | null;
  avatarUrl?: string | null;
  auditContext?: AuditRequestContext;
}

/**
 * UpdateStatusInput — status transition input.
 */
export interface UpdateStatusInput {
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  /** ID of the requesting user — for self-action checks */
  requestedById: string;
  auditContext?: AuditRequestContext;
}

interface AuditRequestContext {
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

/** Role name of the OWNER system role — used for NIP and deletion guards */
const OWNER_ROLE_NAME = 'OWNER' as const;

/**
 * UserService — user management orchestration layer.
 *
 * Responsibilities:
 *   - Orchestrate user CRUD with full business rule enforcement
 *   - Email normalization before all DB operations
 *   - Temporary password generation (hash for DB, plaintext returned once)
 *   - NIP generation via NipHelper (employee roles only)
 *   - Role existence and tenant match validation
 *   - Status transition safety (OWNER deletion protection, self-suspend guard)
 *   - Soft delete safety (tenant must retain at least one active OWNER)
 *   - Response mapping — emailVerified derived boolean, never raw timestamp
 *
 * Layer rules:
 *   - No HTTP concerns (no Request, no Response objects)
 *   - No controller logic
 *   - No RBAC permission checks (enforced at guard level)
 *   - No email sending (deferred to future notification phase)
 *
 * Audit events emitted from this service:
 *   - USER_CREATED
 *   - USER_UPDATED
 *   - USER_STATUS_CHANGED
 *   - USER_DELETED
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly nipHelper: NipHelper,
    private readonly auditService: AuditService,
  ) {}

  // ─── Public Methods ────────────────────────────────────────

  /**
   * listUsers() — paginated, searchable user list for a tenant.
   * Maps all results through mapToResponse() before returning.
   */
  async listUsers(
    tenantId: string,
    query: UserListQuery,
  ): Promise<PaginatedUsers> {
    const result = await this.userRepository.findAll(tenantId, query);
    return {
      ...result,
      data: result.data.map(this.mapToResponse),
    };
  }

  /**
   * getUser() — fetch a single user by ID within a tenant.
   * @throws NotFoundException if user not found or soft-deleted
   */
  async getUser(id: string, tenantId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(id, tenantId);

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return this.mapToResponse(user);
  }

  /**
   * createUser() — create a new user with full business rule enforcement.
   *
   * Flow:
   *   1. Normalize email
   *   2. Validate role exists and belongs to tenant
   *   3. Check email uniqueness in tenant
   *   4. Determine if OWNER role → nip must be null
   *   5. Generate NIP for non-OWNER roles
   *   6. Generate temporary password (plaintext returned once, hash stored)
   *   7. Hash password via PasswordService
   *   8. Create user via UserRepository
   *   9. Return CreateUserResult with user + temporaryPassword
   */
  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const { tenantId, roleId, name, avatarUrl } = input;

    // ── Step 1: Normalize email ─────────────────────────────
    const email = this.normalizeEmail(input.email);

    // ── Step 2: Validate role ───────────────────────────────
    const role = await this.validateRole(roleId, tenantId);

    // ── Step 3: Check email uniqueness ──────────────────────
    const existing = await this.userRepository.findByEmail(email, tenantId);
    if (existing) {
      throw new ConflictException(
        'A user with this email already exists in this tenant',
      );
    }

    // ── Step 4 & 5: NIP determination ───────────────────────
    // OWNER: nip MUST be null — explicit rule, not silent skip
    // Non-OWNER: nip MUST be auto-generated via NipHelper
    let nip: string | null;
    if (role.name === OWNER_ROLE_NAME) {
      nip = null;
      this.logger.debug(`OWNER role — NIP not assigned for userId creation`);
    } else {
      nip = await this.nipHelper.generateNip(tenantId);
      this.logger.debug(`Generated NIP: ${nip} for tenantId=${tenantId}`);
    }

    // ── Step 6: Generate temporary password ─────────────────
    // Plaintext is returned to caller ONCE — never logged, never stored
    const temporaryPassword = this.generateTemporaryPassword();

    // ── Step 7: Hash password ────────────────────────────────
    // ONLY UserService calls PasswordService.hash() for user creation
    // Repository receives only the hash — never plaintext
    const passwordHash = await this.passwordService.hash(temporaryPassword);

    // ── Step 8: Sanitize optional fields ────────────────────
    const address = this.sanitizeOptionalField(input.address);
    const contact = this.sanitizeOptionalField(input.contact);

    // ── Step 9: Create user ──────────────────────────────────
    // emailVerifiedAt is null — user must verify email
    // mustChangePassword is true — user must change on first login
    // TODO: send verification email + onboarding link (future notification phase)
    const createData: CreateUserData = {
      tenantId,
      roleId,
      name,
      email,
      passwordHash,
      nip,
      status: 'ACTIVE',
      mustChangePassword: true,
      address,
      contact,
      avatarUrl: avatarUrl ?? null,
    };

    const user = await this.userRepository.create(createData);

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: input.requestedById,
      action: AUDIT_EVENT.USER_CREATED,
      entityType: 'User',
      entityId: user.id,
      sessionId: input.auditContext?.sessionId ?? null,
      metadata: {
        roleId,
        name,
        email,
        status: 'ACTIVE',
      },
      ipAddress: input.auditContext?.ipAddress ?? null,
      userAgent: input.auditContext?.userAgent ?? null,
    });

    this.logger.log(
      `User created — userId=${user.id}, tenantId=${tenantId}, roleId=${roleId}`,
    );

    return {
      user: this.mapToResponse(user),
      temporaryPassword,
      // temporaryPassword is the ONLY place this exists in plaintext
      // After this return, it is unrecoverable
    };
  }

  /**
   * updateUser() — update user profile fields.
   *
   * Validates role change if roleId is provided.
   * Email update is intentionally NOT supported here (future dedicated flow).
   *
   * @throws NotFoundException if user not found
   * @throws ConflictException if new role is invalid
   */
  async updateUser(
    id: string,
    tenantId: string,
    input: UpdateUserInput,
  ): Promise<UserResponse> {
    // Validate user exists
    const existing = await this.userRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`User not found`);
    }

    // Validate new role if provided
    if (input.roleId) {
      await this.validateRole(input.roleId, tenantId);
    }

    const updateData: UpdateUserData = {
      ...(input.name     !== undefined ? { name: input.name }         : {}),
      ...(input.roleId   !== undefined ? { roleId: input.roleId }     : {}),
      ...(input.avatarUrl!== undefined ? { avatarUrl: input.avatarUrl}: {}),
      ...(input.address  !== undefined
        ? { address: this.sanitizeOptionalField(input.address) }
        : {}),
      ...(input.contact  !== undefined
        ? { contact: this.sanitizeOptionalField(input.contact) }
        : {}),
    };

    const updated = await this.userRepository.update(id, tenantId, updateData);

    if (!updated) {
      throw new NotFoundException(`User not found`);
    }

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: input.auditContext?.userId ?? null,
      action: AUDIT_EVENT.USER_UPDATED,
      entityType: 'User',
      entityId: updated.id,
      sessionId: input.auditContext?.sessionId ?? null,
      metadata: {
        changedFields: Object.keys(updateData),
      },
      ipAddress: input.auditContext?.ipAddress ?? null,
      userAgent: input.auditContext?.userAgent ?? null,
    });

    this.logger.log(`User updated — userId=${id}, tenantId=${tenantId}`);

    return this.mapToResponse(updated);
  }

  /**
   * updateUserStatus() — change user account status.
   *
   * Safety rules enforced:
   *   - Cannot activate a soft-deleted user (distinct operation)
   *   - OWNER cannot suspend themselves (self-suspend on last OWNER)
   *
   * TODO (future phase — needs full role resolution):
   *   - Block suspension if this is the last active OWNER in the tenant
   *   - Currently partially guarded by deleteUser's OWNER check
   *
   * @throws NotFoundException if user not found
   * @throws BadRequestException on invalid status transition
   */
  async updateUserStatus(
    id: string,
    tenantId: string,
    input: UpdateStatusInput,
  ): Promise<UserResponse> {
    const user = await this.userRepository.findById(id, tenantId);
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    // Rule: cannot activate a deleted user via status update
    // Soft-deleted users are invisible to findById — this guards against
    // anyone who bypasses the soft-delete filter somehow
    if (user.status === input.status) {
      return this.mapToResponse(user); // Idempotent — already in desired state
    }

    // Rule: OWNER cannot self-suspend to prevent lockout
    // TODO: extend to check if this is the last active OWNER in tenant
    //       when full role-resolution is available (Phase 3.5+)
    if (
      input.requestedById === id &&
      input.status === 'SUSPENDED'
    ) {
      throw new BadRequestException(
        'A user cannot suspend their own account',
      );
    }

    const updated = await this.userRepository.updateStatus(
      id,
      tenantId,
      input.status,
    );

    if (!updated) {
      throw new NotFoundException(`User not found`);
    }

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: input.auditContext?.userId ?? input.requestedById,
      action: AUDIT_EVENT.USER_STATUS_CHANGED,
      entityType: 'User',
      entityId: updated.id,
      sessionId: input.auditContext?.sessionId ?? null,
      metadata: {
        fromStatus: user.status,
        toStatus: input.status,
      },
      ipAddress: input.auditContext?.ipAddress ?? null,
      userAgent: input.auditContext?.userAgent ?? null,
    });

    this.logger.log(
      `User status updated — userId=${id}, ` +
        `from=${user.status}, to=${input.status}`,
    );

    return this.mapToResponse(updated);
  }

  /**
   * deleteUser() — soft delete a user.
   *
   * Safety rules:
   *   - Cannot delete the last active OWNER in a tenant
   *     (tenant must always have at least one active OWNER)
   *
   * After deletion:
   *   - User is invisible to all normal queries
   *   - Active sessions remain until they expire naturally
   *   - TODO: revoke all sessions immediately (SessionService, future phase)
   *
   * @throws NotFoundException if user not found
   * @throws UnprocessableEntityException if deleting last active OWNER
   */
  async deleteUser(
    id: string,
    tenantId: string,
    auditContext?: AuditRequestContext,
  ): Promise<void> {
    const user = await this.userRepository.findById(id, tenantId);
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    // Rule: protect last active OWNER
    await this.assertNotLastOwner(id, tenantId, user.roleId);

    const deleted = await this.userRepository.softDelete(id, tenantId);

    if (!deleted) {
      throw new NotFoundException(`User not found`);
    }

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: auditContext?.userId ?? null,
      action: AUDIT_EVENT.USER_DELETED,
      entityType: 'User',
      entityId: user.id,
      sessionId: auditContext?.sessionId ?? null,
      metadata: {
        deletedAt: new Date().toISOString(),
      },
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
    });

    this.logger.log(`User soft-deleted — userId=${id}, tenantId=${tenantId}`);
  }

  // ─── Private Business Logic ───────────────────────────────

  /**
   * normalizeEmail() — trim and lowercase before any DB operation.
   * Prevents duplicate accounts with different casing.
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * sanitizeOptionalField() — trim and convert empty/whitespace to null.
   * Prevents storing '' or '   ' in optional string fields.
   */
  private sanitizeOptionalField(
    value: string | null | undefined,
  ): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * validateRole() — verify role exists and belongs to the tenant.
   * @throws BadRequestException if role not found or tenant mismatch
   * @returns The role record (name needed for OWNER check)
   */
  private async validateRole(
    roleId: string,
    tenantId: string,
  ): Promise<{ id: string; name: string }> {
    const role = await this.userRepository.findRoleById(roleId, tenantId);

    if (!role) {
      throw new BadRequestException(
        `Role not found or does not belong to this tenant`,
      );
    }

    return role;
  }

  /**
   * generateTemporaryPassword() — generate a secure random temporary password.
   *
   * Format: 12-character mix of uppercase, lowercase, digits, and symbols.
   * Long enough to be secure, short enough to be communicable by admin.
   *
   * The plaintext is returned ONCE to the caller and NEVER logged.
   * Only the Argon2id hash is persisted.
   */
  private generateTemporaryPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '@#$!%';
    const charset = upper + lower + digits + symbols;
    const bytes = randomBytes(64);
    let cursor = 0;

    const nextIndex = (max: number): number => {
      const value = bytes[cursor] ?? 0;
      cursor += 1;
      return value % max;
    };

    const mandatory = [
      upper[nextIndex(upper.length)],
      lower[nextIndex(lower.length)],
      digits[nextIndex(digits.length)],
      symbols[nextIndex(symbols.length)],
    ];

    const remaining = Array.from({ length: 8 }, () =>
      charset[nextIndex(charset.length)],
    );

    const all = [...mandatory, ...remaining];

    for (let i = all.length - 1; i > 0; i--) {
      const j = nextIndex(i + 1);
      [all[i], all[j]] = [all[j], all[i]];
    }

    return all.join('');
  }

  /**
   * assertNotLastOwner() — guard against deleting/suspending last OWNER.
   *
   * Queries the count of active OWNER users in the tenant.
   * If this user IS an OWNER and is the only active one — reject.
   *
   * Uses repository lookups for role name and owner counting.
   */
  private async assertNotLastOwner(
    userId: string,
    tenantId: string,
    roleId: string,
  ): Promise<void> {
    // Check if this user's role is the OWNER role
    const role = await this.userRepository.findRoleById(roleId, tenantId);

    if (role?.name !== OWNER_ROLE_NAME) {
      return; // Not an OWNER — no protection needed
    }

    // Count active OWNER users in this tenant
    const activeOwnerCount = await this.userRepository.countActiveUsersByRoleName(
      OWNER_ROLE_NAME,
      tenantId,
    );

    if (activeOwnerCount <= 1) {
      throw new UnprocessableEntityException(
        'Cannot delete the last active OWNER in this tenant. ' +
          'Assign another OWNER first.',
      );
    }
  }

  /**
   * mapToResponse() — map UserRecord to public-facing UserResponse.
   *
   * Central mapping method — MUST be used for all outgoing responses.
   * Derives emailVerified boolean from emailVerifiedAt timestamp.
   * Excludes any internal fields not meant for API consumers.
   *
   * Arrow function so it can be passed to Array.map() without binding issues.
   */
  private mapToResponse = (user: UserRecord): UserResponse => ({
    id: user.id,
    tenantId: user.tenantId,
    roleId: user.roleId,
    name: user.name,
    email: user.email,
    nip: user.nip,
    status: user.status,
    avatarUrl: user.avatarUrl,
    contact: user.contact,
    address: user.address,
    mustChangePassword: user.mustChangePassword,
    emailVerified: user.emailVerifiedAt !== null,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}
