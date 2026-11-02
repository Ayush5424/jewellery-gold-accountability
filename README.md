# Jewellery Gold Accountability System
Enterprise Fine-Gold Tracking, Reconcilation & Loss Detection Platform

Designed for a fine jewellery chain in Coimbatore operating 5 showrooms, a centralized workshop, and ~40 artisan karigars.

---

## Key Capabilities

* **Auditable Fine Gold Ledger**: Append-only transactional ledger tracking physical movements (`ISSUE`, `RECEIPT_JEWELLERY`, `RECEIPT_SCRAP`, `RECEIPT_FILINGS`, `ADJUSTMENT_REVERSAL`). Historical entries are never mutated.
* **Strict Accounting Engine**: Built entirely with `BigDecimal` using standard 3-decimal weight precision (`0.001 g`) and 2-decimal purity (`0.01 %`).
* **Controlled Job Lifecycle**: State machine transitions (`OPEN` → `IN_PROGRESS` → `READY_FOR_RECONCILIATION` → `RECONCILED`) separating outstanding working gold from true manufacturing loss.
* **Dual-Mechanism Loss Detection**:
  1. *Rule-Based Allowance Breach*: Compares reconciled loss against contractually agreed wastage.
  2. *Historical Drift Detection*: Detects gradual deviation against a karigar's rolling benchmark across $\ge 5$ completed jobs.
* **Human-in-the-Loop AI Assistance**: Extracts draft weights and purity from workshop scale/slip images. AI outputs are never directly persisted—they require explicit clerk verification.
* **Enterprise Security & Isolation**: Strict role-based access control (`ISSUE_CLERK`, `FINANCE_HEAD`, `KARIGAR`) with server-side validation preventing cross-karigar access.

---

## Tech Stack

* **Backend**: Java 21, Spring Boot 3.3, Spring Security, Spring Data JPA, PostgreSQL 16, Maven
* **Frontend**: React, TypeScript, Vite, Tailwind CSS (Inter typography, aligned tabular numerals)
* **AI Service**: Python 3.13, FastAPI, Pydantic
* **Infrastructure**: Docker & Docker Compose

---

## Quickstart

### Running with Docker Compose
```bash
docker-compose up --build
```
* Frontend: `http://localhost:3000`
* Backend API: `http://localhost:8080/api`
* AI Service: `http://localhost:8000`
* Database: PostgreSQL on port `5432`

---

## License
Confidential — Jewellery Gold Accountability Assessment.
