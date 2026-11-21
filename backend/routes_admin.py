"""MUFSAL - API of the administrator pages (JSON).

Used by static/js/dashboard-admin.js. Only a logged-in admin gets an answer (403 otherwise).

    GET    /api/admin/summary                    the numbers on the dashboard
    GET    /api/admin/delayed                    delayed reports (+ what happened on each case)
    GET    /api/admin/doctors                    doctors who can take a case, fewest open cases first
    POST   /api/admin/delayed/{id}/reassign      {"doctor_id": 5}
    POST   /api/admin/delayed/{id}/handled       close the report without moving the case
    GET    /api/admin/license-requests           registrations AND renewals waiting (kind says which)
    POST   /api/admin/license-requests/{id}/approve
    POST   /api/admin/license-requests/{id}/reject   {"reason": "..."}
    GET    /api/admin/decisions                  decision history (kind: registration | renewal)
    GET    /api/admin/accounts                   active doctor / radiologist accounts
    DELETE /api/admin/accounts/{id}              close an account (its open cases move to the doctor with the fewest)
    GET    /api/admin/deletion-requests          accounts that asked to be closed
    POST   /api/admin/deletion-requests/{id}/approve   close it
    POST   /api/admin/deletion-requests/{id}/decline   keep it open
    GET    /api/admin/support                    support requests (pending first)
    POST   /api/admin/support/{id}/respond    {"reply": "..."}  saves the answer: -> resolved (automatic)
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

import queries_admin as db
from queries_delays import reassign_case
from routes_auth import admin_id, read_json

router = APIRouter()

FORBIDDEN = JSONResponse({"ok": False, "error": "forbidden"}, status_code=403)


def _jsonable(row):
    out = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            v = v.isoformat()
        elif isinstance(v, list):
            v = [_jsonable(x) if isinstance(x, dict) else x for x in v]
        out[k] = v
    return out


def _int(request, name):
    try:
        return int(request.path_params[name])
    except (KeyError, ValueError):
        return None


def _not_found():
    return JSONResponse({"ok": False, "error": "not_found"}, status_code=404)


async def _list(request, func, key):
    if admin_id(request) is None:
        return FORBIDDEN
    rows = await run_in_threadpool(func)
    return {"ok": True, key: [_jsonable(r) for r in rows]}


@router.get("/api/admin/summary")
async def summary(request: Request):
    if admin_id(request) is None:
        return FORBIDDEN
    return {"ok": True, **await run_in_threadpool(db.get_summary)}


# ---------------------------------------------------------------- delayed requests

@router.get("/api/admin/delayed")
async def delayed(request: Request):
    return await _list(request, db.list_delayed, "delayed")


@router.get("/api/admin/doctors")
async def doctors(request: Request):
    return await _list(request, db.list_doctors, "doctors")


@router.post("/api/admin/delayed/{delay_id}/reassign")
async def reassign(request: Request):
    admin = admin_id(request)
    if admin is None:
        return FORBIDDEN
    delay_id = _int(request, "delay_id")
    try:
        doctor_id = int((await read_json(request)).get("doctor_id"))
    except (TypeError, ValueError):
        return JSONResponse({"ok": False, "error": "doctor_required"}, status_code=400)
    complaint = await run_in_threadpool(db.get_delay_complaint, delay_id) if delay_id else None
    if complaint is None:
        return _not_found()
    result = await run_in_threadpool(reassign_case, complaint["case_id"], doctor_id, admin)
    if result is not True:
        return JSONResponse({"ok": False, **result}, status_code=400)
    return {"ok": True}


@router.post("/api/admin/delayed/{delay_id}/handled")
async def handled(request: Request):
    admin = admin_id(request)
    if admin is None:
        return FORBIDDEN
    delay_id = _int(request, "delay_id")
    if not delay_id or not await run_in_threadpool(db.mark_delay_handled, delay_id, admin):
        return _not_found()
    return {"ok": True}


# ---------------------------------------------------------------- medical license verification

@router.get("/api/admin/decisions")
async def decisions(request: Request):
    return await _list(request, db.list_decisions, "decisions")


@router.get("/api/admin/accounts")
async def accounts(request: Request):
    return await _list(request, db.list_active_accounts, "accounts")


def _closed(result):
    if result.get("error") == "not_found":
        return _not_found()
    if "error" in result:
        return JSONResponse({"ok": False, **result}, status_code=409)
    return {"ok": True, **result}


@router.delete("/api/admin/accounts/{user_id}")
async def close_account(request: Request):
    """Close an account. Nothing is removed - see queries_admin.close_account."""
    admin = admin_id(request)
    if admin is None:
        return FORBIDDEN
    user_id = _int(request, "user_id")
    if not user_id:
        return _not_found()
    return _closed(await run_in_threadpool(db.close_account, user_id, admin))


# ---------------------------------------------------------------- licence requests (registration + renewal)

@router.get("/api/admin/license-requests")
async def license_requests(request: Request):
    return await _list(request, db.list_license_requests, "requests")


async def _decide(request, decision):
    admin = admin_id(request)
    if admin is None:
        return FORBIDDEN
    user_id = _int(request, "user_id")
    reason = None
    if decision == "rejected":
        reason = ((await read_json(request)).get("reason") or "").strip()
        if not reason:
            return JSONResponse({"ok": False, "error": "reason_required"}, status_code=400)
    if not user_id:
        return _not_found()
    result = await run_in_threadpool(db.decide_license_request, user_id, admin, decision, reason)
    if result is True:
        return {"ok": True}
    return _closed(result)


@router.post("/api/admin/license-requests/{user_id}/approve")
async def approve_license(request: Request):
    return await _decide(request, "approved")


@router.post("/api/admin/license-requests/{user_id}/reject")
async def reject_license(request: Request):
    return await _decide(request, "rejected")


# ---------------------------------------------------------------- account-deletion requests

@router.get("/api/admin/deletion-requests")
async def deletion_requests(request: Request):
    return await _list(request, db.list_deletion_requests, "requests")


@router.post("/api/admin/deletion-requests/{user_id}/approve")
async def approve_deletion(request: Request):
    admin = admin_id(request)
    if admin is None:
        return FORBIDDEN
    user_id = _int(request, "user_id")
    if not user_id:
        return _not_found()
    return _closed(await run_in_threadpool(db.close_account, user_id, admin))


@router.post("/api/admin/deletion-requests/{user_id}/decline")
async def decline_deletion(request: Request):
    if admin_id(request) is None:
        return FORBIDDEN
    user_id = _int(request, "user_id")
    if not user_id or not await run_in_threadpool(db.decline_deletion, user_id):
        return _not_found()
    return {"ok": True}


# ---------------------------------------------------------------- support messages

@router.get("/api/admin/support")
async def support_requests(request: Request):
    return await _list(request, db.list_support_requests, "support")


@router.post("/api/admin/support/{request_id}/respond")
async def respond(request: Request):
    admin = admin_id(request)
    if admin is None:
        return FORBIDDEN
    request_id = _int(request, "request_id")
    data = await read_json(request)
    reply = (data.get("reply") or "").strip()
    if not reply:                        # the reply is what resolves the complaint, so it cannot be empty
        return JSONResponse({"ok": False, "error": "reply_required"}, status_code=400)
    if len(reply) > 2000:
        return JSONResponse({"ok": False, "error": "reply_too_long"}, status_code=400)
    if not request_id or not await run_in_threadpool(db.respond_to_request, request_id, admin, reply):
        return _not_found()
    return {"ok": True, "status": "resolved"}
