# modules/rbac/

RBAC management module — Adhitama ERP Phase 3.

## Scope

Handles Role and Permission management for a tenant:
- Role CRUD (tenant-scoped)
- Assign permissions to roles
- List permissions (system-level, read-only)
- Role deletion with protection (system roles, roles with users)

## Does NOT handle
- User management → modules/users
- Login / JWT → modules/auth
- Permission key creation (system-seeded only — never created at runtime)

## Endpoints
```
GET    /api/v1/roles                  roles.read
GET    /api/v1/roles/:id              roles.read
POST   /api/v1/roles                  roles.create
PATCH  /api/v1/roles/:id              roles.update
DELETE /api/v1/roles/:id              roles.delete

GET    /api/v1/permissions            permissions.read

POST   /api/v1/roles/:id/permissions  permissions.assign
```

## File Structure
```
rbac/
├── repositories/
│   └── rbac.repository.ts     # Role CRUD, Permission list, RolePermission ops
├── services/
│   └── rbac.service.ts        # Business logic, role deletion protection
├── controllers/
│   └── rbac.controller.ts     # HTTP layer, guards, DTOs
├── dto/
│   ├── create-role.dto.ts
│   ├── update-role.dto.ts
│   ├── assign-permission.dto.ts
│   └── role-query.dto.ts
├── types/
│   └── rbac.types.ts          # RoleRecord, RoleResponse, PermissionRecord
└── rbac.module.ts
```

## Business Rules
- System roles (OWNER, SUPER_ADMIN) cannot be deleted or renamed
- Role with active users cannot be deleted — validate first
- Tenant cannot create custom Permission keys (system-seeded)
- Permission assignment is additive — idempotent insert
