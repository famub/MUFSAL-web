"""MUFSAL - registration, login and password reset logic.

No web framework in here: every function takes plain data and returns
(http_status, answer_dict) - login also returns the account. routes_auth.py is the thin
layer that reads the request, calls these functions and sends the answer.
All database work goes through queries_accounts.py.
"""
import hashlib
import os
import secrets
import threading
import time

from psycopg import errors as pg_errors

import auth_rules as rules
import mailer
import queries_accounts as db

# Where each role goes after logging in. The patient dashboard is rendered by the server (routes_dashboard.py).
HOME = {
    "patient": "/dashboard-patient",
    "radiologist": "/dashboard-radiologist",
    "doctor": "/dashboard-doctor",
    "admin": "/dashboard-admin",
}

MAX_FAILS = 5                 # wrong passwords in a row ...
FAIL_WINDOW = 15 * 60         # ... inside 15 minutes lock the email for the rest of the window
_fails = {}                   # email -> times of the wrong attempts (kept in memory, one server process)
_fails_lock = threading.Lock()


def _err(code, status=400, **extra):
    return status, {"ok": False, "error": code, **extra}


def _which_unique(exc):
    """Which unique rule did the database refuse? (two people registering at the same moment)"""
    name = (getattr(getattr(exc, "diag", None), "constraint_name", "") or "")
    if "national_id" in name:
        return "national_id_taken"
    if "scfhs" in name:
        return "scfhs_taken"
    return "email_taken"


def public_user(user):
    return {"email": user["email"], "role": user["role"], "name": user["full_name"],
            "home": HOME[user["role"]]}


# ---------------------------------------------------------------- registration

def register_patient(data):
    name, email = rules.clean(data.get("name")), rules.clean(data.get("email")).lower()
    national_id = rules.clean(data.get("nationalId"))
    dob, gender = rules.clean(data.get("dob")), rules.clean(data.get("gender")).lower()
    password = data.get("password")

    problem = rules.first_error(
        rules.name_error(name), rules.email_error(email), rules.national_id_error(national_id),
        rules.dob_error(dob), rules.gender_error(gender),
        rules.password_error(password))
    if problem:
        return _err(problem)

    if db.get_user_by_email(email):
        return _err("email_taken", 409)
    if db.national_id_exists(national_id):
        return _err("national_id_taken", 409)
    try:
        db.create_patient(name, email, password, national_id, dob, gender)
    except pg_errors.UniqueViolation as exc:
        return _err(_which_unique(exc), 409)
    except pg_errors.CheckViolation:
        return _err("invalid_data")
    return 201, {"ok": True}


def register_professional(data):
    name, email = rules.clean(data.get("name")), rules.clean(data.get("email")).lower()
    national_id = rules.clean(data.get("nationalId"))
    license_expiry = rules.clean(data.get("licenseExpiry"))
    role, scfhs = rules.clean(data.get("role")), rules.clean(data.get("scfhsNumber"))
    password = data.get("password")

    problem = rules.first_error(
        rules.name_error(name), rules.role_error(role), rules.email_error(email),
        rules.national_id_error(national_id), rules.license_expiry_error(license_expiry),
        rules.scfhs_error(scfhs), rules.password_error(password))
    if problem:
        return _err(problem)

    existing = db.get_user_by_email(email)
    try:
        if existing is None:
            if db.national_id_exists(national_id):
                return _err("national_id_taken", 409)
            if db.scfhs_exists(scfhs):
                return _err("scfhs_taken", 409)
            db.create_professional(name, email, password, national_id, role, scfhs, license_expiry)
        elif existing["status"] == "rejected" and existing["role"] in rules.PROFESSIONAL_ROLES:
            # A rejected professional may apply again; the old rejection stays in the history.
            db.resubmit_professional(existing["user_id"], name, password, national_id,
                                     role, scfhs, license_expiry)
        else:
            return _err("email_taken", 409)
    except pg_errors.UniqueViolation as exc:
        return _err(_which_unique(exc), 409)
    except pg_errors.CheckViolation:
        return _err("invalid_data")
    return 201, {"ok": True}


# ---------------------------------------------------------------- login

def _locked(email):
    with _fails_lock:
        recent = [t for t in _fails.get(email, []) if time.time() - t < FAIL_WINDOW]
        _fails[email] = recent
        return len(recent) >= MAX_FAILS


def _remember_fail(email):
    with _fails_lock:
        _fails.setdefault(email, []).append(time.time())


def login(data):
    """Returns (status, answer, account). The account is None unless the login succeeded."""
    email, password = rules.clean(data.get("email")).lower(), data.get("password")
    if not email or not isinstance(password, str) or not password:
        return (*_err("bad_login", 401), None)
    if _locked(email):
        return (*_err("locked", 429), None)

    result = db.login(email, password)
    error = result.get("error")
    if error in ("not_found", "wrong_password"):
        _remember_fail(email)
        return (*_err("bad_login", 401), None)      # the same answer for a wrong email and a wrong password
    if error == "pending":
        return (*_err("pending", 403), None)
    if error == "deactivated":
        return (*_err("deactivated", 403), None)
    if error == "rejected":
        user = db.get_user_by_email(email)
        return (*_err("rejected", 403, reason=db.get_rejection_reason(user["user_id"])), None)

    with _fails_lock:
        _fails.pop(email, None)
    return 200, {"ok": True, "user": public_user(result)}, result


# ---------------------------------------------------------------- password reset

def _hash_token(token):
    return hashlib.sha256(str(token).encode()).hexdigest()


def forgot(data):
    """Same answer whether the email exists or not, so nobody can find out who is registered."""
    email = rules.clean(data.get("email")).lower()
    answer = {"ok": True}
    user = db.get_user_by_email(email) if rules.email_error(email) is None else None
    if user and db.can_sign_in(user):
        token = secrets.token_urlsafe(32)
        db.create_password_reset(user["user_id"], _hash_token(token))
        link = f"/reset-password.html?token={token}"
        sent = mailer.send_reset_link(email, user["full_name"], link)   # real e-mail (see mailer.py)
        if not sent:
            print(f"[password reset] {email}: {link}")      # mail is not set up: only the server window shows it
        if os.getenv("DEV_LOGIN") == "1":                   # development only: show the link on the page too
            answer["devLink"] = link
    return 200, answer


def check_reset(token):
    return 200, {"ok": bool(token) and db.get_valid_password_reset(_hash_token(token)) is not None}


def reset_password(data):
    token, password = data.get("token"), data.get("password")
    row = db.get_valid_password_reset(_hash_token(token)) if token else None
    if row is None:
        return _err("reset_invalid")
    problem = rules.password_error(password)
    if problem:
        return _err(problem)
    db.complete_password_reset(row["reset_id"], row["user_id"], password)
    return 200, {"ok": True}


# ---------------------------------------------------------------- radiologist: find a patient by ID

LOOKUP_MAX = 20               # searches per radiologist ...
LOOKUP_WINDOW = 10 * 60       # ... in 10 minutes (stops someone from trying every ID)
_lookups = {}
_lookups_lock = threading.Lock()


def find_patient(national_id, requester_id):
    """A radiologist types the patient's National ID / Iqama number; the case is then linked to that patient."""
    national_id = rules.clean(national_id)
    with _lookups_lock:
        recent = [t for t in _lookups.get(requester_id, []) if time.time() - t < LOOKUP_WINDOW]
        if len(recent) >= LOOKUP_MAX:
            _lookups[requester_id] = recent
            return _err("too_many_searches", 429)
        recent.append(time.time())
        _lookups[requester_id] = recent
    if rules.national_id_error(national_id):
        return _err("national_id_invalid")
    patient = db.find_patient_by_national_id(national_id)
    if patient is None:
        return _err("patient_not_found", 404)
    return 200, {"ok": True, "patient": {"patientId": patient["patient_id"], "name": patient["full_name"]}}


# ---------------------------------------------------------------- admin: registration requests

def _jsonable(row):
    return {k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in row.items()}


def pending_requests():
    return 200, {"ok": True, "requests": [_jsonable(r) for r in db.list_pending_professionals()]}


def decide_request(user_id, admin_id, decision, reason=None):
    reason = rules.clean(reason)
    if decision == "rejected" and not reason:
        return _err("reason_required")
    if not db.decide_professional(user_id, admin_id, decision, reason or None):
        return _err("not_found", 404)
    return 200, {"ok": True}
