# DEVELOPMENT_ROADMAP.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked

---

## 1. Roadmap Goals

Roadmap ini dibuat untuk memastikan:
* development stabil
* minim refactor besar
* maintainability tinggi
* arsitektur tetap konsisten
* production-ready growth
* scalable feature delivery

---

## 2. Development Philosophy

Adhitama dibangun menggunakan prinsip:
> “Foundation first, business workflow second, scaling third.”

Artinya:
1. Stabilkan fondasi
2. Bangun core workflow
3. Optimasi & scale

---

## 3. High-Level Development Phases

| Phase | Focus | Status |
| :--- | :--- | :--- |
| **Phase 0** | Blueprint & Documentation | ✅ |
| **Phase 1** | Core Foundation | Planned |
| **Phase 2** | Auth & Security | Planned |
| **Phase 3** | User & RBAC | Planned |
| **Phase 4** | Inventory Foundation | Planned |
| **Phase 5** | Rental Core Engine | Planned |
| **Phase 6** | Warehouse Workflow | Planned |
| **Phase 7** | Customer & Financial | Planned |
| **Phase 8** | Operational Workflow | Planned |
| **Phase 9** | Reporting & Dashboard | Planned |
| **Phase 10** | Stabilization & Production Hardening | Planned |

---

## 4. Phase 0 — Blueprint & Documentation

### Goals
Mengunci:
* business architecture
* technical architecture
* database strategy
* coding standards
* API standards
* security design

### Deliverables
* `PRD.md`
* `DATABASE_DESIGN.md`
* `API_STANDARD.md`
* `CODING_STANDARDS.md`
* `SECURITY_DESIGN.md`
* `FRONTEND_ARCHITECTURE.md`
* `DEVELOPMENT_ROADMAP.md`

---

## 5. Phase 1 — Core Foundation

### Goals
Membangun fondasi backend/frontend production-ready.

### Backend Scope
**Core Infrastructure:**
* NestJS bootstrap
* Prisma setup
* PostgreSQL integration
* Redis integration
* Config module
* Logger module
* Cache module
* Health module

### Frontend Scope
**Frontend Bootstrap:**
* Vite + React setup
* Tailwind setup
* Zustand setup
* React Query setup
* Axios client
* Route system
* Layout system

### Deliverables
```text
Backend:
src/
├── core/
├── common/
├── config/
├── modules/

Frontend:
src/
├── app/
├── features/
├── shared/
├── layouts/
```

---

## 6. Phase 2 — Auth & Security

### Goals
Membangun authentication & security foundation.

### Backend Scope
**Auth System:**
* login
* logout
* refresh token rotation
* multi-session support
* JWT strategy
* Argon2 hashing

**Security Scope:**
* RBAC foundation
* permission decorator
* permission guard
* Redis blacklist
* tenant middleware

### Frontend Scope
* login page
* auth store
* protected route
* token refresh flow

### Deliverables
* secure auth flow
* permission-based routing
* multi-device session

---

## 7. Phase 3 — User & RBAC

### Goals
Membangun user management & permission management.

### Scope
**User Module:**
* CRUD user
* role assignment
* status management
* soft delete

**RBAC:**
* role CRUD
* permission CRUD
* role-permission mapping

### Frontend Scope
* user management page
* role management page
* permission-aware UI

---

## 8. Phase 4 — Inventory Foundation

### Goals
Membangun inventory engine yang stabil.

### Scope
**Inventory Core:**
* item category
* item CRUD
* warehouse CRUD
* stock tracking
* stock movement ledger

### Critical Rules
**WAJIB:**
* immutable stock ledger
* transaction-safe movement
* no direct stock mutation

### Frontend Scope
* item management
* warehouse management
* stock visibility

---

## 9. Phase 5 — Rental Core Engine

### Goals
Membangun rental workflow engine.

### Scope
**Rental Features:**
* reservation
* availability engine
* pickup process
* return process
* extension
* cancellation

### Critical Features
**Availability Engine** support:
* overlapping reservation
* warehouse-aware stock
* date-range calculation

### Frontend Scope
* rental list
* rental detail
* rental timeline
* rental workflow actions

---

## 10. Phase 6 — Warehouse Workflow

### Goals
Membangun warehouse operational workflow.

### Scope
**Warehouse Features:**
* stock transfer
* stock opname
* warehouse inspection
* damaged/lost handling

### Frontend Scope
* transfer workflow
* opname workflow
* warehouse inspection UI

---

## 11. Phase 7 — Customer & Financial

### Goals
Membangun customer finance management.

### Scope
**Customer Features:**
* customer CRUD
* blacklist management
* customer history
* customer financial summary

**Financial Features:**
* invoice
* payment
* outstanding tracking
* consolidated invoice

**PDF Support:**
* invoice PDF
* payment receipt PDF

### Frontend Scope
* customer detail
* invoice page
* payment page
* outstanding dashboard

---

## 12. Phase 8 — Operational Workflow

### Goals
Membangun operational tracking system.

### Scope
**Operational Features:**
* delivery checklist
* return checklist
* operational assignment
* operational report
* operational expense

**Payroll Foundation (Persiapan):**
* employee contribution tracking
* operational metrics
* reimbursement foundation

### Frontend Scope
* checklist UI
* operational report UI
* assignment UI

---

## 13. Phase 9 — Reporting & Dashboard

### Goals
Membangun reporting & analytics foundation.

### Scope
**Dashboard:**
* operational dashboard
* financial dashboard
* stock dashboard

**Reports:**
* revenue report
* outstanding report
* profitability report
* operational report

### Frontend Scope
* analytics dashboard
* reporting UI
* export-ready foundation

---

## 14. Phase 10 — Stabilization & Production Hardening

### Goals
Production hardening & maintainability improvement.

### Scope
**Stability:**
* bug fixing
* query optimization
* cache optimization
* logging refinement

**Security:**
* rate limiting
* security audit
* tenant isolation audit

**Maintainability:**
* refactor cleanup
* dead code cleanup
* documentation improvement

**Production Readiness:**
* Docker optimization
* CI/CD preparation
* monitoring preparation
* backup strategy

---

## 15. Testing Strategy

### Minimum Testing Scope
**Backend:**
* unit test
* integration test
* critical workflow test

**Frontend:**
* component test
* flow test
* permission flow test

### Critical Workflow Tests
**WAJIB:**
* auth flow
* payment flow
* stock movement
* rental workflow

---

## 16. Release Strategy

### Development Environment
* local development
* staging environment
* production environment

### Deployment Strategy
Future-ready:
* Docker deployment
* VPS deployment
* cloud deployment

---

## 17. Refactor Prevention Strategy

### Architecture Rules
Untuk mencegah refactor besar:
**WAJIB:**
* modular architecture
* interface abstraction
* feature isolation
* transaction-safe workflow

### Forbidden
**DILARANG:**
* cross-module chaos
* tightly coupled feature
* hardcoded business rule

---

## 18. Long-Term Expansion Roadmap

### V2 Planned Modules
**Payroll:**
* salary calculation
* incentive
* reimbursement

**Accounting:**
* journal
* ledger
* COA
* cashflow
* P&L

**Notification:**
* WhatsApp integration
* email integration
* due reminder

**Analytics:**
* advanced BI dashboard
* forecasting
* profitability analytics

---

## 19. Final Development Philosophy

Adhitama dikembangkan dengan prinsip:
> “Stability, maintainability, and scalability before feature explosion.”

Prioritas:
* stable foundation
* maintainable architecture
* operational reliability
* scalable business workflow
* future extensibility
