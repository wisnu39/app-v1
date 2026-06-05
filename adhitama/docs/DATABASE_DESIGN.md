# DATABASE_DESIGN.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked

---

## 1. Database Design Goals

Database dirancang untuk:
* enterprise scalability
* transaction safety
* auditability
* operational traceability
* financial consistency
* future accounting integration
* future payroll integration
* extensibility tanpa refactor besar

---

## 2. Core Database Principles

### Multi-Tenant Ready
Semua entitas bisnis wajib memiliki:
* `tenantId`

Tujuan:
* SaaS-ready architecture
* data isolation
* future multi-company support

### Soft Delete Strategy
Semua entitas utama menggunakan:
* `deletedAt`

Tujuan:
* auditability
* data recovery
* historical consistency

### Standard Timestamp
Semua entitas utama memiliki:
* `createdAt`
* `updatedAt`

### UUID Primary Key
Semua tabel menggunakan:
* `id` UUID

Tujuan:
* distributed-safe
* future scalability
* better merging/import capability

### Immutable Financial & Stock Records
Entitas tertentu bersifat immutable:
* `StockMovement`
* `Payment`
* `InvoiceItem` snapshot
* `RentalItem` pricing snapshot
* `AuditLog`

Tujuan:
* historical consistency
* accounting integrity
* audit trail

---

## 3. Core Foundation Entities

### Tenant
Representasi perusahaan/tenant.
**Fields:**
* `id`
* `name`
* `code`
* `status`
* `createdAt`
* `updatedAt`
* `deletedAt`

### User
Representasi pengguna sistem/karyawan.
**Fields:**
* `id`
* `tenantId`
* `roleId`
* `name`
* `email`
* `phone`
* `passwordHash`
* `status`
* `lastLoginAt`
* `createdAt`
* `updatedAt`
* `deletedAt`

### Role
Role RBAC.
**Fields:**
* `id`
* `tenantId`
* `name`
* `description`

### Permission
Permission granular.
**Fields:**
* `id`
* `name`
* `description`
* `module`

### RolePermission
Mapping role ↔ permission.

### Session
Session multi-device.
**Fields:**
* `id`
* `tenantId`
* `userId`
* `refreshTokenHash`
* `deviceInfo`
* `ipAddress`
* `expiredAt`
* `createdAt`

### AuditLog
Audit trail global.
**Fields:**
* `id`
* `tenantId`
* `userId`
* `module`
* `action`
* `entityType`
* `entityId`
* `beforeData`
* `afterData`
* `ipAddress`
* `userAgent`
* `createdAt`

---

## 4. Customer Domain

### Customer
Representasi customer/client.
**Fields:**
* `id`
* `tenantId`
* `code`
* `name`
* `phone`
* `email`
* `address`
* `identityNumber`
* `blacklistStatus`
* `notes`
* `metadata`
* `createdAt`
* `updatedAt`
* `deletedAt`

### Customer Financial Summary (Computed)
Didapat dari agregasi:
* invoice
* payment
* outstanding receivable

*Bukan tabel fisik utama.*

---

## 5. Inventory Domain

### ItemCategory
Kategori barang hierarchical.
**Fields:**
* `id`
* `tenantId`
* `parentId`
* `name`
* `description`

### Item
Master barang rental.
**Fields:**
* `id`
* `tenantId`
* `categoryId`
* `code`
* `sku`
* `name`
* `description`
* `status`
* `defaultRentalPrice`
* `imageUrl`
* `metadata`
* `createdAt`
* `updatedAt`
* `deletedAt`

### Warehouse
Gudang penyimpanan.
**Fields:**
* `id`
* `tenantId`
* `code`
* `name`
* `address`
* `status`
* `createdAt`
* `updatedAt`
* `deletedAt`

### Stock
Denormalized stock cache.
**Fields:**
* `id`
* `tenantId`
* `warehouseId`
* `itemId`
* `qtyAvailable`
* `qtyReserved`
* `qtyDamaged`
* `qtyLost`
* `updatedAt`

### StockMovement
Immutable stock ledger.
**Fields:**
* `id`
* `tenantId`
* `warehouseId`
* `itemId`
* `type`
* `qty`
* `referenceType`
* `referenceId`
* `notes`
* `createdBy`
* `createdAt`

### StockTransfer
Transfer antar gudang.
**Fields:**
* `id`
* `tenantId`
* `sourceWarehouseId`
* `destinationWarehouseId`
* `status`
* `notes`
* `requestedBy`
* `approvedBy`
* `completedBy`
* `createdAt`
* `updatedAt`

### StockOpname
Stock opname gudang.
**Fields:**
* `id`
* `tenantId`
* `warehouseId`
* `status`
* `notes`
* `createdBy`
* `finalizedBy`
* `createdAt`
* `updatedAt`

---

## 6. Rental Domain

### Rental
Entitas utama rental/order.
**Fields:**
* `id`
* `tenantId`
* `customerId`
* `code`
* `status`
* `rentalDate`
* `returnDate`
* `subtotal`
* `discount`
* `deposit`
* `total`
* `notes`
* `createdBy`
* `createdAt`
* `updatedAt`
* `deletedAt`

### RentalItem
Snapshot item rental.
**Fields:**
* `id`
* `rentalId`
* `itemId`
* `warehouseId`
* `qty`
* `reservedQty`
* `returnedQty`
* `damagedQty`
* `lostQty`
* `dailyRateSnapshot`
* `subtotalSnapshot`
* `metadata`

### RentalStatusLog
History status rental.
**Fields:**
* `id`
* `rentalId`
* `fromStatus`
* `toStatus`
* `notes`
* `changedBy`
* `createdAt`

---

## 7. Operational Domain

### OperationalAssignment
Assignment karyawan per order.
**Fields:**
* `id`
* `tenantId`
* `rentalId`
* `userId`
* `role`
* `notes`
* `assignedAt`

### OperationalChecklist
Checklist operasional order.
**Fields:**
* `id`
* `tenantId`
* `rentalId`
* `type`
* `status`
* `notes`
* `checkedBy`
* `checkedAt`

### OperationalChecklistItem
Detail checklist item.
**Fields:**
* `id`
* `checklistId`
* `itemId`
* `qty`
* `condition`
* `notes`

### OperationalReport
Laporan operasional order.
**Fields:**
* `id`
* `tenantId`
* `rentalId`
* `summary`
* `evaluation`
* `issues`
* `recommendation`
* `createdBy`
* `createdAt`

### OperationalExpense
Biaya operasional order.
**Fields:**
* `id`
* `tenantId`
* `rentalId`
* `category`
* `amount`
* `description`
* `expenseDate`
* `createdBy`
* `createdAt`

---

## 8. Financial Domain

### Invoice
Invoice customer.
**Fields:**
* `id`
* `tenantId`
* `customerId`
* `rentalId`
* `code`
* `status`
* `subtotal`
* `discount`
* `tax`
* `grandTotal`
* `paidAmount`
* `outstandingAmount`
* `issuedAt`
* `dueDate`
* `finalizedAt`
* `createdBy`
* `createdAt`
* `updatedAt`

### InvoiceItem
Snapshot invoice item.
**Fields:**
* `id`
* `invoiceId`
* `itemNameSnapshot`
* `qty`
* `priceSnapshot`
* `subtotalSnapshot`
* `metadata`

### Payment
Payment invoice.
**Fields:**
* `id`
* `tenantId`
* `invoiceId`
* `customerId`
* `amount`
* `method`
* `referenceNo`
* `status`
* `paymentDate`
* `notes`
* `createdBy`
* `createdAt`

---

## 9. Payroll Foundation Domain (V2 Preparation)

### Payroll Foundation Strategy
Walaupun payroll belum dibuat di v1, database harus siap untuk:
* employee compensation
* reimbursement
* operational incentive
* performance evaluation

### Payroll Foundation Sources
Data payroll future berasal dari:
* `OperationalAssignment`
* `OperationalExpense`
* `Rental`
* `OperationalReport`

---

## 10. Reporting & Analytics Foundation

### Analytics-Ready Structure
Database harus siap untuk:
* financial dashboard
* profitability analytics
* operational analytics
* customer analytics
* inventory analytics

---

## 11. Database Indexing Strategy

### Required Indexes
Wajib index untuk:
* `tenantId`
* `customerId`
* `warehouseId`
* `itemId`
* `rentalId`
* `invoiceId`
* `status`
* `createdAt`

### Composite Index Recommendation
Contoh:
* `tenantId` + `status`
* `tenantId` + `createdAt`
* `warehouseId` + `itemId`
* `customerId` + `status`

---

## 12. Transaction Strategy

### Mandatory Transaction Operations
**WAJIB** transaction-safe:
* stock reservation
* pickup process
* return process
* stock transfer
* payment posting
* invoice finalization

---

## 13. Future Extensibility

Blueprint database harus siap untuk:
* accounting module
* journal system
* tax system
* payroll system
* notification system
* mobile app
* SaaS expansion
