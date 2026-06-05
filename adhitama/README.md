# Adhitama Enterprise Rental ERP

> Enterprise Operational Rental ERP Platform

---

## Overview

Adhitama adalah platform Enterprise Rental ERP yang dirancang untuk perusahaan jasa sewa tenda, alat pesta, dan perlengkapan event.

---

## Monorepo Structure

```
adhitama/
├── apps/
│   ├── api/          # NestJS Backend API
│   └── web/          # React Frontend (Phase 1+)
├── packages/
│   ├── shared-types/       # (future)
│   ├── shared-constants/   # (future)
│   └── shared-validation/  # (future)
├── docs/             # Architecture & module documentation
├── docker/           # Docker configurations
├── scripts/          # Utility scripts
├── .editorconfig
├── .gitignore
├── .npmrc
└── package.json
```

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Backend     | NestJS, TypeScript (strict)       |
| ORM         | Prisma                            |
| Database    | PostgreSQL                        |
| Cache       | Redis                             |
| Frontend    | React, Vite, Tailwind, Zustand    |
| Monorepo    | npm workspaces                    |

---

## Requirements

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose

---

## Development Phases

| Phase | Focus                          | Status      |
|-------|--------------------------------|-------------|
| 0     | Blueprint & Documentation      | ✅ Complete |
| 1     | Foundation Bootstrap           | 🔄 Active   |
| 2     | Auth & Security                | Planned     |
| 3     | User & RBAC                    | Planned     |
| 4     | Customer Module                | Planned     |
| 5     | Inventory Foundation           | Planned     |
| 6     | Warehouse Workflow             | Planned     |
| 7     | Rental Core Engine             | Planned     |
| 8     | Invoice & Payment              | Planned     |
| 9     | Operational Workflow           | Planned     |
| 10    | Dashboard & Reporting          | Planned     |
| 11    | Stabilization & Production     | Planned     |

---

## Getting Started

```bash
# Install all workspace dependencies
npm install

# Start API (development)
npm run api:dev
```

---

## Architecture

See `docs/` for full architecture documentation.

Key documents:
- `PRD.md` — Product Requirements
- `ARCHITECTURE.md` — System Architecture
- `DATABASE_DESIGN.md` — Database Design
- `BUSINESS_RULES.md` — Business Rules
- `CODING_STANDARDS.md` — Coding Standards
- `API_STANDARD.md` — API Standards
- `SECURITY_DESIGN.md` — Security Design
- `FOLDER_STRUCTURE.md` — Folder Structure
- `DEVELOPMENT_ROADMAP.md` — Development Roadmap
- `MASTER_IMPLEMENTATION_PLAN.md` — Implementation Plan
