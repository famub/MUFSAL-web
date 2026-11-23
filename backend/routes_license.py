"""MUFSAL - licence renewal page for doctors and radiologists.

    GET  /license-renewal   "your licence has expired" + the form, or "waiting for the admin"
    POST /license-renewal   sends the new SCFHS number and expiry date to the admin

session_guard.py sends every page here while the licence date has passed.
"""
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from auth_rules import clean, license_expiry_error, scfhs_error
from queries_license import get_license_state, request_renewal, scfhs_taken
from routes_profile import pw_date
from texts_license import LICENSE_TEXT

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

PROFESSIONALS = ("doctor", "radiologist")


def get_lang(request):
    return "ar" if request.cookies.get("lang") == "ar" else "en"


def professional_or_redirect(request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return None, RedirectResponse("/login", status_code=303)
    if request.session.get("role") not in PROFESSIONALS:
        return None, RedirectResponse("/", status_code=303)
    return user_id, None


def renewal_page(request, user_id, state, error=None, number="", expiry="", status_code=200):
    lang = get_lang(request)
    t = LICENSE_TEXT[lang]
    return templates.TemplateResponse(
        request, "license-renewal.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": t,
            "role": request.session.get("role"),
            "state": state,
            "waiting": state["pending_license_expiry"] is not None,
            "ended_on": pw_date(state["license_expiry"], lang),
            "sent_date": pw_date(state["pending_license_expiry"], lang),
            "error": t["err"].get(error) if error else None,
            "number": number or state["scfhs_number"],
            "expiry": expiry,
            "today": date.today().isoformat(),
        },
        status_code=status_code,
    )


@router.get("/license-renewal", include_in_schema=False)
def license_renewal(request: Request):
    user_id, redirect = professional_or_redirect(request)
    if redirect:
        return redirect
    state = get_license_state(user_id)
    if state is None or not state["expired"]:          # nothing to renew: back home
        return RedirectResponse(f"/dashboard-{request.session.get('role')}", status_code=303)
    return renewal_page(request, user_id, state)


@router.post("/license-renewal", include_in_schema=False)
def send_renewal(request: Request, scfhs_number: str = Form(""), license_expiry: str = Form("")):
    user_id, redirect = professional_or_redirect(request)
    if redirect:
        return redirect
    state = get_license_state(user_id)
    if state is None or not state["expired"]:
        return RedirectResponse(f"/dashboard-{request.session.get('role')}", status_code=303)

    number, expiry = clean(scfhs_number), clean(license_expiry)
    error = scfhs_error(number) or license_expiry_error(expiry)
    if not error and scfhs_taken(user_id, number):
        error = "scfhs_taken"
    if not error:
        result = request_renewal(user_id, number, expiry)
        if isinstance(result, dict):
            error = result["error"]
    if error:
        return renewal_page(request, user_id, state, error, number, expiry, status_code=400)
    return RedirectResponse("/license-renewal", status_code=303)
