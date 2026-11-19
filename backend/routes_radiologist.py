"""MUFSAL - the radiologist's "Start a new case" page.

    GET  /new-case-radiologist         the page: find the patient, upload the X-ray, answer, send
    GET  /new-case-radiologist/find    the search box: ?nationalId=...  -> the patient's name (JSON)
    POST /new-case-radiologist         saves the case for THAT patient (uploaded_by = the radiologist)

The patient must already have an account. The radiologist types the patient's National ID,
sees the name, confirms, and the case is linked to that patient. It then shows on the
patient's own pages with a note that a radiologist uploaded it.
The X-ray and the answers are checked by the same functions the patient page uses.
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from psycopg import errors as pg_errors
from starlette.concurrency import run_in_threadpool

import auth_service
from ai_analysis import analyze_case_later
from queries_cases import create_case
from queries_patient import get_open_case
from routes_new_case import (WARNINGS, XRAYS_DIR, CHOICES, check_answers,
                             check_file)

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")
router = APIRouter()

TYPED_FIELDS = list(CHOICES) + ["height_cm", "weight_kg", "medications", "other_symptoms"]


def radiologist_or_redirect(request: Request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return None, RedirectResponse("/login", status_code=303)
    if request.session.get("role") != "radiologist":
        return None, RedirectResponse("/", status_code=303)
    return user_id, None


def find_for_radiologist(national_id, radiologist_id):
    """(status, payload): the patient, plus whether they already have a case under review."""
    status, payload = auth_service.find_patient(national_id, radiologist_id)
    if status == 200:
        patient = payload["patient"]
        patient["hasOpenCase"] = get_open_case(patient["patientId"]) is not None
    return status, payload


def page(request, a=None, errors=None, file_error=None, patient=None, patient_error=None,
         open_step=1, save_failed=False, status_code=200):
    lang = "ar" if request.cookies.get("lang") == "ar" else "en"
    blank = {name: "" for name in TYPED_FIELDS}
    blank.update({w: False for w in WARNINGS + ("warning_none",)})
    blank.update(a or {})
    return templates.TemplateResponse(
        request, "radiologist/new-case.html",
        {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr",
         "a": blank, "errors": errors or set(), "file_error": file_error,
         "patient": patient, "patient_error": patient_error,
         "open_step": open_step, "save_failed": save_failed},
        status_code=status_code)


@router.get("/new-case-radiologist", include_in_schema=False)
def new_case_page(request: Request):
    _, redirect = radiologist_or_redirect(request)
    return redirect or page(request)


# the old buttons of the static radiologist page point here
@router.get("/new-case-step1", include_in_schema=False)
@router.get("/new-case-step1.html", include_in_schema=False)
def old_address(request: Request):
    return RedirectResponse("/new-case-radiologist", status_code=303)


@router.get("/new-case-radiologist/find", include_in_schema=False)
async def find_patient(request: Request):
    user_id, _ = radiologist_or_redirect(request)
    if user_id is None:
        return JSONResponse({"ok": False, "error": "forbidden"}, status_code=403)
    status, payload = await run_in_threadpool(
        find_for_radiologist, request.query_params.get("nationalId", ""), user_id)
    return JSONResponse(payload, status_code=status)


@router.post("/new-case-radiologist", include_in_schema=False)
async def submit(request: Request):
    user_id, redirect = radiologist_or_redirect(request)
    if redirect:
        return redirect

    form = await request.form()

    # The patient is looked up AGAIN here: the hidden box in the page can be changed by anyone.
    status, found = await run_in_threadpool(
        find_for_radiologist, form.get("patient_national_id") or "", user_id)
    typed = {name: (form.get(name) or "") for name in TYPED_FIELDS}
    typed.update({w: form.get(w) == "on" for w in WARNINGS + ("warning_none",)})
    if status != 200:
        return page(request, a=typed, patient_error=found.get("error", "patient_not_found"),
                    open_step=1, status_code=400)
    patient = found["patient"]
    patient["nationalId"] = (form.get("patient_national_id") or "").strip()
    if patient["hasOpenCase"]:
        return page(request, a=typed, patient=patient, patient_error="open_case",
                    open_step=1, status_code=400)

    data, ext, file_error = await check_file(form.get("xray_file"))
    answers, errors = check_answers(form)
    if file_error or errors:
        return page(request, a=typed, errors=errors, patient=patient,
                    file_error=file_error or "choose_again",
                    open_step=3 if errors else 2, status_code=400)

    XRAYS_DIR.mkdir(parents=True, exist_ok=True)
    stored = XRAYS_DIR / f"{uuid.uuid4().hex}{ext}"
    stored.write_bytes(data)

    history = dict(answers)
    # The question is optional, so "nothing written" is stored as NULL. The dash
    # belongs on the page that reads it, not in the column.
    history["medications"] = history["medications"] or None
    try:
        case_id = create_case(
            patient_id=patient["patientId"],
            uploaded_by=user_id,      # the radiologist, not the patient: that is what marks it as his upload
            xray_image_path=f"uploads/xrays/{stored.name}",
            history=history,
        )
    except (pg_errors.CheckViolation, pg_errors.NotNullViolation):
        stored.unlink(missing_ok=True)
        return page(request, a=answers, patient=patient, file_error="choose_again",
                    open_step=4, save_failed=True, status_code=400)
    # the knee model grades the X-ray in the background; the doctor sees the result a few seconds later
    analyze_case_later(case_id, stored)
    return RedirectResponse(f"/dashboard-radiologist?case_created={case_id}", status_code=303)


# =====================================================================
# The other radiologist pages (new design, real data)
#   GET  /dashboard-radiologist   welcome, "new case" button, numbers, 5 latest cases
#   GET  /radiologist-cases       all the cases this radiologist uploaded
#   GET  /profile-radiologist     the profile (email and phone can be changed)
#   POST /profile-radiologist
# =====================================================================
from typing import Optional

from fastapi import Form

from queries_profile import get_doctor_profile, update_contact
from queries_radiologist import get_radiologist_cases, get_radiologist_stats
from routes_profile import mask_national_id
from routes_dashboard import get_full_name
from texts_profile import PROFILE_TEXT
from texts_radiologist import MONTHS, RADIOLOGIST_TEXT

RECENT_LIMIT = 5


def _lang(request):
    return "ar" if request.cookies.get("lang") == "ar" else "en"


def _case_rows(radiologist_id, lang, limit=None):
    rows = get_radiologist_cases(radiologist_id, limit)
    return [dict(r, date=f"{r['submitted_at'].day} {MONTHS[lang][r['submitted_at'].month - 1]} {r['submitted_at'].year}")
            for r in rows]


@router.get("/dashboard-radiologist", include_in_schema=False)
def dashboard(request: Request, case_created: Optional[int] = None):
    user_id, redirect = radiologist_or_redirect(request)
    if redirect:
        return redirect
    lang = _lang(request)
    return templates.TemplateResponse(
        request, "radiologist/dashboard.html",
        {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr",
         "t": RADIOLOGIST_TEXT[lang],
         "name": get_full_name(user_id).split(" ")[0],
         "stats": get_radiologist_stats(user_id),
         "cases": _case_rows(user_id, lang, RECENT_LIMIT),
         "created": case_created})


@router.get("/radiologist-cases", include_in_schema=False)
def all_cases(request: Request):
    user_id, redirect = radiologist_or_redirect(request)
    if redirect:
        return redirect
    lang = _lang(request)
    return templates.TemplateResponse(
        request, "radiologist/cases.html",
        {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr",
         "t": RADIOLOGIST_TEXT[lang], "cases": _case_rows(user_id, lang)})


@router.get("/profile-radiologist", include_in_schema=False)
def profile(request: Request, saved: Optional[int] = None, error: Optional[str] = None):
    user_id, redirect = radiologist_or_redirect(request)
    if redirect:
        return redirect
    lang = _lang(request)
    t = PROFILE_TEXT[lang]
    data = get_doctor_profile(user_id)
    message, message_ok = None, True
    if saved:
        message = t["saved_msg"]
    elif error in t["err"]:
        message, message_ok = t["err"][error], False
    return templates.TemplateResponse(
        request, "radiologist/profile.html",
        {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr", "t": t,
         "profile": data, "masked_id": mask_national_id(data["national_id"]),
         "message": message, "message_ok": message_ok})


@router.post("/profile-radiologist", include_in_schema=False)
def save_profile(request: Request, email: str = Form(...), phone: str = Form(...)):
    user_id, redirect = radiologist_or_redirect(request)
    if redirect:
        return redirect
    result = update_contact(user_id, email, phone)
    if isinstance(result, dict):
        return RedirectResponse(f"/profile-radiologist?error={result['error']}", status_code=303)
    return RedirectResponse("/profile-radiologist?saved=1", status_code=303)
