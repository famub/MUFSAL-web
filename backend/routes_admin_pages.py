"""MUFSAL - the four administrator pages (built by the server, new design).

    /dashboard-admin             three cards that open the pages below
    /admin-delayed-requests      delay complaints: reassign, mark as handled
    /admin-license-verification  doctor / radiologist requests, history, active accounts
    /admin-complaints            general complaints: reply and change the status

The data itself is loaded by static/js/admin-ui.js from /api/admin/... (routes_admin.py).
A visitor who is not logged in goes to /login; another role goes to its own home page.
"""
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from auth_service import HOME
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
