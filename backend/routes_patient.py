"""MUFSAL - the patient's pages (new design).

Shahd owns every page the patient sees: the home page, the list of cases,
the profile, starting a new case, reading a report and raising a complaint.
They all live in THIS file and in templates/patient/, so nothing here
collides with the pages the rest of the team is building.

main.py includes this router BEFORE routes_dashboard, so any address
written here wins over the older patient page with the same address.
The older file keeps serving whatever has not moved over yet.

Pages finished so far:
    /dashboard-patient   the home page

Still on the old pages (we move them one by one):
    /patient-cases, /profile-patient, /new-case,
    /cases/{id}/report, /complaints
"""
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from queries_patient import get_open_case, get_patient_header

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")

router = APIRouter()


# What to tell the patient when the delay button was refused. The server
# checks the rules again when the button is pressed, so this can happen
# even though the page showed the button as ready.
DELAY_ERRORS = {
    "too_early": "This case has not been waiting long enough yet.",
    "already_reported": "You have already reported a delay on this case. The team is looking at it.",
    "already_approved": "Your report is ready, so there is no delay to report.",
    "not_allowed": "That case is not yours.",
    "case_not_found": "We could not find that case.",
}


# ------------------------------------------------------------------ helpers

def patient_or_redirect(request: Request):
    """Return the signed-in patient's user_id.

    Anyone who is not signed in goes to the login page; anyone signed in
    as a doctor, radiologist or admin goes to their own home page, so a
    patient page can never open for the wrong role.
    """
    user_id = request.session.get("user_id")
    role = request.session.get("role")

    if user_id is None:
        return None, RedirectResponse("/login", status_code=303)
    if role != "patient":
        return None, RedirectResponse("/", status_code=303)
    return user_id, None


def long_date(value):
    """6 November 2026 - for the line under the case number.

    The day is written by hand because the strftime code that drops the
    leading zero is spelled differently on Windows and on Linux.
    """
    return f"{value.day} {value.strftime('%B %Y')}" if value else ""


def short_date(value):
    """6 Nov - for the small dates under the steps."""
    return f"{value.day} {value.strftime('%b')}" if value else ""


def waiting_line(days):
    """'Waiting 4 days so far', said properly for 0 and 1 day too."""
    if days is None:
        return ""
    if days == 0:
        return "Uploaded today"
    if days == 1:
        return "Waiting 1 day so far"
    return f"Waiting {days} days so far"


def build_open_case(row):
    """Turn the database row into the handful of values the page prints."""
    if row is None:
        return None

    knee = (row["knee"] or "").capitalize()
    return {
        "case_id": row["case_id"],
        "knee": f"{knee} knee" if knee else "Knee",
        "submitted_long": long_date(row["submitted_at"]),
        "submitted_short": short_date(row["submitted_at"]),
        "waiting": waiting_line(row["days_waited"]),
        # the delay button has three faces: open, already used, or not yet
        "delay_ready": bool(row["delay_ready"]) and not row["delay_open"],
        "delay_open": bool(row["delay_open"]),
        "delay_date": short_date(row["delay_date"]),
    }


# -------------------------------------------------------------------- pages

@router.get("/dashboard-patient", include_in_schema=False)
def home(request: Request,
         delay_sent: Optional[int] = None,
         delay_error: Optional[str] = None,
         case_created: Optional[int] = None):
    """The patient's home page: the welcome, the case being worked on, and
    the button that starts a new one.

    delay_sent / delay_error arrive from the "Report a delay" button,
    case_created from the page that uploads a new X-ray.
    """
    user_id, redirect = patient_or_redirect(request)
    if redirect:
        return redirect

    header = get_patient_header(user_id)
    open_case = build_open_case(get_open_case(user_id))

    # one green or red line at the top of the page, when there is one to say
    message, message_ok = None, True
    if case_created:
        message = "Your X-ray is with a doctor now. You can follow it below."
    elif delay_sent:
        message = "Your delay has been reported. The team will look into it."
    elif delay_error:
        message, message_ok = DELAY_ERRORS.get(delay_error, "We could not send that."), False

    return templates.TemplateResponse(
        request, "patient/home.html",
        {
            "first_name": header["first_name"] if header else "",
            "total_cases": header["total_cases"] if header else 0,
            "open_case": open_case,
            "message": message,
            "message_ok": message_ok,
        },
    )
