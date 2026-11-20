"""MUFSAL - account queries: registration and login."""
import bcrypt

from db import get_connection


def hash_password(plain_password):
    """Turn a plain password into a hash that is safe to store."""
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt(rounds=12)).decode()


def check_password(plain_password, password_hash):
    """Return True when the password matches the stored hash."""
    return bcrypt.checkpw(plain_password.encode(), password_hash.encode())


# Checked when the email does not exist, so a wrong email and a wrong password take the same time
DUMMY_HASH = hash_password("not-a-real-password")


def create_patient(full_name, email, password, national_id, date_of_birth, gender):
    """Create a patient account. Returns the new user_id."""
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO users (role, full_name, email, password_hash, national_id, status)
            VALUES ('patient', %s, %s, %s, %s, 'approved')
            RETURNING user_id
            """,
            (full_name, email, hash_password(password), national_id),
        ).fetchone()

        conn.execute(
            "INSERT INTO patients (user_id, date_of_birth, gender) VALUES (%s, %s, %s)",
            (row["user_id"], date_of_birth, gender),
        )
    return row["user_id"]


def create_professional(full_name, email, password, national_id,
                        role, scfhs_number, license_expiry):
    """Create a doctor or radiologist account, waiting for admin approval."""
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO users (role, full_name, email, password_hash, national_id, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
            RETURNING user_id
            """,
            (role, full_name, email, hash_password(password), national_id),
        ).fetchone()

        # role is repeated here only so the composite key can check it, and
        # license_expiry is required of every professional when registering
        conn.execute(
            "INSERT INTO professionals (user_id, role, scfhs_number, license_expiry)"
            " VALUES (%s, %s, %s, %s)",
            (row["user_id"], role, scfhs_number, license_expiry),
        )
    return row["user_id"]


def find_patient_by_national_id(national_id):
    """The approved patient with this National ID / Iqama number, or None.
    Only what the radiologist needs to link a case to the patient: the id and the name."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id AS patient_id, u.full_name
            FROM users u JOIN patients p ON p.user_id = u.user_id
            WHERE u.national_id = %s AND u.status = 'approved'
            """,
            (national_id,),
        ).fetchone()


def get_user_by_email(email):
    """Return the account with this email, or None."""
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE LOWER(email) = LOWER(%s)", (email,)
        ).fetchone()


def is_deactivated(user_id):
    """True when an admin has taken this professional's account out of service."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM professionals WHERE user_id = %s AND deactivated_at IS NOT NULL",
            (user_id,),
        ).fetchone()
    return row is not None


def login(email, password):
    """Check an email and password.

    Returns the account when the login is valid, otherwise a dict with 'error':
    'not_found', 'wrong_password', 'pending', 'rejected' or 'deactivated'.
    """
    user = get_user_by_email(email)
    if user is None:
        check_password(password, DUMMY_HASH)
        return {"error": "not_found"}
    if not check_password(password, user["password_hash"]):
        return {"error": "wrong_password"}
    if user["status"] != "approved":
        return {"error": user["status"]}
    # A closed account keeps the status it was approved with, because that part
    # of its history did happen. What stops it logging in is the closing itself.
    if user["role"] in ("doctor", "radiologist") and is_deactivated(user["user_id"]):
        return {"error": "deactivated"}

    del user["password_hash"]  # never send the hash to the pages
    return user


# ---------------------------------------------------------------------
# Added for the login / registration pages (routes_auth.py)
# ---------------------------------------------------------------------

def national_id_exists(national_id):
    """True when an account already uses this National ID / Iqama number."""
    with get_connection() as conn:
        return conn.execute(
            "SELECT 1 FROM users WHERE national_id = %s", (national_id,)
        ).fetchone() is not None


def scfhs_exists(scfhs_number):
    """True when a professional already uses this SCFHS number."""
    with get_connection() as conn:
        return conn.execute(
            "SELECT 1 FROM professionals WHERE scfhs_number = %s", (scfhs_number,)
        ).fetchone() is not None


def get_rejection_reason(user_id):
    """The reason of the admin's latest rejection of this professional, or ''."""
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT reason FROM registration_decisions
            WHERE professional_id = %s AND decision = 'rejected'
            ORDER BY decided_at DESC, decision_id DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()
    return row["reason"] if row else ""


def resubmit_professional(user_id, full_name, password, national_id,
                          role, scfhs_number, license_expiry):
    """A rejected professional sends a new request with the same email.

    The email column is unique, so the old row is reused and goes back to
    'pending'. The old rejection stays in registration_decisions as history.
    """
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE users
            SET full_name = %s, password_hash = %s, national_id = %s,
                role = %s, status = 'pending'
            WHERE user_id = %s AND status = 'rejected'
            """,
            (full_name, hash_password(password), national_id, role, user_id),
        )
        # the role is kept in step here too, or the composite key would refuse
        conn.execute(
            "UPDATE professionals SET role = %s, scfhs_number = %s, license_expiry = %s"
            " WHERE user_id = %s",
            (role, scfhs_number, license_expiry, user_id),
        )
    return user_id


def list_pending_professionals():
    """The registration requests waiting for the admin, oldest first."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.full_name, u.role, u.email, u.national_id,
                   p.scfhs_number, u.created_at
            FROM users u JOIN professionals p ON p.user_id = u.user_id
            WHERE u.status = 'pending'
            ORDER BY u.created_at, u.user_id
            """
        ).fetchall()


def decide_professional(user_id, admin_id, decision, reason=None):
    """Admin approves or rejects a pending professional.

    decision is 'approved' or 'rejected' (a reason is required for 'rejected').
    Writes the decision to registration_decisions. Returns False when the
    request is not pending (already decided, or not a professional).
    """
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT full_name, role FROM users
            WHERE user_id = %s AND status = 'pending' AND role IN ('doctor','radiologist')
            FOR UPDATE
            """,
            (user_id,),
        ).fetchone()
        if row is None:
            return False
        conn.execute("UPDATE users SET status = %s WHERE user_id = %s", (decision, user_id))
        conn.execute(
            """
            INSERT INTO registration_decisions
                (professional_id, admin_id, decision, reason)
            VALUES (%s, %s, %s, %s)
            """,
            (user_id, admin_id, decision, reason),
        )
    return True


def create_password_reset(user_id, token_hash):
    """Save a one-time reset token (only its hash) that works for one hour."""
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO password_resets (user_id, token, expires_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '1 hour')
            """,
            (user_id, token_hash),
        )


def get_valid_password_reset(token_hash):
    """The unused, unexpired reset with this token hash, or None."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT reset_id, user_id FROM password_resets
            WHERE token = %s AND used = FALSE AND expires_at > CURRENT_TIMESTAMP
            """,
            (token_hash,),
        ).fetchone()


def complete_password_reset(reset_id, user_id, new_password):
    """Save the new password and make the token unusable."""
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET password_hash = %s WHERE user_id = %s",
            (hash_password(new_password), user_id),
        )
        conn.execute("UPDATE password_resets SET used = TRUE WHERE reset_id = %s", (reset_id,))
