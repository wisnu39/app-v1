# PRD.md — Adhitama Enterprise Rental ERP

* **Version:** 1.0
* **Status:** Blueprint Locked
* **Project Codename:** Adhitama

---

## 1. Product Overview

### Product Name
Adhitama Enterprise Rental ERP

### Product Description
Adhitama adalah platform Enterprise Rental ERP yang dirancang untuk perusahaan jasa sewa tenda, alat pesta, dan perlengkapan event dengan fokus pada:

* operational workflow
* inventory management
* warehouse management
* customer financial tracking
* operational cost tracking
* payment & invoice management
* profitability monitoring
* enterprise scalability

**Sistem dirancang sebagai:**
modular, scalable, production-ready, dan extensible ERP platform.

---

## 2. Main Objectives

**Tujuan utama sistem:**
* Mengelola seluruh proses rental secara terpusat
* Mengontrol inventory dan warehouse
* Mengurangi kehilangan dan kerusakan barang
* Mengontrol operational workflow lapangan
* Mengontrol pembayaran customer
* Mengontrol outstanding invoice/piutang
* Mengontrol biaya operasional per order
* Menyediakan laporan keuangan dan operasional
* Menjadi fondasi ERP enterprise jangka panjang

---

## 3. Business Goals

### Operational Efficiency
Meningkatkan efisiensi:
* reservasi
* pengiriman barang
* pengembalian barang
* operasional gudang
* operasional lapangan

### Inventory Accuracy
Menjaga:
* akurasi stock
* tracking barang rusak
* tracking barang hilang
* stock movement traceability

### Financial Visibility
Memberikan visibilitas terhadap:
* revenue
* outstanding payment
* overdue invoice
* operational expense
* profitability per order

### Customer Management
Menyediakan:
* customer history
* customer financial tracking
* blacklist management
* payment tracking

### Scalability
Mempersiapkan sistem untuk:
* multi cabang
* multi gudang
* multi tenant
* SaaS architecture
* accounting integration
* payroll integration

---

## 4. Target Users & Roles

### Super Admin
Memiliki akses penuh terhadap:
* seluruh tenant
* seluruh modul
* konfigurasi sistem

### Admin
Mengelola:
* customer
* rental
* inventory
* invoice
* payment

### Warehouse Staff
Mengelola:
* stock
* transfer barang
* stock opname
* pengecekan barang kembali

### Operational Staff
Mengelola:
* delivery checklist
* return checklist
* operational report
* aktivitas lapangan

### Finance Staff
Mengelola:
* invoice
* payment
* outstanding tracking
* financial reporting

### Supervisor / Manager
Melakukan:
* monitoring operasional
* monitoring profit order
* monitoring performa operasional
* evaluasi operasional

---

## 5. Core Business Workflow

### Rental Workflow
> Customer Reservation → Availability Check → Stock Reservation → Rental Confirmation → Delivery Preparation → Delivery Checklist → Customer Acceptance → Rental Active → Return Checklist → Warehouse Inspection → Invoice Finalization → Payment Collection → Order Completion

### Inventory Workflow
> Stock Available → Reserved → Rented Out → Returned → Inspection → Available / Damaged / Lost

### Financial Workflow
> Invoice Generated → Payment Recorded → Outstanding Tracking → Partial / Full Payment → Financial Reporting

### Operational Workflow
> Order Assignment → Team Assignment → Operational Execution → Checklist Verification → Operational Evaluation → Completion Report

---

## 6. Core Modules

### Foundation Modules
* Config
* Database
* Cache
* Logger
* Auth
* RBAC
* User
* Audit
* Tenant

### Business Modules
* Customer
* Inventory
* Warehouse
* Rental
* Invoice
* Payment
* Operational Tracking
* Operational Expense

### Future Modules
* Finance
* Accounting
* Payroll
* Reporting
* Analytics
* Notification
* File Storage
* Queue/Jobs

---

## 7. Customer-Centric Strategy

### Customer Financial Tracking
Semua transaksi harus terhubung ke customer:
* rental
* invoice
* payment
* operational history

### Customer Summary
Setiap customer harus memiliki:
* total transaksi
* jumlah order
* outstanding balance
* overdue invoice
* payment history
* blacklist status

### Consolidated Invoice
Sistem harus mendukung:
* invoice per reservasi
* invoice gabungan multi reservasi customer

---

## 8. Inventory & Warehouse Strategy

### Inventory Rules
Sistem inventory harus:
* transaction-safe
* immutable ledger-based
* reservation-ready
* multi warehouse ready

### Stock Features
Support:
* stock reservation
* stock transfer
* stock opname
* damaged tracking
* lost tracking

### Warehouse Workflow
Support:
* transfer approval
* warehouse inspection
* stock movement history
* warehouse-level stock visibility

---

## 9. Rental Strategy

### Rental Features
Support:
* reservation
* pickup
* return
* partial return
* extension
* cancellation

### Availability Engine
Availability checking harus:
* date-range based
* overlap-aware
* warehouse-aware

### Pricing Strategy
Harga rental menggunakan:
> immutable pricing snapshot

agar histori transaksi tidak berubah.

---

## 10. Operational Workflow Strategy

### Delivery & Return Checklist
Setiap order wajib memiliki:
* delivery checklist
* customer acceptance checklist
* return checklist
* warehouse inspection checklist

### Employee Assignment
Order dapat memiliki:
* penanggung jawab
* tim operasional
* assignment karyawan

Semua assignment menggunakan data dari User module.

### Operational Evaluation
Setiap order memiliki:
* operational notes
* evaluation report
* issue tracking
* damaged/lost report

---

## 11. Operational Expense Strategy

### Expense Tracking
Setiap order dapat memiliki:
* biaya bensin
* biaya tol
* uang makan
* biaya tenaga kerja
* biaya operasional lainnya

### Financial Impact
Expense digunakan untuk:
* profitability tracking
* operational efficiency
* reimbursement foundation
* payroll foundation

---

## 12. Financial Reporting Strategy

### Revenue Reporting
Sistem harus mendukung:
* revenue per periode
* revenue per customer
* revenue per order
* revenue per cabang

### Expense Reporting
Sistem harus mendukung:
* operational expense report
* workforce expense report
* transport expense report

### Profitability Reporting
Sistem harus mendukung:
* profit per order
* gross profit
* operational profitability

### Receivable Reporting
Sistem harus mendukung:
* outstanding invoice
* overdue invoice
* unpaid invoice
* partial paid invoice

---

## 13. Payroll Foundation Strategy

### Payroll Readiness
Walaupun payroll belum dibuat di v1, arsitektur harus siap untuk:
* payroll calculation
* employee incentive
* reimbursement
* performance-based compensation

### Payroll Data Foundation
Sistem harus menyimpan:
* employee assignment
* operational activity
* order contribution
* operational metrics

---

## 14. PDF & File Strategy

### PDF Support
Sistem harus mendukung:
* invoice PDF
* payment receipt PDF
* future quotation PDF
* future contract PDF

### File Storage
Arsitektur storage harus:
* extensible
* cloud-ready
* S3-compatible

---

## 15. Technical Goals

### Architecture Goals
Sistem harus:
* modular
* maintainable
* scalable
* extensible
* production-ready

### Engineering Goals
Sistem harus:
* strict typed
* transaction-safe
* audit-ready
* testing-ready
* Docker-ready

---

## 16. Non-Functional Requirements

### Performance
* Fast response time
* Efficient query strategy
* Cache-ready architecture

### Reliability
* Graceful error handling
* Health monitoring
* Runtime stability

### Security
* JWT authentication
* RBAC authorization
* Secure session handling
* Tenant isolation

### Maintainability
* Modular architecture
* Clean layering
* Low coupling
* Reusable components

---

## 17. Future Scalability

Blueprint harus siap untuk:
* SaaS expansion
* Accounting system
* Payroll system
* Analytics
* Notification system
* Mobile app
* Cloud deployment

---

## 18. Final Product Direction

Adhitama bukan hanya:
> aplikasi rental biasa

tetapi:
> **Enterprise Operational Rental ERP Platform**

yang mengintegrasikan:
* rental
* inventory
* warehouse
* operational workflow
* customer finance
* operational expense
* profitability tracking
* enterprise scalability
