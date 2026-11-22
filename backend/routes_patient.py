"""MUFSAL - the patient's pages (new design).

Shahd owns every page the patient sees: the home page, the list of cases,
the profile, starting a new case, reading a report and raising a support request.
They all live in THIS file and in templates/patient/, so nothing here
collides with the pages the rest of the team is building.

main.py includes this router BEFORE routes_dashboard, so any address
written here wins over the older patient page with the same address.
The older file keeps serving whatever has not moved over yet.

Pages finished so far:
    /dashboard-patient   the home page
    /patient-cases       every X-ray the patient has sent
    /profile-patient     the patient's details, and changing them
    /support          raising a support request and following it
    /new-case            uploading an X-ray and answering the questions

/support belongs to every role, not only the patient, so the two
handlers here hand a doctor or a radiologist straight back to the older
page. Nothing changes for them.

Still on the old pages (we move them one by one):
    /cases/{id}/report
"""
import re
import uuid
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from psycopg import errors as pg_errors

import routes_support           # only to hand the other roles their own page
# the same age and sex rules sign-up uses, so the profile cannot save
# something a new account would have been refused for
from auth_rules import (MIN_AGE, dob_error, gender_error,
                        password_rule_failures)
# The checks for a new case were already written and work well, so they are
# used as they are instead of being written a second time. Only the page
# itself is new here.
from routes_new_case import (CHOICES, WARNINGS, XRAYS_DIR, check_answers,
                             check_file)
from auth_service import HOME
from ai_analysis import analyze_case_later
from queries_cases import create_case, get_patient_case_numbers
from queries_patient import (create_support_request, email_belongs_to_someone_else,
                             get_all_cases, get_case_choices, get_latest_case,
                             get_delay_complaints, get_open_case,
                             get_patient_header, get_profile,
                             get_written_support_requests,
                             password_is_the_current_one, set_password,
                             update_profile)

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

BODY_MAX_WORDS = 120     # the limit the person sees and the page counts
BODY_MAX = 2000          # a safety net in characters, so nothing huge is posted

# How a support request's status is shown. 'pending' and 'resolved' come from
# the support requests table, 'pending' and 'handled' from delay complaints.
COMPLAINT_TAGS = {
    "pending":  ("tag-wait", "Pending"),
    "resolved": ("tag-done", "Handled"),
    "handled":  ("tag-done", "Handled"),
}
DEFAULT_COMPLAINT_TAG = ("tag-wait", "Pending")

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ------------------------------------------------------------------ helpers

def get_lang(request: Request):
    """The language the reader chose, kept in a cookie by /set-lang."""
    return "ar" if request.cookies.get("lang") == "ar" else "en"


def page_context(request: Request, extra):
    """Everything every patient page needs, plus whatever that page adds."""
    lang = get_lang(request)
    context = {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr"}
    context.update(extra)
    return context


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


def build_latest_case(row, numbers):
    """Turn the newest case into the handful of values the card prints.

    Two shapes come out of here: a case still being read, with how long it
    has waited and the delay button, and a case whose report is signed,
    which carries the way in to that report instead.

    numbers is the patient's own numbering (see get_patient_case_numbers):
    "number" is what she is shown, "case_id" is what the addresses use.
    """
    if row is None:
        return None

    done = row["status"] == "approved" and row["final_grade"] is not None

    return {
        "case_id": row["case_id"],
        "number": numbers.get(row["case_id"], row["case_id"]),
        "knee": knee_label(row["knee"]),
        "by_radiologist": row["source"] == "radiologist",     # a radiologist uploaded it for the patient
        "uploader": row["uploaded_by_name"],
        "submitted_long": long_date(row["submitted_at"]),
        "submitted_short": short_date(row["submitted_at"]),
        "done": done,
        "grade": row["final_grade"],
        "approved_short": short_date(row["approved_at"]),
        "approved_long": long_date(row["approved_at"]),
        "waiting": waiting_line(row["days_waited"]),
        # the delay button has three faces: open, already used, or not yet
        "delay_ready": bool(row["delay_ready"]) and not row["delay_open"],
        "delay_open": bool(row["delay_open"]),
        "delay_date": short_date(row["delay_date"]),
    }


# ------------------------------------------------------- the public page

@router.get("/", include_in_schema=False)
def landing(request: Request):
    """What a visitor sees before signing in: what MUFSAL is, who it is for,
    and the two ways in.

    Anyone already signed in is sent to their own home page instead, which is
    what the address did before this page existed.
    """
    role = request.session.get("role")
    if role:
        return RedirectResponse(HOME.get(role, "/login"), status_code=303)
    return templates.TemplateResponse(request, "landing.html", {})


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
    numbers = get_patient_case_numbers(user_id)
    latest = build_latest_case(get_latest_case(user_id), numbers)
    # a case still being read is what locks "Start a new case"
    waiting_on_a_case = bool(latest and not latest["done"])

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
        page_context(request, {
            "first_name": header["first_name"] if header else "",
            "nav_counts": {"cases": header["total_cases"] if header else 0},
            "latest": latest,
            "waiting_on_a_case": waiting_on_a_case,
            "message": message,
            "message_ok": message_ok,
        }),
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

    numbers = get_patient_case_numbers(user_id)

    rows = []
    for case in get_all_cases(user_id):
        done = case["status"] == "approved" and case["final_grade"] is not None
        rows.append({
            "case_id": case["case_id"],
            "number": numbers.get(case["case_id"], case["case_id"]),
            "knee": knee_label(case["knee"]),
            "by_radiologist": case["source"] == "radiologist",
            "uploader": case["uploaded_by_name"],
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
        page_context(request, {
            "cases": rows,
            "nav_counts": {"cases": len(rows)},
            "message": message,
            "message_ok": message_ok,
        }),
    )


# --------------------------------------------------------------- profile

def mask_national_id(value):
    """1011111111 -> 10••••••11. Shown so the patient can recognise it
    without the whole number sitting on the screen."""
    if not value or len(value) < 4:
        return value or ""
    return value[:2] + "•" * (len(value) - 4) + value[-2:]


def oldest_allowed_birthday(today=None):
    """The newest date of birth that still makes someone 18 today.

    Written out rather than taken off a library, and 29 February steps
    back to the 28th, which is the day the law counts the birthday on in
    a year that has no 29th.
    """
    today = today or date.today()
    try:
        return today.replace(year=today.year - MIN_AGE)
    except ValueError:
        return today.replace(year=today.year - MIN_AGE, day=28)


def profile_page(request, user_id, form=None, errors=None, saved=False,
                 pw_failed=None, pw_saved=False, status_code=200):
    """Draw the profile. Used by the plain page and by a save the server
    turned down, so the patient always sees their own words back in the
    boxes. pw_failed carries the keys of the password rules that were not
    met, which the checklist in the security card paints red."""
    row = get_profile(user_id)
    if row is None:
        return RedirectResponse("/login", status_code=303)

    if form is None:
        form = {
            "full_name": row["full_name"],
            "email": row["email"],
            # a date box reads and writes YYYY-MM-DD, which isoformat gives
            "date_of_birth": row["date_of_birth"].isoformat() if row["date_of_birth"] else "",
            "gender": (row["gender"] or "").lower(),
        }

    header = get_patient_header(user_id)

    return templates.TemplateResponse(
        request, "patient/profile.html",
        page_context(request, {
            "nav_counts": {"cases": header["total_cases"] if header else 0},
            "form": form,
            "errors": errors or {},
            "saved": saved,
            "national_id": mask_national_id(row["national_id"]),
            # the last birthday that still makes the patient 18, so the date
            # box cannot even offer a day the database would turn down
            "dob_max": oldest_allowed_birthday().isoformat(),
            "pw_failed": pw_failed or [],
            "pw_saved": pw_saved,
            # the day the password was last set, for the small note beside it
            "password_changed": long_date(row["password_changed_at"]),
        }),
        status_code=status_code,
    )


@router.get("/profile-patient", include_in_schema=False)
def profile(request: Request, saved: int = 0, changed: int = 0):
    user_id, redirect = patient_or_redirect(request)
    if redirect:
        return redirect
    return profile_page(request, user_id, saved=bool(saved), pw_saved=bool(changed))


@router.post("/profile-patient", include_in_schema=False)
async def save_profile(request: Request):
    """Save the name, the email address, the date of birth and the sex.

    Everything is checked again here: the page's own checks can be
    switched off in the browser, so they are a convenience, not a rule.
    The date of birth and the sex are checked with the same two rules
    that sign-up uses, so a profile can never hold something a new
    account would have been refused for.
    """
    user_id, redirect = patient_or_redirect(request)
    if redirect:
        return redirect

    data = await request.form()
    form = {
        "full_name": (data.get("full_name") or "").strip(),
        "email": (data.get("email") or "").strip(),
        "date_of_birth": (data.get("date_of_birth") or "").strip(),
        "gender": (data.get("gender") or "").strip().lower(),
    }

    errors = {}
    if len(form["full_name"]) < 2 or len(form["full_name"]) > 100:
        errors["full_name"] = "Please write your full name."
    if not EMAIL_PATTERN.match(form["email"]) or len(form["email"]) > 255:
        errors["email"] = "That does not look like an email address."
    elif email_belongs_to_someone_else(form["email"], user_id):
        errors["email"] = "Another account already uses this email address."

    dob_code = dob_error(form["date_of_birth"])
    if dob_code == "min_age":
        errors["date_of_birth"] = "MUFSAL is for adults, so this has to be 18 years ago or earlier."
    elif dob_code:
        errors["date_of_birth"] = "Please choose your date of birth."

    if gender_error(form["gender"]):
        errors["gender"] = "Please choose female or male."

    if errors:
        return profile_page(request, user_id, form=form, errors=errors, status_code=400)

    update_profile(user_id, form["full_name"], form["email"],
                   form["date_of_birth"], form["gender"])

    # redirect after saving, so refreshing the page does not save it twice
    return RedirectResponse("/profile-patient?saved=1", status_code=303)


@router.post("/profile-patient/password", include_in_schema=False)
async def change_password(request: Request):
    """Set a new password from the profile page.

    The page paints the list of rules as they are met, but that list is a
    courtesy: the rules are read again here, on the server, where they
    cannot be switched off. "Not the old one" can only be answered here
    anyway, because the old password itself was never stored.
    """
    user_id, redirect = patient_or_redirect(request)
    if redirect:
        return redirect

    data = await request.form()
    new_password = data.get("new_password") or ""

    failed = password_rule_failures(new_password)
    # Only worth asking once the password is a legal one at all, and the
    # answer costs a hash, so it is left until last.
    if not failed and password_is_the_current_one(user_id, new_password):
        failed = ["different"]

    if failed:
        return profile_page(request, user_id, pw_failed=failed, status_code=400)

    set_password(user_id, new_password)

    # redirect after saving, so refreshing does not post the password again
    return RedirectResponse("/profile-patient?changed=1", status_code=303)


# ------------------------------------------------------------ support requests

def support_rows(user_id):
    """The written support requests and the one-click delay reports, in one list,
    newest first. A case is named by the patient's own number for it, the same
    one her home page and her list of cases show."""
    numbers = get_patient_case_numbers(user_id)

    def case_title(case_id):
        if not case_id:
            return "Not about a specific case"
        return f"Case #{numbers.get(case_id, case_id)}"

    rows = []

    for c in get_written_support_requests(user_id):
        tag, label = COMPLAINT_TAGS.get(c["status"], DEFAULT_COMPLAINT_TAG)
        rows.append({
            # the title is worked out for the page, not stored: the request
            # itself no longer carries one, so the case it is about names it.
            "title": case_title(c["case_id"]),
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
        tag, label = COMPLAINT_TAGS.get(d["status"], DEFAULT_COMPLAINT_TAG)
        rows.append({
            "title": "Report is late",
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


def support_page(request, user_id, form=None, errors=None, sent=False, status_code=200):
    header = get_patient_header(user_id)

    numbers = get_patient_case_numbers(user_id)
    choices = [{"case_id": c["case_id"],
                "label": f"Case #{numbers.get(c['case_id'], c['case_id'])}"
                         f" - {knee_label(c['knee'])}"
                         f" · uploaded {long_date(c['submitted_at'])}"}
               for c in get_case_choices(user_id)]

    return templates.TemplateResponse(
        request, "patient/support.html",
        page_context(request, {
            "nav_counts": {"cases": header["total_cases"] if header else 0},
            "choices": choices,
            "form": form or {"case_id": "", "body": ""},
            "errors": errors or {},
            "sent": sent,
            "body_max": BODY_MAX,
            "body_max_words": BODY_MAX_WORDS,
            "support_requests": support_rows(user_id),
        }),
        status_code=status_code,
    )


@router.get("/support", include_in_schema=False)
def support_requests(request: Request, sent: int = 0):
    """The patient's support requests page. A doctor or a radiologist gets the
    older page, which is still theirs. The admin reads support requests rather
    than writing them, so he is sent to the page that lists them all."""
    if request.session.get("user_id") is None:
        return RedirectResponse("/login", status_code=303)
    if request.session.get("role") == "admin":
        return RedirectResponse("/admin-support", status_code=303)
    if request.session.get("role") != "patient":
        return routes_support.support_page(request, sent=sent)

    return support_page(request, request.session["user_id"], sent=bool(sent))


@router.post("/support", include_in_schema=False)
async def send_support_request(request: Request):
    """Save a support request, then redirect so a refresh cannot send it twice."""
    if request.session.get("user_id") is None:
        return RedirectResponse("/login", status_code=303)
    if request.session.get("role") == "admin":
        return RedirectResponse("/admin-support", status_code=303)

    data = await request.form()

    if request.session.get("role") != "patient":
        return routes_support.send_support_request(
            request,
            case_id=(data.get("case_id") or ""),
            body=(data.get("body") or ""),
        )

    user_id = request.session["user_id"]
    form = {
        "case_id": (data.get("case_id") or "").strip(),
        "body": (data.get("body") or "").strip(),
    }

    errors = {}
    words = len(form["body"].split())
    if not form["body"]:
        errors["body"] = "Please tell us what happened."
    elif words > BODY_MAX_WORDS or len(form["body"]) > BODY_MAX:
        errors["body"] = (f"Please keep it to {BODY_MAX_WORDS} words. "
                          f"You have written {words}.")

    # the case must be one of this patient's own, or nothing at all
    case_id = None
    if form["case_id"]:
        own = {str(c["case_id"]) for c in get_case_choices(user_id)}
        if form["case_id"] in own:
            case_id = int(form["case_id"])
        else:
            errors["case_id"] = "Please choose one of your own cases."

    if errors:
        return support_page(request, user_id, form=form, errors=errors, status_code=400)

    create_support_request(user_id, form["body"], case_id)
    return RedirectResponse("/support?sent=1", status_code=303)


# ------------------------------------------------------------- new case

# What the form sends back when an answer has to be filled in again.
TYPED_FIELDS = list(CHOICES) + ["height_cm", "weight_kg", "medications", "other_symptoms"]


def new_case_page(request, user_id, a=None, errors=None, file_error=None,
                  open_step=1, save_failed=False, status_code=200):
    """Draw the three-step page.

    a / errors / file_error come back filled in when the server refused
    something, so the patient sees their own answers again with the
    questions that need another look marked in red.
    """
    header = get_patient_header(user_id)

    blank = {name: "" for name in TYPED_FIELDS}
    blank.update({w: False for w in WARNINGS + ("warning_none",)})
    blank.update(a or {})

    return templates.TemplateResponse(
        request, "patient/new-case.html",
        page_context(request, {
            "nav_counts": {"cases": header["total_cases"] if header else 0},
            "a": blank,
            "errors": errors or set(),
            "file_error": file_error,
            "open_step": open_step,
            "save_failed": save_failed,
        }),
        status_code=status_code,
    )


def may_start_a_case(request: Request):
    """Like patient_or_redirect, and also stops a second case being opened.

    One case under review at a time is the rule the home page shows, and
    it is checked again here because a second tab or a double click would
    otherwise slip past it.
    """
    user_id, redirect = patient_or_redirect(request)
    if redirect:
        return None, redirect
    if get_open_case(user_id) is not None:
        return None, RedirectResponse("/dashboard-patient", status_code=303)
    return user_id, None


@router.get("/new-case", include_in_schema=False)
def new_case(request: Request):
    user_id, redirect = may_start_a_case(request)
    if redirect:
        return redirect
    return new_case_page(request, user_id)


@router.post("/new-case", include_in_schema=False)
async def submit_new_case(request: Request):
    """Receive the X-ray and every answer at once, check them, and open the case."""
    user_id, redirect = may_start_a_case(request)
    if redirect:
        return redirect

    form = await request.form()
    data, ext, file_error = await check_file(form.get("xray_file"))
    answers, errors = check_answers(form)

    if file_error or errors:
        # A browser cannot put a chosen file back into a form after the page
        # reloads, so the X-ray has to be chosen again whenever anything else
        # was wrong.
        typed = {name: (form.get(name) or "") for name in TYPED_FIELDS}
        typed.update({w: form.get(w) == "on" for w in WARNINGS + ("warning_none",)})
        return new_case_page(
            request, user_id, a=typed, errors=errors,
            file_error=file_error or "choose_again",
            open_step=2 if errors else 1,
            status_code=400,
        )

    # ---- the X-ray first, then the case ----
    XRAYS_DIR.mkdir(parents=True, exist_ok=True)
    stored = XRAYS_DIR / f"{uuid.uuid4().hex}{ext}"      # never trust the sent file name
    stored.write_bytes(data)

    history = dict(answers)
    # The question is optional, so "nothing written" is stored as NULL. The dash
    # belongs on the page that reads it, not in the column.
    history["medications"] = history["medications"] or None

    try:
        case_id = create_case(
            patient_id=user_id,
            uploaded_by=user_id,      # the patient herself, so the case counts as hers
            xray_image_path=f"uploads/xrays/{stored.name}",
            history=history,
        )
    except (pg_errors.CheckViolation, pg_errors.NotNullViolation):
        stored.unlink(missing_ok=True)
        return new_case_page(request, user_id, a=answers, file_error="choose_again",
                             open_step=3, save_failed=True, status_code=400)

       # the knee model grades the X-ray in the background; the doctor sees the result a few seconds later
    analyze_case_later(case_id, stored)

    return RedirectResponse(f"/dashboard-patient?case_created={case_id}", status_code=303)
