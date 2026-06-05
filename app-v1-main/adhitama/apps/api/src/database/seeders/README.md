# Adhitama ERP — Database Seeder

## Overview

Production-grade seeder system for bootstrapping:
- System permissions (all ERP modules)
- System roles (OWNER, SUPER_ADMIN, MANAGER, STAFF)
- Role-permission assignments
- Default tenant
- Bootstrap OWNER account

## Execution Order

```
1. permissions  → global, not tenant-scoped
2. tenant       → creates default tenant
3. roles        → creates system roles + assigns permissions
4. owner        → creates bootstrap admin account
```

**Do not reorder.** Roles depend on permissions. Owner depends on roles.

## Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/adhitama_dev

# Tenant bootstrap
SEED_TENANT_NAME=Adhitama Demo
SEED_TENANT_SLUG=adhitama

# Owner account
SEED_OWNER_NAME=Admin Owner
SEED_OWNER_EMAIL=owner@adhitama.com
SEED_OWNER_PASSWORD=YourSecurePassword123!
```

Copy `.env.seed.example` to `.env.seed` and fill values.

## Running the Seeder

```bash
cd apps/api

# Copy and fill env
cp .env.seed.example .env.seed

# Run seeder
npm run prisma:seed
```

## Idempotency Guarantees

| Operation | Strategy | Safe to re-run |
|---|---|---|
| Permissions | upsert by `key` | ✅ Yes |
| Tenant | findUnique by `slug` → skip if exists | ✅ Yes |
| Roles | upsert by `tenantId + name` | ✅ Yes |
| Role permissions | createMany + skipDuplicates | ✅ Yes |
| Owner user | findFirst by `email + tenantId` → skip if exists | ✅ Yes |

## What the Seeder Will NOT Do

- Delete existing data
- Truncate tables
- Overwrite existing owner password
- Remove existing role-permission assignments
- Overwrite custom tenant roles

## Production Warning

⚠️ **Never run the seeder with production credentials in development.**
⚠️ **SEED_OWNER_PASSWORD must be strong — user is forced to change on first login.**
⚠️ **Rotate SEED_OWNER_PASSWORD after first login.**

## Adding New Permissions

1. Add to `src/database/constants/permissions.constant.ts`
2. Add to relevant role in `src/database/constants/system-roles.constant.ts`
3. Re-run `npm run prisma:seed`

New permissions are added additively — no existing data is affected.

## Example Seed Output

```
[SEED] ────────────────────────────────────────────────────
[SEED] Adhitama ERP — Database Seeder
[SEED] Environment: development
[SEED] ────────────────────────────────────────────────────

[SEED] ▶  Seeding permissions
[SEED] ✅ Permissions seeded: 42

[SEED] ▶  Seeding default tenant
[SEED] ✅ Tenant created: "Adhitama Demo" (adhitama)

[SEED] ▶  Seeding system roles for tenant: adhitama
[SEED]    Role upserted: OWNER
[SEED]    Permissions assigned: 42 / 42
[SEED]    Role upserted: SUPER_ADMIN
[SEED]    Permissions assigned: 42 / 42
[SEED]    Role upserted: MANAGER
[SEED]    Permissions assigned: 30 / 30
[SEED]    Role upserted: STAFF
[SEED]    Permissions assigned: 12 / 12
[SEED] ✅ System roles seeded: 4 roles

[SEED] ▶  Seeding OWNER account
[SEED] ✅ OWNER user created: owner@adhitama.com (id: clx...)
[SEED]    mustChangePassword = true — user must change on first login

[SEED] ────────────────────────────────────────────────────
[SEED] ✅ Seeding complete
[SEED] ────────────────────────────────────────────────────
```
