# ARCHITECTURE.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked

---

## 1. Architecture Goals

Arsitektur Adhitama dirancang untuk:
* enterprise scalability
* maintainability
* modular extensibility
* operational reliability
* financial consistency
* low coupling
* production readiness

---

## 2. Architecture Philosophy

Adhitama menggunakan prinsip:
> “Modular enterprise architecture with strict business boundaries.”

Prioritas utama:
* maintainability
* scalability
* predictable workflow
* transaction safety
* auditability

---

## 3. High-Level Architecture

### System Architecture

```text
Frontend (React + Vite + Tauri-ready)
        ↓
API Gateway Layer (NestJS)
        ↓
Business Modules Layer
        ↓
Core Infrastructure Layer
        ↓
PostgreSQL + Redis + Storage
```

---

## 4. Architecture Style

### Backend Architecture Style
Backend menggunakan kombinasi:
* Modular Monolith
* Clean Architecture principles
* DDD-lite boundaries
* Layered Architecture

### Frontend Architecture Style
Frontend menggunakan:
* Feature-Based Architecture
* Modular UI Architecture
* API-Driven Architecture

---

## 5. Monorepo Architecture

### Repository Strategy
Gunakan:
* Monorepo Architecture

### Monorepo Structure
```text
adhitama/
├── apps/
│   ├── api/
│   └── web/
├── packages/
├── docs/
├── docker/
└── scripts/
```

---

## 6. Backend Architecture

### Backend Technology Stack
Backend menggunakan:
* NestJS
* Prisma ORM
* PostgreSQL
* Redis

---

## 7. Backend Layering

### Layer Structure
> Controller → Service → Repository → Prisma → Database

### Layer Responsibilities

#### Controller
Bertanggung jawab terhadap:
* routing
* DTO validation
* auth guard
* response formatting

#### Service
Bertanggung jawab terhadap:
* business logic
* workflow orchestration
* transaction coordination

#### Repository
Bertanggung jawab terhadap:
* database access
* query abstraction
* persistence layer

---

## 8. Core Infrastructure Layer

### Core Modules
```text
core/
├── auth/
├── rbac/
├── database/
├── redis/
├── logger/
├── cache/
├── audit/
├── tenant/
├── queue/
└── storage/
```

### Core Principles
Core module harus:
* reusable
* framework-oriented
* business-independent

---

## 9. Business Module Architecture

### Business Modules
```text
modules/
├── customer/
├── inventory/
├── warehouse/
├── rental/
├── invoice/
├── payment/
├── operational/
├── dashboard/
└── finance/
```

### Module Principles
Setiap module:
* isolated
* loosely coupled
* independently maintainable

---

## 10. Domain Boundary Strategy

### Business Boundary Rules
Setiap domain:
* memiliki business responsibility jelas
* tidak boleh bocor ke domain lain
* komunikasi melalui service contract

### Example
Rental module:
* tidak boleh manipulasi stock langsung
* wajib menggunakan `StockService`

---

## 11. Transaction Architecture

### Transaction Rules
Semua workflow kritikal wajib:
* atomic
* transaction-safe
* rollback-capable

### Critical Transaction Areas
**WAJIB** transaction:
* stock reservation
* pickup
* return
* payment posting
* invoice finalization
* stock transfer

---

## 12. Inventory Architecture

### Inventory Strategy
Gunakan:
* Immutable Ledger Architecture

### Stock Movement Rules
Stock tidak boleh berubah langsung.
Semua perubahan wajib:
* melalui `StockMovement`
* *transaction-safe*
* *audit logged*

### Stock Categories
* available
* reserved
* rented
* damaged
* lost

---

## 13. Rental Architecture

### Rental Workflow Engine
Rental menggunakan:
* state machine architecture

### Rental Status Flow
> DRAFT → RESERVED → CONFIRMED → ACTIVE → RETURNED → COMPLETED → CANCELLED

### Workflow Validation
Semua transisi status:
* wajib tervalidasi
* tidak boleh skip workflow

---

## 14. Availability Engine Architecture

### Availability Strategy
Availability menggunakan:
* date-range calculation
* overlapping reservation analysis
* warehouse-aware stock

### Availability Formula
Konsep availability:
$$	ext{Available Stock} = 	ext{Total Stock} - (	ext{Reserved} + 	ext{Rented})$$

---

## 15. Financial Architecture

### Financial Design Goals
Financial architecture harus:
* immutable
* traceable
* auditable

### Invoice Strategy
Invoice menggunakan:
* immutable snapshot

### Payment Strategy
Payment menggunakan:
* append-only ledger

### Outstanding Formula
$$	ext{Outstanding} = 	ext{Invoice Total} - 	ext{Total Payment}$$

---

## 16. Customer Financial Architecture

### Customer-Centric Financial Design
Customer menjadi pusat:
* invoice
* payment
* outstanding
* rental history

### Consolidated Invoice Support
Support:
* invoice per order
* invoice gabungan multi reservasi

---

## 17. Operational Architecture

### Operational Workflow
Operational workflow mencakup:
* delivery checklist
* return checklist
* operational assignment
* operational report
* operational expense

### Employee Assignment
Assignment menggunakan:
* User module integration

### Payroll Foundation
Operational data disiapkan untuk:
* payroll v2
* incentive
* reimbursement

---

## 18. Audit Architecture

### Audit Strategy
Gunakan:
* decorator
* interceptor
* async logging

### Audit Principles
Audit harus:
* non-blocking
* traceable
* redact sensitive data

### Mandatory Audit Areas
**WAJIB** audit:
* auth activity
* payment
* stock movement
* invoice finalization
* operational update

---

## 19. Security Architecture

### Security Layers
> Authentication → Authorization → Tenant Isolation → DTO Validation → Audit Logging

### Authentication
Gunakan:
* JWT access token
* refresh token rotation
* multi-session

### Authorization
Gunakan:
* RBAC
* permission guard
* least privilege access

---

## 20. Multi-Tenant Architecture

### Tenant Strategy
Semua entity bisnis wajib:
* tenant-aware
* isolated

### Tenant Resolution
Tenant dapat berasal dari:
* JWT
* subdomain
* request header

---

## 21. Frontend Architecture

### Frontend Stack
Frontend menggunakan:
* React
* Vite
* Zustand
* TanStack Query
* Tailwind CSS

### Frontend Principles
Frontend harus:
* feature-based
* permission-aware
* API-driven
* modular

---

## 22. State Management Architecture

### Zustand Usage
Gunakan Zustand untuk:
* auth state
* UI state
* session state

### React Query Usage
Gunakan React Query untuk:
* server state
* cache
* background refresh
* optimistic update

---

## 23. API Architecture

### API Standards
Semua API:
* RESTful
* versioned
* standardized response

### API Response Format
```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```

---

## 24. Cache Architecture

### Redis Usage
Redis digunakan untuk:
* session cache
* permission cache
* token blacklist
* dashboard cache

### Cache Principles
Cache:
* optional
* disposable
* never source of truth

---

## 25. Queue & Async Architecture

### Queue Usage
Digunakan untuk:
* audit processing
* notification
* PDF generation
* future async workflow

### Queue Principles
Async job:
* retryable
* observable
* isolated

---

## 26. File & PDF Architecture

### File Strategy
Support:
* invoice PDF
* receipt PDF
* operational attachment

### Storage Strategy
Storage harus:
* S3-compatible
* cloud-ready
* replaceable

---

## 27. Reporting Architecture

### Reporting Goals
Report harus:
* fast
* traceable
* filterable
* tenant-aware

### Reporting Types
Support:
* financial report
* operational report
* profitability report
* receivable report

---

## 28. Scalability Strategy

### Scalability Goals
Arsitektur harus siap untuk:
* multi warehouse
* multi branch
* SaaS expansion
* accounting integration
* payroll integration

---

## 29. Extensibility Strategy

### Future Module Support
Arsitektur harus siap untuk:
* accounting
* payroll
* analytics
* notification
* mobile app

### Refactor Prevention
Gunakan:
* modular architecture
* interface abstraction
* isolated domain

---

## 30. Deployment Architecture

### Deployment Readiness
System harus siap untuk:
* Docker
* VPS deployment
* cloud deployment
* CI/CD

### Environment Separation
Minimal:
* local
* staging
* production

---

## 31. Observability Architecture

### Monitoring Goals
Support:
* structured logging
* health monitoring
* audit tracing
* performance analysis

### Health Monitoring
Minimal:
* database health
* Redis health
* storage health

---

## 32. Final Architecture Philosophy

Adhitama dibangun dengan prinsip:
> “Enterprise systems survive through modularity, predictability, and operational integrity.”

Prioritas utama:
* maintainability
* financial consistency
* operational traceability
* scalability
* long-term extensibility
