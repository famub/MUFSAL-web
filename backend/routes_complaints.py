"""MUFSAL - complaints page for the doctor, the radiologist and the admin.

The patient has a page of her own (routes_patient.py), and this one works
the same way so that one shape is learned once:

    GET  /complaints   the form, a short note on what happens next,
                       and every complaint this user has sent
    POST /complaints   checks the answers and saves the complaint

A complaint is three answers: what it is about, which case it concerns
(or none), and what happened.
"""
from pathlib import Path

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from queries_complaints import (create_complaint, get_cases_for_user,
                                get_user_complaints)
from routes_dashboard import format_date, get_lang
from texts_dashboard import DASHBOARD_TEXT

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

BODY_MAX = 2000

# What a complaint can be about. The key is what the form sends; the text
# that is saved in complaints.subject is the English wording, so the admin
# reads one set of words whatever language the page was written in.
KINDS = {
    "report": "Something in a report",
    "site": "A problem with the site",
    "other": "Something else",
}

HOME_BY_ROLE = {
    "patient": "/dashboard-patient",
    "doctor": "/dashboard-doctor",
    "radiologist": "/dashboard-radiologist",
    "admin": "/dashboard-admin",
}

# the small line under the title that says whose page this is
ROLE_CHIP = {
    "doctor": "c_role_chip",
    "radiologist": "c_role_chip_radiologist",
    "admin": "c_role_chip_admin",
}


def case_label(case, t, lang):
    """Case #12 - right knee - 6 November 2026"""
    return t["c_case_label"].format(
        id=case["case_id"],
        knee=case["knee"] or "-",
        date=format_date(case["submitted_at"], lang),
    )


def render_complaints(request, user_id, form=None, errors=None,
                      sent=False, status_code=200):
    lang = get_lang(request)
    t = DASHBOARD_TEXT[lang]
    role = request.session.get("role", "doctor")

    complaints = []
    for c in get_user_complaints(user_id):
        complaints.append({
            "subject": c["subject"],
            "body": c["body"],
            "status": c["status"],
            "case_id": c["case_id"],
            "date": format_date(c["created_at"], lang),
            "replies": [{"body": r["body"], "date": format_date(r["created_at"], lang)}
                        for r in c["replies"]],
        })

    choices = [{"case_id": case["case_id"], "label": case_label(case, t, lang)}
               for case in get_cases_for_user(user_id)]

    return templates.TemplateResponse(
        request, "complaints.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": t,
            "role_chip": t[ROLE_CHIP.get(role, "c_role_chip")],
            "home_url": HOME_BY_ROLE.get(role, "/"),
            "kinds": KINDS,
            "choices": choices,
            "complaints": complaints,
            "form": form or {"kind": "report", "case_id": "", "body": ""},
            "errors": errors or {},
            "sent": sent,
            "body_max": BODY_MAX,
        },
        status_code=status_code,
    )


@router.get("/complaints")
def complaints_page(request: Request, sent: int = 0):
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse("/login", status_code=303)
    return render_complaints(request, user_id, sent=bool(sent))


@router.post("/complaints")
def send_complaint(request: Request, kind: str = Form(""), case_id: str = Form(""),
                   body: str = Form("")):
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse("/login", status_code=303)

    t = DASHBOARD_TEXT[get_lang(request)]
    form = {"kind": kind, "case_id": (case_id or "").strip(), "body": (body or "").strip()}

    # ---- check on the server; the page's own checks can be bypassed ----
    errors = {}
    if form["kind"] not in KINDS:
        errors["kind"] = t["c_err_kind"]
    if not form["body"] or len(form["body"]) > BODY_MAX:
        errors["body"] = t["c_err_body"]

    # the case has to be one this user actually works on, or none at all
    chosen_case = None
    if form["case_id"]:
        own = {str(c["case_id"]) for c in get_cases_for_user(user_id)}
        if form["case_id"] in own:
            chosen_case = int(form["case_id"])
        else:
            errors["case_id"] = t["c_err_case"]

    if errors:
        return render_complaints(request, user_id, form=form, errors=errors, status_code=400)

    # ---- save, then redirect so a page refresh does not send it twice ----
    create_complaint(user_id, KINDS[form["kind"]], form["body"], chosen_case)
    return RedirectResponse("/complaints?sent=1", status_code=303)
