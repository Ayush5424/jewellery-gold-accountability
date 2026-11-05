# Deployment & Operations Guide
## Jewellery Gold Accountability Platform

Enterprise Fine-Gold Tracking, Reconciliation, & Anomaly Detection System
*Designed for Coimbatore Jewellery Manufacturing & Retail Operations*

---

## 1. System Overview & Architecture

The **Jewellery Gold Accountability Platform** is a distributed, three-tier enterprise solution engineered to replace legacy paper slips and spreadsheets across 5 retail showrooms, 1 centralized workshop, and ~40 artisan karigars in Coimbatore.

### Component Architecture
* **Frontend Web Application**: Single Page Application built with React 18, TypeScript, Tailwind CSS, Lucide icons, and Vite. Accessible by Finance Heads, Issue Clerks, and Karigars.
* **Backend Core API & Accounting Engine**: Spring Boot 3.3 (Java 21), Spring Data JPA, Spring Security (JWT authentication), Hibernate, PostgreSQL 16+. Authoritative calculation of fine gold with zero floating-point arithmetic.
* **AI Vision Extraction Service**: Python 3.13 FastAPI microservice with Pydantic schemas, Tesseract OCR (`pytesseract`), and OpenCV multi-pass image preprocessing (CLAHE, Otsu thresholding, LCD inversion, Laplacian blur detection) for genuine pixel-level draft extraction from weighing scales and karat-meter printouts.
* **Database**: PostgreSQL 16+ relational database enforcing referential integrity and auditability.
* **Accounting Integration**: Native Tally ERP 9 / Tally Prime XML Stock Journal export format for automated tally inventory reconciliation.

---

## 2. Prerequisites & Environment Setup

Ensure the following runtimes and tools are installed on the deployment host:

| Tool / Runtime | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Java Development Kit (JDK)** | OpenJDK 21 | Eclipse Temurin 21 | `java -version` |
| **Apache Maven** | 3.8+ | 3.9+ | `mvn -v` |
| **Node.js & npm** | Node 18+ / npm 9+ | Node 20 LTS | `node -v && npm -v` |
| **Python** | Python 3.10+ | Python 3.12 / 3.13 | `python --version` |
| **Tesseract OCR** | 5.0+ | 5.4+ with `eng.traineddata` | `tesseract --version` |
| **PostgreSQL** | PostgreSQL 15+ | PostgreSQL 16 or 18 | `psql -U postgres -c "SELECT version();"` |
| **Docker & Docker Compose** | Docker 24+ / Compose v2 | Latest Docker Desktop | `docker compose version` |

---

## 3. Database Initialization (PostgreSQL)

### Local Database Setup
1. Log into your PostgreSQL instance using `psql` or pgAdmin:
   ```bash
   psql -U postgres
   ```
2. Create the production database:
   ```sql
   CREATE DATABASE jewellery_gold_db;
   \c jewellery_gold_db;
   ```
3. Grant permissions to the `postgres` user:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE jewellery_gold_db TO postgres;
   ```
4. *Schema Migration*: The Spring Boot application automatically handles schema creation and initial reference data population on boot via Hibernate (`ddl-auto: update`) and `DataInitializer.java`. No manual SQL migration scripts are required.

---

## 4. Environment Variables & Configuration

### Environment Variables
Configure the following environment variables on your system or in your deployment profile:

```env
# Database Credentials
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/jewellery_gold_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_secure_password_here

# JWT Security
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
JWT_EXPIRATION_MS=86400000

# AI Microservice URL (Backend -> AI Service)
AI_SERVICE_URL=http://localhost:8000

# Server Context Path & Port
SERVER_PORT=8080
```

### Backend `application.properties` (Local Development in IntelliJ IDEA)
For developers running Spring Boot directly inside IntelliJ IDEA:
1. Open `backend/src/main/resources/application.properties`.
2. Confirm the content references the environment variable securely:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/jewellery_gold_db
   spring.datasource.username=postgres
   spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:}
   spring.datasource.driver-class-name=org.postgresql.Driver
   ```
3. In IntelliJ IDEA:
   - Navigate to **Run** -> **Edit Configurations...**
   - Select the Spring Boot Run Configuration for `JewelleryGoldApplication`.
   - Under **Environment variables**, set: `SPRING_DATASOURCE_PASSWORD=your_actual_password`.
   - Click **Apply** and **Run**.

---

## 5. Running the Application Locally (Step-by-Step)

### Step 1: Start the PostgreSQL Database
Ensure your local PostgreSQL server is active on port `5432`:
```powershell
Get-Service -Name postgresql* | Start-Service
```

### Step 2: Start the AI Extraction Microservice (FastAPI & Tesseract OCR)
1. **Install Tesseract OCR**:
   - **Windows**: Install Tesseract OCR 5.4+ (standard path: `C:\Program Files\Tesseract-OCR\tesseract.exe` or user home `~\tesseract-ocr\tesseract.exe`) with English traineddata (`eng.traineddata`). Set environment variables if using a custom location:
     ```powershell
     $env:TESSERACT_CMD = "C:\Program Files\Tesseract-OCR\tesseract.exe"
     $env:TESSDATA_PREFIX = "C:\Program Files\Tesseract-OCR\tessdata"
     ```
   - **Linux / Docker**:
     ```bash
     sudo apt-get update && sudo apt-get install -y tesseract-ocr tesseract-ocr-eng libgl1 libglib2.0-0
     ```
2. Navigate to the `ai-service` directory:
   ```bash
   cd ai-service
   ```
3. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run automated tests to verify OCR image preprocessing and API endpoints:
   ```bash
   python -m pytest tests/
   ```
6. Start the FastAPI server on port 8000:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Health Check*: Visit `http://localhost:8000/health` (should return `{"status":"HEALTHY","service":"gold-slip-ai-extractor","ocr_engine":"Tesseract OCR"}`).

### Step 3: Start the Backend Core Service (Spring Boot)
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Build and run tests with Maven:
   ```bash
   mvn clean test
   ```
   *(Verify all 27 unit, integration, and security isolation tests pass)*.
3. Start the Spring Boot application:
   ```bash
   mvn spring-boot:run
   ```
   *Backend Base URL*: `http://localhost:8080/api`
   *Swagger / API docs*: `http://localhost:8080/api/swagger-ui.html`

### Step 4: Start the Frontend UI (React / Vite)
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Verify production compilation:
   ```bash
   npm run build
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend URL*: `http://localhost:5173` (or `http://localhost:3000` when port is mapped).

---

## 6. Docker & Docker Compose Deployment (One-Click)

To launch the full unified stack with single-command orchestration:

```bash
docker compose up -d --build
```

### Port Mappings & Services:
| Service | Container Port | Host Port | Purpose |
| :--- | :--- | :--- | :--- |
| `postgres` | 5432 | 5432 | PostgreSQL 16 relational database |
| `backend` | 8080 | 8080 | Spring Boot Accounting API |
| `ai-service` | 8000 | 8000 | FastAPI Scale Slip Extractor |
| `frontend` | 80 | 3000 | Nginx serving compiled React SPA |

### Verifying Container Health:
```bash
docker compose ps
docker compose logs -f backend
```

To shut down the cluster safely:
```bash
docker compose down
```

---

## 7. Verified Demo User Accounts & Roles

The system comes pre-seeded with verified test accounts across all three business roles. You can immediately log into the web portal with these credentials:

| Role | Username | Password Configuration | Full Name / Description | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Finance Head** | `finance_head` | Loaded from `.env` (`DEMO_FINANCE_PASSWORD`) | Natarajan Sundaram | Full administrative authority: views total company stock, loss dashboards, karigar benchmark drift, approves reconciliations, exports Tally XML. |
| **Issue Clerk** | `issue_clerk` | Loaded from `.env` (`DEMO_CLERK_PASSWORD`) | K. Ramanathan | Workshop operations: registers karigars, issues raw gold, logs returned items/scrap, uploads scale slips, triggers reconciliation. |
| **Artisan Karigar** | `murugesan` | Loaded from `.env` (`DEMO_KARIGAR_PASSWORD`) | Murugesan A. | Senior Karigar: views personal outstanding gold, assigned active jobs, past job loss history. Strictly isolated from other karigars. |
| **Artisan Karigar** | `sivakumar` | Loaded from `.env` (`DEMO_KARIGAR_PASSWORD`) | Sivakumar V. | Karigar: assigned jobs, balance summary. |
| **Artisan Karigar** | `marimuthu` | Loaded from `.env` (`DEMO_KARIGAR_PASSWORD`) | Marimuthu K. | Karigar: assigned jobs, balance summary. |

---

## 8. Tally ERP 9 / Tally Prime XML Integration

The application exports stock movements directly into standard Tally XML Stock Journal format:

1. Log into the web application as **Finance Head** (`finance_head`).
2. Navigate to **Daily Stock Statement** (`/statement`).
3. Select the desired statement date (e.g. today).
4. Click **Export Tally XML** button in the header.
5. In **Tally ERP 9** or **Tally Prime**:
   - Go to **Import Data** -> **Vouchers**.
   - Select the downloaded `tally_stock_journal_YYYY-MM-DD.xml` file.
   - Tally creates a `Stock Journal` voucher debiting raw material gold stock and crediting finished jewellery, recovering scrap and filings accurately.

---

## 9. Verification & Health Check Procedures

### 1. Database Health Check
```bash
psql -U postgres -d jewellery_gold_db -c "SELECT count(*) FROM users; SELECT count(*) FROM karigars; SELECT count(*) FROM gold_transactions;"
```

### 2. Backend API Health Check
```bash
curl -i http://localhost:8080/api/health
```

### 3. AI Service Health Check
```bash
curl -i http://localhost:8000/health
```

### 4. Running Backend Integration Test Suite
```bash
cd backend
mvn test
```
*Expected Result*: 27 passed, 0 failures, 0 errors.

### 5. Running AI Service Pytest Suite
```bash
cd ai-service
python -m pytest tests/
```
*Expected Result*: 8 passed in ~0.4s.

---

## 10. Troubleshooting & Common Issues

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `java.lang.ClassNotFoundException` for main class | IntelliJ run configuration pointing to incorrect package or Maven target not compiled | Verify main class is `com.coimbatore.jewellery.JewelleryGoldApplication`. Run `mvn clean compile` before starting. |
| `401 Unauthorized` on `/api/auth/login` | SecurityConfig context-path mismatch or bad password | Security filter matches both `/auth/**` and `/api/auth/**`. Ensure password matches `DEMO_*_PASSWORD` loaded into database. |
| `Connection refused: localhost:5432` | PostgreSQL service not running or listening on alternate port | Verify PostgreSQL service is running: `Get-Service postgresql*`. Check `5432` in `netstat -ano`. |
| `FATAL: password authentication failed for user "postgres"` | Incorrect `SPRING_DATASOURCE_PASSWORD` | Set the correct password in `SPRING_DATASOURCE_PASSWORD` environment variable or IntelliJ Run Configuration. |
| AI slip extraction returning empty draft | Image resolution too low or scale digits blurred | Ensure scale slip photo is taken in clear lighting. Fallback manual input is always enabled in the UI. |

---

## 11. Security & Compliance Checklist

- [x] Zero floating-point arithmetic (`BigDecimal` used exclusively with `HALF_UP` rounding).
- [x] Immutable append-only transaction ledger (`gold_transactions`).
- [x] Multi-tenant role-based access control with token claim isolation.
- [x] No plaintext credentials or secrets committed in git history.
- [x] AI recommendations explicitly require human clerk verification prior to database insertion.
- [x] Tally Prime compliant inventory journal generation.
