"""MUFSAL - "Start a new case" for patients: ONE page, ONE form.

    GET  /new-case   shows the page (the 3 steps are switched by JavaScript in the page)
    POST /new-case   receives the X-ray + all the answers at once, checks them,
                     saves the X-ray in uploads/xrays/ and creates the case

create_case() (queries_cases.py) saves the case and its medical history and assigns
it to the doctor with the fewest open cases.
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from psycopg import errors as pg_errors
from starlette.datastructures import UploadFile

from queries_cases import create_case, get_patient_cases
from routes_dashboard import get_lang
from texts_new_case import NEW_CASE_TEXT

router = APIRouter()
BACKEND_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=BACKEND_DIR / "templates")

XRAYS_DIR = BACKEND_DIR / "uploads" / "xrays"
MAX_BYTES = 20 * 1024 * 1024                      # 20 MB

# The first bytes of a file tell its real type, whatever its name says.
FILE_SIGNATURES = {
    b"\x89PNG\r\n\x1a\n": ".png",
    b"\xff\xd8\xff": ".jpg",
}

# Allowed answers, exactly as the database stores them (see schema.sql, case_history)
CHOICES = {
    "knee": ("right", "left"),
    "pain_with_use": ("yes", "no"),
    "rising_difficulty": ("none", "mild", "moderate", "severe", "extreme"),
    "stiffness_duration": ("none", "le30", "gt30"),
    "stairs_pain": ("none", "mild", "moderate", "severe", "extreme"),
    "prior_injury": ("yes", "no"),
}
WARNINGS = ("warning_injury", "warning_hot_swollen", "warning_fever",
            "warning_rapid_worsening", "warning_night_pain")
HEIGHT_RANGE = (50, 270)   # same as history_height_range in schema.sql
WEIGHT_RANGE = (10, 600)    # same as history_weight_range
TEXT_MAX = 500              # medications / other symptoms


# ---------------------------------------------------------------- helpers

def patient_or_redirect(request):
    """Return (user_id, None) for a patient who may start a case, or (None, redirect)."""
    user_id = request.session.get("user_id")
    if user_id is None:
        return None, RedirectResponse("/login", status_code=303)
    if request.session.get("role") != "patient":
        return None, RedirectResponse("/", status_code=303)
    # One case under review at a time - the same rule as the dashboard
    if any(c["status"] == "under_review" for c in get_patient_cases(user_id)):
        return None, RedirectResponse("/dashboard-patient", status_code=303)
    return user_id, None


async def check_file(upload):
    """Return (bytes, extension, None) for a good X-ray, or (None, None, error_code)."""
    if not isinstance(upload, UploadFile) or not upload.filename:
        return None, None, "no_file"
    data = await upload.read(MAX_BYTES + 1)
    if not data:
        return None, None, "no_file"
    if len(data) > MAX_BYTES:
        return None, None, "too_big"
    for signature, ext in FILE_SIGNATURES.items():
        if data.startswith(signature):
            return data, ext, None
    return None, None, "bad_type"


def check_answers(form):
    """Turn the form into case_history values. Returns (answers, set of wrong question names)."""
    answers, errors = {}, set()

    for name, allowed in CHOICES.items():
        value = (form.get(name) or "").strip()
        if value in allowed:
            answers[name] = value
        else:
            errors.add(name)

    for name, (low, high) in (("height_cm", HEIGHT_RANGE), ("weight_kg", WEIGHT_RANGE)):
        try:
            number = float((form.get(name) or "").strip())
        except ValueError:
            number = None
        if number is None or not low <= number <= high:
            errors.add(name)
        else:
            answers[name] = int(round(number)) if name == "height_cm" else round(number, 2)

    # Warning signs: tick some of the five, or tick "none" - not both, and not nothing
    ticked = [w for w in WARNINGS if form.get(w) == "on"]
    none_ticked = form.get("warning_none") == "on"
    if (not ticked and not none_ticked) or (ticked and none_ticked):
        errors.add("warnings")
    for w in WARNINGS:
        answers[w] = w in ticked

    for name in ("medications", "other_symptoms"):
        text = (form.get(name) or "").strip()
        if len(text) > TEXT_MAX:
            errors.add(name)
        answers[name] = text

    return answers, errors


def render(request, status_code=200, a=None, errors=None, file_error=None, open_step=1,
           save_failed=False):
    lang = get_lang(request)
    return templates.TemplateResponse(
        request, "new-case.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": NEW_CASE_TEXT[lang],
            "home_url": "/dashboard-patient",
            "a": a or {},                  # what the patient typed (to fill the form again)
            "errors": errors or set(),     # names of the wrong questions (shown in red)
            "file_error": file_error,      # problem with the X-ray file, or None
            "open_step": open_step,        # which step the page opens on
            "save_failed": save_failed,
        },
        status_code=status_code,
    )


# ---------------------------------------------------------------- the page

@router.get("/new-case", include_in_schema=False)
def new_case_page(request: Request):
    _, redirect = patient_or_redirect(request)
    if redirect:
        return redirect
    return render(request)


@router.post("/new-case", include_in_schema=False)
async def submit_new_case(request: Request):
    user_id, redirect = patient_or_redirect(request)   # also stops a 2nd case (double click)
    if redirect:
        return redirect

    # ---- check everything on the server (the page's JavaScript can be bypassed) ----
    form = await request.form()
    data, ext, file_error = await check_file(form.get("xray_file"))
    answers, errors = check_answers(form)

    if file_error or errors:
        # The browser cannot put the chosen file back into the form, so when the
        # answers are wrong the patient must choose the X-ray again.
        typed = {k: (form.get(k) or "") for k in
                 list(CHOICES) + ["height_cm", "weight_kg", "medications", "other_symptoms"]}
        typed.update({w: form.get(w) == "on" for w in WARNINGS + ("warning_none",)})
        return render(request, 400, a=typed, errors=errors,
                      file_error=file_error or "choose_again",
                      open_step=2 if errors else 1)

    # ---- save the X-ray, then the case ----
    XRAYS_DIR.mkdir(parents=True, exist_ok=True)
    file = XRAYS_DIR / f"{uuid.uuid4().hex}{ext}"       # never trust the patient's file name
    file.write_bytes(data)

    history = dict(answers)
    # The question is optional, so "nothing written" is stored as NULL. The dash
    # belongs on the page that reads it, not in the column.
    history["medications"] = history["medications"] or None

    try:
        case_id = create_case(
            patient_id=user_id,
            uploaded_by=user_id,      # the patient herself, so the case counts as hers
            xray_image_path=f"uploads/xrays/{file.name}",     # same style as seed.sql
            history=history,
        )
    except (pg_errors.CheckViolation, pg_errors.NotNullViolation):
        file.unlink(missing_ok=True)
        return render(request, 400, a=answers, file_error="choose_again",
                      open_step=3, save_failed=True)

    # TODO (AI teammate): run the knee model on `file` here, then call
    # save_ai_result(case_id, grade, confidence, probabilities, priority, gradcam_path)
    # from queries_cases.py. Until then the doctor sees "AI analysis not ready yet".

    return RedirectResponse(f"/dashboard-patient?case_created={case_id}", status_code=303)
