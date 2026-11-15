"""MUFSAL - FastAPI app."""
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates

from pathlib import Path

from db import get_connection

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

@app.get("/db-test")
def db_test():
    """Check that the API can reach the database."""
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) AS accounts FROM users").fetchone()
    return row

"""MUFSAL - FastAPI app."""
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

import routes_review
import routes_dashboard
app.include_router(routes_dashboard.router)

load_dotenv()

BASE_DIR = Path(__file__).parent          # .../backend
PROJECT_DIR = BASE_DIR.parent             # the project root (static/, assets/)

# Server session (secure cookie) - the login page puts user_id and role in it
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "change-me"),
    max_age=60 * 60 * 8,
    same_site="lax",
)

# CSS, JS and images of the pages
app.mount("/static", StaticFiles(directory=PROJECT_DIR / "static"), name="static")
app.mount("/assets", StaticFiles(directory=PROJECT_DIR / "assets"), name="assets")

# Pages
app.include_router(routes_review.router)   # review-case + view-report

@app.get("/dashboard-patient", include_in_schema=False)
def dashboard(req: Request):
    return templates.TemplateResponse(req, "dashboard-patient.html")