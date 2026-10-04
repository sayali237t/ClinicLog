# ClinicLog API

## Database (PostgreSQL)

ClinicLog uses **PostgreSQL** as its primary database.

### 1. Start PostgreSQL (Docker)

If you use Docker, a `docker-compose.yml` is provided at the root of the project:

```powershell
docker compose up -d
```

This starts a PostgreSQL 16 container on `localhost:5432` with user `postgres`, password `postgres`, and database `cliniclog`.

### 2. Configure Database URL

In `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/cliniclog
```

*(You can also use remote hosted PostgreSQL such as Supabase, Neon, or AWS RDS by pasting their connection URL.)*

### 3. Migrate Existing SQLite Data to PostgreSQL

If you already have records in `cliniclog.db` (seeded doctors, patients, history, appointments), migrate them directly into PostgreSQL with:

```powershell
cd backend
.\.venv\Scripts\python.exe migrate_sqlite_to_postgres.py
```

This copies all records from SQLite into PostgreSQL and synchronizes primary key sequences.

---

## Run Locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/docs` for interactive API documentation.

## Running Tests

```powershell
cd backend
.\.venv\Scripts\python.exe test_integration.py
```

---

## Authentication

### Doctor Authentication
- `POST /auth/doctor/register`: creates a doctor account with a secure password (min 12 chars) and returns a Bearer JWT.
- `POST /auth/doctor/login` with `{ "phone": "9000000000", "password": "PriyaClinic12" }`: returns doctor Bearer JWT.
- `GET /auth/doctor/me`: returns doctor profile.

### Patient Authentication (Password + JWT)
- `POST /auth/patient/login` with `{ "phone": "9876543120", "password": "AnitaSharma12" }`: authenticates the patient with phone number and portal password, returning a Bearer JWT access token and role `"patient"`.

## Patient Record & Document Storage
- Patients can view their record via `GET /me`, update details via `PATCH /me`, upload documents via `POST /me/documents`, and download documents via `GET /documents/{document_id}/download`.
- Patient appointments are requested via `POST /me/appointments` and listed via `GET /me/appointments`.
- Notifications regarding appointment approvals, reschedules, and cancellations are retrieved via `GET /me/notifications`.

## Doctor Appointment Management
- Doctor lists all appointments via `GET /appointments`.
- Doctor updates appointment status via `PATCH /appointments/{appointment_id}` (`approved`, `rescheduled`, `cancelled`) with optional `doctor_note`. Patient notifications are automatically triggered.
