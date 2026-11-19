"""MUFSAL - the radiologist's own queries: the cases THIS radiologist uploaded."""
from db import get_connection


def get_radiologist_stats(radiologist_id):
    """The three numbers at the top of the radiologist dashboard."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT COUNT(*)                                       AS total,
                   COUNT(*) FILTER (WHERE status = 'under_review') AS waiting,
                   COUNT(*) FILTER (WHERE status = 'approved')     AS approved
            FROM cases
            -- sent in by him, not by the patient herself: comparing the two
            -- columns is what the old "source" column used to say
            WHERE uploaded_by = %s AND uploaded_by <> patient_id
            """,
            (radiologist_id,),
        ).fetchone()


def get_radiologist_cases(radiologist_id, limit=None):
    """Cases uploaded by this radiologist, newest first (all of them when limit is None)."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, c.status, c.submitted_at,
                   p.full_name AS patient_name, p.national_id,
                   h.knee, r.final_grade, r.approved_at
            FROM cases c
            JOIN users p            ON p.user_id = c.patient_id
            LEFT JOIN case_history h ON h.case_id = c.case_id
            LEFT JOIN reports r      ON r.case_id = c.case_id
            WHERE c.uploaded_by = %s AND c.uploaded_by <> c.patient_id
            ORDER BY c.submitted_at DESC
            LIMIT %s
            """,
            (radiologist_id, limit),
        ).fetchall()
