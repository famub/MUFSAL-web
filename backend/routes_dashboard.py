"""MUFSAL - patient dashboard.

Reads the logged-in user from the server session:
request.session["user_id"] and request.session["role"] (written by the login, routes_auth.py).
"""
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from db import get_connection
from queries_cases import get_patient_cases
from queries_delays import DELAY_DAYS, can_report_delay, create_delay_complaint
from texts_dashboard import DASHBOARD_TEXT

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

RECENT_LIMIT = 5   # how many cases the dashboard table shows

# Messages after pressing "Report a delay" (the keys are the error codes of
# create_delay_complaint in queries_delays.py)
DELAY_ERRORS = {"too_early", "already_reported", "already_approved",
                "not_allowed", "case_not_found"}


# ---------------------------------------------------------------- helpers
# routes_complaints.py imports these too.

def get_lang(request):
    """Page language from the 'lang' cookie (English by default)."""
    return "ar" if request.cookies.get("lang") == "ar" else "en"


def get_full_name(user_id):
    """The user's name for the welcome banner."""
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


def delay_state(case, user_id):
    """What the Actions column shows for a case under review:

    'can_report' - the button works
    'too_early'  - the button is disabled until DELAY_DAYS have passed
    'reported'   - an open delay complaint already exists for this case
    """
    if can_report_delay(case["case_id"], user_id):
        return "can_report"
    # can_report_delay said no. For the patient's own case under review there are
    # only two reasons left: the 10 days have not passed yet, or it was already reported.
    if case["submitted_at"] + timedelta(days=DELAY_DAYS) > datetime.now():
        return "too_early"
    return "reported"


# ---------------------------------------------------------------- page

@router.get("/dashboard-patient", include_in_schema=False)
def dashboard_patient(request: Request, delay_sent: int | None = None,
                      delay_error: str | None = None):
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
        row = {
            "case_id": c["case_id"],
            "date": format_date(c["submitted_at"], lang),
            "status": c["status"],                     # 'under_review' or 'approved'
            "grade": c["final_grade"],                 # None until the doctor approves
        }
        if c["status"] == "under_review":
            row["delay"] = delay_state(c, user_id)
            row["delay_from"] = format_date(c["submitted_at"] + timedelta(days=DELAY_DAYS), lang)
        rows.append(row)

    # A patient can have only one case under review at a time
    open_case = next((c for c in all_cases if c["status"] == "under_review"), None)
    waiting_text = None
    if open_case is not None:
        waiting_text = t["waiting_text"].format(
            case_id=open_case["case_id"],
            date=format_date(open_case["submitted_at"], lang),
        )

    # Message after pressing "Report a delay"
    message, message_ok = None, True
    if delay_sent is not None:
        message = t["delay_sent_msg"].format(case_id=delay_sent)
    elif delay_error in DELAY_ERRORS:
        message, message_ok = t["delay_err"][delay_error], False

    return templates.TemplateResponse(
        request, "dashboard-patient.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": t,
            "welcome": t["welcome"].format(name=first_name),
            "cases": rows,
            "total": len(all_cases),
            "has_open_case": open_case is not None,
            "waiting_text": waiting_text,
            "message": message,
            "message_ok": message_ok,
        },
    )


@router.post("/cases/{case_id}/report-delay", include_in_schema=False)
def report_delay(request: Request, case_id: int):
    """The "Report a delay" button: one click, no text to type."""
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse("/login", status_code=303)
    if request.session.get("role") != "patient":
        return RedirectResponse("/", status_code=303)

    # create_delay_complaint checks everything again on the server: the case is
    # this patient's, still under review, 10 days have passed, not reported yet.
    result = create_delay_complaint(case_id, user_id)

    if isinstance(result, dict):                       # {"error": "..."}
        return RedirectResponse(f"/dashboard-patient?delay_error={result['error']}",
                                status_code=303)
    return RedirectResponse(f"/dashboard-patient?delay_sent={case_id}", status_code=303)