"""MUFSAL - server session setup and the 15-minute inactivity rule (NFR-S5).

main.py calls install(app). The login route puts user_id and role in the session
(request.session) and this file adds "seen" (the time of the last request).
A doctor or radiologist who does nothing for 15 minutes is logged out by the SERVER,
so closing or editing the browser cannot skip the rule.
"""
import os
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import JSONResponse, RedirectResponse

IDLE_ROLES = ("doctor", "radiologist")
IDLE_LIMIT_SECONDS = 15 * 60
SESSION_MAX_AGE = 60 * 60 * 8          # the cookie itself lives 8 hours (patients and admins)
NOT_COUNTED = ("/static/", "/assets/")  # css/js/images are not "activity"

# An account that asked to be deleted (routes_account.py) can only see these until the admin decides
WHILE_DELETING = ("/account-deletion", "/logout", "/logout.html", "/api/logout", "/set-lang", "/login")


def install(app):
    async def idle_timeout(request, call_next):
        path = request.url.path
        session = request.session
        if session.get("user_id") is not None and not path.startswith(NOT_COUNTED):
            now = time.time()
            idle = now - session.get("seen", now)
            if session.get("role") in IDLE_ROLES and idle > IDLE_LIMIT_SECONDS:
                session.clear()
                if path.startswith("/api/"):
                    return JSONResponse({"ok": False, "error": "expired"}, status_code=401)
                return RedirectResponse("/login?expired=1", status_code=303)
            session["seen"] = now 
                        if session.get("deleting") and path not in WHILE_DELETING:
                if path.startswith("/api/"):
                    return JSONResponse({"ok": False, "error": "deleting"}, status_code=403)
                return RedirectResponse("/account-deletion", status_code=303)
        return await call_next(request)

    app.add_middleware(BaseHTTPMiddleware, dispatch=idle_timeout)

    # Added AFTER the line above on purpose: the last middleware added is the outermost,
    # so the session is already loaded when idle_timeout runs.
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("SESSION_SECRET", "change-me"),
        max_age=SESSION_MAX_AGE,
        same_site="lax",
        https_only=os.getenv("HTTPS_ONLY") == "1",   # set HTTPS_ONLY=1 on Render
    )
