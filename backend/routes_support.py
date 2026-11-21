"""MUFSAL - support requests page for the doctor, the radiologist and the admin.

The patient has a page of her own (routes_patient.py), and this one works
the same way so that one shape is learned once:

    GET  /support   the form, a short note on what happens next,
                       and every support request this user has sent
    POST /support   checks the answers and saves the support request

A support request is three answers: what it is about, which case it concerns
(or none), and what happened.
"""
from pathlib import Path

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from queries_support import (create_support_request, get_cases_for_user,
                                get_user_support_requests)
from routes_dashboard import format_date, get_lang
from texts_dashboard import DASHBOARD_TEXT

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

BODY_MAX_WORDS = 120     # the limit the person sees and the page counts
BODY_MAX = 2000          # a safety net in characters, so nothing huge is posted

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


def render_support_page(request, user_id, form=None, errors=None,
                      sent=False, status_code=200):
    lang = get_lang(request)
    t = DASHBOARD_TEXT[lang]
    role = request.session.get("role", "doctor")

    support_requests = []
    for c in get_user_support_requests(user_id):
        support_requests.append({
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
        request, "support.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": t,
            "role_chip": t[ROLE_CHIP.get(role, "c_role_chip")],
            "home_url": HOME_BY_ROLE.get(role, "/"),
            "choices": choices,
            "support_requests": support_requests,
            "form": form or {"case_id": "", "body": ""},
            "errors": errors or {},
            "sent": sent,
            "body_max": BODY_MAX,
            "body_max_words": BODY_MAX_WORDS,
        },
        status_code=status_code,
    )


@router.get("/support")
def support_page(request: Request, sent: int = 0):
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse("/login", status_code=303)
    return render_support_page(request, user_id, sent=bool(sent))


@router.post("/support")
def send_support_request(request: Request, case_id: str = Form(""), body: str = Form("")):
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse("/login", status_code=303)

    t = DASHBOARD_TEXT[get_lang(request)]
    form = {"case_id": (case_id or "").strip(), "body": (body or "").strip()}

    # ---- check on the server; the page's own checks can be bypassed ----
    errors = {}
    words = len(form["body"].split())
    if not form["body"]:
        errors["body"] = t["c_err_body"]
    elif words > BODY_MAX_WORDS or len(form["body"]) > BODY_MAX:
        errors["body"] = t["c_err_body_long"].format(limit=BODY_MAX_WORDS, count=words)

    # the case has to be one this user actually works on, or none at all
    chosen_case = None
    if form["case_id"]:
        own = {str(c["case_id"]) for c in get_cases_for_user(user_id)}
        if form["case_id"] in own:
            chosen_case = int(form["case_id"])
        else:
            errors["case_id"] = t["c_err_case"]

    if errors:
        return render_support_page(request, user_id, form=form, errors=errors, status_code=400)

    # ---- save, then redirect so a page refresh does not send it twice ----
    create_support_request(user_id, form["body"], chosen_case)
    return RedirectResponse("/support?sent=1", status_code=303)
