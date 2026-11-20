"""MUFSAL - profile pages: read the account and save the contact details."""
import psycopg

from db import get_connection


def get_doctor_profile(user_id):
    """Everything the doctor's profile page shows. None when the id is not a professional."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.role, u.full_name, u.email, u.national_id,
                   p.scfhs_number
            FROM users u
            JOIN professionals p ON p.user_id = u.user_id
            WHERE u.user_id = %s
            """,
            (user_id,),
        ).fetchone()


def update_contact(user_id, email):
    """Save the email address.

    Returns True, or a dict with 'error': 'email_taken' or 'bad_value'
    (the database rejected the format).
    """
    try:
        with get_connection() as conn:
            conn.execute(
                "UPDATE users SET email = %s WHERE user_id = %s",
                (email.strip(), user_id),
            )
    except psycopg.errors.UniqueViolation:
        return {"error": "email_taken"}
    except psycopg.errors.CheckViolation:
        return {"error": "bad_value"}
    return True
