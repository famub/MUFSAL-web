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

Still on the old pages (we move them one by one):
    /patient-cases, /profile-patient, /new-case,
    /cases/{id}/report, /complaints
"""
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")

router = APIRouter()


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


# -------------------------------------------------------------------- pages

@router.get("/dashboard-patient", include_in_schema=False)
def home(request: Request):
    """The patient's home page: the welcome, the case being worked on, and
    the button that starts a new one."""
    user_id, redirect = patient_or_redirect(request)
    if redirect:
        return redirect

    return templates.TemplateResponse(
        request, "patient/home.html",
        {},          # the real data arrives in the next step
    )
