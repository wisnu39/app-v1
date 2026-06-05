# FOLDER_STRUCTURE.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked

---

## 1. Folder Structure Goals

Struktur folder dirancang untuk:
* enterprise scalability
* maintainability
* modular growth
* low coupling
* clean architecture
* predictable navigation
* future extensibility

---

## 2. Monorepo Structure

Adhitama menggunakan:
* monorepo architecture

Tujuan:
* shared typing
* shared validation
* reusable package
* easier scaling

---

## 3. Root Structure

### Recommended Root Layout
```text
adhitama/
├── apps/
├── packages/
├── docs/
├── docker/
├── scripts/
├── .github/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 4. Apps Structure

### Main Applications
```text
apps/
├── api/     # NestJS Backend
└── web/     # React Frontend
```

---

## 5. Backend Folder Structure

### Backend Root Structure
```text
apps/api/src/
├── core/
├── modules/
├── common/
├── config/
├── infrastructure/
├── integrations/
├── jobs/
├── main.ts
└── app.module.ts
```

---

## 6. Backend Core Structure

`core/` berisi reusable enterprise foundation.

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
├── health/
├── queue/
└── storage/
```

### Core Rules
Core module:
* reusable
* framework-oriented
* business-agnostic

---

## 7. Backend Modules Structure

`modules/` berisi seluruh business module.

```text
modules/
├── user/
├── customer/
├── inventory/
├── warehouse/
├── rental/
├── invoice/
├── payment/
├── operational/
├── dashboard/
├── report/
└── finance/
```

---

## 8. Standard Module Structure

### Example Module Layout
```text
inventory/
├── controllers/
├── services/
├── repositories/
├── dto/
├── entities/
├── enums/
├── interfaces/
├── mappers/
├── policies/
├── validators/
├── events/
├── listeners/
├── utils/
├── tests/
├── inventory.module.ts
└── README.md
```

---

## 9. Module Layering Rules

### Dependency Direction
**WAJIB:**
> Controller → Service → Repository → Database

### Forbidden
**DILARANG:**
* controller access Prisma langsung
* service access HTTP request directly
* cross-module chaos dependency

---

## 10. Common Structure

`common/` berisi shared reusable utility.

```text
common/
├── constants/
├── decorators/
├── dto/
├── enums/
├── exceptions/
├── filters/
├── guards/
├── interceptors/
├── interfaces/
├── pipes/
├── responses/
├── types/
├── utils/
└── validators/
```

---

## 11. Config Structure

```text
config/
├── app.config.ts
├── auth.config.ts
├── database.config.ts
├── redis.config.ts
├── storage.config.ts
├── queue.config.ts
└── validation.schema.ts
```

---

## 12. Infrastructure Structure

`infrastructure/` berisi implementasi external provider.

```text
infrastructure/
├── prisma/
├── redis/
├── storage/
├── mail/
├── queue/
└── pdf/
```

---

## 13. Integrations Structure

`integrations/` untuk third-party integration.

```text
integrations/
├── whatsapp/
├── payment-gateway/
├── accounting/
└── notification/
```

---

## 14. Jobs Structure

`jobs/` untuk async processing & scheduled task.

```text
jobs/
├── processors/
├── schedulers/
├── queues/
└── workers/
```

---

## 15. Frontend Folder Structure

### Frontend Root Structure
```text
apps/web/src/
├── app/
├── features/
├── shared/
├── layouts/
├── pages/
├── routes/
├── providers/
├── stores/
├── styles/
├── assets/
├── hooks/
├── types/
├── utils/
└── main.tsx
```

---

## 16. Frontend Feature Structure

### Feature-Based Architecture
```text
features/
├── auth/
├── user/
├── customer/
├── inventory/
├── warehouse/
├── rental/
├── invoice/
├── payment/
├── operational/
└── dashboard/
```

---

## 17. Standard Frontend Feature Structure

### Example Feature Layout
```text
rental/
├── api/
├── components/
├── hooks/
├── pages/
├── forms/
├── schemas/
├── stores/
├── tables/
├── timeline/
├── types/
├── utils/
└── index.ts
```

---

## 18. Shared Frontend Structure

`shared/` berisi reusable frontend component.

```text
shared/
├── components/
├── ui/
├── table/
├── form/
├── modal/
├── layout/
├── icons/
├── constants/
├── types/
└── utils/
```

---

## 19. Layout Structure

```text
layouts/
├── app-layout/
├── auth-layout/
├── dashboard-layout/
└── public-layout/
```

---

## 20. Route Structure

```text
routes/
├── app.routes.tsx
├── protected.routes.tsx
├── public.routes.tsx
└── permission.routes.tsx
```

---

## 21. Store Structure

```text
stores/
├── auth.store.ts
├── ui.store.ts
└── preference.store.ts
```

---

## 22. Packages Structure

`packages/` berisi shared monorepo packages.

```text
packages/
├── shared-types/
├── shared-constants/
├── shared-validation/
├── eslint-config/
├── typescript-config/
└── ui-kit/
```

---

## 23. Docs Structure

```text
docs/
├── architecture/
├── api/
├── database/
├── modules/
├── deployment/
└── decisions/
```

---

## 24. Docker Structure

```text
docker/
├── api/
├── web/
├── postgres/
├── redis/
└── nginx/
```

---

## 25. Scripts Structure

```text
scripts/
├── setup/
├── migration/
├── seed/
├── backup/
└── deployment/
```

---

## 26. Testing Structure

### Backend Testing
```text
tests/
├── unit/
├── integration/
├── e2e/
└── fixtures/
```

### Frontend Testing
```text
__tests__/
├── components/
├── pages/
├── hooks/
└── flows/
```

---

## 27. README Standard

### Every Module Must Have README
Minimal berisi:
* purpose
* flow
* business rules
* dependency
* important warning

---

## 28. Import Standards

### Import Rules
Gunakan:
* path alias
* centralized export

### Forbidden
**DILARANG:**
deep relative import chaos.

**Contoh buruk:**
`../../../../../../utils`

---

## 29. Scalability Strategy

### Structure Must Support
* payroll module
* accounting module
* analytics module
* notification module
* mobile app
* desktop app
* SaaS architecture

---

## 30. Refactor Prevention Strategy

### Folder Philosophy
Struktur folder dibuat untuk:
* minimize refactor
* isolate module
* reduce coupling
* simplify onboarding

### Future Growth Rules
Feature baru harus:
* isolated
* modular
* follow architecture rules

---

## 31. Final Folder Philosophy

Struktur Adhitama menggunakan prinsip:
> “Large enterprise systems survive through predictable structure and disciplined modularity.”

Prioritas utama:
* maintainability
* predictability
* scalability
* operational clarity
* long-term extensibility
