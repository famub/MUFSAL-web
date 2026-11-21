"""MUFSAL - the four administrator pages (built by the server, new design).

    /dashboard-admin             three cards that open the pages below
    /admin-delayed-requests      delay complaints: reassign, mark as handled
    /admin-license-verification  doctor / radiologist requests, history, active accounts
    /admin-complaints            general complaints: reply and change the status
    /profile-admin               the administrator's own details (name and email)

The data itself is loaded by static/js/admin-ui.js from /api/admin/... (routes_admin.py).
A visitor who is not logged in goes to /login; another role goes to its own home page.
"""
from pathlib import Path

import re

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from auth_service import HOME
from db import get_connection
from routes_dashboard import get_lang

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

PAGES = {
    "dashboard-admin": "admin/home.html",
    "admin-delayed-requests": "admin/delayed.html",
    "admin-license-verification": "admin/licenses.html",
    "admin-complaints": "admin/complaints.html",
}


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


# ------------------------------------------------------------------ the administrator's profile
# Same shape as the patient's profile: the name and the email can change, the role is locked.
# (An administrator has no national ID and no date of birth.)

EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")   # same rule as the old profile page
ARABIC = re.compile(r"[\u0600-\u06FF]")

ERR = {
    "en": {"name": "Please write your full name.", "email": "Please enter a valid email address, for example name@example.com",
           "email_ar": "Please write the email in English letters.",
           "taken": "Another account already uses this email address."},
    "ar": {"name": "اكتب اسمك الكامل.", "email": "أدخل بريدًا إلكترونيًا صحيحًا، مثال: name@example.com",
           "email_ar": "اكتب البريد الإلكتروني بأحرف إنجليزية.",
           "taken": "يوجد حساب آخر يستخدم هذا البريد الإلكتروني."},
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
            "SELECT full_name, email FROM admins WHERE admin_id = %s", (admin_id,)
        ).fetchone()


def profile_page(request, user_id, form=None, errors=None, saved=False, status_code=200):
    lang = get_lang(request)
    row = get_admin_account(user_id)
    return templates.TemplateResponse(
        request, "admin/profile.html",
        {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr",
         "form": form or {"full_name": row["full_name"], "email": row["email"]},
         "errors": errors or {}, "saved": saved},
        status_code=status_code, headers={"Cache-Control": "no-store"})


@router.get("/profile-admin", include_in_schema=False)
def profile(request: Request, saved: int = 0):
    user_id, redirect = admin_or_redirect(request)
    if redirect:
        return redirect
    return profile_page(request, user_id, saved=bool(saved))


@router.post("/profile-admin", include_in_schema=False)
async def save_profile(request: Request):
    """Save the name and the email. Checked again here: the page's own checks are only a convenience."""
    user_id, redirect = admin_or_redirect(request)
    if redirect:
        return redirect
    msg = ERR[get_lang(request)]
    data = await request.form()
    form = {"full_name": (data.get("full_name") or "").strip(),
            "email": (data.get("email") or "").strip()}
    errors = {}
    if not 2 <= len(form["full_name"]) <= 100:
        errors["full_name"] = msg["name"]
    if ARABIC.search(form["email"]):
        errors["email"] = msg["email_ar"]
    elif not EMAIL_PATTERN.match(form["email"]) or len(form["email"]) > 255:
        errors["email"] = msg["email"]
    else:
        # An address may name one account only, and accounts sit in two
        # tables, so both are asked. The database would refuse the write
        # anyway (the triggers in schema.sql), but asking first turns a
        # crash into the same worded message the rest of the form gives.
        with get_connection() as conn:
            taken = conn.execute(
                "SELECT 1 FROM users WHERE lower(email) = lower(%s)"
                " UNION ALL"
                " SELECT 1 FROM admins WHERE lower(email) = lower(%s) AND admin_id <> %s",
                (form["email"], form["email"], user_id)).fetchone()
        if taken:
            errors["email"] = msg["taken"]
    if errors:
        return profile_page(request, user_id, form=form, errors=errors, status_code=400)
    with get_connection() as conn:
        conn.execute("UPDATE admins SET full_name = %s, email = %s WHERE admin_id = %s",
                     (form["full_name"], form["email"], user_id))
    return RedirectResponse("/profile-admin?saved=1", status_code=303)
