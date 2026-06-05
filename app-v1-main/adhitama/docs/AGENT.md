# AGENT.md — Adhitama Enterprise ERP AI Engineering Agent

**Version:** 1.0
**Status:** LOCKED
**Project:** Adhitama Enterprise Rental ERP

---

## 1. PROJECT OVERVIEW
Adhitama adalah Enterprise Rental ERP Platform untuk:
* Rental management
* Inventory & warehouse
* Finance & accounting
* Multi-tenant enterprise operations
* RBAC enterprise security
* Audit logging
* Desktop-first architecture
* Future-ready mobile ecosystem

**Tech Stack:**
* Backend: NestJS
* Database: PostgreSQL + Prisma
* Cache: Redis
* Frontend Desktop: Tauri + React
* Frontend Mobile: React Native (future)
* Auth: JWT + Refresh Rotation
* Password Hashing: Argon2id

**Architecture:**
* Clean Architecture
* DDD-lite
* Modular Monolith
* Enterprise Security First

---

## 2. CORE ENGINEERING RULES

### 2.1 DO NOT BREAK ARCHITECTURE
**AI MUST:**
* Follow existing folder structure
* Follow module boundaries
* Follow repository/service/controller separation
* Follow typed DTO patterns
* Follow tenant-scoped data access
* Follow enterprise security standards

**AI MUST NEVER:**
* Create random folders
* Mix business logic into controllers
* Access Prisma directly from controllers
* Bypass services
* Introduce hidden magic behavior
* Create duplicate logic

---

## 3. BACKEND ARCHITECTURE

### 3.1 Layer Rules

#### Controller Layer
**Responsibilities:**
* HTTP request handling
* DTO validation
* Guard usage
* Permission enforcement
* Return response only

**Controllers MUST NOT:**
* Access database
* Contain business logic
* Hash passwords
* Generate JWT
* Handle transactions

#### Service Layer
**Responsibilities:**
* Business orchestration
* Validation rules
* Security logic
* Transaction coordination
* Response mapping

**Services MUST:**
* Use repositories
* Throw business exceptions
* Enforce tenant isolation
* Be deterministic

#### Repository Layer
**Responsibilities:**
* Prisma access only
* Query isolation
* Minimal select discipline
* Tenant filtering
* Soft delete filtering

**Repositories MUST NOT:**
* Contain business rules
* Throw business exceptions
* Access HTTP layer
* Generate responses

---

## 4. SECURITY RULES

### 4.1 AUTHENTICATION
**Authentication system:**
* JWT access token
* JWT refresh token
* Refresh token rotation
* Session validation
* Multi-device session support

**JWT payload MUST ONLY contain:**
```typescript
{
  sub: string
  tenantId: string
  sessionId: string
  roleId: string
}
```

**JWT payload MUST NEVER contain:**
* email
* permissions
* password
* status
* mustChangePassword

---

### 4.2 PASSWORD RULES
**Password hashing:**
* Argon2id ONLY
* Never use bcrypt
* Never log passwords
* Never return passwordHash

**Temporary password:**
* Generated server-side
* Returned ONCE
* Never stored raw
* mustChangePassword = true

---

### 4.3 SESSION SECURITY
**Every refresh token MUST:**
* Be hashed before DB storage
* Be rotated
* Be revocable
* Be session-bound

**Every request MUST validate:**
* User exists
* User ACTIVE
* User not deleted
* Session exists
* Session not revoked
* Session not expired

---

### 4.4 MULTI-TENANT SECURITY
**ALL queries MUST:**
* Include tenantId
* Exclude deletedAt != null

**Controllers MUST NEVER:**
* Accept tenantId from body
* Accept tenantId from query
* Accept tenantId from params

**tenantId source:**
```typescript
@CurrentUser() user: AuthUser
```

---

## 5. USER MODULE RULES

### 5.1 USER MODEL
**User fields:**
* nip
* address
* contact
* emailVerifiedAt
* mustChangePassword

**Owner rules:**
* OWNER has no NIP
* OWNER login via email only

**Employee rules:**
* Employee MUST have generated NIP
* Login via email OR NIP

---

### 5.2 PROFILE COMPLETION RULES
Before entering app, User MUST complete:
* name
* email
* address
* contact

*avatarUrl optional.*

If incomplete:
* backend returns `profileCompleted = false`
* frontend redirects to complete-profile flow

---

### 5.3 EMAIL VERIFICATION RULES
**Email verification:**
* OTP or magic link
* `emailVerifiedAt = null` => unverified
* Unverified email blocks access to protected app areas

---

## 6. RBAC RULES

**Permission format:**
`module.action`

**Examples:**
* `users.read`
* `users.create`
* `inventory.update`
* `finance.approve`

**System roles:**
* OWNER
* SUPER_ADMIN

**System roles:**
* Cannot be deleted
* Cannot be modified
* Cannot have permissions reassigned

**PermissionGuard:**
* OR logic
* Stateless
* DB-driven
* No hardcoded permission map

---

## 7. DATABASE RULES

### 7.1 PRISMA RULES
**Prisma MUST:**
* Use explicit select
* Avoid include unless necessary
* Use transactions where needed
* Use soft delete

**All models MUST:**
* Have `createdAt`
* Have `updatedAt`
* Have `deletedAt` when applicable
* Have `@@map()`

---

### 7.2 QUERY RULES
**AI MUST:**
* Reuse select objects
* Avoid N+1 queries
* Use `Promise.all` when appropriate
* Use pagination

**AI MUST NEVER:**
* Select `passwordHash` unnecessarily
* Return Prisma entities directly
* Use raw SQL unless approved

---

## 8. CONTROLLER RULES
All protected controllers MUST use:
```typescript
@UseGuards(JwtAuthGuard, PermissionGuard)
```

All protected endpoints MUST use:
```typescript
@Permission('module.action')
```

Controllers MUST remain thin.

---

## 9. DTO RULES
**DTOs MUST:**
* Use `class-validator`
* Use whitelist validation
* Use explicit decorators
* Reject unknown fields

**DTOs MUST NEVER:**
* Expose internal fields
* Accept tenantId
* Accept mustChangePassword
* Accept emailVerifiedAt

---

## 10. ERROR HANDLING RULES
Use NestJS exceptions ONLY:
* `BadRequestException`
* `UnauthorizedException`
* `ForbiddenException`
* `NotFoundException`
* `ConflictException`
* `UnprocessableEntityException`
* `InternalServerErrorException`

**Do NOT:**
* throw raw Error
* leak DB errors
* leak stack traces

---

## 11. LOGGING RULES
**Never log:**
* passwords
* refresh tokens
* JWT secrets
* raw auth headers

**Allowed logging:**
* userId
* sessionId
* tenantId
* action type

---

## 12. RESPONSE RULES
**Responses MUST:**
* Use typed DTOs
* Hide internal fields
* Return derived booleans when appropriate

**Example:**
```typescript
emailVerified: emailVerifiedAt !== null
```

**Do NOT expose:**
* passwordHash
* refreshTokenHash
* internal DB fields

---

## 13. CODE STYLE RULES

**AI MUST:**
* Use explicit typing
* Avoid `any`
* Use `readonly` when possible
* Prefer `const` over `let`
* Keep functions small
* Keep services deterministic

**AI MUST NEVER:**
* Use magic strings
* Use deeply nested logic
* Create god services
* Duplicate validation logic

---

## 14. TESTING RULES
Every feature SHOULD include:
* success scenario
* invalid input scenario
* permission scenario
* tenant isolation scenario
* security scenario

---

## 15. CURRENT IMPLEMENTATION STATUS
**Completed:**
* Phase 1 — Core Foundation
* Phase 2 — Auth & Security
* Phase 3.1 — User/RBAC Structure
* Phase 3.2 — UserRepository
* Phase 3.3 — UserService
* Phase 3.4 — UsersController + DTO + Module
* Phase 3.5 — RBAC Repository
* Phase 3.6 — RbacService
* Phase 3.7 — RBAC Controller + DTO + Module
* Phase 3.8 — Seeder System

**Next:**
* Audit Module
* Notification Module
* Inventory Module
* Warehouse Module
* Finance Module
* Reporting Module

---

## 16. AI EXECUTION MODE
When generating code:
1. Read architecture first
2. Respect existing patterns
3. Reuse established conventions
4. Do not invent new architecture
5. Keep security-first mindset
6. Keep enterprise-grade quality

**AI MUST:**
* Explain architectural impact before major refactor
* Avoid breaking changes
* Keep implementation incremental
* Keep modules isolated

---

## 17. GOLDEN RULE
* Security > Convenience
* Consistency > Cleverness
* Explicit > Implicit
* Architecture > Speed
* Enterprise Stability > Shortcuts
