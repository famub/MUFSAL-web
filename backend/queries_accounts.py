"""MUFSAL - account queries: registration and login."""
import bcrypt

from db import get_connection


def hash_password(plain_password):
    """Turn a plain password into a hash that is safe to store."""
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt(rounds=12)).decode()


def check_password(plain_password, password_hash):
    """Return True when the password matches the stored hash."""
    return bcrypt.checkpw(plain_password.encode(), password_hash.encode())


def create_patient(full_name, email, password, phone, national_id, date_of_birth, gender):
    """Create a patient account. Returns the new user_id."""
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO users (role, full_name, email, password_hash, phone, national_id, status)
            VALUES ('patient', %s, %s, %s, %s, %s, 'approved')
            RETURNING user_id
            """,
            (full_name, email, hash_password(password), phone, national_id),
        ).fetchone()

        conn.execute(
            "INSERT INTO patients (user_id, date_of_birth, gender) VALUES (%s, %s, %s)",
            (row["user_id"], date_of_birth, gender),
        )
    return row["user_id"]


def create_professional(full_name, email, password, phone, national_id,
                        role, scfhs_number, license_file_path):
    """Create a doctor or radiologist account, waiting for admin approval."""
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO users (role, full_name, email, password_hash, phone, national_id, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending')
            RETURNING user_id
            """,
            (role, full_name, email, hash_password(password), phone, national_id),
        ).fetchone()

        conn.execute(
            """
            INSERT INTO professionals (user_id, scfhs_number, license_file_path)
            VALUES (%s, %s, %s)
            """,
            (row["user_id"], scfhs_number, license_file_path),
        )
    return row["user_id"]


def get_user_by_email(email):
    """Return the account with this email, or None."""
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE LOWER(email) = LOWER(%s)", (email,)
        ).fetchone()


def login(email, password):
    """Check an email and password.

    Returns the account when the login is valid, otherwise a dict with 'error':
    'not_found', 'wrong_password', 'pending' or 'rejected'.
    """
    user = get_user_by_email(email)
    if user is None:
        return {"error": "not_found"}
    if not check_password(password, user["password_hash"]):
        return {"error": "wrong_password"}
    if user["status"] != "approved":
        return {"error": user["status"]}

    del user["password_hash"]  # never send the hash to the pages
    return user