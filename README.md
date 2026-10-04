# ClinicLog

ClinicLog is a clinical management and patient portal application built with **React**, **FastAPI**, and **PostgreSQL**. It offers doctors an intuitive interface for patient records, consultations, and appointment management, while providing patients a secure self-service portal for medical history, document uploads, and appointment requests.

---

## Features

### Doctor Portal
- **Secure Authentication**: Argon2 password hashing and JWT access tokens.
- **Patient Management**: Search patients by name or phone, register new patients, and update clinical profiles.
- **Consultation Records**: Add structured visit consultations (symptoms, diagnosis, prescriptions, notes).
- **Appointment Management**: Review incoming requests with quick filters (`Pending`, `Approved`, `Rescheduled`, `Cancelled`).
- **Schedule Actions**: Approve, reschedule (date & time), or cancel appointments with custom clinical notes.
- **Automatic Notifications**: Patients receive instant in-app alerts when appointment status changes.
- **Document Access**: View and download patient-uploaded medical reports and prescriptions.

### Patient Portal
- **Password + JWT Login**: Direct phone and password authentication matching industry security standards.
- **Profile Management**: View and edit emergency contact, blood group, and allergy information.
- **Medical Records**: Access complete consultation history, diagnoses, and prescriptions anytime.
- **Document Vault**: Upload diagnostic reports and lab results; download clinical files securely.
- **Appointment Requests**: Book clinic visits by specifying date, preferred time window, and reason.
- **In-App Notifications**: Real-time status updates and notes from the doctor.

---

## Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS design system (responsive, clean medical aesthetics).
- **Backend**: FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2.
- **Database**: PostgreSQL (with automatic connection pooling and local SQLite development fallback).
- **Authentication**: JWT (JSON Web Tokens) with Argon2 password hashing via `pwdlib`.
- **Infrastructure**: Docker & Docker Compose for local PostgreSQL containerization.

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+
- **PostgreSQL** (via Docker Desktop, local service, or hosted provider like [Supabase](https://supabase.com) / [Neon](https://neon.tech))

---

### 2. Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env`:
   - **Windows:**
     ```powershell
     Copy-Item .env.example .env
     ```
   - **macOS / Linux:**
     ```bash
     cp .env.example .env
     ```

   Edit `backend/.env` to configure your PostgreSQL connection:
   ```env
   # Local Docker or hosted Supabase/Neon URL:
   DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/cliniclog
   FRONTEND_ORIGIN=http://localhost:5173
   JWT_SECRET=your_super_secret_key_here
   JWT_ALGORITHM=HS256
   JWT_EXPIRE_MINUTES=30
   ```

5. *(Optional)* Start PostgreSQL using Docker Compose from the root directory:
   ```bash
   docker compose up -d
   ```

6. Migrate initial SQLite records to PostgreSQL (if migrating existing data):
   ```bash
   python migrate_sqlite_to_postgres.py
   ```

7. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   Interactive API documentation will be available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3. Frontend Setup

1. Open a second terminal in the project root:
   ```bash
   cd ClinicLog
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Demo Credentials

Pre-seeded accounts are available for immediate testing:

| Role | Phone Number | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Doctor** | `9000000000` | `PriyaClinic12` | Full clinic & patient management access |
| **Patient** | `9876543120` | `AnitaSharma12` | Anita Sharma — self-service portal |

---

## Running Automated Tests

ClinicLog includes a comprehensive integration test suite verifying health checks, authentication, patient search, consultations, document storage, and appointment workflows:

```powershell
cd backend
python test_integration.py
```

All 7 test suites will execute and validate the end-to-end API contract.

---

## Project Structure

```text
ClinicLog/
├── backend/
│   ├── migrations/            # Alembic database migration scripts
│   ├── private_uploads/       # Local secure storage for patient documents
│   ├── .env.example           # Environment template (safe for GitHub)
│   ├── .gitignore             # Backend gitignore rules
│   ├── alembic.ini            # Alembic configuration
│   ├── main.py                # FastAPI app, SQLAlchemy models, and routes
│   ├── migrate_sqlite_to_postgres.py # Data migration utility
│   ├── requirements.txt       # Python package requirements
│   ├── test_integration.py    # Automated integration test suite
│   └── README.md              # Backend-specific notes
├── src/
│   ├── api.js                 # Centralized API client & HTTP interceptors
│   ├── main.jsx               # React application UI & state management
│   └── styles.css             # Responsive styling & design system
├── docker-compose.yml         # PostgreSQL 16 container definition
├── index.html                 # HTML5 entrypoint
├── package.json               # Node.js dependencies and scripts
├── vite.config.js             # Vite configuration
├── .gitignore                 # Root repository gitignore
└── README.md                  # Project documentation
```

---

## License

This project is licensed under the MIT License.
