"""MUFSAL - delay complaints: raised by a patient or a radiologist when a
report has not come back, and handled by the admin on the delayed-requests page."""
from db import get_connection

DELAY_DAYS = 10


def _delay_check(conn, case_id, user_id):
    """Return (allowed, reason). Shared by the button and the submit function."""
    case = conn.execute(
        "SELECT patient_id, uploaded_by, status, submitted_at FROM cases WHERE case_id = %s",
        (case_id,),
    ).fetchone()
    if case is None:
        return False, "case_not_found"

    is_patient = case["patient_id"] == user_id
    # the radiologist who sent this X-ray in: someone other than the patient,
    # which is the same thing the old "source" column used to say
    is_radiologist = (case["uploaded_by"] != case["patient_id"]
                      and case["uploaded_by"] == user_id)
    if not (is_patient or is_radiologist):
        return False, "not_allowed"

    if case["status"] != "under_review":
        return False, "already_approved"

    waited = conn.execute(
        "SELECT (CURRENT_TIMESTAMP - %s) >= make_interval(days => %s) AS ready",
        (case["submitted_at"], DELAY_DAYS),
    ).fetchone()
    if not waited["ready"]:
        return False, "too_early"

    open_one = conn.execute(
        "SELECT 1 FROM delay_complaints WHERE case_id = %s AND status = 'pending'",
        (case_id,),
    ).fetchone()
    if open_one is not None:
        return False, "already_reported"

    return True, None


def can_report_delay(case_id, user_id):
    """True when this user may press the 'report delay' button on this case."""
    with get_connection() as conn:
        allowed, _ = _delay_check(conn, case_id, user_id)
    return allowed



def create_delay_complaint(case_id, user_id):
    """Send a delay complaint. Returns the new id, or a dict with 'error'."""
    with get_connection() as conn:
        allowed, reason = _delay_check(conn, case_id, user_id)
        if not allowed:
            return {"error": reason}

        row = conn.execute(
            "INSERT INTO delay_complaints (case_id, user_id) VALUES (%s, %s) RETURNING delay_complaint_id",
            (case_id, user_id),
        ).fetchone()
    return row["delay_complaint_id"]


def list_delay_complaints(status="pending"):
    """The admin's delayed-requests list, longest wait first."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT d.delay_complaint_id, d.case_id, d.created_at, d.status,
                   raiser.full_name AS raised_by,
                   raiser.role      AS raised_by_role,
                   patient.full_name AS patient_name,
                   doctor.full_name  AS current_doctor,
                   c.assigned_doctor_id,
                   DATE_PART('day', CURRENT_TIMESTAMP - c.submitted_at)::int AS days_waiting
            FROM delay_complaints d
            JOIN cases c      ON c.case_id = d.case_id
            JOIN users raiser ON raiser.user_id = d.user_id
            JOIN users patient ON patient.user_id = c.patient_id
            LEFT JOIN users doctor ON doctor.user_id = c.assigned_doctor_id
            WHERE d.status = %s
            ORDER BY c.submitted_at ASC
            """,
            (status,),
        ).fetchall()


def reassign_case(case_id, new_doctor_id, admin_id):
    """Move the case to another doctor, close any open delay complaint and log it."""
    with get_connection() as conn:
        # only that such a doctor exists; the name is no longer copied anywhere
        doctor = conn.execute(
            "SELECT 1 FROM users u JOIN professionals p ON p.user_id = u.user_id"
            " WHERE u.user_id = %s AND u.role = 'doctor'"
            "   AND p.status = 'approved' AND p.deactivated_at IS NULL",
            (new_doctor_id,),
        ).fetchone()
        if doctor is None:
            return {"error": "doctor_not_found"}

        conn.execute(
            "UPDATE cases SET assigned_doctor_id = %s WHERE case_id = %s",
            (new_doctor_id, case_id),
        )

        conn.execute(
            """
            UPDATE delay_complaints
            SET status = 'handled', handled_at = CURRENT_TIMESTAMP, handled_by = %s
            WHERE case_id = %s AND status = 'pending'
            """,
            (admin_id, case_id),
        )

        conn.execute(
            """
            INSERT INTO case_activity (case_id, event_type, doctor_id, note)
            VALUES (%s, 'reassigned', %s, 'Reassigned by the admin after a delay complaint.')
            """,
            (case_id, new_doctor_id),
        )
    return True
