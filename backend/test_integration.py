"""Integration test suite for ClinicLog FastAPI backend and all connected flows."""
from io import BytesIO
from fastapi.testclient import TestClient
from main import app, DEMO_DOCTOR_PASSWORD, DEMO_PATIENT_PASSWORD

client = TestClient(app)


def test_cliniclog_flows():
    print("\n--- 1. Testing Health Check ---")
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
    print("Health check OK")

    print("\n--- 2. Testing Doctor Login ---")
    # Wrong password
    res = client.post("/auth/doctor/login", json={"phone": "9000000000", "password": "WrongPassword"})
    assert res.status_code == 401
    print("Doctor invalid login rejected with 401")

    # Correct credentials
    res = client.post("/auth/doctor/login", json={"phone": "9000000000", "password": DEMO_DOCTOR_PASSWORD})
    assert res.status_code == 200
    doctor_token = res.json()["access_token"]
    assert res.json()["role"] == "doctor"
    doctor_headers = {"Authorization": f"Bearer {doctor_token}"}
    print("Doctor login succeeded, token received")

    # Doctor Me
    res = client.get("/auth/doctor/me", headers=doctor_headers)
    assert res.status_code == 200
    doctor_info = res.json()
    assert doctor_info["phone"] == "9000000000"
    print(f"Doctor profile verified: {doctor_info['name']}")

    print("\n--- 3. Testing Doctor Patient Register & Search ---")
    res = client.get("/patients?q=Anita", headers=doctor_headers)
    assert res.status_code == 200
    anita_matches = res.json()
    assert len(anita_matches) >= 1
    anita_id = anita_matches[0]["id"]
    print(f"Patient search for 'Anita' found ID: {anita_id}")

    # Create new patient
    new_patient_data = {
        "name": "Rohan Verma",
        "phone": "+91 91234 56789",
        "age": 28,
        "gender": "Male",
        "locality": "Koramangala",
        "notes": "Mild allergy to dust",
        "password": "RohanSecure123"
    }
    res = client.post("/patients", json=new_patient_data, headers=doctor_headers)
    assert res.status_code == 201
    created_patient = res.json()
    created_id = created_patient["id"]
    print(f"New patient created with ID {created_id}: {created_patient['name']}")

    # Edit patient
    update_data = {
        "name": "Rohan Verma",
        "phone": "+91 91234 56789",
        "age": 29,
        "gender": "Male",
        "locality": "HSR Layout",
        "notes": "Mild allergy to dust. Annual checkup.",
    }
    res = client.patch(f"/patients/{created_id}", json=update_data, headers=doctor_headers)
    assert res.status_code == 200
    assert res.json()["age"] == 29
    assert res.json()["locality"] == "HSR Layout"
    print("Doctor update patient details verified")

    # Add consultation
    consult_data = {
        "visit_date": "2026-10-04",
        "reason": "Seasonal allergy",
        "notes": "Sneezing and water discharge from eyes for 3 days. Chest clear.",
        "prescription": "Cetirizine 10 mg once daily at bedtime for 5 days."
    }
    res = client.post(f"/patients/{created_id}/consultations", json=consult_data, headers=doctor_headers)
    assert res.status_code == 201
    consult_id = res.json()["id"]
    print(f"Consultation added with ID {consult_id}")

    # Check patient detail has history
    res = client.get(f"/patients/{created_id}", headers=doctor_headers)
    assert res.status_code == 200
    detail = res.json()
    assert len(detail["consultations"]) >= 1
    assert detail["consultations"][0]["reason"] == "Seasonal allergy"
    print("Patient visit history verified in detail view")

    print("\n--- 4. Testing Patient Password + JWT Login ---")
    # Wrong password for Anita
    res = client.post("/auth/patient/login", json={"phone": "9876543120", "password": "WrongPassword12"})
    assert res.status_code == 401
    print("Patient invalid password rejected with 401")

    # Wrong phone
    res = client.post("/auth/patient/login", json={"phone": "0000000000", "password": "SomePassword12"})
    assert res.status_code == 401
    print("Patient non-existent phone rejected with 401")

    # Correct credentials for Anita
    res = client.post("/auth/patient/login", json={"phone": "9876543120", "password": DEMO_PATIENT_PASSWORD})
    assert res.status_code == 200
    patient_token = res.json()["access_token"]
    assert res.json()["role"] == "patient"
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    print("Patient Anita password login succeeded, JWT token received")

    # Correct credentials for Rohan (created by doctor with password RohanSecure123)
    res = client.post("/auth/patient/login", json={"phone": "+91 91234 56789", "password": "RohanSecure123"})
    assert res.status_code == 200
    rohan_token = res.json()["access_token"]
    assert res.json()["role"] == "patient"
    rohan_headers = {"Authorization": f"Bearer {rohan_token}"}
    print("Patient Rohan password login succeeded, JWT token received")

    print("\n--- 5. Testing Patient Self-Service Flows ---")
    # View own record
    res = client.get("/me", headers=rohan_headers)
    assert res.status_code == 200
    me_info = res.json()
    assert me_info["name"] == "Rohan Verma"
    assert len(me_info["consultations"]) >= 1
    print("Patient /me loaded record and consultation history")

    # Update own profile
    res = client.patch("/me", json={"locality": "Indiranagar 100ft Rd", "age": 30}, headers=rohan_headers)
    assert res.status_code == 200
    assert res.json()["locality"] == "Indiranagar 100ft Rd"
    assert res.json()["age"] == 30
    print("Patient profile update verified")

    # Upload document
    dummy_pdf = BytesIO(b"%PDF-1.4 test document content")
    res = client.post(
        "/me/documents",
        files={"file": ("blood_report.pdf", dummy_pdf, "application/pdf")},
        headers=rohan_headers,
    )
    assert res.status_code == 201
    doc_id = res.json()["id"]
    print(f"Patient document uploaded with ID {doc_id}")

    # Download document as patient
    res = client.get(f"/documents/{doc_id}/download", headers=rohan_headers)
    assert res.status_code == 200
    assert b"%PDF-1.4 test document content" in res.content
    print("Patient document download verified")

    # Download document as doctor
    res = client.get(f"/documents/{doc_id}/download", headers=doctor_headers)
    assert res.status_code == 200
    print("Doctor document download verified")

    # Request appointment
    res = client.post("/me/appointments", json={
        "preferred_date": "2026-10-10",
        "preferred_time": "11:00 AM – 11:30 AM",
        "reason": "Follow-up checkup for allergies"
    }, headers=rohan_headers)
    assert res.status_code == 201
    appt_id = res.json()["id"]
    assert res.json()["status"] == "requested"
    print(f"Appointment request created with ID {appt_id}")

    # View patient's own appointments
    res = client.get("/me/appointments", headers=rohan_headers)
    assert res.status_code == 200
    appts = res.json()
    assert any(a["id"] == appt_id for a in appts)
    print("Patient appointments list verified")

    print("\n--- 6. Testing Doctor Appointment Management & Patient Notifications ---")
    # Doctor views appointments
    res = client.get("/appointments", headers=doctor_headers)
    assert res.status_code == 200
    doc_appts = res.json()
    assert any(a["id"] == appt_id for a in doc_appts)
    print("Doctor viewed appointments list including new request")

    # Doctor reschedules appointment
    res = client.patch(f"/appointments/{appt_id}", json={
        "status": "rescheduled",
        "preferred_date": "2026-10-12",
        "preferred_time": "4:30 PM - 5:00 PM",
        "doctor_note": "Doctor is in surgery in the morning. Shifted to afternoon."
    }, headers=doctor_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "rescheduled"
    print("Doctor rescheduled appointment")

    # Verify patient received reschedule notification
    res = client.get("/me/notifications", headers=rohan_headers)
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) >= 1
    assert "rescheduled" in notifs[0]["message"]
    assert "Doctor is in surgery" in notifs[0]["message"]
    print(f"Patient received notification: {notifs[0]['message']}")

    # Doctor approves appointment
    res = client.patch(f"/appointments/{appt_id}", json={
        "status": "approved",
        "doctor_note": "Confirmed. Please arrive 5 minutes early."
    }, headers=doctor_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "approved"
    print("Doctor approved appointment")

    # Verify patient received approval notification
    res = client.get("/me/notifications", headers=rohan_headers)
    assert res.status_code == 200
    notifs = res.json()
    assert "approved" in notifs[0]["message"]
    print(f"Patient received approval notification: {notifs[0]['message']}")

    # Doctor cancels appointment
    res = client.patch(f"/appointments/{appt_id}", json={
        "status": "cancelled",
        "doctor_note": "Clinic closed due to holiday."
    }, headers=doctor_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "cancelled"
    print("Doctor cancelled appointment")

    # Verify patient received cancellation notification
    res = client.get("/me/notifications", headers=rohan_headers)
    assert res.status_code == 200
    notifs = res.json()
    assert "cancelled" in notifs[0]["message"]
    print(f"Patient received cancellation notification: {notifs[0]['message']}")

    print("\n--- 7. Testing Expired / Unauthorized Handling ---")
    # Missing token
    res = client.get("/me")
    assert res.status_code == 401
    print("Missing token rejected with 401")

    # Invalid token
    res = client.get("/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert res.status_code == 401
    print("Invalid token rejected with 401")

    # Role mismatch: Patient accessing doctor route
    res = client.get("/appointments", headers=rohan_headers)
    assert res.status_code == 403
    print("Patient accessing doctor route rejected with 403")

    # Role mismatch: Doctor accessing patient route
    res = client.get("/me", headers=doctor_headers)
    assert res.status_code == 403
    print("Doctor accessing patient route rejected with 403")

    print("\nALL CLINICLOG INTEGRATION TESTS PASSED SUCCESSFULLY!\n")


if __name__ == "__main__":
    test_cliniclog_flows()
