"""MUFSAL - doctor and admin dashboards, rendered on the server with Jinja."""
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from queries_dashboards import (get_admin_stats, get_doctor_approved,
                                get_doctor_pending, get_doctor_stats, get_user_name)
from routes_review import current_user, error_page, get_lang, templates
from texts_dashboards import DASH_TEXT

router = APIRouter()


def short_date(value, lang):
    """Nov 15, 2026 / 15 نوفمبر 2026"""
    if value is None:
        return ""
    month = DASH_TEXT[lang]["months"][value.month - 1]
    return f"{month} {value.day}, {value.year}" if lang == "en" else f"{value.day} {month} {value.year}"


def base_context(request):
    lang = get_lang(request)
    return {"lang": lang, "direction": "rtl" if lang == "ar" else "ltr", "t": DASH_TEXT[lang]}


@router.get("/dashboard-doctor")
def dashboard_doctor(request: Request):
    user = current_user(request)
    if user is None:
        return RedirectResponse("/login", status_code=303)
    if user["role"] != "doctor":
        return error_page(request, 403)

    ctx = base_context(request)
    lang = ctx["lang"]
    pending = [dict(row, date=short_date(row["submitted_at"], lang),
                    confidence_pct=int(round(float(row["confidence"]) * 100)) if row["confidence"] is not None else None)
               for row in get_doctor_pending(user["user_id"])]
    approved = [dict(row, date=short_date(row["approved_at"], lang))
                for row in get_doctor_approved(user["user_id"])]

    ctx.update(
        name=get_user_name(user["user_id"]),
        stats=get_doctor_stats(user["user_id"]),
        pending=pending,
        approved=approved,
    )
    return templates.TemplateResponse(request, "dashboard_doctor.html", ctx)


@router.get("/dashboard-admin")
def dashboard_admin(request: Request):
    user = current_user(request)
    if user is None:
        return RedirectResponse("/login", status_code=303)
    if user["role"] != "admin":
        return error_page(request, 403)

    ctx = base_context(request)
    ctx.update(stats=get_admin_stats())
    return templates.TemplateResponse(request, "dashboard_admin.html", ctx)
