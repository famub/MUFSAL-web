"""MUFSAL - FastAPI app.

Start it from the backend folder:   uvicorn main:app --reload
Then open http://127.0.0.1:8000/login
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

load_dotenv()   # reads .env BEFORE the modules below read their settings

import routes_account 
import routes_admin
import routes_admin_pages
import routes_auth
import routes_support
import routes_dashboard
import routes_doctor
import routes_license
import routes_new_case
import routes_pages
import routes_patient
import routes_profile
import routes_radiologist
import routes_review
import session_guard
from db import get_connection

BASE_DIR = Path(__file__).resolve().parent   # .../backend
PROJECT_DIR = BASE_DIR.parent                # the project root (static/, assets/, the HTML pages)

app = FastAPI()

# Server session (secure cookie) + the 15-minute inactivity rule for doctors and radiologists
session_guard.install(app)

# CSS, JS and images of the pages
app.mount("/static", StaticFiles(directory=PROJECT_DIR / "static"), name="static")
app.mount("/assets", StaticFiles(directory=PROJECT_DIR / "assets"), name="assets")


@app.get("/db-test")
def db_test():
    """Check that the API can reach the database."""
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) AS accounts FROM users").fetchone()
    return row


# The order matters: specific routes first, the page server (routes_pages) LAST.
app.include_router(routes_admin.router)      # /api/admin/... (the admin pages)
app.include_router(routes_admin_pages.router)   # /dashboard-admin, /admin-... (the admin pages)
app.include_router(routes_auth.router)        # /api/login, /api/register/...
app.include_router(routes_radiologist.router)  # /new-case-radiologist (find the patient by ID, then upload)
app.include_router(routes_patient.router)     # the patient's new pages - must come BEFORE routes_dashboard
app.include_router(routes_dashboard.router)   # the older patient pages that have not moved over yet
app.include_router(routes_doctor.router)      # /dashboard-doctor (built by the server)
app.include_router(routes_support.router)  # /support (built by the server)
app.include_router(routes_new_case.router)    # /new-case (built by the server)
app.include_router(routes_review.router)      # /cases/{id}/review, /cases/{id}/report, /set-lang ...
app.include_router(routes_profile.router)    # /profile-doctor (built by the server) 
app.include_router(routes_account.router)    # /account/delete-request, /account-deletion
app.include_router(routes_license.router)    # /license-renewal (expired licence)
app.include_router(routes_pages.router)       # /login, /register ... and every other .html page
