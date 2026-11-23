"""MUFSAL - licence renewal for a doctor / radiologist whose licence date has passed.

The professional sends a new SCFHS number and a new expiry date. Both wait in
professionals.pending_scfhs_number / pending_license_expiry until the admin decides
(queries_admin.decide_license_request moves them in, or empties them on a refusal).
"""
import psycopg

from db import get_connection


def get_license_state(user_id):
    """The licence row of this professional, plus the admin's last renewal answer (or None)."""
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT p.role, p.scfhs_number, p.license_expiry,
                   p.pending_scfhs_number, p.pending_license_expiry,
                   (p.license_expiry < CURRENT_DATE) AS expired,
                   d.decision AS last_decision, d.reason AS last_reason
            FROM professionals p
            LEFT JOIN LATERAL (
                SELECT decision, reason FROM registration_decisions
                WHERE professional_id = p.user_id AND kind = 'renewal'
                ORDER BY decided_at DESC, decision_id DESC LIMIT 1
            ) d ON TRUE
            WHERE p.user_id = %s
            """,
            (user_id,),
        ).fetchone()
    return row


def scfhs_taken(user_id, number):
    """True when another professional already has (or is waiting for) this SCFHS number."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM professionals WHERE user_id <> %s"
            " AND (scfhs_number = %s OR pending_scfhs_number = %s)",
            (user_id, number, number),
        ).fetchone()
    return row is not None


def request_renewal(user_id, number, expiry):
    """Save the new number and date for the admin. Returns True, or {'error': ...}."""
    try:
        with get_connection() as conn:
            conn.execute(
                "UPDATE professionals SET pending_scfhs_number = %s, pending_license_expiry = %s"
                " WHERE user_id = %s AND status = 'approved'",
                (number, expiry, user_id),
            )
    except psycopg.errors.CheckViolation:
        return {"error": "bad_value"}
    return True
