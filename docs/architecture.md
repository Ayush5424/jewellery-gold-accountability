# Coimbatore Jewellery Chain — System Architecture

## System Boundaries

```mermaid
flowchart TD
    subgraph Frontend["React 19 + TypeScript (Vite + Tailwind)"]
        UI["Workshop Tablet / Desktop UI"]
        Cache["Local Draft Persistence (localStorage)"]
        Idemp["Client Idempotency-Key Generator"]
    end

    subgraph Backend["Spring Boot 3.3 (Java 21)"]
        Sec["Spring Security RBAC (JWT)"]
        API["REST Controllers"]
        Calc["Domain Accounting Engine (BigDecimal)"]
        Ledger["Auditable Ledger Service"]
        AlertEng["Loss Detection Engine"]
        SeqGen["Atomic Voucher Sequence Generator"]
    end

    subgraph Database["PostgreSQL 16"]
        PG_Ledger[("gold_ledger_entry (Append-Only)")]
        PG_Jobs[("job_order (State Machine)")]
        PG_Karigars[("karigar")]
        PG_Alerts[("loss_alert")]
    end

    subgraph AIService["Python FastAPI"]
        OCR["Image Parser Draft Generator"]
    end

    UI --> Sec
    Sec --> API
    API --> Calc
    API --> Ledger
    API --> AlertEng
    Ledger --> PG_Ledger
    Ledger --> PG_Jobs
    UI -.->|"Upload Slip/Scale (Draft Only)"| API
    API -.->|"Extract Draft Values"| AIService
    AIService -.->|"Weight, Purity, Confidence"| API
    API -.->|"Review Screen"| UI
```

## Security & Access Control Matrix
| Role | Issue Gold | Receive Gold | Finalize Reconciliation | View Own Ledger | View All Showroom Stock | Export Stock Reports |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `ISSUE_CLERK` | Yes | Yes | Request Only (`READY_FOR_RECONCILIATION`) | Assigned Jobs | No | No |
| `FINANCE_HEAD` | Yes | Yes | Yes (`RECONCILED`) | All | Yes | Yes |
| `KARIGAR` | No | No | No | Own Slips Only | No | No |
