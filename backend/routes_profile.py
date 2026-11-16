"""MUFSAL - profile pages. For now: the doctor and the radiologist.

    GET  /profile-doctor        the page
    POST /profile-doctor        saves the email and the phone number

Include this router in main.py BEFORE routes_pages.
"""
from typing import Optional  # Python 3.9 friendly (instead of int | None) 

from pathlib import Path

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from queries_profile import get_doctor_profile, update_contact
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


@router.get("/profile-doctor", include_in_schema=False)
def profile_doctor(request: Request, saved: Optional[int] = None, error: Optional[str] = None):
    user_id, redirect = doctor_or_redirect(request)
    if redirect:
        return redirect

    lang = get_lang(request)
    t = PROFILE_TEXT[lang]
    profile = get_doctor_profile(user_id)

    message, message_ok = None, True
    if saved:
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
        },
    )


@router.post("/profile-doctor", include_in_schema=False)
def save_profile_doctor(request: Request, email: str = Form(...), phone: str = Form(...)):
    user_id, redirect = doctor_or_redirect(request)
    if redirect:
        return redirect

    result = update_contact(user_id, email, phone)
    if isinstance(result, dict):
        return RedirectResponse(f"/profile-doctor?error={result['error']}", status_code=303)
    return RedirectResponse("/profile-doctor?saved=1", status_code=303)
