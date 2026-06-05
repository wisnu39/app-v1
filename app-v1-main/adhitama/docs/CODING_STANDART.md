# CODING_STANDARDS.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked

---

## 1. Coding Standards Goals

Dokumen ini bertujuan untuk memastikan:
* consistency
* maintainability
* readability
* scalability
* production readiness
* low technical debt

Seluruh developer wajib mengikuti standar ini.

---

## 2. General Engineering Principles

### Core Principles
Semua code harus:
* clean
* readable
* modular
* reusable
* predictable
* testable
* extensible

### Anti-Patterns Yang Dilarang
**DILARANG:**
* god service
* fat controller
* business logic di controller
* direct Prisma access di controller
* duplicated logic
* hardcoded business rules
* circular dependency
* `any` type abuse
* massive utility dumping

---

## 3. TypeScript Standards

### Strict Mode
**WAJIB:**
```json
{
  "strict": true
}
```

### Type Safety
**DILARANG:** `any`

**Gunakan:**
* interface
* type
* generics
* union type
* enum

### Explicit Return Type
**WAJIB** untuk service method penting:
```typescript
async createUser(): Promise<User>
```

---

## 4. Naming Convention

### General Rules
Gunakan:
* descriptive naming
* konsisten
* mudah dibaca

### File Naming
Gunakan: `kebab-case`

**Contoh:**
* `user.service.ts`
* `inventory.repository.ts`
* `payment.controller.ts`

### Class Naming
Gunakan: `PascalCase`

**Contoh:**
* `UserService`
* `RentalRepository`
* `PaymentController`

### Variable & Function Naming
Gunakan: `camelCase`

**Contoh:**
* `getCustomerInvoices()`
* `calculateOutstandingAmount()`

### Constant Naming
Gunakan: `UPPER_SNAKE_CASE`

**Contoh:**
* `MAX_RETRY_ATTEMPT`
* `DEFAULT_PAGE_SIZE`

---

## 5. Folder Structure Standards

### Backend Structure
Gunakan struktur:
```text
src/
├── core/
├── modules/
├── common/
├── config/
```

### Frontend Structure
Gunakan struktur:
```text
src/
├── app/
├── features/
├── shared/
├── layouts/
├── pages/
```

---

## 6. Backend Architecture Standards

### Layering Rules
**WAJIB:**
> Controller → Service / UseCase → Repository → Database

### Controller Rules
Controller hanya boleh:
* routing
* validation
* auth guard
* response handling

**DILARANG:**
* business logic
* query database langsung

### Service Rules
Service bertanggung jawab terhadap:
* business rules
* orchestration
* transaction workflow

### Repository Rules
Repository bertanggung jawab terhadap:
* database access
* query abstraction
* persistence logic

---

## 7. Prisma Standards

### Prisma Usage Rules
Prisma hanya boleh digunakan:
* repository
* infrastructure layer

**DILARANG:**
* controller access Prisma
* direct Prisma di frontend service

### Query Standards
**WAJIB:**
* selective query
* avoid overfetching
* indexed filtering
* pagination

### Transaction Standards
**WAJIB** transaction untuk:
* stock movement
* payment posting
* invoice finalization
* stock transfer
* rental pickup/return

---

## 8. DTO Standards

### DTO Rules
Semua request wajib menggunakan DTO.

### Validation Rules
Gunakan:
* `class-validator`
* `class-transformer`

### DTO Separation
Pisahkan:
* Create DTO
* Update DTO
* Query DTO
* Response DTO (optional future)

---

## 9. Error Handling Standards

### Error Strategy
Gunakan:
* centralized exception handling
* standardized error response

### DILARANG
`throw new Error()`

Gunakan:
* `BadRequestException`
* `ForbiddenException`
* `UnauthorizedException`
* `ConflictException`

---

## 10. Logging Standards

### Logging Rules
Gunakan:
* structured logging
* contextual logging

### Wajib Log
* auth event
* payment event
* stock movement
* system error
* external integration failure

### Jangan Log
**DILARANG log:**
* password
* token
* sensitive credential

---

## 11. Audit Standards

### Audit-Worthy Actions
**WAJIB** audit log:
* create
* update
* delete
* payment
* stock movement
* invoice finalization

### Audit Strategy
Gunakan:
* interceptor
* decorator
* async logging

---

## 12. Security Standards

### Security Rules
**WAJIB:**
* DTO validation
* JWT verification
* RBAC permission guard
* secure password hashing
* rate limiting

### Password Standards
Gunakan:
* Argon2
* hashed refresh token
* no plain password storage

---

## 13. Frontend Standards

### Frontend Architecture
Gunakan:
* feature-based architecture
* reusable component
* centralized API layer

### State Management
Gunakan:
* Zustand → global auth/session
* React Query → server state

### Frontend Rules
**DILARANG:**
* business logic besar di component
* API call langsung di UI component
* duplicated query logic

---

## 14. API Standards

### API Consistency
Semua endpoint wajib:
* standardized response
* consistent naming
* versioned

### Pagination Rules
Gunakan:
* `page`
* `limit`
* `search`
* `sortBy`
* `sortOrder`

---

## 15. Database Standards

### Entity Standards
Semua entity utama wajib memiliki:
* `id`
* `createdAt`
* `updatedAt`
* `deletedAt`
* `tenantId`

### Financial & Ledger Rules
Data berikut immutable:
* payment
* stock movement
* invoice snapshot
* audit log

---

## 16. Testing Standards

### Testing Requirement
Minimal support:
* unit testing
* integration testing

### Critical Flow Tests
**WAJIB** test:
* auth flow
* payment flow
* stock movement
* rental workflow

---

## 17. Git Standards

### Branch Naming
Gunakan:
* `feature/auth`
* `feature/inventory`
* `fix/payment-bug`

### Commit Convention
Gunakan:
* `feat:`
* `fix:`
* `refactor:`
* `docs:`
* `test:`
* `chore:`

**Contoh:**
* `feat: add rental availability service`
* `fix: repair invoice outstanding calculation`

---

## 18. Performance Standards

### Query Optimization
**WAJIB:**
* pagination
* indexed query
* avoid N+1 query
* selective loading

### Cache Strategy
Gunakan cache untuk:
* permissions
* dashboard summary
* frequently accessed lookup

---

## 19. Extensibility Standards

### Future-Ready Architecture
Code harus siap untuk:
* payroll
* accounting
* analytics
* notification
* mobile app
* SaaS expansion

### Extensibility Rules
**WAJIB:**
* loose coupling
* interface abstraction
* reusable shared logic

---

## 20. Documentation Standards

### Documentation Rules
Setiap module wajib memiliki:
* README
* flow explanation
* important business rules

### Complex Logic Documentation
**WAJIB** dokumentasi untuk:
* stock algorithm
* availability engine
* invoice calculation
* payment allocation

---

## 21. Final Engineering Philosophy

Adhitama dibangun dengan prinsip:
> "Enterprise-grade maintainability over short-term speed"

Prioritas utama:
* maintainability
* stability
* extensibility
* operational clarity
* predictable architecture
