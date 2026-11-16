"""MUFSAL - doctor pages, built by the server:

    GET /dashboard-doctor   the dashboard (5 most urgent pending + 5 latest approved)
    GET /pending-cases      ALL pending cases   (templates/doctor-cases.html)
    GET /approved-cases     ALL approved cases  (templates/doctor-cases.html)

auth_service.HOME already sends doctors to /dashboard-doctor after login.
Include this router in main.py BEFORE routes_pages (which would otherwise serve the
old static pending-cases.html / approved-cases.html).
"""
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from queries_cases import get_doctor_cases
from queries_doctor import get_doctor_approved, get_doctor_stats
from routes_dashboard import get_full_name, get_lang
from texts_doctor import DOCTOR_TEXT

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

RECENT_LIMIT = 5   # rows in each table of the dashboard


# ---------------------------------------------------------------- helpers

def short_date(value, lang):
    """15 Nov 2026 / 15 نوفمبر 2026"""
    if value is None:
        return ""
    return f"{value.day} {DOCTOR_TEXT[lang]['months'][value.month - 1]} {value.year}"


def doctor_id_or_redirect(request):
    """Return (user_id, None) for a logged-in doctor, or (None, redirect)."""
    user_id = request.session.get("user_id")
    if user_id is None:
        return None, RedirectResponse("/login", status_code=303)
    if request.session.get("role") != "doctor":
        return None, RedirectResponse("/", status_code=303)   # "/" sends each role to its own home
    return user_id, None


def pending_rows(doctor_id, lang, limit=None):
    """Pending cases for the table. get_doctor_cases already sorts: high priority first, then oldest."""
    rows = get_doctor_cases(doctor_id, "under_review")
    if limit is not None:
        rows = rows[:limit]
    return [dict(row,
                 date=short_date(row["submitted_at"], lang),
                 confidence_pct=round(float(row["confidence"]) * 100) if row["confidence"] is not None else None)
            for row in rows]


def approved_rows(doctor_id, lang, limit=None):
    """Approved cases for the table, newest approval first."""
    return [dict(row, date=short_date(row["approved_at"], lang))
            for row in get_doctor_approved(doctor_id, limit)]


def base_context(request, lang):
    return {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr", "t": DOCTOR_TEXT[lang]}


# ---------------------------------------------------------------- pages

@router.get("/dashboard-doctor", include_in_schema=False)
def dashboard_doctor(request: Request):
    user_id, redirect = doctor_id_or_redirect(request)
    if redirect:
        return redirect
    lang = get_lang(request)
    return templates.TemplateResponse(
        request, "dashboard-doctor.html",
        {
            **base_context(request, lang),
            "name": get_full_name(user_id).split(" ")[0],
            "stats": get_doctor_stats(user_id),          # the totals ("Showing 3 of 8")
            "pending": pending_rows(user_id, lang, RECENT_LIMIT),
            "approved": approved_rows(user_id, lang, RECENT_LIMIT),
        },
    )


@router.get("/pending-cases", include_in_schema=False)
def all_pending(request: Request):
    user_id, redirect = doctor_id_or_redirect(request)
    if redirect:
        return redirect
    lang = get_lang(request)
    t = DOCTOR_TEXT[lang]
    return templates.TemplateResponse(
        request, "doctor-cases.html",
        {**base_context(request, lang), "kind": "pending",
         "page_title": t["all_pending_title"], "page_sub": t["all_pending_sub"],
         "pending": pending_rows(user_id, lang)},
    )


@router.get("/approved-cases", include_in_schema=False)
def all_approved(request: Request):
    user_id, redirect = doctor_id_or_redirect(request)
    if redirect:
        return redirect
    lang = get_lang(request)
    t = DOCTOR_TEXT[lang]
    return templates.TemplateResponse(
        request, "doctor-cases.html",
        {**base_context(request, lang), "kind": "approved",
         "page_title": t["all_approved_title"], "page_sub": t["all_approved_sub"],
         "approved": approved_rows(user_id, lang)},
    )