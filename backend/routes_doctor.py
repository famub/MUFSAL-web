"""MUFSAL - doctor dashboard: GET /dashboard-doctor (templates/dashboard-doctor.html).

auth_service.HOME already sends doctors here after login.
Include this router in main.py BEFORE routes_pages.
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

RECENT_LIMIT = 5   # rows in each table ("the 5 most urgent / most recent")


def short_date(value, lang):
    """15 Nov 2026 / 15 نوفمبر 2026"""
    if value is None:
        return ""
    return f"{value.day} {DOCTOR_TEXT[lang]['months'][value.month - 1]} {value.year}"


@router.get("/dashboard-doctor", include_in_schema=False)
def dashboard_doctor(request: Request):
    # 1. Only a logged-in doctor may open this page
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse("/login", status_code=303)
    if request.session.get("role") != "doctor":
        return RedirectResponse("/", status_code=303)   # "/" sends each role to its own home

    lang = get_lang(request)

    # 2. Pending: get_doctor_cases already sorts by priority (high first), then oldest first
    pending = []
    for row in get_doctor_cases(user_id, "under_review")[:RECENT_LIMIT]:
        pending.append(dict(
            row,
            date=short_date(row["submitted_at"], lang),
            confidence_pct=round(float(row["confidence"]) * 100) if row["confidence"] is not None else None,
        ))

    # 3. Approved: newest approval first
    approved = [dict(row, date=short_date(row["approved_at"], lang))
                for row in get_doctor_approved(user_id, RECENT_LIMIT)]

    return templates.TemplateResponse(
        request, "dashboard-doctor.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": DOCTOR_TEXT[lang],
            "name": get_full_name(user_id).split(" ")[0],
            "stats": get_doctor_stats(user_id),
            "pending": pending,
            "approved": approved,
        },
    )
