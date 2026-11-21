"""MUFSAL - support request queries: a user's own support requests and new support requests."""
from db import get_connection


def get_user_support_requests(user_id):
    """Return the user's support requests, newest first.

    Each support request has a 'replies' list with the admin's answers (oldest first).
    """
    with get_connection() as conn:
        support_requests = conn.execute(
            """
            SELECT request_id, body, status, created_at, case_id
            FROM support_requests
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()

        for c in support_requests:
            c["replies"] = conn.execute(
                """
                SELECT body, created_at
                FROM support_replies
                WHERE request_id = %s
                ORDER BY created_at ASC
                """,
                (c["request_id"],),
            ).fetchall()
    return support_requests


def create_support_request(user_id, body, case_id=None):
    """Save a new support request with status 'open'. Returns the new request_id.

    case_id says which case the support request is about, and stays empty when it
    is about nothing in particular.
    """
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO support_requests (user_id, body, case_id)
            VALUES (%s, %s, %s)
            RETURNING request_id
            """,
            (user_id, body, case_id),
        ).fetchone()
    return row["request_id"]


def get_cases_for_user(user_id):
    """The cases this user may name in a support request, newest first.

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
