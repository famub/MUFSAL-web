"""MUFSAL - doctor dashboard queries (templates/dashboard-doctor.html)."""
from db import get_connection


def get_doctor_stats(doctor_id):
    """The three numbers at the top of the doctor dashboard."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT COUNT(*) FILTER (WHERE c.status = 'under_review')                       AS pending,
                   COUNT(*) FILTER (WHERE c.status = 'under_review' AND a.priority = 'high') AS high_priority,
                   COUNT(*) FILTER (WHERE c.status = 'approved')                           AS approved
            FROM cases c
            LEFT JOIN ai_results a ON a.case_id = c.case_id
            WHERE c.assigned_doctor_id = %s
            """,
            (doctor_id,),
        ).fetchone()


def get_doctor_approved(doctor_id, limit=None):
    """The doctor's approved cases, newest approval first (all of them when limit is None)."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, c.source, p.full_name AS patient_name, p.national_id,
            r.final_grade, r.approved_at
            FROM cases c
            JOIN users p   ON p.user_id = c.patient_id
            JOIN reports r ON r.case_id = c.case_id
            WHERE c.assigned_doctor_id = %s AND c.status = 'approved'
            ORDER BY r.approved_at DESC
            LIMIT %s
            """,
            (doctor_id, limit),
        ).fetchall()
