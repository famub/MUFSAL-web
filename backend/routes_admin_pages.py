"""MUFSAL - the administrator pages (built by the server, new design).

    /dashboard-admin             the dashboard: urgent items, weekly activity, one chart card per section
    /admin-delayed-reports       delayed reports: reassign, mark as handled
    /admin-license-verification  registration AND renewal requests, history, active accounts
    /admin-account-requests      doctors / radiologists asking to close their account
    /admin-support               support messages: reply (answering resolves them)
    /profile-admin               the administrator's own details (name and email)

The old addresses /admin-delayed-requests and /admin-complaints still work: they send the visitor to the new ones.
The data itself is loaded by static/js/admin-ui.js from /api/admin/... (routes_admin.py).
A visitor who is not logged in goes to /login; another role goes to its own home page.
"""
from pathlib import Path

import re

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from auth_rules import password_rule_failures
from queries_accounts import check_password, hash_password

from auth_service import HOME
from db import get_connection
from routes_dashboard import get_lang

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

PAGES = {
    "dashboard-admin": "admin/home.html",
    "admin-delayed-reports": "admin/delayed.html",
    "admin-license-verification": "admin/licenses.html",
    "admin-account-requests": "admin/accounts.html",
    "admin-support": "admin/support.html",
}
OLD_ADDRESSES = {"admin-delayed-requests": "/admin-delayed-reports", "admin-complaints": "/admin-support"}


def make_page(name, template):
    def page(request: Request):
        role = request.session.get("role")
        if request.session.get("user_id") is None or role is None:
            return RedirectResponse("/login", status_code=303)
        if role != "admin":
            return RedirectResponse(HOME.get(role, "/login"), status_code=303)
        lang = get_lang(request)
        return templates.TemplateResponse(
            request, template,
            {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr"},
            headers={"Cache-Control": "no-store"})
    router.add_api_route("/" + name, page, methods=["GET"], include_in_schema=False)


for _name, _template in PAGES.items():
    make_page(_name, _template)

for _old, _new in OLD_ADDRESSES.items():
    router.add_api_route("/" + _old, (lambda target: lambda: RedirectResponse(target, status_code=303))(_new),
                         methods=["GET"], include_in_schema=False)


# ------------------------------------------------------------------ the administrator's profile
# Same shape as the patient's profile, but stricter: only the NAME can be edited.
# The email is what the administrator signs in with and the role never changes, so both are locked.
# "Change password" opens the same inline form as the patient's profile (it does not leave the page).

ERR = {
    "en": {"name": "Please write your full name."},
    "ar": {"name": "اكتب اسمك الكامل."},
}


def admin_or_redirect(request):
    """(user_id, None) for a signed-in administrator, otherwise (None, a redirect)."""
    role = request.session.get("role")
    if request.session.get("user_id") is None or role is None:
        return None, RedirectResponse("/login", status_code=303)
    if role != "admin":
        return None, RedirectResponse(HOME.get(role, "/login"), status_code=303)
    return request.session["user_id"], None


def get_admin_account(admin_id):
    with get_connection() as conn:
        return conn.execute(
            "SELECT full_name, email, password_hash, password_changed_at FROM admins WHERE admin_id = %s",
            (admin_id,),
        ).fetchone()


def long_date(value):
    """23 November 2026 (the day is written by hand: strftime's no-zero code differs on Windows)."""
    return f"{value.day} {value.strftime('%B %Y')}" if value else ""


def profile_page(request, user_id, form=None, errors=None, saved=False, pw_saved=False, pw_failed=None,
                 status_code=200):
    lang = get_lang(request)
    row = get_admin_account(user_id)
    return templates.TemplateResponse(
        request, "admin/profile.html",
        {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr",
         "form": form or {"full_name": row["full_name"]}, "email": row["email"],
         "errors": errors or {}, "saved": saved, "pw_saved": pw_saved, "pw_failed": pw_failed or [],
         "password_changed": long_date(row["password_changed_at"])},
        status_code=status_code, headers={"Cache-Control": "no-store"})


@router.get("/profile-admin", include_in_schema=False)
def profile(request: Request, saved: int = 0, changed: int = 0):
    user_id, redirect = admin_or_redirect(request)
    if redirect:
        return redirect
    return profile_page(request, user_id, saved=bool(saved), pw_saved=bool(changed))


@router.post("/profile-admin", include_in_schema=False)
async def save_profile(request: Request):
    """Save the name. Nothing else can be changed here: an email that arrives in the form is ignored."""
    user_id, redirect = admin_or_redirect(request)
    if redirect:
        return redirect
    msg = ERR[get_lang(request)]
    data = await request.form()
    form = {"full_name": (data.get("full_name") or "").strip()}
    if not 2 <= len(form["full_name"]) <= 100:
        return profile_page(request, user_id, form=form, errors={"full_name": msg["name"]}, status_code=400)
    with get_connection() as conn:
        conn.execute("UPDATE admins SET full_name = %s WHERE admin_id = %s", (form["full_name"], user_id))
    return RedirectResponse("/profile-admin?saved=1", status_code=303)


@router.post("/profile-admin/password", include_in_schema=False)
async def change_password(request: Request):
    """Set a new password. The page paints the rules as they are met, but they are read again here.
    "Not the old one" can only be answered here, because only the hash of the old password is kept."""
    user_id, redirect = admin_or_redirect(request)
    if redirect:
        return redirect
    data = await request.form()
    new_password = data.get("new_password") or ""
    failed = password_rule_failures(new_password)
    if not failed and check_password(new_password, get_admin_account(user_id)["password_hash"]):
        failed = ["different"]
    if failed:
        return profile_page(request, user_id, pw_failed=failed, status_code=400)
    with get_connection() as conn:
        conn.execute(
            "UPDATE admins SET password_hash = %s, password_changed_at = CURRENT_TIMESTAMP WHERE admin_id = %s",
            (hash_password(new_password), user_id))
    return RedirectResponse("/profile-admin?changed=1", status_code=303)
