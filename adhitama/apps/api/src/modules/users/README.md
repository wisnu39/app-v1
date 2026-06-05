# modules/users/

User management module — Adhitama ERP Phase 3.

## Scope

Handles user lifecycle for a tenant:
- Create user (with NIP generation for employees, default password, mustChangePassword=true)
- Update user profile
- List users (paginated, searchable)
- User detail
- Status management (ACTIVE / INACTIVE / SUSPENDED)
- Soft delete

## Does NOT handle
- Role CRUD → modules/rbac
- Permission CRUD → modules/rbac
- Login / logout → modules/auth
- Password reset → future phase

## Endpoints
```
GET    /api/v1/users           users.read
GET    /api/v1/users/:id       users.read
POST   /api/v1/users           users.create
PATCH  /api/v1/users/:id       users.update
PATCH  /api/v1/users/:id/status users.update
DELETE /api/v1/users/:id       users.delete
```

## File Structure
```
users/
├── helpers/
│   └── nip.helper.ts          # NIP generation (EMP-000001 format)
├── repositories/
│   └── user.repository.ts     # DB access — list, findById, create, update
├── services/
│   └── user.service.ts        # Business logic, NIP orchestration
├── controllers/
│   └── user.controller.ts     # HTTP layer, guards, DTOs
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── update-status.dto.ts
│   └── user-query.dto.ts
├── types/
│   └── user.types.ts          # UserRecord, UserResponse, PaginatedUsers
└── users.module.ts
```

## Dependencies
- PrismaService     (global — DatabaseModule)
- PasswordService   (PasswordModule)
- NipHelper         (provided by UsersModule)
- JwtAuthGuard      (global — CoreAuthModule)
- PermissionGuard   (global — CoreAuthModule)
