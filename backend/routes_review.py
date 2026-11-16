"""MUFSAL - doctor case review (review-case), the report page (view-report) and their images.

Pages rendered on the server with Jinja. The logged-in user comes from the
server session: request.session["user_id"] and request.session["role"]
(set by the login page).
"""
import os
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Form, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from psycopg import errors

from db import get_connection
from queries_cases import approve_case, get_case
from texts_report import REPORT_TEXT
from texts_review import TEXT

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

UPLOADS_DIR = (Path(__file__).parent / "uploads").resolve()


# ---------------------------------------------------------------- helpers

def get_lang(request):
    """Page language from the 'lang' cookie (English by default)."""
    return "ar" if request.cookies.get("lang") == "ar" else "en"


def current_user(request):
    """The logged-in user from the session, or None."""
    user_id = request.session.get("user_id")
    role = request.session.get("role")
    if user_id is None or role is None:
        return None
    return {"user_id": user_id, "role": role}


def can_view_case(user, case):
    """Who may open a case: its doctor, its patient, or the radiologist who uploaded it."""
    if user["role"] == "doctor":
        return case["assigned_doctor_id"] == user["user_id"]
    if user["role"] == "patient":
        return case["patient_id"] == user["user_id"]
    if user["role"] == "radiologist":
        return case["source"] == "radiologist" and case["uploaded_by"] == user["user_id"]
    return False


def format_date(value, lang):
    """15 Nov 2026 / 15 نوفمبر 2026"""
    if value is None:
        return ""
    return f"{value.day} {TEXT[lang]['months'][value.month - 1]} {value.year}"


def age_from(date_of_birth):
    if date_of_birth is None:
        return None
    today = date.today()
    return today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day))


def history_sections(history, lang):
    """Turn the case_history row into question/answer sections for the page."""
    t = TEXT[lang]
    if history is None:
        return []

    warnings = [label for column, label in t["warnings"].items() if history[column]]
    height = history["height_cm"]
    weight = float(history["weight_kg"])
    bmi = round(weight / (height / 100) ** 2, 1)

    return [
        (t["sec_knee"], [
            (t["h_knee"], t["knee"][history["knee"]]),
        ]),
        (t["sec_screening"], [
            (t["h_pain_with_use"], t["yes_no"][history["pain_with_use"]]),
            (t["h_stiffness"], t["stiffness"][history["stiffness_duration"]]),
        ]),
        (t["sec_severity"], [
            (t["h_stairs"], t["severity"][history["stairs_pain"]]),
            (t["h_rising"], t["severity"][history["rising_difficulty"]]),
        ]),
        (t["sec_warnings"], [
            (t["h_warnings"], t["list_sep"].join(warnings) if warnings else t["none_of_these"]),
        ]),
        (t["sec_risk"], [
            (t["h_body"], f"{height} {t['cm']} / {weight:g} {t['kg']} - {t['bmi']} {bmi}"),
            (t["h_prior"], t["yes_no"][history["prior_injury"]]),
        ]),
        (t["sec_other"], [
            (t["h_medications"], history["medications"]),
            (t["h_other"], history["other_symptoms"] or "-"),
        ]),
    ]


def error_page(request, status_code):
    """Simple 403 / 404 page."""
    return templates.TemplateResponse(
        request, "error.html",
        {"lang": get_lang(request), "status_code": status_code},
        status_code=status_code,
    )


def safe_upload_path(relative_path):
    """Return the file inside the uploads folder, or None if the path leaves it."""
    if not relative_path:
        return None
    full = (Path(__file__).parent / relative_path).resolve()
    if UPLOADS_DIR not in full.parents:
        return None
    return full


def render_review(request, case, final_grade=None, notes="", errors_=None, status_code=200):
    lang = get_lang(request)
    ai = case["ai_result"]
    xray_file = safe_upload_path(case["xray_image_path"])
    gradcam_file = safe_upload_path(ai["gradcam_image_path"]) if ai else None

    if final_grade is None and ai is not None:
        final_grade = ai["predicted_grade"]

    probabilities = []
    if ai is not None:
        probabilities = [float(ai[f"prob_grade_{i}"]) for i in range(5)]

    return templates.TemplateResponse(
        request, "review_case.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": TEXT[lang],
            "case": case,
            "ai": ai,
            "probabilities": probabilities,
            "has_xray": xray_file is not None and xray_file.is_file(),
            "has_gradcam": gradcam_file is not None and gradcam_file.is_file(),
            "submitted": format_date(case["submitted_at"], lang),
            "age": age_from(case["date_of_birth"]),
            "history": history_sections(case["history"], lang),
            "final_grade": final_grade,
            "notes": notes,
            "errors": errors_ or {},
        },
        status_code=status_code,
    )


def generate_reports(case, final_grade, doctor_notes):
    """TEMPORARY: returns (report_ar, report_en).

    TODO: replace with the Gemini call that writes the simplified report.
    """
    en = TEXT["en"]["kl"][final_grade]
    ar = TEXT["ar"]["kl"][final_grade]
    return (
        f"نتيجة أشعة الركبة: الدرجة KL{final_grade} ({ar}). راجع طبيبك لأي استفسار.",
        f"Your knee X-ray result: KL{final_grade} ({en}). Talk to your doctor if you have questions.",
    )


# ---------------------------------------------------------------- pages

@router.get("/cases/{case_id}/review")
def review_case_page(request: Request, case_id: int):
    user = current_user(request)
    if user is None:
        return RedirectResponse("/login", status_code=303)
    if user["role"] != "doctor":
        return error_page(request, 403)

    case = get_case(case_id)
    if case is None:
        return error_page(request, 404)
    if not can_view_case(user, case):
        return error_page(request, 403)
    if case["status"] == "approved":
        return RedirectResponse(f"/cases/{case_id}/report", status_code=303)

    return render_review(request, case)


@router.post("/cases/{case_id}/review")
def confirm_case(request: Request, case_id: int,
                 final_grade: str = Form(""), notes: str = Form("")):
    user = current_user(request)
    if user is None:
        return RedirectResponse("/login", status_code=303)
    if user["role"] != "doctor":
        return error_page(request, 403)

    case = get_case(case_id)
    if case is None:
        return error_page(request, 404)
    if not can_view_case(user, case):
        return error_page(request, 403)
    if case["status"] == "approved" or case["ai_result"] is None:
        return RedirectResponse(f"/cases/{case_id}/review", status_code=303)

    # ---- validate on the server ----
    t = TEXT[get_lang(request)]
    notes = notes.strip()
    form_errors = {}
    if final_grade not in ("0", "1", "2", "3", "4"):
        form_errors["grade"] = t["err_grade"]
        grade = None
    else:
        grade = int(final_grade)
    if not notes:
        form_errors["notes"] = t["err_notes"]

    if form_errors:
        return render_review(request, case, final_grade=grade, notes=notes,
                             errors_=form_errors, status_code=400)

    # ---- save ----
    report_ar, report_en = generate_reports(case, grade, notes)
    try:
        approve_case(case_id, user["user_id"], grade, notes, report_ar, report_en)
    except errors.UniqueViolation:
        pass  # the form was sent twice: the report already exists

    return RedirectResponse(f"/cases/{case_id}/report?confirmed=1", status_code=303)


@router.get("/cases/{case_id}/report")
def view_report(request: Request, case_id: int, confirmed: int = 0):
    """The report page: the case's doctor, its patient, or the radiologist who uploaded it.

    Under review: only "your report is not ready yet" (NFR-R1) - the doctor gets a
    button to the review page instead. Approved: the simplified report in the page's
    language, plus a clinical summary for the doctor.
    """
    from auth_service import HOME   # where the logo and the back link go, per role

    user = current_user(request)
    if user is None:
        return RedirectResponse("/login", status_code=303)

    case = get_case(case_id)
    if case is None:
        return error_page(request, 404)
    if not can_view_case(user, case):
        return error_page(request, 403)

    lang = get_lang(request)
    report = case["report"]
    ai = case["ai_result"]
    approved = case["status"] == "approved" and report is not None

    report_text, confidence = None, None
    has_xray = has_gradcam = False
    if approved:
        report_text = report["report_ar"] if lang == "ar" else report["report_en"]
        if ai is not None:
            confidence = round(float(ai["confidence"]) * 100)
        xray_file = safe_upload_path(case["xray_image_path"])
        gradcam_file = safe_upload_path(ai["gradcam_image_path"]) if ai else None
        has_xray = xray_file is not None and xray_file.is_file()
        has_gradcam = gradcam_file is not None and gradcam_file.is_file()

    def long_date(value):
        """15 November 2026 / 15 نوفمبر 2026"""
        if value is None:
            return ""
        return f"{value.day} {REPORT_TEXT[lang]['months'][value.month - 1]} {value.year}"

    return templates.TemplateResponse(
        request, "view_report.html",
        {
            "lang": lang,
            "direction": "rtl" if lang == "ar" else "ltr",
            "t": REPORT_TEXT[lang],
            "role": user["role"],
            "home": HOME.get(user["role"], "/"),
            "case": case,
            "approved": approved,
            "report": report,
            "ai": ai,
            "report_text": report_text,
            "confidence": confidence,
            "has_xray": has_xray,
            "has_gradcam": has_gradcam,
            "submitted": long_date(case["submitted_at"]),
            "approved_on": long_date(report["approved_at"]) if report else "",
            # the green "Result confirmed" banner: only for the doctor who just confirmed
            "confirmed": bool(confirmed) and user["role"] == "doctor" and approved,
        },
    )


@router.get("/cases/{case_id}/image/{kind}")
def case_image(request: Request, case_id: int, kind: str):
    """The X-ray ('xray') or the Grad-CAM heatmap ('gradcam'), only for allowed users."""
    user = current_user(request)
    if user is None:
        return error_page(request, 403)

    case = get_case(case_id)
    if case is None or kind not in ("xray", "gradcam"):
        return error_page(request, 404)
    if not can_view_case(user, case):
        return error_page(request, 403)

    if kind == "xray":
        path = case["xray_image_path"]
    else:
        # NFR-R1: patient / radiologist see the heatmap only after the doctor approved
        if case["ai_result"] is None or (user["role"] != "doctor" and case["status"] != "approved"):
            return error_page(request, 404)
        path = case["ai_result"]["gradcam_image_path"]

    file = safe_upload_path(path)
    if file is None or not file.is_file():
        return error_page(request, 404)
    return FileResponse(file, headers={"Cache-Control": "private, no-store"})


@router.get("/set-lang")
def set_lang(lang: str = "en", next: str = "/"):
    """Language button in the header: save the choice in a cookie and go back."""
    if not next.startswith("/") or next.startswith("//"):
        next = "/"
    response = RedirectResponse(next, status_code=303)
    response.set_cookie("lang", "ar" if lang == "ar" else "en",
                        max_age=60 * 60 * 24 * 365, samesite="lax")
    return response


# ---------------------------------------------------------------- testing only
# DELETE THIS when the team's real login is ready.
# Works only when DEV_LOGIN=1 is in the .env file.

@router.get("/dev/login-as/{user_id}")
def dev_login_as(request: Request, user_id: int):
    if os.getenv("DEV_LOGIN") != "1":
        return error_page(request, 404)
    with get_connection() as conn:
        user = conn.execute(
            "SELECT user_id, role FROM users WHERE user_id = %s", (user_id,)
        ).fetchone()
    if user is None:
        return error_page(request, 404)
    request.session["user_id"] = user["user_id"]
    request.session["role"] = user["role"]
    return {"logged_in_as": user}