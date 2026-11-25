"""MUFSAL - profile pages: read the account and save the contact details."""
import psycopg

from db import get_connection


def get_doctor_profile(user_id):
    """Everything the doctor's profile page shows. None when the id is not a professional."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.role, u.full_name, u.email, u.national_id,
                   u.password_changed_at, p.scfhs_number,
             (p.license_expiry - CURRENT_DATE) AS license_days_left
            FROM users u
            JOIN healthcare_professionals p ON p.user_id = u.user_id
            WHERE u.user_id = %s
            """,
            (user_id,),
        ).fetchone()


def update_name(user_id, full_name):
    """Save the full name (the email is locked, only the name can be changed here)."""
    with get_connection() as conn:
        conn.execute("UPDATE users SET full_name = %s WHERE user_id = %s",
                     (full_name.strip(), user_id))
    return True


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
