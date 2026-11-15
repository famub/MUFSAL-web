"""MUFSAL - complaints page: the user's previous complaints and a form for a new one.

Open to any logged-in user (the footer links here from every page).
"""
from pathlib import Path

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from queries_complaints import create_complaint, get_user_complaints
from routes_dashboard import format_date, get_lang
from texts_dashboard import DASHBOARD_TEXT

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

SUBJECT_MAX = 200    # same limit as the complaints.subject column
BODY_MAX = 2000

HOME_BY_ROLE = {
    "patient": "/dashboard-patient",
    "doctor": "/dashboard-doctor",
    "radiologist": "/dashboard-radiologist",
    "admin": "/dashboard-admin",
}


def render_complaints(request, user_id, subject="", body="", errors=None,
                      sent=False, status_code=200):
    lang = get_lang(request)
    t = DASHBOARD_TEXT[lang]

    complaints = []
    for c in get_user_complaints(user_id):
        complaints.append({
            "subject": c["subject"],
            "body": c["body"],
            "status": c["status"],
            "date": format_date(c["created_at"], lang),
            "replies": [{"body": r["body"], "date": format_date(r["created_at"], lang)}
                        for r in c["replies"]],
        })

    return templates.TemplateResponse(
        request, "complaints.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": t,
            "home_url": HOME_BY_ROLE.get(request.session.get("role"), "/"),
            "complaints": complaints,
            "subject": subject,
            "body": body,
            "errors": errors or {},
            "sent": sent,
            "subject_max": SUBJECT_MAX,
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
def send_complaint(request: Request, subject: str = Form(""), body: str = Form("")):
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse("/login", status_code=303)

    # ---- validate on the server (the browser's checks can be bypassed) ----
    t = DASHBOARD_TEXT[get_lang(request)]
    subject = subject.strip()
    body = body.strip()
    errors = {}
    if not subject or len(subject) > SUBJECT_MAX:
        errors["subject"] = t["c_err_subject"]
    if not body or len(body) > BODY_MAX:
        errors["body"] = t["c_err_body"]

    if errors:
        return render_complaints(request, user_id, subject, body, errors, status_code=400)

    # ---- save, then redirect so a page refresh does not send it twice ----
    create_complaint(user_id, subject, body)
    return RedirectResponse("/complaints?sent=1", status_code=303)
