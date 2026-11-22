"""MUFSAL - profile pages. For now: the doctor and the radiologist.

    GET  /profile-doctor        the page
    POST /profile-doctor        saves the full name (email is locked)
    POST /profile-doctor/password   sets a new password (same rules as the patient's)

Include this router in main.py BEFORE routes_pages.
"""
from typing import Optional  # Python 3.9 friendly (instead of int | None) 

from pathlib import Path

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from auth_rules import name_error, password_rule_failures
from queries_profile import get_doctor_profile, update_name
# the patient page already has these two, so the doctor uses them as they are
from queries_patient import password_is_the_current_one, set_password
from routes_dashboard import get_lang
from texts_profile import PROFILE_TEXT

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")


def mask_national_id(national_id):
    """1033333333 -> 10______33. The full number never reaches the page."""
    if not national_id:
        return ""
    national_id = national_id.strip()
    return national_id[:2] + "•" * (len(national_id) - 4) + national_id[-2:]


def doctor_or_redirect(request):
    """Return (user_id, None) for a logged-in doctor, or (None, redirect)."""
    user_id = request.session.get("user_id")
    if user_id is None:
        return None, RedirectResponse("/login", status_code=303)
    if request.session.get("role") != "doctor":
        return None, RedirectResponse("/", status_code=303)
    return user_id, None


AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
             "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]


def pw_date(value, lang):
    """23 November 2026 / 23 نوفمبر 2026 - the day the password was last set."""
    if not value:
        return ""
    month = AR_MONTHS[value.month - 1] if lang == "ar" else value.strftime("%B")
    return f"{value.day} {month} {value.year}"


def doctor_profile_page(request, user_id, saved=False, error=None,
                        pw_failed=None, pw_saved=False, status_code=200):
    """Draw the page. Also used when a new password is turned down,
    so the rules that failed come back painted red."""
    lang = get_lang(request)
    t = PROFILE_TEXT[lang]
    profile = get_doctor_profile(user_id)

    message, message_ok = None, True
    if pw_saved:
        message = t["pw_saved_msg"]
    elif saved:
        message = t["saved_msg"]
    elif error in t["err"]:
        message, message_ok = t["err"][error], False

    return templates.TemplateResponse(
        request, "profile-doctor.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": t,
            "home_url": "/dashboard-doctor",
            "profile": profile,
            "masked_id": mask_national_id(profile["national_id"]),
            "message": message,
            "message_ok": message_ok,
            "pw_failed": pw_failed or [],
            "password_changed": pw_date(profile.get("password_changed_at"), lang),
        },
        status_code=status_code,
    )


@router.get("/profile-doctor", include_in_schema=False)
def profile_doctor(request: Request, saved: Optional[int] = None,
                   error: Optional[str] = None, changed: Optional[int] = None):
    user_id, redirect = doctor_or_redirect(request)
    if redirect:
        return redirect
    return doctor_profile_page(request, user_id, saved=bool(saved), error=error,
                               pw_saved=bool(changed))


@router.post("/profile-doctor", include_in_schema=False)
def save_profile_doctor(request: Request, full_name: str = Form("")):
    user_id, redirect = doctor_or_redirect(request)
    if redirect:
        return redirect
    problem = name_error(full_name)          # empty -> name_required, over 100 -> name_invalid
    if problem:
        return RedirectResponse(f"/profile-doctor?error={problem}", status_code=303)
    update_name(user_id, full_name)          # only the name changes, the email stays locked
    return RedirectResponse("/profile-doctor?saved=1", status_code=303)


@router.post("/profile-doctor/password", include_in_schema=False)
def change_password_doctor(request: Request, new_password: str = Form("")):
    """Same rules as the patient's page. The list on the page is only a
    helper - the server checks every rule again here."""
    user_id, redirect = doctor_or_redirect(request)
    if redirect:
        return redirect

    failed = password_rule_failures(new_password)
    if not failed and password_is_the_current_one(user_id, new_password):
        failed = ["different"]
    if failed:
        return doctor_profile_page(request, user_id, pw_failed=failed, status_code=400)

    set_password(user_id, new_password)
    return RedirectResponse("/profile-doctor?changed=1", status_code=303)
