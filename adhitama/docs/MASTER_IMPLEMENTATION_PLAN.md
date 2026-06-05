# MASTER_IMPLEMENTATION_PLAN.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Locked Execution Plan

---

## 1. Purpose

Dokumen ini menjadi:
* panduan implementasi utama
* aturan eksekusi development
* anti-chaos development guide
* refactor prevention guide

Semua proses development **WAJIB** mengikuti dokumen ini.

---

## 2. Core Development Philosophy

Adhitama dikembangkan menggunakan prinsip:
> “Build stable foundations first, then scale business workflows gradually.”

Prioritas:
* Stability
* Maintainability
* Consistency
* Scalability
* Feature expansion

---

## 3. Mandatory Development Rules

### Rule #1 — One Module At A Time
**DILARANG:**
* generate banyak module sekaligus
* generate seluruh ERP dalam satu prompt
* generate frontend + backend + database sekaligus

**WAJIB:**
* selesaikan 1 module
* stabilisasi
* review
* baru lanjut

### Rule #2 — Stabilization First
Setelah setiap module selesai, **WAJIB:**
* lint clean
* build clean
* type clean
* test endpoint
* dependency review
* architecture review

### Rule #3 — No Direct Business Logic In Controller
Controller hanya:
* routing
* validation
* guard
* response

### Rule #4 — Repository Pattern Mandatory
Semua database access **WAJIB:**
* melalui repository
* tidak langsung Prisma di service/controller

### Rule #5 — Transaction Safety Mandatory
Workflow kritikal **WAJIB** transaction-safe:
* stock movement
* payment
* invoice
* rental pickup/return
* stock transfer

---

## 4. Global Technical Standards

### Backend Standards
**WAJIB:**
* NestJS
* Prisma
* PostgreSQL
* Redis
* TypeScript strict mode

### Frontend Standards
**WAJIB:**
* React
* Vite
* Tailwind
* Zustand
* React Query

### Architecture Standards
**WAJIB:**
* modular architecture
* layered architecture
* feature isolation
* DTO validation
* RBAC

---

## 5. Official Development Sequence

### PHASE 0 — Documentation & Blueprint
* **Status:** ✅ COMPLETE

**Deliverables:**
* `PRD.md`
* `ARCHITECTURE.md`
* `DATABASE_DESIGN.md`
* `BUSINESS_RULES.md`
* `SECURITY_DESIGN.md`
* `CODING_STANDARDS.md`
* `API_STANDARD.md`
* `FRONTEND_ARCHITECTURE.md`
* `FOLDER_STRUCTURE.md`
* `DEVELOPMENT_ROADMAP.md`

---

## 6. PHASE 1 — Foundation Bootstrap
* **Status:** NEXT PHASE

### Goals
Membangun foundation production-ready.

### Scope
**Monorepo Setup:**
* pnpm workspace
* turbo repo (optional)
* shared packages

**Backend Bootstrap:**
* NestJS setup
* strict TypeScript
* ESLint
* Prettier
* environment validation

**Infrastructure Setup:**
* PostgreSQL connection
* Prisma setup
* Redis setup
* Docker setup

**Core Foundation:**
* `ConfigModule`
* `LoggerModule`
* `CacheModule`
* `HealthModule`
* `ExceptionFilter`
* `ResponseInterceptor`
* `ValidationPipe`

### Definition Of Done
Foundation dianggap selesai jika:
* app start tanpa error
* build clean
* lint clean
* prisma generate sukses
* prisma migrate sukses
* Redis connect sukses
* Docker compose jalan
* health endpoint aktif

### Forbidden
**DILARANG** di fase ini:
* auth module
* rental module
* inventory module
* invoice module

---

## 7. PHASE 2 — Auth & Security Foundation

### Goals
Membangun authentication & authorization.

### Scope
**Auth:**
* login
* logout
* refresh token rotation
* session management

**Security:**
* JWT strategy
* RBAC
* permission guard
* tenant middleware
* audit foundation

**Frontend:**
* login page
* auth store
* protected route

### Definition Of Done
**WAJIB:**
* login berhasil
* refresh token bekerja
* logout revoke session
* RBAC berjalan
* protected route berjalan

---

## 8. PHASE 3 — User & RBAC Module

### Goals
Membangun user management system.

### Scope
**User Module:**
* CRUD user
* role assignment
* status management

**Role Module:**
* role CRUD
* permission mapping

### Definition Of Done
**WAJIB:**
* permission enforcement bekerja
* role assignment berjalan
* audit log berjalan

---

## 9. PHASE 4 — Customer Module

### Goals
Membangun customer-centric foundation.

### Scope
* customer CRUD
* customer history
* blacklist
* financial summary

### Definition Of Done
**WAJIB:**
* customer financial tracking berjalan
* blacklist restriction berjalan

---

## 10. PHASE 5 — Inventory Foundation

### Goals
Membangun stock engine.

### Scope
* item
* category
* stock
* warehouse
* stock movement ledger

### Critical Rules
**WAJIB:**
* immutable stock movement
* no direct stock mutation
* transaction-safe stock update

### Definition Of Done
**WAJIB:**
* stock consistency terjamin
* movement ledger akurat
* negative stock prevention bekerja

---

## 11. PHASE 6 — Warehouse Workflow

### Goals
Membangun warehouse operation.

### Scope
* stock transfer
* stock opname
* warehouse inspection

### Definition Of Done
**WAJIB:**
* transfer transaction-safe
* opname adjustment akurat

---

## 12. PHASE 7 — Rental Core Engine

### Goals
Membangun rental workflow engine.

### Scope
* reservation
* availability engine
* pickup
* return
* extension
* cancellation

### Critical Rules
**WAJIB:**
* overlap-aware availability
* warehouse-aware reservation
* immutable rental snapshot

### Definition Of Done
**WAJIB:**
* reservation conflict prevention berjalan
* return flow stabil
* stock sync valid

---

## 13. PHASE 8 — Invoice & Payment

### Goals
Membangun financial workflow.

### Scope
* invoice
* payment
* outstanding tracking
* consolidated invoice

### Critical Rules
**WAJIB:**
* immutable invoice snapshot
* append-only payment history

### Definition Of Done
**WAJIB:**
* outstanding calculation valid
* invoice status automation valid

---

## 14. PHASE 9 — Operational Workflow

### Goals
Membangun operational tracking.

### Scope
* delivery checklist
* return checklist
* operational report
* operational expense
* employee assignment

### Definition Of Done
**WAJIB:**
* operational traceability lengkap
* damaged/lost tracking berjalan

---

## 15. PHASE 10 — Dashboard & Reporting

### Goals
Membangun analytics & reporting.

### Scope
* dashboard
* revenue report
* receivable report
* profitability report

### Definition Of Done
**WAJIB:**
* report konsisten
* dashboard performant

---

## 16. PHASE 11 — Stabilization & Production Hardening

### Goals
Production readiness.

### Scope
* query optimization
* cache optimization
* bug fixing
* security audit
* Docker optimization
* CI/CD preparation

### Definition Of Done
**WAJIB:**
* production-safe
* observability ready
* monitoring ready

---

## 17. Testing Strategy

### Minimum Requirement
Setiap module **WAJIB:**
* unit test
* integration test
* endpoint validation

### Critical Flow Tests
**WAJIB:**
* auth flow
* payment flow
* stock movement
* rental workflow

---

## 18. AI Usage Strategy

### Claude AI Usage Rules
Gunakan Claude sebagai:
* senior engineer assistant

**JANGAN** sebagai:
* instant ERP generator

### Recommended Prompt Pattern

| Status | Prompt Example |
| :--- | :--- |
| **Benar** | Buat repository layer inventory sesuai architecture.md |
| **Salah** | Buat seluruh inventory module lengkap |

---

## 19. Refactor Prevention Strategy

### Anti-Chaos Rules
**WAJIB:**
* strict layering
* isolated module
* interface abstraction
* feature-by-feature stabilization

### Forbidden
**DILARANG:**
* cross-module coupling
* business logic duplication
* uncontrolled utility dumping

---

## 20. Git Workflow Strategy

### Branch Rules
Gunakan:
* `feature/module-name`
* `fix/bug-name`
* `refactor/module-name`

### Commit Convention
Gunakan:
* `feat:`
* `fix:`
* `refactor:`
* `docs:`
* `test:`
* `chore:`

---

## 21. Production Readiness Goals

System harus siap untuk:
* Docker deployment
* VPS deployment
* cloud deployment
* monitoring
* backup
* SaaS future

---

## 22. Final Implementation Philosophy

Adhitama dikembangkan menggunakan prinsip:
> “Large enterprise systems fail from uncontrolled growth, not lack of features.”

Prioritas utama:
* stable foundation
* disciplined modularity
* predictable architecture
* operational consistency
* maintainable growth
