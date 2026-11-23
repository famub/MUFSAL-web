"""MUFSAL - queries used only by the administrator pages.

Delayed requests, registration history, active accounts and general support requests.
(Registration requests and reassigning a case already live in queries_accounts.py and queries_delays.py.)
Every function returns plain dictionaries, like the other queries_*.py files.
"""
from db import get_connection

COMPLAINT_STATUSES = ("pending", "resolved")
DELAY_STATUSES = ("pending", "handled")


# ------------------------------------------------------------------ summary (dashboard cards)

def get_summary():
    """The numbers on the admin dashboard."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT
              (SELECT COUNT(*) FROM delay_complaints WHERE status = 'pending')::int AS delayed,
              (SELECT COUNT(*) FROM professionals
                WHERE status = 'pending'
                   OR (status = 'approved' AND pending_license_expiry IS NOT NULL))::int AS licenses,
              (SELECT COUNT(*) FROM professionals
                WHERE delete_requested_at IS NOT NULL AND deactivated_at IS NULL)::int AS deletions,
              (SELECT COUNT(*) FROM support_requests WHERE status <> 'resolved')::int AS support
            """
        ).fetchone()


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


def list_doctors():
    """Approved doctors - the choices in the reassign dialog."""
    with get_connection() as conn:
        return conn.execute(
            "SELECT u.user_id, u.full_name FROM users u"
            " JOIN professionals p ON p.user_id = u.user_id"
            " WHERE u.role = 'doctor' AND p.status = 'approved' ORDER BY u.full_name"
        ).fetchall()


# ------------------------------------------------------------------ medical license verification

def list_decisions():
    """Approved / rejected registration decisions, newest first."""
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


def list_active_accounts():
    """Approved doctors and radiologists whose accounts are still open."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.full_name, u.role, p.scfhs_number, p.delete_requested_at,
                   (p.license_expiry < CURRENT_DATE) AS expired,
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


def list_license_requests():
    """Everything waiting for the admin's licence check, oldest first:
    first applications (kind 'registration') and renewals of an approved account
    (kind 'renewal', the new date waits in pending_license_expiry)."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.full_name, u.role, u.email, u.national_id, p.scfhs_number,
                   p.license_expiry, p.pending_license_expiry, p.pending_scfhs_number,
                   CASE WHEN p.status = 'pending' THEN 'registration' ELSE 'renewal' END AS kind,
                   p.created_at AS since
            FROM users u JOIN professionals p ON p.user_id = u.user_id
            WHERE p.deactivated_at IS NULL
              AND (p.status = 'pending'
                   OR (p.status = 'approved' AND p.pending_license_expiry IS NOT NULL))
            ORDER BY p.created_at, u.user_id
            """
        ).fetchall()


def decide_license_request(user_id, admin_id, decision, reason=None):
    """Approve or reject a registration or a renewal. False when nothing is waiting for this user.

    A registration is decided like before (professionals.status). A renewal moves
    pending_license_expiry into license_expiry when accepted and is emptied when refused;
    a refused renewal does not count against the two tries of a first application."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT status, pending_license_expiry FROM professionals"
            " WHERE user_id = %s AND deactivated_at IS NULL FOR UPDATE",
            (user_id,),
        ).fetchone()
        if row is None:
            return False
        if row["status"] == "pending":
            kind = "registration"
            conn.execute("UPDATE professionals SET status = %s WHERE user_id = %s", (decision, user_id))
        elif row["status"] == "approved" and row["pending_license_expiry"] is not None:
            kind = "renewal"
            if decision == "approved":
                conn.execute(
                    "UPDATE professionals SET license_expiry = pending_license_expiry,"
                    " scfhs_number = COALESCE(pending_scfhs_number, scfhs_number),"
                    " pending_license_expiry = NULL, pending_scfhs_number = NULL WHERE user_id = %s", (user_id,))
            else:
                conn.execute("UPDATE professionals SET pending_license_expiry = NULL, pending_scfhs_number = NULL"
                             " WHERE user_id = %s", (user_id,))
        else:
            return False
        conn.execute(
            "INSERT INTO registration_decisions (professional_id, admin_id, kind, decision, reason)"
            " VALUES (%s, %s, %s, %s, %s)",
            (user_id, admin_id, kind, decision, reason),
        )
    return True


def list_deletion_requests():
    """Doctors / radiologists who asked to close their account: pending, or closed by the admin.
    open_cases is how many unfinished cases a doctor still holds (they move to other doctors on approval)."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.full_name, u.role, u.email, p.scfhs_number,
                   CASE WHEN p.deactivated_at IS NULL THEN 'pending' ELSE 'closed' END AS status,
                   p.delete_requested_at AS requested_at, p.deactivated_at AS closed_at,
                   (SELECT COUNT(*) FROM cases c
                     WHERE c.assigned_doctor_id = u.user_id AND c.status = 'under_review')::int AS open_cases
            FROM users u JOIN professionals p ON p.user_id = u.user_id
            WHERE p.delete_requested_at IS NOT NULL
            ORDER BY (p.deactivated_at IS NOT NULL), p.delete_requested_at, u.user_id
            """
        ).fetchall()


def decline_deletion_request(user_id):
    """The admin says no: the request is cleared and the account works again. False if none is open."""
    with get_connection() as conn:
        row = conn.execute(
            "UPDATE professionals SET delete_requested_at = NULL"
            " WHERE user_id = %s AND delete_requested_at IS NOT NULL AND deactivated_at IS NULL"
            " RETURNING user_id",
            (user_id,),
        ).fetchone()
    return row is not None


def deactivate_professional_account(user_id, only_if_requested=False):
    """Close a doctor's or radiologist's account. Returns the number of cases moved to other
    doctors, or None when there is no open account.

    Nothing is deleted. The account signed reports or sent X-rays in, and every
    foreign key to users is ON DELETE RESTRICT, so removing the row would leave
    medical records with no author and the database would refuse it. Filling
    deactivated_at stops the login (queries_accounts.login) and takes the
    account off the active list.

    A doctor's unfinished cases go to the active doctor who has the fewest open cases
    (never the doctor who is leaving), and each move is written to case_activity.
    """
    with get_connection() as conn:
        row = conn.execute(
            """
            UPDATE professionals SET deactivated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND deactivated_at IS NULL
              AND (NOT %s OR delete_requested_at IS NOT NULL)
            RETURNING user_id, role
            """,
            (user_id, only_if_requested),
        ).fetchone()
        if row is None:
            return None
        moved = 0
        if row["role"] == "doctor":
            cases = conn.execute(
                "SELECT case_id FROM cases WHERE assigned_doctor_id = %s AND status = 'under_review'"
                " ORDER BY submitted_at", (user_id,)).fetchall()
            for c in cases:
                target = conn.execute(
                    """
                    SELECT u.user_id FROM users u JOIN professionals p ON p.user_id = u.user_id
                    WHERE u.role = 'doctor' AND p.status = 'approved' AND p.deactivated_at IS NULL
                      AND p.delete_requested_at IS NULL AND p.license_expiry >= CURRENT_DATE
                      AND u.user_id <> %s
                    ORDER BY (SELECT COUNT(*) FROM cases x WHERE x.assigned_doctor_id = u.user_id
                              AND x.status = 'under_review'), u.user_id
                    LIMIT 1
                    """, (user_id,)).fetchone()
                if target is None:
                    break                      # nobody to give them to: they stay assigned
                conn.execute("UPDATE cases SET assigned_doctor_id = %s WHERE case_id = %s",
                             (target["user_id"], c["case_id"]))
                conn.execute(
                    "INSERT INTO case_activity (case_id, event_type, doctor_id, note)"
                    " VALUES (%s, 'reassigned', %s, 'Reassigned automatically: the doctor closed the account.')",
                    (c["case_id"], target["user_id"]))
                moved += 1
    return moved


# ------------------------------------------------------------------ general support requests

def list_support_requests():
    """Every support request with the requester and the admin replies (oldest first), newest support request first."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT c.request_id, c.body, c.status, c.created_at,
                   u.full_name AS requester, u.role AS requester_role
            FROM support_requests c JOIN users u ON u.user_id = c.user_id
            ORDER BY c.created_at DESC, c.request_id DESC
            """
        ).fetchall()
        for c in rows:
            c["replies"] = conn.execute(
                "SELECT body, created_at FROM support_replies WHERE request_id = %s ORDER BY created_at, reply_id",
                (c["request_id"],),
            ).fetchall()
    return rows


# A support request's status is never picked by hand. It has two states and
# moves between them by itself:
#   pending   - waiting for an answer
#   resolved  - the admin sent a reply (respond_to_request)


def respond_to_request(request_id, admin_id, reply):
    """Save the admin's reply and mark the support request 'resolved'. Returns False when not found."""
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
