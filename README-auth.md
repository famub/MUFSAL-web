# MUFSAL - login / registration / password pages

New files only. Nothing in the existing pages was changed. Copy them into the project root, keeping the folders.

| File | What it is |
|---|---|
| login.html | Login. Redirects each role to its home page. Blocks pending / rejected professionals with a message. |
| register.html | Choose the account type. |
| register-patient.html | Patient registration: name, email, password, Health ID, symptoms, medications, 8-question questionnaire. Phone, birth date and gender are optional (the proposal does not require them). |
| register-professional.html | Radiologist / doctor registration: National ID/Iqama, SCFHS licence. Creates a "pending" request. |
| forgot-password.html, reset-password.html | Password reset (demo link instead of an email). |
| logout.html | The logout icon in every header already points here. |
| static/js/auth.js | All the page logic + EN/AR texts. |
| static/js/mock-users.js | Mock accounts and session (no database yet). Demo accounts are listed on the login page. |
| static/js/questionnaire.js | The questionnaire questions (edit them here). |
| static/css/auth.css | Styles (also loads profiles.css for cards, fields, buttons). |

## Protect the other pages (acceptance criterion: "after logout I must log in again")
Add these two lines just before `</head>` of each page:

    <script src="static/js/mock-users.js"></script>
    <script>MufsalUsers.guard(["patient"]);</script>

| Page | Roles inside guard([...]) |
|---|---|
| dashboard-patient.html, profile-patient.html | "patient" |
| dashboard-radiologist.html, profile-radiologist.html | "radiologist" |
| profile-doctor.html, review-cases.html, review-case.html | "doctor" |
| view-report.html | "patient", "radiologist", "doctor" |

Doctors and radiologists are logged out after 15 minutes without activity (NFR-S5).
Where to go after login is set in `HOME` at the top of mock-users.js (the doctor dashboard and the admin pages do not exist yet).

## Still for the backend (marked TODO(backend) in the code)
- Hash passwords (bcrypt / Argon2, work factor 12 - NFR-S4). The mock stores plain text: never type a real password.
- Save accounts in PostgreSQL, check duplicate email / Health ID on the server.
- Real session + the 15-minute timeout on the server.
- Email: the reset link, and the "your request was approved" notification.
- Remove the demo-accounts box from login.html before the final version.

## To confirm with the team
- Health ID format (10 digits is a guess) and SCFHS licence number format.
- The questionnaire (8 questions): it is a draft from the evidence-base document. The Arabic is a plain translation, not the validated Saudi KOOS wording.
