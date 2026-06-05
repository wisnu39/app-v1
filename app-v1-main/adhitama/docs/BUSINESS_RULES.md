# BUSINESS_RULES.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked

---

## 1. Business Rules Goals

Dokumen ini mendefinisikan:
* aturan bisnis inti
* validasi workflow
* integritas data
* operational policy
* financial consistency

Seluruh module **WAJIB** mengikuti business rules ini.

---

## 2. Global System Rules

### Tenant Isolation
Semua data bisnis wajib:
* memiliki `tenantId`
* terisolasi antar tenant

**DILARANG:**
* *cross-tenant access*
* *manual tenant override*

### Soft Delete Policy
Entity utama menggunakan:
* `deletedAt`

Soft deleted data:
* tidak tampil di query normal
* tetap tersedia untuk audit/history

### Immutable Records
Data berikut bersifat immutable:
* `StockMovement`
* `Payment`
* `Invoice snapshot`
* `AuditLog`
* `RentalItem snapshot`

**DILARANG:**
* *update history financial*
* *delete ledger movement*

---

## 3. User & Authentication Rules

### User Rules
User wajib:
* memiliki role
* memiliki tenant
* memiliki status aktif untuk login

### Authentication Rules
Login membutuhkan:
* valid credential
* active user
* active tenant

### Session Rules
Support:
* *multi-device session*
* *refresh token rotation*
* *session revocation*

### Password Rules
**WAJIB:**
* hashed menggunakan Argon2
* minimum complexity
* *never stored plaintext*

---

## 4. RBAC Rules

### Permission-Based Access
Semua endpoint sensitif wajib:
* *authentication protected*
* *permission protected*

### Least Privilege Rule
User hanya boleh:
* melihat data sesuai permission
* mengubah data sesuai permission

---

## 5. Customer Rules

### Customer Requirements
Customer wajib memiliki:
* nama
* kontak utama

### Blacklist Rules
Customer blacklist:
* tidak dapat membuat rental baru
* tetap dapat dilihat histori transaksi

### Customer Financial Tracking
Customer harus dapat ditrack:
* total order
* *outstanding balance*
* *overdue invoice*
* *payment history*

### Consolidated Invoice Rules
Sistem mendukung:
* *single reservation invoice*
* *multiple reservation invoice*

---

## 6. Inventory Rules

### Inventory Integrity Rules
Stock tidak boleh:
* negatif
* berubah tanpa movement

### Mandatory Stock Movement
Semua perubahan stock **WAJIB**:
* melalui `StockMovement`
* *transaction-safe*
* *audit logged*

### Stock Categories
Stock dipisahkan menjadi:
* available
* reserved
* rented
* damaged
* lost

### Damaged & Lost Rules
Barang damaged/lost:
* tidak boleh kembali ke available otomatis
* wajib memiliki *operational trace*

---

## 7. Warehouse Rules

### Warehouse Transfer Rules
Transfer stock wajib:
* *source warehouse* valid
* *destination warehouse* valid
* *transaction-safe*

### Transfer Workflow
Status transfer:
> PENDING → APPROVED → COMPLETED / CANCELLED

### Stock Opname Rules
Stock opname:
* snapshot qty system saat dibuat
* adjustment dibuat sebagai *ledger movement*

---

## 8. Rental Rules

### Rental Requirements
Rental wajib memiliki:
* customer
* rental items
* rental date
* return date

### Rental Workflow Rules
Rental wajib mengikuti workflow:
> DRAFT → RESERVED → CONFIRMED → ACTIVE → RETURNED → COMPLETED / CANCELLED

### Invalid Workflow Prevention
**DILARANG:**
* *skip status*
* direct COMPLETE tanpa RETURNED
* pickup tanpa reserve

### Rental Availability Rules
Availability checking wajib:
* *date-range based*
* *overlap-aware*
* *warehouse-aware*

### Reservation Rules
Reservation:
* mengurangi *available stock*
* menambah *reserved stock*

### Pickup Rules
Pickup:
* mengurangi *reserved stock*
* menambah *rented stock*

### Return Rules
Return process wajib:
* *inspection-aware*
* support damaged item
* support lost item
* *transaction-safe*

### Partial Return Rules
Support:
* sebagian item kembali
* sebagian item rusak
* sebagian item hilang

### Extension Rules
Rental extension:
* wajib *re-check availability*
* tidak boleh *overlap invalid*

---

## 9. Pricing Rules

### Immutable Pricing Snapshot
Harga rental:
* snapshot saat rental dibuat
* tidak berubah meskipun master price berubah

### Invoice Snapshot
Invoice item:
* immutable setelah finalized

---

## 10. Operational Workflow Rules

### Delivery Checklist Rules
Setiap order wajib memiliki:
* delivery checklist
* *item verification*
* *operational verification*

### Return Checklist Rules
Setiap return wajib:
* *item inspection*
* *qty verification*
* *damaged/lost validation*

### Operational Assignment Rules
Operational assignment wajib:
* terhubung ke user
* memiliki role/tugas

### Operational Report Rules
Operational report wajib:
* summary pekerjaan
* *issue log*
* *evaluation note*

---

## 11. Operational Expense Rules

### Expense Requirements
Expense wajib:
* memiliki category
* memiliki amount
* terhubung ke rental/order

### Expense Categories
Minimal support:
* fuel
* transport
* labor
* consumption
* miscellaneous

### Profitability Rules
Operational expense digunakan untuk:
* *profitability tracking*
* *financial analytics*
* *payroll foundation*

---

## 12. Invoice Rules

### Invoice Requirements
Invoice wajib:
* memiliki customer
* memiliki item snapshot
* memiliki grand total

### Invoice Status Rules
Status invoice:
> DRAFT → FINALIZED → UNPAID → PARTIAL_PAID → PAID / OVERDUE / CANCELLED

### Finalization Rules
Invoice finalized:
* immutable
* tidak boleh edit item
* tidak boleh edit amount

### Outstanding Rules
Outstanding dihitung otomatis:
$$	ext{Outstanding} = 	ext{Grand Total} - 	ext{Paid Amount}$$

---

## 13. Payment Rules

### Payment Requirements
Payment wajib:
* terhubung ke invoice
* memiliki amount
* memiliki payment date

### Payment History Rules
Payment bersifat:
* *append-only*
* *immutable history*

### Partial Payment Rules
Support:
* cicilan
* DP
* *multiple payment*

### Invoice Auto Update Rules
Status invoice berubah otomatis berdasarkan payment.

---

## 14. Financial Reporting Rules

### Revenue Reporting
Revenue dihitung berdasarkan:
* *finalized invoice*
* *valid payment*

### Profitability Rules
Profitability order dihitung berdasarkan:
$$	ext{Profit} = 	ext{Revenue} - 	ext{Operational Expense}$$

### Receivable Rules
Outstanding receivable wajib:
* *trackable*
* *customer-linked*
* *aging-ready*

---

## 15. Audit Rules

### Mandatory Audit Events
**WAJIB** audit:
* login / logout
* create / update / delete
* stock movement
* invoice finalization
* payment posting

### Audit Redaction Rules
Audit wajib redact:
* password
* token
* *sensitive secret*

---

## 16. Security Rules

### API Security
**WAJIB:**
* JWT validation
* RBAC guard
* DTO validation
* *request sanitization*

**DILARANG:**
* *raw unrestricted query*
* *bypass permission*
* direct DB mutation

---

## 17. Transaction Rules

### Mandatory Transaction Operations
**WAJIB** *transaction-safe*:
* stock reservation
* pickup
* return
* stock transfer
* payment posting
* invoice finalization

---

## 18. Reporting Rules

### Reporting Integrity
Report wajib:
* *consistent*
* *tenant-aware*
* *traceable*
* *filterable*

### Historical Consistency
Historical report:
* tidak boleh berubah karena master data update

---

## 19. Future Payroll Foundation Rules

### Payroll Readiness
Operational data wajib menyimpan:
* *employee assignment*
* *operational contribution*
* *operational expense*

### Future Payroll Usage
Data akan digunakan untuk:
* *salary calculation*
* incentive
* reimbursement

---

## 20. Extensibility Rules

### Future Expansion Ready
Business architecture harus siap untuk:
* accounting
* payroll
* analytics
* SaaS
* mobile app

### Refactor Prevention Rules
Feature baru **WAJIB**:
* modular
* isolated
* mengikuti *workflow rules*

---

## 21. Final Business Philosophy

Adhitama dibangun dengan prinsip:
> “Operational consistency and financial integrity are more important than shortcut workflows.”

**Prioritas utama:**
* *operational traceability*
* *financial consistency*
* maintainability
* scalability
* *enterprise reliability*
