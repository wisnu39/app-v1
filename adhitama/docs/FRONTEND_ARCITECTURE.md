# FRONTEND_ARCHITECTURE.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked

---

## 1. Frontend Architecture Goals

Frontend dirancang untuk:
* enterprise scalability
* maintainability
* predictable UI behavior
* modular growth
* desktop readiness
* operational usability
* permission-driven workflow

---

## 2. Frontend Technology Stack

### Core Stack
Frontend menggunakan:
* React
* Vite
* TypeScript strict mode
* TailwindCSS
* Zustand
* React Query

### Future Desktop Stack
Frontend harus siap untuk:
* Tauri integration

Tujuan:
* desktop ERP application
* offline-capable future
* secure desktop runtime

---

## 3. Frontend Architecture Style

### Architecture Style
Gunakan:
* feature-based architecture
* modular frontend structure
* centralized API layer
* reusable UI system

### Core Principles
Frontend harus:
* scalable
* reusable
* predictable
* permission-aware
* API-driven

---

## 4. Folder Structure

### Recommended Structure
```text
src/
├── app/
├── features/
├── shared/
├── layouts/
├── pages/
├── routes/
├── stores/
├── providers/
├── styles/
├── types/
├── utils/
```

---

## 5. Feature-Based Structure

### Feature Module Example
```text
features/
└── rental/
    ├── api/
    ├── components/
    ├── hooks/
    ├── pages/
    ├── schemas/
    ├── stores/
    ├── types/
    └── utils/
```

### Feature Rules
Setiap feature:
* isolated
* reusable
* loosely coupled

---

## 6. Routing Architecture

### Routing Rules
Gunakan:
* centralized route definition
* lazy-loaded pages
* protected route system

### Route Protection
Semua protected route wajib:
* authentication check
* permission check
* session validation

### Example
```tsx
<ProtectedRoute permission="inventory.read">
  <InventoryPage />
</ProtectedRoute>
```

---

## 7. State Management Strategy

### Zustand Usage
Gunakan Zustand untuk:
* auth session
* user info
* UI preferences
* lightweight global state

### React Query Usage
Gunakan React Query untuk:
* server state
* API caching
* optimistic update
* query invalidation

### Forbidden
**DILARANG:**
* server state di Zustand
* duplicated query state
* manual cache duplication

---

## 8. API Layer Architecture

### Centralized API Client
Semua API wajib melalui:
* centralized axios/fetch client

### API Responsibilities
API layer bertanggung jawab terhadap:
* token injection
* refresh token flow
* error normalization
* request retry
* response typing

### Forbidden
**DILARANG:**
* fetch langsung di component
* duplicate API logic
* hardcoded endpoint

---

## 9. Authentication Architecture

### Auth Flow
Frontend wajib mendukung:
* login
* logout
* token refresh
* multi-session handling

### Session Persistence
Gunakan:
* secure storage abstraction
* session restore strategy

### Invalid Session Strategy
Jika session invalid:
* auto logout
* redirect login
* clear cache/state

---

## 10. Permission Architecture

### Permission-Based UI
UI harus:
* permission-aware
* role-aware

### Example
```typescript
can('invoice.create')
canAny(['inventory.read', 'inventory.update'])
```

### UI Security Principle
Permission check frontend:
* hanya untuk UX
* backend tetap source of truth

---

## 11. Component Architecture

### Component Categories
Pisahkan:
* UI components
* feature components
* layout components
* form components

### Shared Components
Shared component wajib:
* reusable
* presentation-focused
* loosely coupled

### Forbidden
**DILARANG:**
* business logic besar di component
* API call langsung di UI component

---

## 12. Form Architecture

### Form Rules
Gunakan:
* reusable form component
* schema validation
* typed form data

### Validation Strategy
Frontend validation:
* UX enhancement only

Backend:
* tetap validation source of truth

---

## 13. Table & List Architecture

### Enterprise Table Requirements
Semua table harus support:
* pagination
* sorting
* filtering
* searching
* loading state
* empty state

### Reusable Table System
Gunakan reusable:
* `DataTable`
* `FilterBar`
* `Pagination` component

---

## 14. Dashboard Architecture

### Dashboard Goals
Dashboard harus:
* fast
* cache-friendly
* analytics-ready

### Dashboard Data
Support:
* operational summary
* financial summary
* outstanding invoice
* stock alert
* active rental

---

## 15. Operational Workflow UI

### Operational Features
UI harus mendukung:
* delivery checklist
* return checklist
* warehouse inspection
* operational report
* operational expense input

### Operational Timeline
Rental detail harus memiliki:
* status timeline
* operational timeline
* payment timeline

---

## 16. Financial UI Architecture

### Financial Features
UI harus mendukung:
* invoice management
* payment history
* outstanding tracking
* profitability summary

### Customer Financial View
Customer detail harus menampilkan:
* total transaction
* outstanding balance
* overdue invoice
* payment history

---

## 17. Error Handling Architecture

### Global Error Handling
Frontend wajib memiliki:
* centralized error handling
* standardized error parsing
* notification strategy

### User Feedback
Semua action wajib memiliki:
* loading state
* success feedback
* error feedback

---

## 18. Loading & UX Standards

### Loading Strategy
Gunakan:
* skeleton loading
* optimistic UI
* background refresh

### UX Goals
ERP harus:
* cepat digunakan
* minim klik
* keyboard-friendly future
* operationally efficient

---

## 19. Theme & Design System

### Theme Strategy
Gunakan:
* centralized theme variables
* dark ERP theme
* gold accent palette

### Design Goals
UI harus:
* professional
* operational-friendly
* enterprise-focused
* consistent

---

## 20. Responsive Strategy

### Responsive Rules
Prioritas:
1. Desktop
2. Laptop
3. Tablet
4. Mobile (optional)

### Desktop Optimization
Karena ERP:
* dense information layout
* multi-panel workflow
* operational dashboard heavy

---

## 21. Frontend Security

### Security Rules
**DILARANG:**
* expose secret env
* insecure token storage
* bypass permission check

### Sensitive Data Handling
Jangan tampilkan:
* token
* secret credential
* sensitive internal data

---

## 22. Performance Strategy

### Frontend Performance
**WAJIB:**
* route lazy loading
* query caching
* component memoization
* virtualization future-ready

### Avoid
**DILARANG:**
* unnecessary rerender
* duplicated query
* large uncontrolled state

---

## 23. Future Extensibility

Frontend harus siap untuk:
* payroll module
* accounting module
* analytics dashboard
* notification center
* mobile app
* desktop app

---

## 24. Final Frontend Philosophy

Frontend Adhitama dibangun dengan prinsip:
> “Enterprise operational UI must be predictable, fast, permission-aware, and maintainable.”

Prioritas utama:
* maintainability
* operational clarity
* modular growth
* consistent UX
* scalability
