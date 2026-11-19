"""MUFSAL - API of the administrator pages (JSON).

Used by static/js/dashboard-admin.js. Only a logged-in admin gets an answer (403 otherwise).
Registration requests (list / approve / reject) are in routes_auth.py: GET /api/admin/requests ...

    GET    /api/admin/summary                    the 3 numbers on the dashboard
    GET    /api/admin/delayed                    delayed requests (+ what happened on each case)
    GET    /api/admin/doctors                    approved doctors (reassign dialog)
    POST   /api/admin/delayed/{id}/reassign      {"doctor_id": 5}
    POST   /api/admin/delayed/{id}/handled       close the complaint without moving the case
    GET    /api/admin/decisions                  decision history
    GET    /api/admin/accounts                   active doctor / radiologist accounts
    DELETE /api/admin/accounts/{id}              delete an account
    GET    /api/admin/complaints                 general complaints
    POST   /api/admin/complaints/{id}/seen       the admin opened it: open -> investigating (automatic)
    POST   /api/admin/complaints/{id}/respond    {"reply": "..."}  saves the reply: -> resolved (automatic)
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


@router.delete("/api/admin/accounts/{user_id}")
async def delete_account(request: Request):
    if admin_id(request) is None:
        return FORBIDDEN
    user_id = _int(request, "user_id")
    if not user_id or not await run_in_threadpool(db.delete_professional_account, user_id):
        return _not_found()
    return {"ok": True}


# ---------------------------------------------------------------- general complaints

@router.get("/api/admin/complaints")
async def complaints(request: Request):
    return await _list(request, db.list_complaints, "complaints")


@router.post("/api/admin/complaints/{complaint_id}/respond")
async def respond(request: Request):
    admin = admin_id(request)
    if admin is None:
        return FORBIDDEN
    complaint_id = _int(request, "complaint_id")
    data = await read_json(request)
    reply = (data.get("reply") or "").strip()
    if not reply:                        # the reply is what resolves the complaint, so it cannot be empty
        return JSONResponse({"ok": False, "error": "reply_required"}, status_code=400)
    if len(reply) > 2000:
        return JSONResponse({"ok": False, "error": "reply_too_long"}, status_code=400)
    if not complaint_id or not await run_in_threadpool(db.respond_to_complaint, complaint_id, admin, reply):
        return _not_found()
    return {"ok": True, "status": "resolved"}


@router.post("/api/admin/complaints/{complaint_id}/seen")
async def seen(request: Request):
    """The admin opened the details of a complaint: a new one ('open') becomes 'investigating'."""
    if admin_id(request) is None:
        return FORBIDDEN
    complaint_id = _int(request, "complaint_id")
    status = await run_in_threadpool(db.mark_complaint_seen, complaint_id) if complaint_id else None
    if status is None:
        return _not_found()
    return {"ok": True, "status": status}
