"""MUFSAL - database queries for the doctor and admin dashboards."""
from db import get_connection


def get_user_name(user_id):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT full_name FROM users WHERE user_id = %s", (user_id,)
        ).fetchone()
    return row["full_name"] if row else ""


# ---------------------------------------------------------------- doctor

def get_doctor_stats(doctor_id):
    """Numbers for the three cards at the top of the doctor dashboard."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE c.status = 'under_review')                       AS pending,
              COUNT(*) FILTER (WHERE c.status = 'under_review' AND a.priority = 'high') AS high_priority,
              COUNT(*) FILTER (WHERE c.status = 'approved')                           AS approved
            FROM cases c
            LEFT JOIN ai_results a ON a.case_id = c.case_id
            WHERE c.assigned_doctor_id = %s
            """,
            (doctor_id,),
        ).fetchone()


def get_doctor_pending(doctor_id, limit=5):
    """Pending cases, most urgent first (high priority, then oldest)."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, c.submitted_at, p.national_id,
                   a.predicted_grade, a.confidence, a.priority
            FROM cases c
            JOIN users p ON p.user_id = c.patient_id
            LEFT JOIN ai_results a ON a.case_id = c.case_id
            WHERE c.assigned_doctor_id = %s AND c.status = 'under_review'
            ORDER BY CASE a.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                     c.submitted_at ASC
            LIMIT %s
            """,
            (doctor_id, limit),
        ).fetchall()


def get_doctor_approved(doctor_id, limit=5):
    """The doctor's most recently approved cases."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, p.national_id, r.final_grade, r.approved_at
            FROM cases c
            JOIN users p ON p.user_id = c.patient_id
            JOIN reports r ON r.case_id = c.case_id
            WHERE c.assigned_doctor_id = %s AND c.status = 'approved'
            ORDER BY r.approved_at DESC
            LIMIT %s
            """,
            (doctor_id, limit),
        ).fetchall()


# ---------------------------------------------------------------- admin

def get_admin_stats():
    """Numbers for the three cards on the admin dashboard."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT
              (SELECT COUNT(*) FROM cases
                WHERE status = 'under_review'
                  AND submitted_at < NOW() - INTERVAL '24 hours')           AS delayed,
              (SELECT COUNT(*) FROM users
                WHERE role IN ('doctor', 'radiologist') AND status = 'pending') AS licenses,
              (SELECT COUNT(*) FROM complaints WHERE status <> 'resolved')   AS complaints
            """
        ).fetchone()
