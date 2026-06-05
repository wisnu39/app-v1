# SECURITY_DESIGN.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked

---

## 1. Security Design Goals

Security architecture dirancang untuk:
* enterprise-grade protection
* tenant isolation
* operational safety
* auditability
* secure authentication
* secure authorization
* future SaaS readiness

---

## 2. Security Principles

### Core Security Philosophy
Adhitama menggunakan prinsip:
> “Secure by default”

Semua fitur harus:
* deny by default
* explicit authorization
* least privilege access
* traceable activity

### Security Priorities
Prioritas utama:
* Authentication Security
* Authorization Security
* Tenant Isolation
* Data Integrity
* Auditability
* Session Security
* API Protection

---

## 3. Authentication Design

### Authentication Strategy
Gunakan:
* JWT access token
* Refresh token rotation
* Session-based authentication
* Redis token blacklist

### Access Token Rules
**Characteristics:**
* short-lived
* stateless
* signed JWT

### Refresh Token Rules
**Characteristics:**
* hashed before storage
* rotatable
* revocable
* session-bound

### Token Rotation Strategy
Saat refresh:
* old refresh token invalidated
* new refresh token generated
* session updated atomically

Tujuan: mencegah replay attack.

---

## 4. Password Security

### Password Hashing
Gunakan: **Argon2**

### Password Rules
Minimal:
* minimum length
* strong password enforcement
* no plaintext storage

### Forbidden
**DILARANG:**
* store plaintext password
* expose password hash
* log password

---

## 5. Session Security

### Multi-Device Session
User dapat login di beberapa device.
Setiap session menyimpan:
* device info
* IP address
* refresh token hash
* expiredAt

### Session Revocation
Support:
* logout single device
* logout all devices
* admin force revoke

### Session Validation
Setiap refresh token wajib:
* diverifikasi terhadap database session
* diverifikasi blacklist Redis

---

## 6. Authorization Design

### RBAC Strategy
Gunakan:
* Role
* Permission
* Dynamic permission guard

### Permission-Based Access
Contoh:
```typescript
@Permission('inventory.read')
@Permission('invoice.create')
```

### Least Privilege Principle
User hanya boleh:
* mengakses resource sesuai role
* mengakses action sesuai permission

---

## 7. Tenant Isolation

### Tenant-Aware Architecture
Semua business entity wajib:
* memiliki `tenantId`
* terisolasi antar tenant

### Tenant Resolution
Tenant dapat berasal dari:
* JWT payload
* request header
* subdomain

### Tenant Security Rules
**DILARANG:**
* cross-tenant data access
* tenant override manual
* bypass tenant filter

---

## 8. API Security

### API Protection
Gunakan:
* Helmet
* CORS whitelist
* DTO validation
* rate limiting
* request sanitization

### Security Headers
Wajib:
* secure headers
* anti-clickjacking
* anti-MIME sniffing

### Rate Limiting
Minimal protect:
* login endpoint
* refresh endpoint
* public endpoint

---

## 9. Input Validation Security

### DTO Validation
Semua input wajib:
* validated
* sanitized
* transformed safely

### Forbidden Inputs
**DILARANG:**
* raw SQL input
* unsanitized HTML
* unsafe payload injection

---

## 10. Database Security

### Query Safety
Gunakan:
* Prisma ORM
* parameterized query
* repository abstraction

### Database Rules
**DILARANG:**
* raw query tanpa validasi
* unrestricted mass update/delete
* direct database exposure

---

## 11. Financial Data Security

### Immutable Financial Records
Data berikut immutable:
* payment
* invoice snapshot
* stock movement
* audit log

### Financial Integrity
Semua transaksi financial wajib:
* transaction-safe
* audit logged
* traceable

---

## 12. Audit Logging Security

### Audit Requirements
Wajib audit:
* login / logout
* payment
* stock movement
* permission change
* invoice finalization

### Audit Data
Minimal:
* `userId`
* `tenantId`
* IP
* userAgent
* before/after data
* timestamp

### Sensitive Data Redaction
Audit wajib redact:
* password
* token
* secret credential

---

## 13. File Upload Security

### Upload Protection
Semua upload wajib:
* MIME validated
* size limited
* sanitized filename
* isolated storage

### Forbidden Uploads
**DILARANG:**
* executable file
* unsafe script
* unrestricted upload type

---

## 14. Frontend Security

### Frontend Security Rules
**DILARANG:**
* store token di insecure storage
* hardcoded secret
* expose sensitive env

### Session Handling
Gunakan:
* secure token storage abstraction
* automatic token refresh
* logout on invalid session

---

## 15. Logging Security

### Secure Logging
**DILARANG log:**
* password
* refresh token
* access token
* secret env

### Error Logging
Error harus:
* sanitized
* traceable
* correlation-ready

---

## 16. Infrastructure Security

### Environment Variables
Semua credential wajib menggunakan:
* environment variables
* secret management

### Forbidden
**DILARANG:**
* hardcoded secret
* hardcoded API key
* hardcoded DB password

---

## 17. Production Security

### Production Requirements
**WAJIB:**
* HTTPS
* secure cookie policy
* production-safe CORS
* secure proxy config

### Security Monitoring
Future-ready untuk:
* suspicious login detection
* brute-force monitoring
* audit analytics

---

## 18. Operational Security

### Operational Traceability
Semua aktivitas operasional wajib:
* user-traceable
* timestamped
* audit logged

### Accountability
Support:
* operational assignment tracking
* operational report tracking
* inventory accountability

---

## 19. Future Security Readiness

Blueprint harus siap untuk:
* SSO
* MFA / 2FA
* OAuth integration
* enterprise identity provider
* audit analytics
* advanced threat monitoring

---

## 20. Incident Recovery Strategy

### Recovery Support
Support:
* session revoke
* account disable
* audit investigation
* operational rollback investigation

---

## 21. Final Security Philosophy

Adhitama menggunakan prinsip:
> “Enterprise operational systems must be secure, traceable, and accountable.”

Prioritas utama:
* tenant isolation
* operational accountability
* financial integrity
* auditability
* secure extensibility
