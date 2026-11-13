# MUFSAL - database and backend queries

Everything the backend needs to read from and write to PostgreSQL.
You never write SQL yourself: call the functions in `queries_accounts.py` and
`queries_cases.py` and they return plain Python dictionaries.

---

## 1. Setup (once per machine)

1. Install PostgreSQL 18 and create an empty database named `mufsal`.
2. From the `backend` folder:

   ```
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Copy `env.example` to a file named `.env` and put your own PostgreSQL
   password in it. **Never commit `.env`.**
4. In pgAdmin, open a Query Tool on `mufsal` and run `schema.sql`, then
   `seed.sql` for demo data.
5. Start the API:

   ```
   uvicorn main:app --reload
   ```

   Open `http://127.0.0.1:8000/db-test` - it should answer `{"accounts": 8}`.

---

## 2. Demo accounts

Password for all of them: `Mufsal@123`

| Role | Email | Status |
|---|---|---|
| admin | admin@mufsal.test | approved |
| patient | sarah@mufsal.test | approved |
| patient | noura@mufsal.test | approved |
| doctor | reem@mufsal.test | approved |
| doctor | khalid@mufsal.test | approved |
| radiologist | huda@mufsal.test | approved |
| doctor | maha@mufsal.test | **pending** |
| radiologist | lama@mufsal.test | **rejected** |

The last two exist so you can test that the login page blocks accounts the
admin has not approved.

---

## 3. Account functions - `queries_accounts.py`

### `login(email, password)`
Returns the account as a dict when the login is valid. The password hash is
removed before it is returned. On failure it returns a dict with an `error` key:
`not_found`, `wrong_password`, `pending` or `rejected`.

```python
from queries_accounts import login

user = login("sarah@mufsal.test", "Mufsal@123")
if "error" in user:
    ...  # show the matching message on the login page
else:
    ...  # start the session with user["user_id"] and user["role"]
```

### `create_patient(full_name, email, password, phone, national_id, date_of_birth, gender)`
Creates the account and the patient details in one step and returns the new
`user_id`. The password is hashed inside the function - pass the plain password.

* `phone` - `966` followed by 9 digits, e.g. `"966501234567"`
* `national_id` - exactly 10 digits
* `date_of_birth` - `"YYYY-MM-DD"`, the patient must be 18 or older
* `gender` - `"female"` or `"male"`

### `create_professional(full_name, email, password, phone, national_id, role, scfhs_number, license_file_path)`
Creates a doctor or radiologist account with status `pending`, waiting for the
admin. `role` is `"doctor"` or `"radiologist"`. `license_file_path` is where you
saved the uploaded licence file, e.g. `"uploads/licenses/12.pdf"`.

### `get_user_by_email(email)`
Returns the raw account row, or `None`.

### `hash_password(plain)` / `check_password(plain, hash)`
Used by the functions above. Call them directly only for password changes.

---

## 4. Case functions - `queries_cases.py`

### `find_patient_by_national_id(national_id)`
Used on the radiologist's page to link an X-ray to a registered patient.
Returns the patient, or `None` when the ID is not registered.

### `create_case(patient_id, uploaded_by, source, xray_image_path, history)`
Saves the X-ray and its medical history, picks the approved doctor with the
fewest open cases, assigns the case to that doctor and writes the first line of
the case timeline. Returns the new `case_id`.

* `patient_id` - the patient the X-ray belongs to
* `uploaded_by` - who uploaded it (the patient, or the radiologist)
* `source` - `"patient"` or `"radiologist"`
* `history` - a dict of the upload-form answers:

```python
history = {
    "medications": "Ibuprofen when needed",
    "knee": "right",                 # right | left
    "pain_with_use": "yes",          # yes | no
    "stiffness_duration": "le30",    # none | le30 | gt30
    "stairs_pain": "severe",         # none | mild | moderate | severe | extreme
    "rising_difficulty": "moderate", # same five values
    "warning_injury": False,         # the five warning signs are optional,
    "warning_hot_swollen": True,     # and default to False
    "warning_fever": False,
    "warning_rapid_worsening": False,
    "warning_night_pain": False,
    "other_symptoms": "Mild swelling in the evening",  # optional
    "height_cm": 162,                # 100 to 250
    "weight_kg": 78,                 # 20 to 400
    "prior_injury": "no",            # yes | no
}

case_id = create_case(patient_id, patient_id, "patient", "uploads/xrays/12.png", history)
```

### `save_ai_result(case_id, predicted_grade, confidence, probabilities, priority, gradcam_image_path)`
Call this after the model has run.

* `predicted_grade` - 0 to 4
* `confidence` - 0 to 1
* `probabilities` - a list of five numbers, one per grade
* `priority` - `"low"`, `"medium"` or `"high"`

```python
save_ai_result(case_id, 3, 0.91, [0.01, 0.02, 0.06, 0.91, 0.00],
               "high", "uploads/gradcam/12.png")
```

### `get_doctor_cases(doctor_id, status="under_review")`
The doctor's own queue, high priority first and oldest first inside each
priority. Pass `status="approved"` for the cases they have already reviewed.

### `get_case(case_id)`
Everything about one case in a single dict: the case row, the patient, plus
`case["history"]`, `case["ai_result"]` and `case["report"]` (`None` until the
doctor approves it). This is what the review page needs.

### `approve_case(case_id, doctor_id, final_grade, doctor_notes, report_ar, report_en)`
Saves the report, marks the case approved and adds a line to the case timeline.
`final_grade` is the doctor's grade, which may differ from the AI grade.
`doctor_notes`, `report_ar` and `report_en` are all required.

### `get_patient_cases(patient_id)`
The patient's own cases, newest first, with the report when there is one.

---

## 5. Rules the database enforces by itself

You do not need to check these in Python - the database rejects bad data and
raises an error you can catch.

* Email must look like `name@domain.something` and cannot be used twice.
* National ID: exactly 10 digits, and cannot be used twice.
* Phone: `966` followed by 9 digits.
* Everyone except the admin must have a national ID and a phone number.
* A patient must be 18 or older.
* SCFHS number cannot be used twice.
* KL grades are 0 to 4; priority is low, medium or high.
* A rejected registration must have a reason.
* Doctor notes and both report languages are required.

Passwords are **not** checked by the database. Validate the password rules
(8-20 characters, upper, lower, digit, symbol) in the backend before calling
`create_patient` or `create_professional`.

---

## 6. Deleting accounts

* Deleting a **patient** deletes everything that belongs to them: their cases,
  X-rays, AI results, reports and complaints.
* Deleting a **doctor** does not delete anything else. Reports they approved stay
  with the patient and keep the doctor's name, and their open cases simply lose
  the assignment.

The database only removes rows. When you delete an account, the backend must
also delete that account's files from the `uploads` folder.

---

## 7. Still to do

* Add a licence-file upload field to `register-professional.html` -
  `license_file_path` is required and cannot be empty.
* Confirm the real format of the SCFHS registration number (stored as text, max
  20 characters for now).
* Remove the "both" option from the knee question in `static/js/questionnaire.js` -
  one X-ray shows one knee, and the database rejects `both`.
* Remove the 6-digit case-ID check in `static/js/mock-cases.js` - case IDs now
  start at 1.
* Delete the demo data from `seed.sql` before the final version.
