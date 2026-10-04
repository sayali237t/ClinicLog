"""ClinicLog API — Clinical management and patient portal backend service.

Quick Start:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000

Demo Credentials:
  - Doctor:  Phone 9000000000 | Password PriyaClinic12
  - Patient: Phone 9876543120 | Password AnitaSharma12
"""
from __future__ import annotations
import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash
import os
import shutil
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Date, DateTime, ForeignKey, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))
password_hasher = PasswordHash.recommended()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/cliniclog")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg2" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

UPLOAD_DIR = BASE_DIR / "private_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
DEMO_PATIENT_PASSWORD = "AnitaSharma12"
DEMO_DOCTOR_PASSWORD = "PriyaClinic12"


def create_db_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )


def test_db_connection(eng) -> bool:
    try:
        with eng.connect() as conn:
            return True
    except Exception:
        return False


engine = create_db_engine(DATABASE_URL)
if not DATABASE_URL.startswith("sqlite") and not test_db_connection(engine):
    sqlite_url = f"sqlite:///{BASE_DIR / 'cliniclog.db'}"
    print(f"[Notice] PostgreSQL at {DATABASE_URL} is not reachable. Using {sqlite_url}.")
    print("         Run 'docker compose up -d' or start your local PostgreSQL service to use PostgreSQL.")
    engine = create_db_engine(sqlite_url)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


class Doctor(Base):
    __tablename__ = "doctors"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    clinic_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(30), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
    patients: Mapped[list["Patient"]] = relationship(back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
    age: Mapped[int | None] = mapped_column(nullable=True)
    gender: Mapped[str | None] = mapped_column(String(30), nullable=True)
    locality: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    doctor: Mapped[Doctor] = relationship(back_populates="patients")
    consultations: Mapped[list["Consultation"]] = relationship(back_populates="patient", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="patient", cascade="all, delete-orphan")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="patient", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="patient", cascade="all, delete-orphan")


class Consultation(Base):
    __tablename__ = "consultations"
    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    visit_date: Mapped[date] = mapped_column(Date, default=date.today)
    reason: Mapped[str | None] = mapped_column(String(250), nullable=True)
    notes: Mapped[str] = mapped_column(Text)
    prescription: Mapped[str | None] = mapped_column(Text, nullable=True)
    patient: Mapped[Patient] = relationship(back_populates="consultations")


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(255), unique=True)
    content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    document_type: Mapped[str] = mapped_column(String(50), default="report")
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    patient: Mapped[Patient] = relationship(back_populates="documents")


class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    preferred_date: Mapped[date] = mapped_column(Date)
    preferred_time: Mapped[str] = mapped_column(String(50))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="requested")
    doctor_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    patient: Mapped[Patient] = relationship(back_populates="appointments")


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    patient: Mapped[Patient] = relationship(back_populates="notifications")


class PatientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    password: str | None = Field(default=None, max_length=128)
    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = Field(default=None, max_length=30)
    locality: str | None = Field(default=None, max_length=120)
    notes: str | None = None


class PatientUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=30)
    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = Field(default=None, max_length=30)
    locality: str | None = Field(default=None, max_length=120)


class ConsultationCreate(BaseModel):
    visit_date: date = Field(default_factory=date.today)
    reason: str | None = Field(default=None, max_length=250)
    notes: str = Field(min_length=1)
    prescription: str | None = None


class AppointmentCreate(BaseModel):
    preferred_date: date
    preferred_time: str = Field(min_length=1, max_length=50)
    reason: str | None = None


class AppointmentUpdate(BaseModel):
    status: Literal["approved", "rescheduled", "cancelled"]
    preferred_date: date | None = None
    preferred_time: str | None = Field(default=None, min_length=1, max_length=50)
    doctor_note: str | None = None


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    document_type: str
    uploaded_at: datetime


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    visit_date: date
    reason: str | None
    notes: str
    prescription: str | None


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str | None
    age: int | None
    gender: str | None
    locality: str | None
    notes: str | None
    created_at: datetime


class PatientDetail(PatientOut):
    consultations: list[ConsultationOut]
    documents: list[DocumentOut]


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_id: int
    patient_name: str | None = None
    preferred_date: date
    preferred_time: str
    reason: str | None
    status: str
    doctor_note: str | None = None
    created_at: datetime


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    message: str
    read: bool
    created_at: datetime


class DoctorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    clinic_name: str
    phone: str


class DoctorRegister(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    clinic_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=30)
    password: str = Field(min_length=12, max_length=128)


class DoctorLogin(BaseModel):
    phone: str = Field(min_length=5, max_length=30)
    password: str = Field(min_length=1, max_length=128)


class PatientLogin(BaseModel):
    phone: str = Field(min_length=5, max_length=30)
    password: str = Field(min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    role: Literal["doctor", "patient"]


app = FastAPI(title="ClinicLog API", version="0.1.0")
cors_origins = [
    os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def phone_digits(phone: str | None) -> str:
    if not phone:
        return ""
    return "".join(char for char in phone if char.isdigit())[-10:]


def find_patient_by_phone(db: Session, phone: str) -> Patient | None:
    digits = phone_digits(phone)
    if not digits:
        return None
    matches = db.scalars(select(Patient).where(Patient.phone.is_not(None))).all()
    return next(
        (item for item in matches if phone_digits(item.phone) == digits),
        None,
    )


def create_access_token(
    role: Literal["doctor", "patient"],
    user_id: int,
) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def current_session(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer),
    ],
) -> tuple[str, int]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in required",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
        role = payload["role"]
        user_id = int(payload["sub"])
        if role not in {"doctor", "patient"}:
            raise ValueError("Unknown role")
        return role, user_id
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )


def doctor_session(session: Annotated[tuple[str, int], Depends(current_session)]) -> int:
    if session[0] != "doctor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor access required")
    return session[1]


def patient_session(session: Annotated[tuple[str, int], Depends(current_session)]) -> int:
    if session[0] != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access required")
    return session[1]


def require_patient(db: Session, patient_id: int, doctor_id: int | None = None) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient or (doctor_id is not None and patient.doctor_id != doctor_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def appointment_out(appointment: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=appointment.id,
        patient_id=appointment.patient_id,
        patient_name=appointment.patient.name if appointment.patient else None,
        preferred_date=appointment.preferred_date,
        preferred_time=appointment.preferred_time,
        reason=appointment.reason,
        status=appointment.status,
        doctor_note=appointment.doctor_note,
        created_at=appointment.created_at,
    )


def notify_patient(db: Session, patient_id: int, message: str) -> Notification:
    notification = Notification(patient_id=patient_id, message=message)
    db.add(notification)
    return notification


@app.on_event("startup")
def initialise() -> None:
    global engine, SessionLocal
    try:
        with engine.connect() as conn:
            pass
    except Exception as exc:
        print(f"[Notice] Could not connect to primary database at {DATABASE_URL}: {exc}")
        if not DATABASE_URL.startswith("sqlite"):
            sqlite_fallback = f"sqlite:///{BASE_DIR / 'cliniclog.db'}"
            print(f"[Notice] Using SQLite fallback at {sqlite_fallback} until PostgreSQL server is started.")
            engine = create_db_engine(sqlite_fallback)
            SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if not db.scalar(select(Doctor.id).limit(1)):
            doctor = Doctor(
                name="Dr. Priya Desai",
                clinic_name="Priya Clinic",
                phone="9000000000",
                password_hash=password_hasher.hash(DEMO_DOCTOR_PASSWORD),
            )
            db.add(doctor)
            db.flush()
            patient = Patient(
                name="Anita Sharma",
                phone="+91 98765 43120",
                password_hash=password_hasher.hash(DEMO_PATIENT_PASSWORD),
                age=34,
                gender="Female",
                locality="Indiranagar",
                doctor_id=doctor.id,
            )
            db.add(patient)
            db.flush()
            db.add(Consultation(patient_id=patient.id, visit_date=date(2026, 9, 18), reason="Sore throat & cough", notes="Low-grade fever for two days with dry cough and throat pain. No breathing difficulty.", prescription="Paracetamol 650 mg — as needed for fever."))
            db.commit()
            return

        # Backfill portal credentials for seeded demo accounts on upgraded databases.
        demo_doctor = db.scalar(select(Doctor).where(Doctor.phone == "9000000000"))
        if demo_doctor and not demo_doctor.password_hash:
            demo_doctor.password_hash = password_hasher.hash(DEMO_DOCTOR_PASSWORD)
        demo_patient = find_patient_by_phone(db, "9876543120")
        if demo_patient and not demo_patient.password_hash:
            demo_patient.password_hash = password_hasher.hash(DEMO_PATIENT_PASSWORD)
        db.commit()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/doctor/register", response_model=TokenOut, status_code=201)
def register_doctor(
    payload: DoctorRegister,
    db: Annotated[Session, Depends(get_db)],
) -> TokenOut:
    existing = db.scalar(
        select(Doctor).where(Doctor.phone == payload.phone)
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="An account already uses this phone number",
        )

    doctor = Doctor(
        name=payload.name,
        clinic_name=payload.clinic_name,
        phone=payload.phone,
        password_hash=password_hasher.hash(payload.password),
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return TokenOut(
        access_token=create_access_token("doctor", doctor.id),
        role="doctor",
    )


@app.post("/auth/doctor/login", response_model=TokenOut)
def login_doctor(
    payload: DoctorLogin,
    db: Annotated[Session, Depends(get_db)],
) -> TokenOut:
    doctor = db.scalar(
        select(Doctor).where(Doctor.phone == payload.phone)
    )
    if (
        not doctor
        or not doctor.password_hash
        or not password_hasher.verify(payload.password, doctor.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
        )

    return TokenOut(
        access_token=create_access_token("doctor", doctor.id),
        role="doctor",
    )


@app.get("/auth/doctor/me", response_model=DoctorOut)
def doctor_me(
    doctor_id: Annotated[int, Depends(doctor_session)],
    db: Annotated[Session, Depends(get_db)],
) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@app.post("/auth/patient/login", response_model=TokenOut)
def login_patient(
    payload: PatientLogin,
    db: Annotated[Session, Depends(get_db)],
) -> TokenOut:
    patient = find_patient_by_phone(db, payload.phone)
    if (
        not patient
        or not patient.password_hash
        or not password_hasher.verify(payload.password, patient.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
        )

    return TokenOut(
        access_token=create_access_token("patient", patient.id),
        role="patient",
    )


@app.get("/patients", response_model=list[PatientOut])
def list_patients(q: str = "", doctor_id: Annotated[int, Depends(doctor_session)] = 0, db: Session = Depends(get_db)) -> list[Patient]:
    statement = select(Patient).where(Patient.doctor_id == doctor_id).order_by(Patient.created_at.desc())
    if q:
        term = f"%{q.lower()}%"
        statement = statement.where((Patient.name.ilike(term)) | (Patient.phone.ilike(term)))
    return list(db.scalars(statement))


@app.post("/patients", response_model=PatientOut, status_code=201)
def create_patient(payload: PatientCreate, doctor_id: Annotated[int, Depends(doctor_session)], db: Annotated[Session, Depends(get_db)]) -> Patient:
    data = payload.model_dump()
    password = data.pop("password")
    patient = Patient(**data, doctor_id=doctor_id)
    if password and password.strip():
        if len(password.strip()) < 12:
            raise HTTPException(status_code=400, detail="Portal password must be at least 12 characters")
        patient.password_hash = password_hasher.hash(password.strip())
    db.add(patient); db.commit(); db.refresh(patient)
    return patient


@app.get("/patients/{patient_id}", response_model=PatientDetail)
def patient_detail(patient_id: int, doctor_id: Annotated[int, Depends(doctor_session)], db: Annotated[Session, Depends(get_db)]) -> Patient:
    return require_patient(db, patient_id, doctor_id)


@app.patch("/patients/{patient_id}", response_model=PatientOut)
def doctor_update_patient(patient_id: int, payload: PatientCreate, doctor_id: Annotated[int, Depends(doctor_session)], db: Annotated[Session, Depends(get_db)]) -> Patient:
    patient = require_patient(db, patient_id, doctor_id)
    data = payload.model_dump()
    password = data.pop("password")
    for key, value in data.items(): setattr(patient, key, value)
    if password and password.strip():
        if len(password.strip()) < 12:
            raise HTTPException(status_code=400, detail="Portal password must be at least 12 characters")
        patient.password_hash = password_hasher.hash(password.strip())
    db.commit(); db.refresh(patient)
    return patient


@app.post("/patients/{patient_id}/consultations", response_model=ConsultationOut, status_code=201)
def create_consultation(patient_id: int, payload: ConsultationCreate, doctor_id: Annotated[int, Depends(doctor_session)], db: Annotated[Session, Depends(get_db)]) -> Consultation:
    require_patient(db, patient_id, doctor_id)
    consultation = Consultation(patient_id=patient_id, **payload.model_dump())
    db.add(consultation); db.commit(); db.refresh(consultation)
    return consultation


@app.post("/patients/{patient_id}/documents", response_model=DocumentOut, status_code=201)
def upload_document(patient_id: int, file: Annotated[UploadFile, File(...)], doctor_id: Annotated[int, Depends(doctor_session)], db: Annotated[Session, Depends(get_db)]) -> Document:
    require_patient(db, patient_id, doctor_id)
    if file.content_type not in {"application/pdf", "image/jpeg", "image/png"}:
        raise HTTPException(status_code=415, detail="Only PDF, JPG, and PNG files are accepted")
    key = f"{uuid4().hex}{Path(file.filename or '').suffix.lower()}"
    with (UPLOAD_DIR / key).open("wb") as destination:
        shutil.copyfileobj(file.file, destination)
    document = Document(patient_id=patient_id, filename=file.filename or "document", storage_key=key, content_type=file.content_type)
    db.add(document); db.commit(); db.refresh(document)
    return document


@app.get("/me", response_model=PatientDetail)
def my_record(patient_id: Annotated[int, Depends(patient_session)], db: Annotated[Session, Depends(get_db)]) -> Patient:
    return require_patient(db, patient_id)


@app.patch("/me", response_model=PatientOut)
def update_my_record(payload: PatientUpdate, patient_id: Annotated[int, Depends(patient_session)], db: Annotated[Session, Depends(get_db)]) -> Patient:
    patient = require_patient(db, patient_id)
    for key, value in payload.model_dump(exclude_unset=True).items(): setattr(patient, key, value)
    db.commit(); db.refresh(patient)
    return patient


@app.post("/me/documents", response_model=DocumentOut, status_code=201)
def upload_my_document(file: Annotated[UploadFile, File(...)], patient_id: Annotated[int, Depends(patient_session)], db: Annotated[Session, Depends(get_db)]) -> Document:
    # Reuse the same validation/storage logic while enforcing patient ownership first.
    patient = require_patient(db, patient_id)
    if file.content_type not in {"application/pdf", "image/jpeg", "image/png"}:
        raise HTTPException(status_code=415, detail="Only PDF, JPG, and PNG files are accepted")
    key = f"{uuid4().hex}{Path(file.filename or '').suffix.lower()}"
    with (UPLOAD_DIR / key).open("wb") as destination:
        shutil.copyfileobj(file.file, destination)
    document = Document(patient_id=patient.id, filename=file.filename or "document", storage_key=key, content_type=file.content_type)
    db.add(document); db.commit(); db.refresh(document)
    return document


@app.get("/documents/{document_id}/download")
def download_document(document_id: int, session: Annotated[tuple[str, int], Depends(current_session)], db: Annotated[Session, Depends(get_db)]) -> FileResponse:
    """Return a document only when the signed-in doctor or its patient owns it."""
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    role, owner_id = session
    if role == "patient" and document.patient_id != owner_id:
        raise HTTPException(status_code=403, detail="You cannot access this document")
    if role == "doctor" and document.patient.doctor_id != owner_id:
        raise HTTPException(status_code=403, detail="You cannot access this document")
    path = UPLOAD_DIR / document.storage_key
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Stored file not found")
    return FileResponse(path, media_type=document.content_type or "application/octet-stream", filename=document.filename)


@app.get("/me/appointments", response_model=list[AppointmentOut])
def my_appointments(patient_id: Annotated[int, Depends(patient_session)], db: Annotated[Session, Depends(get_db)]) -> list[AppointmentOut]:
    appointments = list(db.scalars(select(Appointment).where(Appointment.patient_id == patient_id).order_by(Appointment.created_at.desc())))
    return [appointment_out(item) for item in appointments]


@app.post("/me/appointments", response_model=AppointmentOut, status_code=201)
def request_appointment(payload: AppointmentCreate, patient_id: Annotated[int, Depends(patient_session)], db: Annotated[Session, Depends(get_db)]) -> AppointmentOut:
    appointment = Appointment(patient_id=patient_id, **payload.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment_out(appointment)


@app.get("/me/notifications", response_model=list[NotificationOut])
def my_notifications(patient_id: Annotated[int, Depends(patient_session)], db: Annotated[Session, Depends(get_db)]) -> list[Notification]:
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.patient_id == patient_id)
            .order_by(Notification.created_at.desc())
        )
    )


@app.get("/appointments", response_model=list[AppointmentOut])
def list_appointments(
    doctor_id: Annotated[int, Depends(doctor_session)],
    db: Annotated[Session, Depends(get_db)],
) -> list[AppointmentOut]:
    appointments = list(
        db.scalars(
            select(Appointment)
            .join(Patient)
            .where(Patient.doctor_id == doctor_id)
            .order_by(Appointment.created_at.desc())
        )
    )
    return [appointment_out(item) for item in appointments]


@app.patch("/appointments/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    doctor_id: Annotated[int, Depends(doctor_session)],
    db: Annotated[Session, Depends(get_db)],
) -> AppointmentOut:
    appointment = db.get(Appointment, appointment_id)
    if not appointment or appointment.patient.doctor_id != doctor_id:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if payload.status == "rescheduled":
        if not payload.preferred_date or not payload.preferred_time:
            raise HTTPException(
                status_code=400,
                detail="Reschedule requires a new date and time",
            )
        appointment.preferred_date = payload.preferred_date
        appointment.preferred_time = payload.preferred_time
    elif payload.preferred_date is not None:
        appointment.preferred_date = payload.preferred_date
    if payload.preferred_time is not None and payload.status != "rescheduled":
        appointment.preferred_time = payload.preferred_time

    appointment.status = payload.status
    if payload.doctor_note is not None:
        appointment.doctor_note = payload.doctor_note

    date_label = appointment.preferred_date.isoformat()
    time_label = appointment.preferred_time
    if payload.status == "approved":
        message = f"Your appointment on {date_label} at {time_label} was approved."
    elif payload.status == "rescheduled":
        message = f"Your appointment was rescheduled to {date_label} at {time_label}."
    else:
        message = f"Your appointment request for {date_label} at {time_label} was cancelled."
    if appointment.doctor_note:
        message = f"{message} Note from clinic: {appointment.doctor_note}"

    notify_patient(db, appointment.patient_id, message)
    db.commit()
    db.refresh(appointment)
    return appointment_out(appointment)
