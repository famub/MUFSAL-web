# MUFSAL - login, registration and the account backend

Login and registration now talk to the team's PostgreSQL database through the FastAPI backend in `backend/`.
The mock accounts (`mock-users.js`) are no longer used for login.

## Run it
1. Database ready as in `backend/README-database.md` (`schema.sql`, then `seed.sql`), `.env` filled in.
2. From the `backend` folder: `uvicorn main:app --reload`
3. Open **http://127.0.0.1:8000/login** (always through the server, not by double-clicking an HTML file).
4. Demo accounts (password `Mufsal@123`): sarah@ / huda@ / reem@ / admin@ `mufsal.test`, maha@ = pending, lama@ = rejected.

## What each file does
| File | What it does |
|---|---|
| `backend/routes_auth.py` | The API the pages call: register, login, logout, me, forgot, reset, admin approve/reject |
| `backend/auth_service.py` | The logic behind each call (no web code, no SQL) |
| `backend/auth_rules.py` | Validation rules: phone, National ID, password, date of birth, SCFHS |
| `backend/queries_accounts.py` | Your file + new database functions at the bottom (and a timing fix in `login`) |
| `backend/session_guard.py` | Session cookie + 15-minute inactivity logout for doctors and radiologists (NFR-S5) |
| `backend/routes_pages.py` | Serves the HTML pages and protects them by login and role, on the server |
| `backend/main.py` | Cleaned: it had two copies pasted together and a second `/dashboard-patient` route |
| `static/js/auth.js`, `static/css/auth.css` | The pages' logic and styles |
| `register-patient.html`, `register-professional.html`, `login.html` | The pages |
| `backend/tests/` | 21 tests of the login logic, no database needed: `python -m pytest tests` (from `backend`) |

## What the database requires, so the pages ask for it
- Patient: full name, National ID (10 digits), phone, date of birth (18+), gender, email, password. All required.
- Professional: role, full name, phone, National ID, SCFHS number, email, password. All required. Status starts as `pending`.
- Phone: the page shows a fixed `+966`; the person types 9 digits starting with 5. Saved as `9665XXXXXXXX`.
- Every required field has a red `*` (added by `markRequired()` in `auth.js` to the label of every `required` field).
- The questionnaire, symptoms and medications are no longer on the registration page. Medications and the questionnaire answers
  are saved with each X-ray (`case_history`), so they belong to the upload form.

## How the system knows who is registered
- Registration: the server looks for the email and the National ID in `users`; if one exists it answers "already registered".
  The password is hashed with bcrypt (work factor 12) before saving.
- Login: the server compares the password with the stored hash and checks `status`. Wrong email and wrong password give the same
  message. 5 wrong passwords lock that email for 15 minutes.
- After login the server saves `user_id` and `role` in the session cookie. `routes_dashboard.py` and `routes_review.py` already read these.
- A rejected professional can register again with the same email: the old row goes back to `pending` and the rejection stays in
  `registration_decisions`.

## Still to do
1. **Not tested here:** the SQL in the new functions of `queries_accounts.py` and the FastAPI wiring were not run (no PostgreSQL and no FastAPI in the
   place where this was written). Run the checklist below once and tell the team about any error.
2. Reset email: the link is only printed in the server window, and shown on the page while `DEV_LOGIN=1`. Connect an email service; then set `DEV_LOGIN=0`.
3. Admin page: `admin-license-verification.html` still uses mock data. It should call `GET /api/admin/requests` and `POST /api/admin/requests/<id>/approve|reject` (`{"reason": "..."}`).
4. On Render: set `SESSION_SECRET` (long random text), `HTTPS_ONLY=1`, `DEV_LOGIN=0`. Delete the `/dev/login-as` route in `routes_review.py` and the demo box in `login.html`.
5. The lock after wrong passwords is kept in memory (one server process). With several workers, move it to a table.
6. Confirm the real SCFHS format (`auth_rules.py`, `SCFHS_RE`).

## Test checklist (10 minutes)
1. Register a patient -> the row is in `users` and `patients`, `phone` starts with 966.
2. Register the same email again -> "already registered". Same National ID with another email -> the ID message.
3. Log in as that patient -> `/dashboard-patient` opens. Log out -> the dashboard needs a login again.
4. Register a doctor -> log in -> "waiting for approval". Log in as admin and call the approve address -> the doctor can log in.
5. Log in as lama@mufsal.test -> the rejection reason shows. Register again with the same email -> pending.
6. Forgot password -> open the link -> new password -> the link no longer works.
