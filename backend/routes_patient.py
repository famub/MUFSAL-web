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
    /patient-cases       every X-ray the patient has sent
    /profile-patient     the patient's details, and changing them
    /complaints          raising a complaint and following it

/complaints belongs to every role, not only the patient, so the two
handlers here hand a doctor or a radiologist straight back to the older
page. Nothing changes for them.

Still on the old pages (we move them one by one):
    /new-case, /cases/{id}/report
"""
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

import routes_complaints           # only to hand the other roles their own page
from queries_patient import (create_complaint, email_belongs_to_someone_else,
                             get_all_cases, get_case_choices,
                             get_delay_complaints, get_open_case,
                             get_patient_header, get_profile,
                             get_written_complaints, update_profile)

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

# The four things a complaint can be about. The key is what the form
# sends, the value is what is saved and what the admin reads.
COMPLAINT_SUBJECTS = {
    "report": "Something in my report",
    "site": "A problem with the site",
    "other": "Something else",
}

# the small grey line under each choice
COMPLAINT_HINTS = {
    "report": "The result or the note looks wrong",
    "site": "Upload failed, page not loading",
    "other": "Anything not listed here",
}
BODY_MAX = 600

# How a complaint's status is shown. 'open' and 'investigating' come from
# the complaints table, 'pending' and 'handled' from delay complaints.
COMPLAINT_TAGS = {
    "open":          ("tag-wait",   "Waiting for the team"),
    "investigating": ("tag-review", "Being looked at"),
    "resolved":      ("tag-done",   "Answered"),
    "pending":       ("tag-wait",   "Waiting for the team"),
    "handled":       ("tag-done",   "Handled"),
}

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_PATTERN = re.compile(r"^966[0-9]{9}$")


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


def knee_label(knee):
    """'right' -> 'Right knee'. Older cases may have no answer saved."""
    return f"{knee.capitalize()} knee" if knee else "Knee"


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

    return {
        "case_id": row["case_id"],
        "knee": knee_label(row["knee"]),
        "submitted_long": long_date(row["submitted_at"]),
        "submitted_short": short_date(row["submitted_at"]),
        "waiting": waiting_line(row["days_waited"]),
        # the delay button has three faces: open, already used, or not yet
        "delay_ready": bool(row["delay_ready"]) and not row["delay_open"],
        "delay_open": bool(row["delay_open"]),
        "delay_date": short_date(row["delay_date"]),
    }


# ---------------------------------------------------------- the home page

@router.get("/dashboard-patient", include_in_schema=False)
def home(request: Request,
         delay_sent: Optional[int] = None,
         delay_error: Optional[str] = None,
         case_created: Optional[int] = None):
    """The welcome, the case being worked on, and the button that starts
    a new one.

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


# ------------------------------------------------------------- "My cases"

@router.get("/patient-cases", include_in_schema=False)
def my_cases(request: Request,
             delay_sent: Optional[int] = None,
             delay_error: Optional[str] = None):
    """Every X-ray the patient has sent, newest first.

    The filter chips and the search box work in the page itself, so each
    row carries the two things they look at: its state and its number.
    """
    user_id, redirect = patient_or_redirect(request)
    if redirect:
        return redirect

    rows = []
    for case in get_all_cases(user_id):
        done = case["status"] == "approved" and case["final_grade"] is not None
        rows.append({
            "case_id": case["case_id"],
            "knee": knee_label(case["knee"]),
            "date": long_date(case["submitted_at"]),
            "done": done,
            "grade": case["final_grade"],
        })

    message, message_ok = None, True
    if delay_sent:
        message = "Your delay has been reported. The team will look into it."
    elif delay_error:
        message, message_ok = DELAY_ERRORS.get(delay_error, "We could not send that."), False

    return templates.TemplateResponse(
        request, "patient/cases.html",
        {
            "cases": rows,
            "total_cases": len(rows),
            "message": message,
            "message_ok": message_ok,
        },
    )


# --------------------------------------------------------------- profile

def mask_national_id(value):
    """1011111111 -> 10••••••11. Shown so the patient can recognise it
    without the whole number sitting on the screen."""
    if not value or len(value) < 4:
        return value or ""
    return value[:2] + "•" * (len(value) - 4) + value[-2:]


def profile_page(request, user_id, form=None, errors=None, saved=False, status_code=200):
    """Draw the profile. Used by both the plain page and a failed save,
    so the patient always sees their own words back in the boxes."""
    row = get_profile(user_id)
    if row is None:
        return RedirectResponse("/login", status_code=303)

    if form is None:
        form = {"full_name": row["full_name"], "email": row["email"], "phone": row["phone"]}

    header = get_patient_header(user_id)

    return templates.TemplateResponse(
        request, "patient/profile.html",
        {
            "total_cases": header["total_cases"] if header else 0,
            "form": form,
            "errors": errors or {},
            "saved": saved,
            "national_id": mask_national_id(row["national_id"]),
            "date_of_birth": long_date(row["date_of_birth"]),
            "gender": (row["gender"] or "").capitalize(),
        },
        status_code=status_code,
    )


@router.get("/profile-patient", include_in_schema=False)
def profile(request: Request, saved: int = 0):
    user_id, redirect = patient_or_redirect(request)
    if redirect:
        return redirect
    return profile_page(request, user_id, saved=bool(saved))


@router.post("/profile-patient", include_in_schema=False)
async def save_profile(request: Request):
    """Save the name, the email and the phone number.

    Everything is checked again here: the page's own checks can be
    switched off in the browser, so they are a convenience, not a rule.
    """
    user_id, redirect = patient_or_redirect(request)
    if redirect:
        return redirect

    data = await request.form()
    form = {
        "full_name": (data.get("full_name") or "").strip(),
        "email": (data.get("email") or "").strip(),
        "phone": (data.get("phone") or "").strip(),
    }

    errors = {}
    if len(form["full_name"]) < 2 or len(form["full_name"]) > 100:
        errors["full_name"] = "Please write your full name."
    if not EMAIL_PATTERN.match(form["email"]) or len(form["email"]) > 255:
        errors["email"] = "That does not look like an email address."
    elif email_belongs_to_someone_else(form["email"], user_id):
        errors["email"] = "Another account already uses this email address."
    if not PHONE_PATTERN.match(form["phone"]):
        errors["phone"] = "The number starts with 966 and has 12 digits in all."

    if errors:
        return profile_page(request, user_id, form=form, errors=errors, status_code=400)

    update_profile(user_id, form["full_name"], form["email"], form["phone"])

    # redirect after saving, so refreshing the page does not save it twice
    return RedirectResponse("/profile-patient?saved=1", status_code=303)


# ------------------------------------------------------------ complaints

def complaint_rows(user_id):
    """The written complaints and the one-click delay reports, in one list,
    newest first."""
    rows = []

    for c in get_written_complaints(user_id):
        tag, label = COMPLAINT_TAGS.get(c["status"], ("tag-wait", "Waiting for the team"))
        rows.append({
            "subject": c["subject"],
            "body": c["body"],
            "case_id": c["case_id"],
            "date": long_date(c["created_at"]),
            "sort_key": c["created_at"],
            "tag": tag,
            "label": label,
            "from_case": False,
            "replies": [{"body": r["body"], "date": long_date(r["created_at"])}
                        for r in c["replies"]],
        })

    for d in get_delay_complaints(user_id):
        tag, label = COMPLAINT_TAGS.get(d["status"], ("tag-wait", "Waiting for the team"))
        rows.append({
            "subject": "My report is late",
            "body": "",
            "case_id": d["case_id"],
            "date": long_date(d["created_at"]),
            "sort_key": d["created_at"],
            "tag": tag,
            "label": label,
            "from_case": True,       # this one was raised with the button on a case
            "replies": [],
        })

    rows.sort(key=lambda row: row["sort_key"], reverse=True)
    return rows


def complaints_page(request, user_id, form=None, errors=None, sent=False, status_code=200):
    header = get_patient_header(user_id)

    choices = [{"case_id": c["case_id"],
                "label": f"Case #{c['case_id']} - {knee_label(c['knee'])} "
                         f"· uploaded {long_date(c['submitted_at'])}"}
               for c in get_case_choices(user_id)]

    return templates.TemplateResponse(
        request, "patient/complaints.html",
        {
            "total_cases": header["total_cases"] if header else 0,
            "kinds": COMPLAINT_SUBJECTS,
            "hints": COMPLAINT_HINTS,
            "choices": choices,
            "form": form or {"kind": "report", "case_id": "", "body": ""},
            "errors": errors or {},
            "sent": sent,
            "body_max": BODY_MAX,
            "complaints": complaint_rows(user_id),
        },
        status_code=status_code,
    )


@router.get("/complaints", include_in_schema=False)
def complaints(request: Request, sent: int = 0):
    """The patient's complaints page. A doctor or a radiologist gets the
    older page, which is still theirs."""
    if request.session.get("user_id") is None:
        return RedirectResponse("/login", status_code=303)
    if request.session.get("role") != "patient":
        return routes_complaints.complaints_page(request, sent=sent)

    return complaints_page(request, request.session["user_id"], sent=bool(sent))


@router.post("/complaints", include_in_schema=False)
async def send_complaint(request: Request):
    """Save a complaint, then redirect so a refresh cannot send it twice."""
    if request.session.get("user_id") is None:
        return RedirectResponse("/login", status_code=303)

    data = await request.form()

    if request.session.get("role") != "patient":
        return routes_complaints.send_complaint(
            request,
            subject=(data.get("subject") or ""),
            body=(data.get("body") or ""),
        )

    user_id = request.session["user_id"]
    form = {
        "kind": data.get("kind") or "",
        "case_id": (data.get("case_id") or "").strip(),
        "body": (data.get("body") or "").strip(),
    }

    errors = {}
    if form["kind"] not in COMPLAINT_SUBJECTS:
        errors["kind"] = "Please choose what this is about."
    if not form["body"] or len(form["body"]) > BODY_MAX:
        errors["body"] = f"Please tell us what happened, in up to {BODY_MAX} characters."

    # the case must be one of this patient's own, or nothing at all
    case_id = None
    if form["case_id"]:
        own = {str(c["case_id"]) for c in get_case_choices(user_id)}
        if form["case_id"] in own:
            case_id = int(form["case_id"])
        else:
            errors["case_id"] = "Please choose one of your own cases."

    if errors:
        return complaints_page(request, user_id, form=form, errors=errors, status_code=400)

    create_complaint(user_id, COMPLAINT_SUBJECTS[form["kind"]], form["body"], case_id)
    return RedirectResponse("/complaints?sent=1", status_code=303)
