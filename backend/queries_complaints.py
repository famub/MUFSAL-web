"""MUFSAL - complaint queries: a user's own complaints and new complaints."""
from db import get_connection


def get_user_complaints(user_id):
    """Return the user's complaints, newest first.

    Each complaint has a 'replies' list with the admin's answers (oldest first).
    """
    with get_connection() as conn:
        complaints = conn.execute(
            """
            SELECT complaint_id, subject, body, status, created_at, case_id
            FROM complaints
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()

        for c in complaints:
            c["replies"] = conn.execute(
                """
                SELECT body, created_at
                FROM complaint_replies
                WHERE complaint_id = %s
                ORDER BY created_at ASC
                """,
                (c["complaint_id"],),
            ).fetchall()
    return complaints


def create_complaint(user_id, subject, body, case_id=None):
    """Save a new complaint with status 'open'. Returns the new complaint_id.

    case_id says which case the complaint is about, and stays empty when it
    is about nothing in particular.
    """
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO complaints (user_id, subject, body, case_id)
            VALUES (%s, %s, %s, %s)
            RETURNING complaint_id
            """,
            (user_id, subject, body, case_id),
        ).fetchone()
    return row["complaint_id"]


def get_cases_for_user(user_id):
    """The cases this user may name in a complaint, newest first.

    A doctor sees the cases assigned to them and a radiologist the ones they
    uploaded, which is exactly the set each of them can complain about. An
    admin is tied to no case, so the list comes back empty and the page
    simply offers "not about a specific case".
    """
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, c.submitted_at, h.knee
            FROM cases c
            LEFT JOIN case_history h ON h.case_id = c.case_id
            WHERE c.assigned_doctor_id = %(user)s OR c.uploaded_by = %(user)s
            ORDER BY c.submitted_at DESC
            LIMIT 60
            """,
            {"user": user_id},
        ).fetchall()
