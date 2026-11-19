"""MUFSAL - queries used only by the administrator pages.

Delayed requests, registration history, active accounts and general complaints.
(Registration requests and reassigning a case already live in queries_accounts.py and queries_delays.py.)
Every function returns plain dictionaries, like the other queries_*.py files.
"""
from db import get_connection

COMPLAINT_STATUSES = ("open", "investigating", "resolved")
DELAY_STATUSES = ("pending", "handled")


# ------------------------------------------------------------------ summary (dashboard cards)

def get_summary():
    """The three numbers on the admin dashboard."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT
              (SELECT COUNT(*) FROM delay_complaints WHERE status = 'pending')::int       AS delayed,
              (SELECT COUNT(*) FROM users WHERE status = 'pending'
                                          AND role IN ('doctor','radiologist'))::int      AS licenses,
              (SELECT COUNT(*) FROM complaints WHERE status <> 'resolved')::int           AS complaints
            """
        ).fetchone()


# ------------------------------------------------------------------ delayed requests

def list_delayed():
    """Every delay complaint (pending and handled), longest wait first.

    Each row has the 'log' of its case (case_activity) so the details panel can show what happened.
    """
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT d.delay_complaint_id, d.case_id, d.status, d.created_at AS reported_at, d.handled_at,
                   c.submitted_at,
                   raiser.role       AS source,
                   raiser.full_name  AS raised_by,
                   patient.full_name AS patient_name,
                   doctor.full_name  AS doctor_name,
                   c.assigned_doctor_id
            FROM delay_complaints d
            JOIN cases c       ON c.case_id = d.case_id
            JOIN users raiser  ON raiser.user_id = d.user_id
            JOIN users patient ON patient.user_id = c.patient_id
            LEFT JOIN users doctor ON doctor.user_id = c.assigned_doctor_id
            ORDER BY c.submitted_at ASC
            """
        ).fetchall()
        for r in rows:
            r["log"] = conn.execute(
                """
                SELECT event_type, doctor_name, note, created_at
                FROM case_activity WHERE case_id = %s ORDER BY created_at, activity_id
                """,
                (r["case_id"],),
            ).fetchall()
    return rows


def get_delay_complaint(delay_complaint_id):
    with get_connection() as conn:
        return conn.execute(
            "SELECT delay_complaint_id, case_id, status FROM delay_complaints WHERE delay_complaint_id = %s",
            (delay_complaint_id,),
        ).fetchone()


def mark_delay_handled(delay_complaint_id, admin_id):
    """Close a delay complaint without moving the case. Returns False when it is not pending."""
    with get_connection() as conn:
        row = conn.execute(
            """
            UPDATE delay_complaints
            SET status = 'handled', handled_at = CURRENT_TIMESTAMP, handled_by = %s
            WHERE delay_complaint_id = %s AND status = 'pending'
            RETURNING delay_complaint_id
            """,
            (admin_id, delay_complaint_id),
        ).fetchone()
    return row is not None


def list_doctors():
    """Approved doctors - the choices in the reassign dialog."""
    with get_connection() as conn:
        return conn.execute(
            "SELECT user_id, full_name FROM users WHERE role = 'doctor' AND status = 'approved' ORDER BY full_name"
        ).fetchall()


# ------------------------------------------------------------------ medical license verification

def list_decisions():
    """Approved / rejected registration decisions, newest first."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT decision_id, applicant_name, applicant_role, decision, reason, decided_at
            FROM registration_decisions ORDER BY decided_at DESC, decision_id DESC
            """
        ).fetchall()


def list_active_accounts():
    """Approved doctors and radiologists."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.full_name, u.role, p.scfhs_number,
                   COALESCE(
                       (SELECT MAX(decided_at) FROM registration_decisions r
                        WHERE r.professional_id = u.user_id AND r.decision = 'approved'),
                       u.created_at) AS approved_at
            FROM users u JOIN professionals p ON p.user_id = u.user_id
            WHERE u.status = 'approved' AND u.role IN ('doctor','radiologist')
            ORDER BY u.full_name
            """
        ).fetchall()


def delete_professional_account(user_id):
    """Delete an approved doctor or radiologist. Returns False when there is no such account.

    The database does the rest (README-database.md, section 6): reports the doctor approved stay with the
    patient, open cases lose the assignment. Doctors and radiologists have no files in uploads/ to delete.
    """
    with get_connection() as conn:
        row = conn.execute(
            "DELETE FROM users WHERE user_id = %s AND role IN ('doctor','radiologist') RETURNING user_id",
            (user_id,),
        ).fetchone()
    return row is not None


# ------------------------------------------------------------------ general complaints

def list_complaints():
    """Every complaint with the complainant and the admin replies (oldest first), newest complaint first."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT c.complaint_id, c.subject, c.body, c.status, c.created_at,
                   u.full_name AS complainant, u.role AS complainant_role
            FROM complaints c JOIN users u ON u.user_id = c.user_id
            ORDER BY c.created_at DESC, c.complaint_id DESC
            """
        ).fetchall()
        for c in rows:
            c["replies"] = conn.execute(
                "SELECT body, created_at FROM complaint_replies WHERE complaint_id = %s ORDER BY created_at, reply_id",
                (c["complaint_id"],),
            ).fetchall()
    return rows


# A complaint's status is never picked by hand. It moves by itself:
#   open           - just arrived, nobody has looked at it
#   investigating  - the admin opened its details (mark_complaint_seen)
#   resolved       - the admin sent a reply (respond_to_complaint)

def mark_complaint_seen(complaint_id):
    """The admin opened the complaint: 'open' becomes 'investigating'. Any other status stays as it is.
    Returns the status after the call, or None when there is no such complaint."""
    with get_connection() as conn:
        conn.execute(
            "UPDATE complaints SET status = 'investigating' WHERE complaint_id = %s AND status = 'open'",
            (complaint_id,),
        )
        row = conn.execute("SELECT status FROM complaints WHERE complaint_id = %s", (complaint_id,)).fetchone()
    return row["status"] if row else None


def respond_to_complaint(complaint_id, admin_id, reply):
    """Save the admin's reply and mark the complaint 'resolved'. Returns False when not found."""
    with get_connection() as conn:
        row = conn.execute(
            "UPDATE complaints SET status = 'resolved' WHERE complaint_id = %s RETURNING complaint_id",
            (complaint_id,),
        ).fetchone()
        if row is None:
            return False
        conn.execute(
            "INSERT INTO complaint_replies (complaint_id, admin_id, body) VALUES (%s, %s, %s)",
            (complaint_id, admin_id, reply),
        )
    return True
