"""MUFSAL - patient dashboard.

Reads the logged-in user from the server session:
request.session["user_id"] and request.session["role"].
Whoever builds the login page fills these in. Until then, test with
/dev/login-as/2 (Sarah) or /dev/login-as/3 (Noura), with DEV_LOGIN=1 in .env.
"""
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from db import get_connection
from queries_cases import get_patient_cases
from texts_dashboard import DASHBOARD_TEXT

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

RECENT_LIMIT = 5   # how many cases the dashboard table shows


def get_lang(request):
    """Page language from the 'lang' cookie (English by default)."""
    return "ar" if request.cookies.get("lang") == "ar" else "en"


def get_full_name(user_id):
    """The patient's name for the welcome banner."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT full_name FROM users WHERE user_id = %s", (user_id,)
        ).fetchone()
    return row["full_name"] if row else ""


def format_date(value, lang):
    """15 Nov 2026 / 15 نوفمبر 2026"""
    if value is None:
        return ""
    return f"{value.day} {DASHBOARD_TEXT[lang]['months'][value.month - 1]} {value.year}"


@router.get("/dashboard-patient", include_in_schema=False)
def dashboard_patient(request: Request):
    # 1. Only a logged-in patient may open this page
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse("/login", status_code=303)
    if request.session.get("role") != "patient":
        return RedirectResponse("/", status_code=303)

    lang = get_lang(request)
    t = DASHBOARD_TEXT[lang]

    # 2. Get the data from the database
    all_cases = get_patient_cases(user_id)           # newest first
    first_name = get_full_name(user_id).split(" ")[0]

    # 3. Prepare it for the page
    rows = []
    for c in all_cases[:RECENT_LIMIT]:
        rows.append({
            "case_id": c["case_id"],
            "date": format_date(c["submitted_at"], lang),
            "status": c["status"],                     # 'under_review' or 'approved'
            "grade": c["final_grade"],                 # None until the doctor approves
        })

    # A patient can have only one case under review at a time
    has_open_case = any(c["status"] == "under_review" for c in all_cases)

    return templates.TemplateResponse(
        request, "dashboard-patient.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": t,
            "welcome": t["welcome"].format(name=first_name),
            "cases": rows,
            "total": len(all_cases),
            "has_open_case": has_open_case,
        },
    )
