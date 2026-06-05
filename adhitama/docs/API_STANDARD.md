# API_STANDARD.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked

---

## 1. API Design Goals

API dirancang untuk:
* consistency
* maintainability
* scalability
* frontend compatibility
* auditability
* predictable integration
* enterprise-grade standardization

---

## 2. API Architecture Style

### API Type
* REST API
* JSON-based communication
* Versioned API

### API Base Path
`/api/v1`

**Contoh:**
```text
/api/v1/auth/login
/api/v1/customers
/api/v1/rentals
```

---

## 3. API Naming Convention

### Resource Naming
Gunakan:
* plural nouns
* lowercase
* kebab-case bila diperlukan

### Examples
```http
GET    /customers
GET    /customers/:id
POST   /customers
PATCH  /customers/:id
DELETE /customers/:id
```

### Nested Resource Example
```http
GET /rentals/:id/items
GET /customers/:id/invoices
GET /warehouses/:id/stocks
```

---

## 4. HTTP Method Standard

| Method | Fungsi |
| :--- | :--- |
| **GET** | Mengambil data. |
| **POST** | Membuat resource baru. |
| **PATCH** | Partial update. |
| **PUT** | Full replace (jarang digunakan). |
| **DELETE** | Soft delete. |

---

## 5. Standard API Response Format

### Success Response
Semua response sukses wajib menggunakan format:
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {},
  "meta": {}
}
```

### Error Response
Semua error wajib menggunakan format:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ],
  "meta": {}
}
```

---

## 6. Pagination Standard

### Query Parameters
Gunakan:
```text
?page=1
&limit=20
&search=wisnu
&sortBy=createdAt
&sortOrder=desc
```

### Pagination Response
```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 100,
    "totalPages": 5
  }
}
```

---

## 7. Filtering Standard

### Basic Filtering
**Contoh:**
```http
GET /rentals?status=ACTIVE
GET /invoices?status=UNPAID
```

### Date Range Filtering
```http
GET /payments?startDate=2026-01-01&endDate=2026-01-31
```

### Multi Filter Example
```http
GET /rentals?status=ACTIVE&customerId=123
```

---

## 8. Authentication Standard

### JWT Authentication
Gunakan:
`Authorization: Bearer <token>`

### Refresh Token Strategy
* Access token short-lived
* Refresh token rotation
* Session-based validation
* Redis blacklist support

---

## 9. Authorization Standard

### RBAC Permission Guard
Endpoint sensitif wajib menggunakan permission.

**Contoh:**
```typescript
@Permission('inventory.read')
@Permission('rental.create')
```

---

## 10. Validation Standard

### DTO Validation
Semua input wajib:
* menggunakan DTO
* menggunakan `class-validator`
* strict validation enabled

### Validation Error Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Phone number is invalid"
    }
  ]
}
```

---

## 11. Error Handling Standard

### Global Exception Filter
Semua error harus:
* standardized
* sanitized
* traceable

### Error Categories

| HTTP Code | Error Name | Deskripsi |
| :--- | :--- | :--- |
| **400** | Bad Request | Validation / malformed request. |
| **401** | Unauthorized | Token invalid / expired. |
| **403** | Forbidden | Permission denied. |
| **404** | Not Found | Resource tidak ditemukan. |
| **409** | Conflict | Duplicate / state conflict. |
| **422** | Unprocessable Entity | Business rule violation. |
| **500** | Internal Server Error | Unexpected system error. |

---

## 12. Audit Logging Standard

### Audit-Worthy Actions
Wajib audit log:
* login / logout
* create / update / delete
* payment posting
* stock movement
* invoice finalization

### Audit Data
Minimal data:
```json
{
  "module": "inventory",
  "action": "UPDATE",
  "entityId": "uuid",
  "before": {},
  "after": {}
}
```

---

## 13. Idempotency & Transaction Safety

### Transaction Required
Endpoint berikut wajib *transaction-safe*:
* reserve stock
* pickup rental
* return rental
* finalize invoice
* payment posting
* stock transfer

### Idempotency Recommendation
Future-ready untuk:
* payment callback
* external integration
* queue processing

---

## 14. File Upload Standard

### Upload Strategy
Semua upload melalui:
* `FileStorage` abstraction

### Supported Future Uploads
* invoice PDF
* payment proof
* operational photo
* quotation PDF
* contract PDF

---

## 15. API Security Standard

### Required Security
* Helmet
* CORS whitelist
* Rate limiting
* DTO sanitization
* Secure headers
* JWT verification

### Sensitive Data Rules
Tidak boleh expose:
* `passwordHash`
* `refreshTokenHash`
* internal secrets

---

## 16. API Performance Standard

### Query Optimization
Wajib:
* pagination
* selective query
* indexed query
* avoid N+1 query

### Cache Strategy
Gunakan cache untuk:
* permissions
* dashboard summary
* frequently accessed lookup

---

## 17. Frontend Compatibility Standard

API harus:
* predictable
* typed-friendly
* React Query friendly
* optimistic-update friendly

---

## 18. Multi-Tenant Standard

### Tenant Isolation
Semua business query wajib:
* tenant-aware
* isolated per tenant

### Tenant Resolution
Tenant dapat berasal dari:
* JWT
* subdomain
* request header

---

## 19. API Documentation Standard

### Documentation Requirement
Semua endpoint wajib memiliki:
* request example
* response example
* validation rules
* permission requirement

### Swagger/OpenAPI
Gunakan:
* Swagger
* OpenAPI
untuk auto-generated documentation.

---

## 20. Future Extensibility

API harus siap untuk:
* mobile app
* public API
* webhook
* queue worker
* third-party integration
* payment gateway
* accounting integration
