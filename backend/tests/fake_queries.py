"""An in-memory copy of queries_accounts.py, for tests that need no PostgreSQL.
It has the same function names and answers, and raises the same kind of errors the database would."""
import hashlib
import itertools
from datetime import datetime

from psycopg import errors as pg_errors

users, professionals, patients, decisions, resets = [], {}, {}, [], []
_ids = itertools.count(1)


def reset_all():
    global _ids
    _ids = itertools.count(1)
    for box in (users, decisions, resets):
        box.clear()
    professionals.clear(); patients.clear()


class Dup(pg_errors.UniqueViolation):
    def __init__(self, constraint):
        super().__init__("duplicate")
        self._constraint = constraint

    @property
    def diag(self):
        class _D:
            constraint_name = self._constraint
        return _D()


def hash_password(p): return "h$" + hashlib.sha256(p.encode()).hexdigest()
def check_password(p, h): return hash_password(p) == h
DUMMY_HASH = hash_password("x")


def _unique(email=None, national_id=None, scfhs=None, skip=None):
    for u in users:
        if u["user_id"] == skip:
            continue
        if email and u["email"].lower() == email.lower(): raise Dup("users_email_key")
        if national_id and u["national_id"] == national_id: raise Dup("users_national_id_key")
    for uid, p in professionals.items():
        if uid != skip and scfhs and p == scfhs: raise Dup("healthcare_professionals_scfhs_number_key")


def _add(role, status, name, email, password, phone, national_id):
    _unique(email, national_id)
    u = dict(user_id=next(_ids), role=role, full_name=name, email=email, password_hash=hash_password(password),
             phone=phone, national_id=national_id, status=status, created_at=datetime.now())
    users.append(u)
    return u


def create_patient(full_name, email, password, phone, national_id, date_of_birth, gender):
    u = _add("patient", "approved", full_name, email, password, phone, national_id)
    patients[u["user_id"]] = (date_of_birth, gender)
    return u["user_id"]


def create_professional(full_name, email, password, phone, national_id, role, scfhs_number):
    _unique(scfhs=scfhs_number)
    u = _add(role, "pending", full_name, email, password, phone, national_id)
    professionals[u["user_id"]] = scfhs_number
    return u["user_id"]


def get_user_by_email(email):
    return next((dict(u) for u in users if u["email"].lower() == email.lower()), None)


def find_patient_by_national_id(n):
    for u in users:
        if u["national_id"] == n and u["role"] == "patient" and u["status"] == "approved":
            return {"patient_id": u["user_id"], "full_name": u["full_name"]}
    return None


def national_id_exists(n): return any(u["national_id"] == n for u in users)
def scfhs_exists(s): return s in professionals.values()


def login(email, password):
    user = get_user_by_email(email)
    if user is None: return {"error": "not_found"}
    if not check_password(password, user["password_hash"]): return {"error": "wrong_password"}
    if user["status"] != "approved": return {"error": user["status"]}
    del user["password_hash"]
    return user


def get_rejection_reason(user_id):
    rows = [d for d in decisions if d["professional_id"] == user_id and d["decision"] == "rejected"]
    return rows[-1]["reason"] if rows else ""


def resubmit_professional(user_id, full_name, password, phone, national_id, role, scfhs_number):
    u = next(x for x in users if x["user_id"] == user_id and x["status"] == "rejected")
    _unique(national_id=national_id, scfhs=scfhs_number, skip=user_id)
    u.update(full_name=full_name, password_hash=hash_password(password), phone=phone,
             national_id=national_id, role=role, status="pending")
    professionals[user_id] = scfhs_number
    return user_id


def list_pending_professionals():
    return [dict(u, scfhs_number=professionals[u["user_id"]]) for u in users
            if u["status"] == "pending" and u["user_id"] in professionals]


def decide_professional(user_id, admin_id, decision, reason=None):
    u = next((x for x in users if x["user_id"] == user_id and x["status"] == "pending"
              and x["role"] in ("doctor", "radiologist")), None)
    if u is None: return False
    u["status"] = decision
    decisions.append(dict(professional_id=user_id, admin_id=admin_id, decision=decision, reason=reason))
    return True


def create_password_reset(user_id, token_hash):
    resets.append(dict(reset_id=len(resets) + 1, user_id=user_id, token=token_hash, used=False))


def get_valid_password_reset(token_hash):
    return next((dict(r) for r in resets if r["token"] == token_hash and not r["used"]), None)


def complete_password_reset(reset_id, user_id, new_password):
    next(u for u in users if u["user_id"] == user_id)["password_hash"] = hash_password(new_password)
    next(r for r in resets if r["reset_id"] == reset_id)["used"] = True
