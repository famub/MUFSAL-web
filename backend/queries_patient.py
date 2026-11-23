"""Database questions the patient's pages ask.

Shahd's file. Nothing else in the project imports it, so changing a
query here can only affect the patient's own pages.

Every function opens its own connection, runs one question and gives
back plain rows - no page logic, no HTML.
"""
from db import get_connection
# the one place in the project that hashes and checks passwords, so the
# profile page cannot grow a second way of doing it
from queries_accounts import check_password, hash_password

# A patient may report a delay only after this many days of waiting.
# It matches DELAY_DAYS in queries_delays.py, which checks it again
# on the server when the button is actually pressed.
DELAY_DAYS = 10


# ============================================================ the home page

def get_patient_header(patient_id):
    """The name for the welcome line and how many cases the patient has.

    Returns a row with: full_name, first_name, total_cases.
    """
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.full_name,
                   split_part(u.full_name, ' ', 1) AS first_name,
                   (SELECT COUNT(*) FROM cases c WHERE c.patient_id = u.user_id) AS total_cases
            FROM users u
            WHERE u.user_id = %s
            """,
            (patient_id,),
        ).fetchone()


def get_open_case(patient_id):
    """The one case still with a doctor, or None.

    A patient may only have one case under review at a time, so this is
    the case the home page follows. It also works out, in the database,
    everything the page needs to know about reporting a delay:

        days_waited   how long since the X-ray was uploaded
        delay_date    the day the "Report a delay" button turns on
        delay_ready   True once that day has arrived
        delay_open    True if a delay was already reported and is still open
    """
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id,
                   c.submitted_at,
                   h.knee,
                   (CURRENT_DATE - c.submitted_at::date)                        AS days_waited,
                   (c.submitted_at + make_interval(days => %(days)s))::date     AS delay_date,
                   (CURRENT_TIMESTAMP - c.submitted_at)
                        >= make_interval(days => %(days)s)                      AS delay_ready,
                   EXISTS (SELECT 1 FROM delay_complaints d
                           WHERE d.case_id = c.case_id AND d.status = 'pending') AS delay_open
            FROM cases c
            LEFT JOIN case_history h ON h.case_id = c.case_id
            WHERE c.patient_id = %(patient)s
              AND c.status = 'under_review'
            ORDER BY c.submitted_at DESC
            LIMIT 1
            """,
            {"patient": patient_id, "days": DELAY_DAYS},
        ).fetchone()


def get_latest_case(patient_id):
    """The newest case, whatever state it is in, or None.

    The home page follows this one: while it is being read the page shows
    how far it has got, and once the report is signed the same card turns
    into the way in to that report.
    """
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id,
                   c.status,
                   c.submitted_at,
                   h.knee,
                   CASE WHEN c.uploaded_by = c.patient_id THEN 'patient' ELSE 'radiologist' END AS source,
                   up.full_name                                                 AS uploaded_by_name,
                   r.final_grade,
                   r.approved_at,
                   (CURRENT_DATE - c.submitted_at::date)                        AS days_waited,
                   (c.submitted_at + make_interval(days => %(days)s))::date     AS delay_date,
                   (CURRENT_TIMESTAMP - c.submitted_at)
                        >= make_interval(days => %(days)s)                      AS delay_ready,
                   EXISTS (SELECT 1 FROM delay_complaints d
                           WHERE d.case_id = c.case_id AND d.status = 'pending') AS delay_open
            FROM cases c
            LEFT JOIN case_history h ON h.case_id = c.case_id
            LEFT JOIN reports      r ON r.case_id = c.case_id
            LEFT JOIN users       up ON up.user_id = c.uploaded_by
            WHERE c.patient_id = %(patient)s
            ORDER BY c.submitted_at DESC
            LIMIT 1
            """,
            {"patient": patient_id, "days": DELAY_DAYS},
        ).fetchone()


# =============================================================== "My cases"

def get_all_cases(patient_id):
    """Every X-ray this patient has sent, newest first.

    final_grade and approved_at are empty while a case is still being
    read, which is how the page knows whether to offer the report.
    """
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id,
                   c.status,
                   c.submitted_at,
                   h.knee,
                   CASE WHEN c.uploaded_by = c.patient_id THEN 'patient' ELSE 'radiologist' END AS source,
                   up.full_name AS uploaded_by_name,
                   r.final_grade,
                   r.approved_at
            FROM cases c
            LEFT JOIN case_history h ON h.case_id = c.case_id
            LEFT JOIN reports      r ON r.case_id = c.case_id
            LEFT JOIN users       up ON up.user_id = c.uploaded_by
            WHERE c.patient_id = %s
            ORDER BY c.submitted_at DESC
            """,
            (patient_id,),
        ).fetchall()


# ================================================================= profile

def get_profile(user_id):
    """Everything the profile page shows.

    The account row and the patient row are always created together at
    sign-up, so one question with a join answers the whole page.
    """
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.full_name, u.email, u.national_id, u.password_changed_at,
                   p.date_of_birth, p.gender
            FROM users u
            JOIN patients p ON p.user_id = u.user_id
            WHERE u.user_id = %s
            """,
            (user_id,),
        ).fetchone()


def email_belongs_to_someone_else(email, user_id):
    """True when another account already uses this email address.

    Checked here as well as by the UNIQUE rule on the column, so the
    patient gets a clear message instead of a database error.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM users WHERE lower(email) = lower(%s) AND user_id <> %s",
            (email, user_id),
        ).fetchone()
    return row is not None


def update_profile(user_id, full_name, date_of_birth, gender):
    """Save the details a patient is allowed to change.

    The national ID and the email address are left out on purpose. The ID
    is what the account was opened against, and the email is what the
    account is known by and where a password-reset link is sent, so both
    are an administrator's to change. The name lives on the account row,
    the date of birth and the sex on the patient row, so the two rows are
    written in the same transaction - the connection commits once, at the
    end of the block.
    """
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET full_name = %s WHERE user_id = %s",
            (full_name, user_id),
        )
        conn.execute(
            "UPDATE patients SET date_of_birth = %s, gender = %s WHERE user_id = %s",
            (date_of_birth, gender, user_id),
        )


def password_is_the_current_one(user_id, password):
    """True when this is the password the account already has.

    The old password is not stored anywhere, only its hash, so the new one
    is hashed the same way and the two hashes are compared.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE user_id = %s", (user_id,)
        ).fetchone()
    return bool(row) and check_password(password, row["password_hash"])


def set_password(user_id, new_password):
    """Replace the password with a fresh hash of the new one, and note the
    day it happened, which is what the profile shows underneath it."""
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE users
            SET password_hash = %s, password_changed_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """,
            (hash_password(new_password), user_id),
        )


# =============================================================== support requests

def get_case_choices(patient_id):
    """The patient's cases, for the "which case?" list on the support request form."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, c.submitted_at, h.knee
            FROM cases c
            LEFT JOIN case_history h ON h.case_id = c.case_id
            WHERE c.patient_id = %s
            ORDER BY c.submitted_at DESC
            """,
            (patient_id,),
        ).fetchall()


def create_support_request(user_id, body, case_id=None):
    """Save a support request. case_id may be None when it is about nothing in
    particular. Returns the new request_id."""
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


def get_written_support_requests(user_id):
    """The support requests this user typed, newest first, each with the admin's
    answers underneath."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT request_id, body, status, created_at, case_id
            FROM support_requests
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()

        for row in rows:
            row["replies"] = conn.execute(
                """
                SELECT body, created_at
                FROM support_replies
                WHERE request_id = %s
                ORDER BY created_at ASC
                """,
                (row["request_id"],),
            ).fetchall()
    return rows


def get_delay_complaints(user_id):
    """The delays this user reported with the one-click button on a case.

    They live in their own table because they carry no text, so the
    support requests page reads both and shows them in one list.
    """
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT delay_complaint_id, case_id, status, created_at
            FROM delay_complaints
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()
