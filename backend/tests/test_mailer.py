"""The password-reset e-mail: built correctly, sent through a real (local) SMTP exchange,
never breaks the site, and the answer of /forgot never changes."""
import socketserver
import threading
import time

import pytest

import mailer
import auth_service as svc
import fake_queries as fq


class _Smtp(socketserver.StreamRequestHandler):
    """A tiny SMTP server that keeps the message it receives."""
    inbox = []

    def handle(self):
        w = lambda s: self.wfile.write((s + "\r\n").encode())
        w("220 test")
        data, reading = [], False
        while True:
            line = self.rfile.readline().decode(errors="replace")
            if not line:
                return
            if reading:
                if line.strip() == ".":
                    reading = False
                    _Smtp.inbox.append("".join(data))
                    w("250 ok")
                else:
                    data.append(line)
                continue
            cmd = line.strip().upper()
            if cmd.startswith("EHLO") or cmd.startswith("HELO"):
                w("250 test")
            elif cmd.startswith("DATA"):
                w("354 go"); reading = True
            elif cmd.startswith("QUIT"):
                w("221 bye"); return
            else:
                w("250 ok")


@pytest.fixture
def smtp_server(monkeypatch):
    _Smtp.inbox.clear()
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), _Smtp)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    monkeypatch.setenv("SMTP_HOST", "127.0.0.1")
    monkeypatch.setenv("SMTP_PORT", str(srv.server_address[1]))
    monkeypatch.setenv("SMTP_SECURITY", "none")
    monkeypatch.setenv("SMTP_FROM", "mufsal@test.com")
    monkeypatch.setenv("APP_URL", "https://mufsal.example")
    yield _Smtp.inbox
    srv.shutdown()


def _wait(inbox):
    for _ in range(50):
        if inbox:
            return
        time.sleep(0.1)


def test_not_configured_sends_nothing(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    assert mailer.send_reset_link("a@b.com", "A", "/reset-password.html?token=x") is False


def test_message_has_full_link_in_both_languages(monkeypatch):
    monkeypatch.setenv("SMTP_FROM", "mufsal@test.com")
    msg = mailer.build_reset_message("a@b.com", "Sarah", "https://mufsal.example/reset-password.html?token=abc")
    body = msg.get_content()
    assert msg["To"] == "a@b.com" and "https://mufsal.example/reset-password.html?token=abc" in body
    assert "Hello Sarah" in body and "مرحبًا Sarah" in body


def test_forgot_sends_a_real_mail(smtp_server):
    fq.reset_all()
    fq.create_patient("Noura", "noura@test.com", "Mufsal@123", "966512345678", "1012345678", "1990-01-01", "female")
    ans = svc.forgot(dict(email="noura@test.com"))[1]
    assert ans == {"ok": True}                    # same answer as before: nothing leaks
    _wait(smtp_server)
    assert smtp_server and "noura@test.com" in smtp_server[0]
    assert "https://mufsal.example/reset-password.html?token=" in smtp_server[0].replace("=\r\n", "")


def test_unknown_email_sends_no_mail(smtp_server):
    fq.reset_all()
    assert svc.forgot(dict(email="ghost@test.com"))[1] == {"ok": True}
    time.sleep(0.5)
    assert smtp_server == []


def test_mail_failure_never_breaks_forgot(monkeypatch):
    fq.reset_all()
    fq.create_patient("Noura", "noura@test.com", "Mufsal@123", "966512345678", "1012345678", "1990-01-01", "female")
    monkeypatch.setenv("SMTP_HOST", "127.0.0.1")
    monkeypatch.setenv("SMTP_PORT", "1")           # nothing listens here
    monkeypatch.setenv("SMTP_SECURITY", "none")
    monkeypatch.setenv("SMTP_FROM", "mufsal@test.com")
    assert svc.forgot(dict(email="noura@test.com"))[1] == {"ok": True}
    time.sleep(0.5)
