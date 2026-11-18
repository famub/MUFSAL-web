"""MUFSAL - sends e-mail (the password-reset link).

Settings come from .env (see env.example). If SMTP_HOST is not set, nothing is sent and the
reset link is only printed in the server window (and shown on the page when DEV_LOGIN=1).

Two ways to send (the first one that is set up is used):
 1. BREVO_API_KEY (+ MAIL_FROM)  - sends over HTTPS. Use this on Render's free plan, which blocks SMTP.
 2. SMTP_HOST ...                - any SMTP service. For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587 and an
    "App password" (Google account -> Security -> 2-Step Verification -> App passwords) as SMTP_PASSWORD.
"""
import json
import os
import smtplib
import ssl
import threading
import urllib.request
from email.message import EmailMessage


def _use_api():
    return bool(os.getenv("BREVO_API_KEY") and (os.getenv("MAIL_FROM") or os.getenv("SMTP_FROM") or os.getenv("SMTP_USER")))


def is_configured():
    return _use_api() or bool(os.getenv("SMTP_HOST") and (os.getenv("SMTP_FROM") or os.getenv("SMTP_USER")))


def _sender():
    return os.getenv("MAIL_FROM") or os.getenv("SMTP_FROM") or os.getenv("SMTP_USER")


def app_url():
    """The public address of the site, used to build the link inside the e-mail."""
    return (os.getenv("APP_URL") or "http://127.0.0.1:8000").rstrip("/")


def build_reset_message(to_email, name, link):
    sender = _sender()
    msg = EmailMessage()
    msg["Subject"] = "MUFSAL - Reset your password | إعادة تعيين كلمة المرور"
    msg["From"] = f"MUFSAL <{sender}>"
    msg["To"] = to_email
    name = name or ""
    msg.set_content(
        f"Hello {name},\n\n"
        "We received a request to reset your MUFSAL password. Open this link to choose a new one "
        "(it works once and expires in 1 hour):\n"
        f"{link}\n\n"
        "If you did not ask for this, you can ignore this e-mail; your password stays the same.\n\n"
        "------------------------------\n\n"
        f"مرحبًا {name}،\n\n"
        "وصلنا طلب لإعادة تعيين كلمة مرور حسابك في مفصل. افتح الرابط التالي لاختيار كلمة مرور جديدة "
        "(يعمل مرة واحدة وتنتهي صلاحيته بعد ساعة):\n"
        f"{link}\n\n"
        "إذا لم تطلب ذلك فتجاهل هذه الرسالة، وستبقى كلمة مرورك كما هي.\n"
    )
    return msg


def _send_api(msg):
    """Send through Brevo's HTTPS API (no SMTP port needed)."""
    to_email = msg["To"]
    sender = _sender()
    body = {
        "sender": {"name": "MUFSAL", "email": sender},
        "to": [{"email": to_email}],
        "subject": msg["Subject"],
        "textContent": msg.get_content(),
    }
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(body).encode("utf-8"),
        headers={"api-key": os.getenv("BREVO_API_KEY"), "content-type": "application/json",
                 "accept": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        resp.read()


def _send(msg):
    if _use_api():
        return _send_api(msg)
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT") or 587)
    security = (os.getenv("SMTP_SECURITY") or ("ssl" if port == 465 else "starttls")).lower()
    user, password = os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD")
    context = ssl.create_default_context()
    if security == "ssl":
        server = smtplib.SMTP_SSL(host, port, timeout=15, context=context)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
    with server:
        if security == "starttls":
            server.starttls(context=context)
        if user and password:
            server.login(user, password)
        server.send_message(msg)


def send_reset_link(to_email, name, path):
    """Send the reset link in the background (the page does not wait, and the answer time
    does not tell anyone whether the e-mail is registered). Returns False if mail is not set up."""
    if not is_configured():
        return False
    msg = build_reset_message(to_email, name, app_url() + path)

    def work():
        try:
            _send(msg)
        except Exception as exc:                      # a mail problem must never break the site
            print(f"[mail] could not send to {to_email}: {exc}")

    threading.Thread(target=work, daemon=True).start()
    return True
