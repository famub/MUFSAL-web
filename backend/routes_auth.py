"""MUFSAL - login, registration and password-reset API.

The pages (static/js/auth.js) send JSON to these addresses. The logic is in auth_service.py.
After a successful login the server writes request.session["user_id"] and request.session["role"],
which is exactly what routes_dashboard.py and routes_review.py already read.

Database calls are blocking, so they run in a thread pool and do not freeze the server.
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

import auth_service as service

router = APIRouter()


async def read_json(request):
    try:
        data = await request.json()
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


def answer(result):
    status, payload = result
    return JSONResponse(payload, status_code=status)


def admin_id(request):
    """The logged-in admin's id, or None."""
    if request.session.get("role") == "admin":
        return request.session.get("user_id")
    return None


NOT_ADMIN = {"ok": False, "error": "forbidden"}


# ---------------------------------------------------------------- registration

@router.post("/api/register/patient")
async def register_patient(request: Request):
    return answer(await run_in_threadpool(service.register_patient, await read_json(request)))


@router.post("/api/register/professional")
async def register_professional(request: Request):
    return answer(await run_in_threadpool(service.register_professional, await read_json(request)))


# ---------------------------------------------------------------- login / logout / who am I

@router.post("/api/login")
async def login(request: Request):
    status, payload, user = await run_in_threadpool(service.login, await read_json(request))
    if user is not None:
        request.session.clear()                       # a new session for every login
        request.session["user_id"] = user["user_id"]
        request.session["role"] = user["role"]
    return JSONResponse(payload, status_code=status)


@router.post("/api/logout")
async def logout(request: Request):
    request.session.clear()
    return JSONResponse({"ok": True})


@router.get("/api/me")
async def me(request: Request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return JSONResponse({"ok": False, "error": "not_logged_in"}, status_code=401)
    return JSONResponse({"ok": True, "user": {"role": request.session.get("role"),
                                              "home": service.HOME.get(request.session.get("role"), "/")}})


# ---------------------------------------------------------------- password reset

@router.post("/api/forgot")
async def forgot(request: Request):
    return answer(await run_in_threadpool(service.forgot, await read_json(request)))


@router.get("/api/reset/check")
async def reset_check(request: Request):
    return answer(await run_in_threadpool(service.check_reset, request.query_params.get("token", "")))


@router.post("/api/reset")
async def reset(request: Request):
    return answer(await run_in_threadpool(service.reset_password, await read_json(request)))


# ---------------------------------------------------------------- radiologist: find a patient by National ID
# The upload page calls this, shows the name to confirm, then saves the case with this patient_id
# (queries_cases.create_case(patient_id, uploaded_by=radiologist, source="radiologist", ...)).

@router.get("/api/patients/lookup")
async def patient_lookup(request: Request):
    if request.session.get("role") != "radiologist" or request.session.get("user_id") is None:
        return JSONResponse(NOT_ADMIN, status_code=403)
    return answer(await run_in_threadpool(
        service.find_patient, request.query_params.get("nationalId", ""), request.session["user_id"]))


# ---------------------------------------------------------------- admin: doctor / radiologist requests
# The admin page (admin-license-verification.html) will call these three.

@router.get("/api/admin/requests")
async def admin_requests(request: Request):
    if admin_id(request) is None:
        return JSONResponse(NOT_ADMIN, status_code=403)
    return answer(await run_in_threadpool(service.pending_requests))


async def decide(request, decision):
    admin = admin_id(request)
    if admin is None:
        return JSONResponse(NOT_ADMIN, status_code=403)
    try:
        user_id = int(request.path_params["user_id"])
    except (KeyError, ValueError):
        return JSONResponse({"ok": False, "error": "not_found"}, status_code=404)
    reason = (await read_json(request)).get("reason")
    return answer(await run_in_threadpool(service.decide_request, user_id, admin, decision, reason))


@router.post("/api/admin/requests/{user_id}/approve")
async def approve_request(request: Request):
    return await decide(request, "approved")


@router.post("/api/admin/requests/{user_id}/reject")
async def reject_request(request: Request):
    return await decide(request, "rejected")
