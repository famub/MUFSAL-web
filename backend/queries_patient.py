"""Database questions the patient's pages ask.

Shahd's file. Nothing else in the project imports it, so changing a
query here can only affect the patient's own pages.

Every function opens its own connection, runs one question and gives
back plain rows - no page logic, no HTML.
"""
from db import get_connection

# A patient may report a delay only after this many days of waiting.
# It matches DELAY_DAYS in queries_delays.py, which checks it again
# on the server when the button is actually pressed.
DELAY_DAYS = 10


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
