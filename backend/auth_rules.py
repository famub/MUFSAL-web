"""MUFSAL - validation rules for registration, login and password reset.

Plain Python, no database and no web framework, so every rule can be tested alone.
Each function returns an error code (a short string) or None when the value is fine.
The register pages show a message for each code (static/js/auth.js, FIELD_ERRORS).
The database checks most of these again with its own constraints (see schema.sql).
"""
import re
from datetime import date, datetime

MIN_AGE = 18   # same rule as patients_age_18_plus in schema.sql

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PHONE_RE = re.compile(r"^966[0-9]{9}$")           # 966 + 9 digits, e.g. 966512345678
NATIONAL_ID_RE = re.compile(r"^[12][0-9]{9}$")    # National ID starts with 1, Iqama with 2
SCFHS_RE = re.compile(r"^[A-Za-z0-9\-/]{5,20}$")  # TODO: confirm the real SCFHS format (column max is 20)

PROFESSIONAL_ROLES = ("doctor", "radiologist")
GENDERS = ("female", "male")


def clean(value):
    """A trimmed string, or '' when the value is not text."""
    return value.strip() if isinstance(value, str) else ""


def name_error(name):
    name = clean(name)
    if not name:
        return "name_required"
    if len(name) > 100:                            # users.full_name is VARCHAR(100)
        return "name_invalid"
    return None


def email_error(email):
    email = clean(email)
    if not EMAIL_RE.match(email) or len(email) > 255:
        return "email_invalid"
    return None


def password_error(password):
    if not isinstance(password, str) or not 8 <= len(password) <= 20:
        return "password_length"
    if not (re.search("[A-Z]", password) and re.search("[a-z]", password)
            and re.search("[0-9]", password) and re.search("[^A-Za-z0-9]", password)):
        return "password_rules"
    return None


def national_id_error(national_id):
    return None if NATIONAL_ID_RE.match(clean(national_id)) else "national_id_invalid"


def scfhs_error(number):
    return None if SCFHS_RE.match(clean(number)) else "scfhs_invalid"


def gender_error(gender):
    return None if clean(gender).lower() in GENDERS else "gender_invalid"


def role_error(role):
    return None if clean(role) in PROFESSIONAL_ROLES else "role_invalid"


def age_on(birth, today=None):
    today = today or date.today()
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))


def license_expiry_error(value):
    """Licence expiry as 'YYYY-MM-DD'. It has to be a day still ahead of us:
    a professional cannot register on a licence that has already run out."""
    try:
        day = datetime.strptime(clean(value), "%Y-%m-%d").date()
    except ValueError:
        return "license_expiry_invalid"
    return "license_expired" if day <= date.today() else None


def dob_error(dob):
    """Date of birth as 'YYYY-MM-DD'. The patient must be 18 or older."""
    try:
        birth = datetime.strptime(clean(dob), "%Y-%m-%d").date()
    except ValueError:
        return "dob_invalid"
    if birth > date.today():
        return "dob_invalid"
    return "min_age" if age_on(birth) < MIN_AGE else None


def first_error(*codes):
    """The first error code that is not None."""
    for code in codes:
        if code:
            return code
    return None
