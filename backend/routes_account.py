"""MUFSAL - a doctor or radiologist asks to delete their own account.

    POST /account/delete-request   from the red "Delete account" button on the profile page
    GET  /account-deletion         the only page the account can see until the admin decides

The request does not delete anything. It saves the time of the request in
users.delete_requested_at and locks the account (session_guard.py sends every other
page here). The admin then deletes it from the admin dashboard, with the existing
DELETE /api/admin/accounts/{id}, which removes the row and so the request too.
"""
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from db import get_connection
from routes_dashboard import get_lang

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).resolve().parent / "templates")

CAN_ASK = ("doctor", "radiologist")    # patients and the admin do not have this button


def request_deletion(user_id):
    """Saves the request once (asking twice keeps the first time)."""
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET delete_requested_at = COALESCE(delete_requested_at, CURRENT_TIMESTAMP) "
            "WHERE user_id = %s AND role IN ('doctor','radiologist')",
            (user_id,),
        )


@router.post("/account/delete-request", include_in_schema=False)
def ask_to_delete(request: Request):
    if request.session.get("user_id") is None:
        return RedirectResponse("/login", status_code=303)
    if request.session.get("role") not in CAN_ASK:
        return RedirectResponse("/", status_code=303)
    request_deletion(request.session["user_id"])
    request.session["deleting"] = True           # session_guard.py locks every other page from now on
    return RedirectResponse("/account-deletion", status_code=303)


@router.get("/account-deletion", include_in_schema=False)
def waiting_page(request: Request):
    if not request.session.get("deleting"):
        return RedirectResponse("/", status_code=303)
    lang = get_lang(request)
    return templates.TemplateResponse(
        request, "account-deletion.html",
        {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr"},
    )
