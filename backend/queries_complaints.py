"""MUFSAL - complaint queries: a user's own complaints and new complaints."""
from db import get_connection


def get_user_complaints(user_id):
    """Return the user's complaints, newest first.

    Each complaint has a 'replies' list with the admin's answers (oldest first).
    """
    with get_connection() as conn:
        complaints = conn.execute(
            """
            SELECT complaint_id, subject, body, status, created_at
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


def create_complaint(user_id, subject, body):
    """Save a new complaint with status 'open'. Returns the new complaint_id."""
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO complaints (user_id, subject, body)
            VALUES (%s, %s, %s)
            RETURNING complaint_id
            """,
            (user_id, subject, body),
        ).fetchone()
    return row["complaint_id"]
