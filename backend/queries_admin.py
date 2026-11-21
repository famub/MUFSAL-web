"""MUFSAL - queries used only by the administrator pages.

Delayed reports, licence requests (registration and renewal), account-deletion requests,
active accounts and support messages. (Reassigning one case lives in queries_delays.py.)
Every function returns plain dictionaries, like the other queries_*.py files.
"""
from db import get_connection

# Support messages have two states for the admin: pending (the DB value 'open', or the old
# 'investigating') and resolved (the admin replied).
COMPLAINT_STATUSES = ("open", "investigating", "resolved")
DELAY_STATUSES = ("pending", "handled")


# ------------------------------------------------------------------ summary (dashboard cards)

def get_summary():
    """The numbers on the admin dashboard."""
    with get_connection() as conn:
        return conn.execute(
            f"""
            SELECT
              (SELECT COUNT(*) FROM delay_complaints WHERE status = 'pending')::int       AS delayed,
              (SELECT COUNT(*) FROM professionals p WHERE {_LICENSE_WAITING})::int        AS licenses,
              (SELECT COUNT(*) FROM professionals p WHERE {_DELETE_WAITING})::int         AS deletions,
              (SELECT COUNT(*) FROM support_requests WHERE status <> 'resolved')::int    AS support
            """
        ).fetchone()


# A professional is waiting for a licence decision when the first application is still pending,
# or when an approved one sent a new date (pending_license_expiry). A closed account never waits.
_LICENSE_WAITING = """p.deactivated_at IS NULL AND (p.status = 'pending'
                      OR (p.status = 'approved' AND p.pending_license_expiry IS NOT NULL))"""
# Asked to close the account and the admin has not decided yet.
_DELETE_WAITING = "p.delete_requested_at IS NOT NULL AND p.deactivated_at IS NULL"


# ------------------------------------------------------------------ delayed requests

def list_delayed():
    """Every delay complaint (pending and handled), longest wait first.

    Each row has the 'log' of its case (case_activity) so the details panel can show what happened.
    """
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT d.delay_complaint_id, d.case_id, d.status, d.created_at AS reported_at, d.handled_at,
                   c.submitted_at,
                   raiser.role       AS source,
                   raiser.full_name  AS raised_by,
                   patient.full_name AS patient_name,
                   doctor.full_name  AS doctor_name,
                   c.assigned_doctor_id
            FROM delay_complaints d
            JOIN cases c       ON c.case_id = d.case_id
            JOIN users raiser  ON raiser.user_id = d.user_id
            JOIN users patient ON patient.user_id = c.patient_id
            LEFT JOIN users doctor ON doctor.user_id = c.assigned_doctor_id
            ORDER BY c.submitted_at ASC
            """
        ).fetchall()
        for r in rows:
            r["log"] = conn.execute(
                """
                SELECT a.event_type, doc.full_name AS doctor_name, a.note, a.created_at
                FROM case_activity a
                JOIN users doc ON doc.user_id = a.doctor_id
                WHERE a.case_id = %s ORDER BY a.created_at, a.activity_id
                """,
                (r["case_id"],),
            ).fetchall()
    return rows


def get_delay_complaint(delay_complaint_id):
    with get_connection() as conn:
        return conn.execute(
            "SELECT delay_complaint_id, case_id, status FROM delay_complaints WHERE delay_complaint_id = %s",
            (delay_complaint_id,),
        ).fetchone()


def mark_delay_handled(delay_complaint_id, admin_id):
    """Close a delay complaint without moving the case. Returns False when it is not pending."""
    with get_connection() as conn:
        row = conn.execute(
            """
            UPDATE delay_complaints
            SET status = 'handled', handled_at = CURRENT_TIMESTAMP, handled_by = %s
            WHERE delay_complaint_id = %s AND status = 'pending'
            RETURNING delay_complaint_id
            """,
            (admin_id, delay_complaint_id),
        ).fetchone()
    return row is not None


def _doctor_load_sql():
    """Doctors who can take a case today: approved, open account, licence in date, not asking to leave.
    open_cases = reports they still have to write (cases under review)."""
    return """
        SELECT u.user_id, u.full_name,
               (SELECT COUNT(*) FROM cases c
                 WHERE c.assigned_doctor_id = u.user_id AND c.status = 'under_review')::int AS open_cases
        FROM users u JOIN professionals p ON p.user_id = u.user_id
        WHERE u.role = 'doctor' AND p.status = 'approved'
          AND p.deactivated_at IS NULL AND p.delete_requested_at IS NULL
          AND p.license_expiry >= CURRENT_DATE
    """


def list_doctors():
    """Doctors who can take a case, the one with the fewest open cases first (reassign dialog)."""
    with get_connection() as conn:
        return conn.execute(_doctor_load_sql() + " ORDER BY open_cases, u.full_name").fetchall()


def _pick_doctor(conn, leaving_id):
    """The doctor with the fewest open cases (ties: the first one), never the one who is leaving. None if nobody."""
    rows = conn.execute(
        _doctor_load_sql() + " AND u.user_id <> %s ORDER BY open_cases, u.user_id LIMIT 1", (leaving_id,)
    ).fetchall()
    return rows[0] if rows else None


# ------------------------------------------------------------------ medical license verification

def list_decisions():
    """Approved / rejected decisions (registration and renewal), newest first."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT d.decision_id, u.full_name AS applicant_name, u.role AS applicant_role,
                   d.kind, d.decision, d.reason, d.decided_at
            FROM registration_decisions d
            JOIN users u ON u.user_id = d.professional_id
            ORDER BY d.decided_at DESC, d.decision_id DESC
            """
        ).fetchall()


def list_license_requests():
    """Everything waiting for a licence decision, oldest first.

    kind 'registration' = a first application. kind 'renewal' = a professional whose licence ran out
    sent a new date, which waits in professionals.pending_license_expiry (the team's seed also puts
    such an account back to status 'pending'; an 'approved' one with a waiting date is read the same way).
    For a renewal the 'since' time is the day the old licence expired, when the account stopped working.
    """
    with get_connection() as conn:
        return conn.execute(
            f"""
            SELECT u.user_id, u.full_name, u.role, u.email, u.national_id, p.scfhs_number,
                   p.license_expiry, p.pending_license_expiry,
                   CASE WHEN p.pending_license_expiry IS NULL THEN 'registration' ELSE 'renewal' END AS kind,
                   CASE WHEN p.pending_license_expiry IS NULL THEN p.created_at ELSE p.license_expiry::timestamp END AS since
            FROM users u JOIN professionals p ON p.user_id = u.user_id
            WHERE {_LICENSE_WAITING}
            ORDER BY since, u.user_id
            """
        ).fetchall()


def decide_license_request(user_id, admin_id, decision, reason=None):
    """Approve or reject a registration or a renewal. Returns True, or a dict with 'error'.

    Registration: status becomes approved / rejected.
    Renewal: approved moves the new date into license_expiry (and clears the waiting date);
             rejected only clears it, the old date stands, and the status goes back to 'approved'. A new date that is already in the
             past cannot be approved. Every decision is written to registration_decisions with its kind.
    """
    with get_connection() as conn:
        p = conn.execute(
            f"SELECT p.status, p.pending_license_expiry FROM professionals p WHERE p.user_id = %s AND {_LICENSE_WAITING} FOR UPDATE",
            (user_id,),
        ).fetchone()
        if p is None:
            return {"error": "not_found"}
        kind = "registration" if p["pending_license_expiry"] is None else "renewal"
        if kind == "registration":
            conn.execute("UPDATE professionals SET status = %s WHERE user_id = %s", (decision, user_id))
        elif decision == "approved":
            ok = conn.execute("SELECT %s >= CURRENT_DATE AS ok", (p["pending_license_expiry"],)).fetchone()["ok"]
            if not ok:
                return {"error": "date_expired"}
            conn.execute(
                "UPDATE professionals SET license_expiry = pending_license_expiry, pending_license_expiry = NULL,"
                " status = 'approved' WHERE user_id = %s",
                (user_id,),
            )
        else:       # refused: the waiting date is dropped, the old date stands (the account stays suspended by it)
            conn.execute(
                "UPDATE professionals SET pending_license_expiry = NULL, status = 'approved' WHERE user_id = %s",
                (user_id,),
            )
        conn.execute(
            "INSERT INTO registration_decisions (professional_id, admin_id, kind, decision, reason) VALUES (%s, %s, %s, %s, %s)",
            (user_id, admin_id, kind, decision, reason),
        )
    return True


def list_active_accounts():
    """Approved doctors and radiologists whose accounts are still open."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.full_name, u.role, p.scfhs_number, p.delete_requested_at,
                   p.license_expiry, (p.license_expiry < CURRENT_DATE) AS expired,
                   COALESCE(
                       (SELECT MAX(decided_at) FROM registration_decisions r
                        WHERE r.professional_id = u.user_id AND r.decision = 'approved'),
                       p.created_at) AS approved_at
            FROM users u JOIN professionals p ON p.user_id = u.user_id
            WHERE p.status = 'approved' AND u.role IN ('doctor','radiologist')
              AND p.deactivated_at IS NULL
            ORDER BY u.full_name
            """
        ).fetchall()


# ------------------------------------------------------------------ closing accounts and account-deletion requests

def list_deletion_requests():
    """Doctors and radiologists who asked to close their account: waiting first (oldest request first),
    then the ones the admin already closed (newest first). A declined request leaves no trace."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.full_name, u.role, u.email, p.scfhs_number,
                   p.delete_requested_at AS requested_at, p.deactivated_at AS closed_at,
                   CASE WHEN p.deactivated_at IS NULL THEN 'pending' ELSE 'closed' END AS status,
                   (SELECT COUNT(*) FROM cases c
                     WHERE c.assigned_doctor_id = u.user_id AND c.status = 'under_review')::int AS open_cases
            FROM users u JOIN professionals p ON p.user_id = u.user_id
            WHERE p.delete_requested_at IS NOT NULL
            ORDER BY (p.deactivated_at IS NOT NULL), p.delete_requested_at, u.user_id
            """
        ).fetchall()


def close_account(user_id, admin_id):
    """Close a doctor's or radiologist's account (by the admin, or after the person asked).

    Returns {'moved': n} or {'error': ...}. Nothing is deleted (see the foreign keys: every one is
    ON DELETE RESTRICT); deactivated_at is filled, which stops the login.

    A doctor's cases are never left without a doctor: each case still under review goes to the
    doctor with the fewest open cases (ties: any), and is written in case_activity. When nobody else
    can take them the account is NOT closed ('no_doctor_available'), so no case is left NULL.
    Approved cases keep the doctor who signed them.
    """
    with get_connection() as conn:
        p = conn.execute(
            "SELECT u.role FROM users u JOIN professionals p ON p.user_id = u.user_id"
            " WHERE u.user_id = %s AND p.deactivated_at IS NULL AND p.status = 'approved' FOR UPDATE OF p",
            (user_id,),
        ).fetchone()
        if p is None:
            return {"error": "not_found"}
        moved = 0
        if p["role"] == "doctor":
            cases = conn.execute(
                "SELECT case_id FROM cases WHERE assigned_doctor_id = %s AND status = 'under_review' ORDER BY submitted_at, case_id",
                (user_id,),
            ).fetchall()
            for c in cases:
                new = _pick_doctor(conn, user_id)          # re-counted each time, so the load stays even
                if new is None:
                    conn.rollback()
                    return {"error": "no_doctor_available"}
                conn.execute("UPDATE cases SET assigned_doctor_id = %s WHERE case_id = %s", (new["user_id"], c["case_id"]))
                conn.execute(
                    "INSERT INTO case_activity (case_id, event_type, doctor_id, note) VALUES (%s, 'reassigned', %s, %s)",
                    (c["case_id"], new["user_id"], "Reassigned automatically: the previous doctor's account was closed."),
                )
                moved += 1
        conn.execute(
            "UPDATE professionals SET deactivated_at = CURRENT_TIMESTAMP, pending_license_expiry = NULL WHERE user_id = %s",
            (user_id,),
        )
    return {"moved": moved}


def decline_deletion(user_id):
    """The admin says no: the request is cleared and the account works again. False if nothing was waiting."""
    with get_connection() as conn:
        row = conn.execute(
            "UPDATE professionals SET delete_requested_at = NULL"
            " WHERE user_id = %s AND delete_requested_at IS NOT NULL AND deactivated_at IS NULL RETURNING user_id",
            (user_id,),
        ).fetchone()
    return row is not None


# ------------------------------------------------------------------ support messages

def list_support_requests():
    """Every support message with the sender and the admin replies.

    Order: waiting ones first, the one that arrived first on top; answered ones after them, newest first.
    """
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT c.request_id, c.body, c.status, c.created_at,
                   u.full_name AS requester, u.role AS requester_role
            FROM support_requests c JOIN users u ON u.user_id = c.user_id
            ORDER BY (c.status = 'resolved'),
                     CASE WHEN c.status <> 'resolved' THEN c.created_at END ASC,
                     c.created_at DESC, c.request_id DESC
            """
        ).fetchall()
        for c in rows:
            c["replies"] = conn.execute(
                "SELECT body, created_at FROM support_replies WHERE request_id = %s ORDER BY created_at, reply_id",
                (c["request_id"],),
            ).fetchall()
    return rows


# A support message is never given a status by hand: it is pending until the admin sends an answer
# (respond_to_request), and then it is resolved.

def respond_to_request(request_id, admin_id, reply):
    """Save the admin's reply and mark the message 'resolved'. Returns False when not found."""
    with get_connection() as conn:
        row = conn.execute(
            "UPDATE support_requests SET status = 'resolved' WHERE request_id = %s RETURNING request_id",
            (request_id,),
        ).fetchone()
        if row is None:
            return False
        conn.execute(
            "INSERT INTO support_replies (request_id, admin_id, body) VALUES (%s, %s, %s)",
            (request_id, admin_id, reply),
        )
    return True
