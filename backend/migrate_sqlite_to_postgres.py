"""Script to migrate all data from SQLite (cliniclog.db) to PostgreSQL.

Usage:
    python migrate_sqlite_to_postgres.py
"""
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from main import (
    Base, Doctor, Patient, Consultation, Document, Appointment, Notification,
    BASE_DIR
)

load_dotenv(BASE_DIR / ".env")

SQLITE_URL = f"sqlite:///{BASE_DIR / 'cliniclog.db'}"
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/cliniclog")

if POSTGRES_URL.startswith("postgres://"):
    POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif POSTGRES_URL.startswith("postgresql://") and "+psycopg2" not in POSTGRES_URL:
    POSTGRES_URL = POSTGRES_URL.replace("postgresql://", "postgresql+psycopg2://", 1)


def migrate() -> None:
    print("=" * 65)
    print("ClinicLog: SQLite -> PostgreSQL Data Migration")
    print("=" * 65)
    print(f"Source (SQLite):     {SQLITE_URL}")
    print(f"Target (PostgreSQL): {POSTGRES_URL}")

    sqlite_file = BASE_DIR / "cliniclog.db"
    if not sqlite_file.is_file():
        print(f"[Error] SQLite file not found at {sqlite_file}")
        return

    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    pg_engine = create_engine(POSTGRES_URL, pool_pre_ping=True)

    try:
        with pg_engine.connect() as conn:
            print("[OK] Connected to PostgreSQL database successfully.")
    except Exception as e:
        print(f"\n[Error] Could not connect to PostgreSQL: {e}")
        print("\nPlease ensure your PostgreSQL service is running and credentials are valid.")
        print("To start PostgreSQL in Docker, run in the project root:")
        print("    docker compose up -d\n")
        sys.exit(1)

    print("\nCreating schema & tables in PostgreSQL if not present...")
    Base.metadata.create_all(pg_engine)

    with Session(sqlite_engine) as src, Session(pg_engine) as dst:
        # 1. Doctors
        doctors = src.scalars(select(Doctor)).all()
        print(f"\nMigrating {len(doctors)} doctor(s)...")
        for d in doctors:
            if not dst.get(Doctor, d.id):
                dst.merge(d)
        dst.commit()

        # 2. Patients
        patients = src.scalars(select(Patient)).all()
        print(f"Migrating {len(patients)} patient(s)...")
        for p in patients:
            if not dst.get(Patient, p.id):
                dst.merge(p)
        dst.commit()

        # 3. Consultations
        consultations = src.scalars(select(Consultation)).all()
        print(f"Migrating {len(consultations)} consultation(s)...")
        for c in consultations:
            if not dst.get(Consultation, c.id):
                dst.merge(c)
        dst.commit()

        # 4. Documents
        documents = src.scalars(select(Document)).all()
        print(f"Migrating {len(documents)} document(s)...")
        for doc in documents:
            if not dst.get(Document, doc.id):
                dst.merge(doc)
        dst.commit()

        # 5. Appointments
        appointments = src.scalars(select(Appointment)).all()
        print(f"Migrating {len(appointments)} appointment(s)...")
        for a in appointments:
            if not dst.get(Appointment, a.id):
                dst.merge(a)
        dst.commit()

        # 6. Notifications
        notifications = src.scalars(select(Notification)).all()
        print(f"Migrating {len(notifications)} notification(s)...")
        for n in notifications:
            if not dst.get(Notification, n.id):
                dst.merge(n)
        dst.commit()

        # Align PostgreSQL primary key sequences
        print("\nAligning PostgreSQL sequences to prevent ID collisions...")
        tables = ["doctors", "patients", "consultations", "documents", "appointments", "notifications"]
        with pg_engine.begin() as conn:
            for t in tables:
                try:
                    conn.execute(text(f"""
                        SELECT setval(
                            pg_get_serial_sequence('{t}', 'id'),
                            COALESCE((SELECT MAX(id) FROM {t}), 1)
                        );
                    """))
                except Exception:
                    pass

    print("\n[OK] Migration completed successfully!")
    print("All doctors, patients, records, appointments, and notifications are now in PostgreSQL.")


if __name__ == "__main__":
    migrate()
