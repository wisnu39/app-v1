-- ============================================================
-- Migration: init-auth-foundation
-- Phase: 2.1.a — Base Auth Schema
-- Generated: manually authored (offline environment)
-- Matches: prisma/schema.prisma @ Phase 2.1.a
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- ─── Tables ──────────────────────────────────────────────────

-- Tenant
CREATE TABLE "tenants" (
    "id"         TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "slug"       TEXT NOT NULL,
    "status"     "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata"   JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- Role
-- Note: createdById / updatedById reference users(id).
-- Created after users table to avoid forward-reference issues.
-- FK added via ALTER TABLE after users is created.
CREATE TABLE "roles" (
    "id"           TEXT NOT NULL,
    "tenantId"     TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "createdById"  TEXT,
    "updatedById"  TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- Permission
CREATE TABLE "permissions" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "description" TEXT,
    "module"      TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- RolePermission
CREATE TABLE "role_permissions" (
    "id"           TEXT NOT NULL,
    "roleId"       TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- User
CREATE TABLE "users" (
    "id"                 TEXT NOT NULL,
    "tenantId"           TEXT NOT NULL,
    "roleId"             TEXT NOT NULL,
    "name"               TEXT NOT NULL,
    "email"              TEXT NOT NULL,
    "passwordHash"       TEXT NOT NULL,
    "status"             "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatarUrl"          TEXT,
    "lastLoginAt"        TIMESTAMP(3),
    "nip"                TEXT,
    "address"            TEXT,
    "contact"            TEXT,
    "emailVerifiedAt"    TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    "deletedAt"          TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Session
CREATE TABLE "sessions" (
    "id"               TEXT NOT NULL,
    "tenantId"         TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceInfo"       TEXT,
    "ipAddress"        TEXT,
    "userAgent"        TEXT,
    "expiresAt"        TIMESTAMP(3) NOT NULL,
    "revokedAt"        TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- AuditLog
CREATE TABLE "audit_logs" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "actorUserId" TEXT,
    "action"      TEXT NOT NULL,
    "entityType"  TEXT NOT NULL,
    "entityId"    TEXT NOT NULL,
    "before"      JSONB,
    "after"       JSONB,
    "metadata"    JSONB,
    "ipAddress"   TEXT,
    "userAgent"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ─── Unique Constraints ───────────────────────────────────────

CREATE UNIQUE INDEX "tenants_slug_key"
    ON "tenants"("slug");

CREATE UNIQUE INDEX "roles_tenantId_name_key"
    ON "roles"("tenantId", "name");

CREATE UNIQUE INDEX "permissions_key_key"
    ON "permissions"("key");

CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key"
    ON "role_permissions"("roleId", "permissionId");

CREATE UNIQUE INDEX "users_tenantId_email_key"
    ON "users"("tenantId", "email");

CREATE UNIQUE INDEX "users_tenantId_nip_key"
    ON "users"("tenantId", "nip");

-- EmailVerificationToken
CREATE TABLE "email_verification_tokens" (
    "id"         TEXT NOT NULL,
    "tenantId"   TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "tokenHash"  TEXT NOT NULL,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "usedAt"     TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- ─── Regular Indexes ─────────────────────────────────────────

-- roles
CREATE INDEX "roles_tenantId_idx"
    ON "roles"("tenantId");

-- permissions
CREATE INDEX "permissions_module_idx"
    ON "permissions"("module");

-- role_permissions
CREATE INDEX "role_permissions_roleId_idx"
    ON "role_permissions"("roleId");

CREATE INDEX "role_permissions_permissionId_idx"
    ON "role_permissions"("permissionId");

-- users
CREATE INDEX "users_tenantId_idx"
    ON "users"("tenantId");

CREATE INDEX "users_roleId_idx"
    ON "users"("roleId");

CREATE INDEX "users_status_idx"
    ON "users"("status");

CREATE INDEX "users_deletedAt_idx"
    ON "users"("deletedAt");

CREATE INDEX "users_tenantId_deletedAt_idx"
    ON "users"("tenantId", "deletedAt");

CREATE INDEX "users_tenantId_nip_idx"
    ON "users"("tenantId", "nip");

CREATE INDEX "users_emailVerifiedAt_idx"
    ON "users"("emailVerifiedAt");

CREATE INDEX "email_verification_tokens_tenantId_userId_idx"
    ON "email_verification_tokens"("tenantId", "userId");

CREATE INDEX "email_verification_tokens_tokenHash_idx"
    ON "email_verification_tokens"("tokenHash");

-- sessions
CREATE INDEX "sessions_tenantId_userId_idx"
    ON "sessions"("tenantId", "userId");

CREATE INDEX "sessions_userId_idx"
    ON "sessions"("userId");

CREATE INDEX "sessions_expiresAt_idx"
    ON "sessions"("expiresAt");

CREATE INDEX "sessions_revokedAt_idx"
    ON "sessions"("revokedAt");

-- audit_logs
CREATE INDEX "audit_logs_tenantId_idx"
    ON "audit_logs"("tenantId");

CREATE INDEX "audit_logs_actorUserId_idx"
    ON "audit_logs"("actorUserId");

CREATE INDEX "audit_logs_entityType_entityId_idx"
    ON "audit_logs"("entityType", "entityId");

CREATE INDEX "audit_logs_tenantId_createdAt_idx"
    ON "audit_logs"("tenantId", "createdAt");

-- ─── Foreign Keys ─────────────────────────────────────────────

-- roles → tenants (RESTRICT: protect tenant from deletion while roles exist)
ALTER TABLE "roles"
    ADD CONSTRAINT "roles_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- roles → users createdBy (SET NULL: role survives creator deletion)
ALTER TABLE "roles"
    ADD CONSTRAINT "roles_createdById_fkey"
    FOREIGN KEY ("createdById")
    REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- roles → users updatedBy (SET NULL: role survives updater deletion)
ALTER TABLE "roles"
    ADD CONSTRAINT "roles_updatedById_fkey"
    FOREIGN KEY ("updatedById")
    REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- role_permissions → roles (CASCADE: role deletion removes grants)
ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_roleId_fkey"
    FOREIGN KEY ("roleId")
    REFERENCES "roles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- role_permissions → permissions (CASCADE: permission removal cleans grants)
ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_permissionId_fkey"
    FOREIGN KEY ("permissionId")
    REFERENCES "permissions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- users → tenants (RESTRICT: protect tenant from deletion while users exist)
ALTER TABLE "users"
    ADD CONSTRAINT "users_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- users → roles (RESTRICT: protect role from deletion while users assigned)
ALTER TABLE "users"
    ADD CONSTRAINT "users_roleId_fkey"
    FOREIGN KEY ("roleId")
    REFERENCES "roles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- sessions → tenants (CASCADE: tenant deletion cleans all sessions)
ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- sessions → users (CASCADE: user deletion invalidates all sessions)
ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- audit_logs → tenants (RESTRICT: audit trail must survive tenant lifecycle)
ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- audit_logs → users/actor (SET NULL: log preserved, actor nulled on deletion)
ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_actorUserId_fkey"
    FOREIGN KEY ("actorUserId")
    REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- email_verification_tokens → tenants (CASCADE: tenant deletion cleans tokens)
ALTER TABLE "email_verification_tokens"
    ADD CONSTRAINT "email_verification_tokens_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- email_verification_tokens → users (CASCADE: user deletion cleans tokens)
ALTER TABLE "email_verification_tokens"
    ADD CONSTRAINT "email_verification_tokens_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
