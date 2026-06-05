-- ============================================================
-- Migration: add-password-reset-foundation
-- Phase: 2.2.a — Forgot Password Foundation
-- Generated: manually authored (offline environment)
-- Matches: prisma/schema.prisma @ Phase 2.2.a
-- ============================================================

-- PasswordResetToken
CREATE TABLE "password_reset_tokens" (
    "id"         TEXT NOT NULL,
    "tenantId"   TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "tokenHash"  TEXT NOT NULL,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "usedAt"     TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "password_reset_tokens_tenantId_userId_idx"
    ON "password_reset_tokens"("tenantId", "userId");

CREATE INDEX "password_reset_tokens_tokenHash_idx"
    ON "password_reset_tokens"("tokenHash");

ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
