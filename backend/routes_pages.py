"""MUFSAL - serves the HTML pages of the project root and protects them on the SERVER.

/login, /register ... open without an account. Every other page needs a login, and the role must fit
the page. A visitor who is not logged in goes to /login; a user on a page of another role goes to
his own home page. (The pages' own mock-users.js guard is no longer needed.)

Include this router LAST in main.py: the pages rendered with Jinja (/dashboard-patient, /cases/...)
must be matched first.
"""
import re
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, PlainTextResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from auth_service import HOME

PROJECT_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")
router = APIRouter()

# The login / registration pages live in backend/templates and are rendered with Jinja
# (like the patient dashboard). They open without an account.
AUTH_TEMPLATES = {"login", "register", "register-patient", "register-professional",
                  "forgot-password", "reset-password", "logout"}
PUBLIC = AUTH_TEMPLATES | {"header"}

ROLE_PAGES = {
    "patient": {"profile-patient", "patient-cases"},
    "radiologist": {"dashboard-radiologist", "profile-radiologist", "radiologist-cases"},
    "doctor": {"dashboard-doctor", "profile-doctor", "pending-cases", "approved-cases", "review-case"},
    "admin": {"dashboard-admin", "profile-admin", "admin-support",
              "admin-delayed-requests", "admin-license-verification"},
}
# pages shared by several roles
SHARED = {
    "new-case-step1": {"patient", "radiologist"},
    "new-case-step2": {"patient", "radiologist"},
    "new-case-step3": {"patient", "radiologist"},
    "view-report": {"patient", "radiologist", "doctor"},
}
# Any other page that exists in the project root needs a login but accepts every role.

NAME_RE = re.compile(r"^[a-z0-9-]+$")


def allowed_roles(name):
    if name in SHARED:
        return SHARED[name]
    for role, pages in ROLE_PAGES.items():
        if name in pages:
            return {role}
    return None          # any logged-in role


def send_page(request, name):
    if not NAME_RE.match(name):
        return None
    if name in AUTH_TEMPLATES:
        lang = "ar" if request.cookies.get("lang") == "ar" else "en"
        return templates.TemplateResponse(
            request, f"{name}.html",
            {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr"},
            headers={"Cache-Control": "no-store"})
    file = PROJECT_DIR / f"{name}.html"
    if not file.is_file():
        return None

    if name not in PUBLIC:
        role = request.session.get("role")
        if request.session.get("user_id") is None or role is None:
            return RedirectResponse("/login", status_code=303)
        roles = allowed_roles(name)
        if roles is not None and role not in roles:
            return RedirectResponse(HOME.get(role, "/login"), status_code=303)

    # The patient dashboard is built by the server (routes_dashboard.py), never the static copy
    if name == "dashboard-patient":
        return RedirectResponse("/dashboard-patient", status_code=303)

    return FileResponse(file, headers={"Cache-Control": "no-store"})


@router.get("/", include_in_schema=False)
def home(request: Request):
    role = request.session.get("role")
    if request.session.get("user_id") is None or role is None:
        return RedirectResponse("/login", status_code=303)
    return RedirectResponse(HOME.get(role, "/login"), status_code=303)


@router.get("/{name}.html", include_in_schema=False)
def html_page(request: Request):
    name = request.path_params["name"]
    return send_page(request, name) or PlainTextResponse("Page not found", status_code=404)


@router.get("/{name}", include_in_schema=False)
def clean_url(request: Request):
    """/login works the same as /login.html"""
    name = request.path_params["name"]
    return send_page(request, name) or PlainTextResponse("Page not found", status_code=404)
