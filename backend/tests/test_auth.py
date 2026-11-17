import os
import auth_rules as rules
import auth_service as svc
import fake_queries as q

PATIENT = dict(name="Noura Alharbi", email="Noura@Test.com", password="Mufsal@123", nationalId="1012345678",
               phone="966512345678", dob="1999-05-20", gender="female")
PRO = dict(role="doctor", name="Dr Reem", email="reem@test.com", password="Mufsal@123", phone="966501234567",
           nationalId="1098765432", scfhsNumber="12-H-48213")


def make_admin():
    q._add("admin", "approved", "Admin", "admin@test.com", "Mufsal@123", None, None)


# ---------- rules ----------
def test_phone_rule():
    assert rules.phone_error("966512345678") is None
    for bad in ["0512345678", "96651234567", "9665123456789", "+966512345678", "", "966 512345678"]:
        assert rules.phone_error(bad) == "phone_invalid", bad

def test_password_rule():
    assert rules.password_error("Mufsal@123") is None
    assert rules.password_error("Short@1") == "password_length"
    assert rules.password_error("a" * 21) == "password_length"
    assert rules.password_error("alllowercase1@") == "password_rules"
    assert rules.password_error("NoSpecial123") == "password_rules"

def test_ids_and_dates():
    assert rules.national_id_error("1012345678") is None and rules.national_id_error("2012345678") is None
    assert rules.national_id_error("3012345678") and rules.national_id_error("101234567")
    assert rules.dob_error("2000-01-01") is None
    assert rules.dob_error("2015-01-01") == "min_age"
    assert rules.dob_error("2999-01-01") == "dob_invalid" and rules.dob_error("20-01-2000") == "dob_invalid"


# ---------- patient registration ----------
def test_patient_register_ok_and_lowercases_email():
    status, body = svc.register_patient(PATIENT)
    assert status == 201 and body["ok"]
    assert q.get_user_by_email("noura@test.com")["role"] == "patient"
    assert q.patients[1] == ("1999-05-20", "female")

def test_patient_gender_case_insensitive():
    assert svc.register_patient({**PATIENT, "gender": "Female"})[0] == 201

def test_patient_missing_or_bad_fields():
    for field, code in [("nationalId", "national_id_invalid"), ("phone", "phone_invalid"), ("dob", "dob_invalid"),
                        ("gender", "gender_invalid"), ("email", "email_invalid"), ("name", "name_required"),
                        ("password", "password_length")]:
        status, body = svc.register_patient({**PATIENT, field: ""})
        assert (status, body["error"]) == (400, code), field
    assert svc.register_patient({**PATIENT, "dob": "2015-01-01"})[1]["error"] == "min_age"
    assert q.users == []          # nothing was saved

def test_patient_duplicates():
    svc.register_patient(PATIENT)
    assert svc.register_patient({**PATIENT, "email": "NOURA@test.com", "nationalId": "1111111111"})[1]["error"] == "email_taken"
    assert svc.register_patient({**PATIENT, "email": "other@test.com"})[1]["error"] == "national_id_taken"

def test_database_race_is_reported_not_crashed():
    # the checks pass but the database refuses (two people at the same moment)
    orig = q.get_user_by_email
    svc.register_patient(PATIENT)
    q.get_user_by_email = lambda e: None
    try:
        status, body = svc.register_patient(PATIENT)
    finally:
        q.get_user_by_email = orig
    assert status == 409 and body["error"] in ("email_taken", "national_id_taken")


# ---------- professional registration + approval ----------
def test_professional_pending_cannot_login_until_approved():
    assert svc.register_professional(PRO)[0] == 201
    assert q.get_user_by_email("reem@test.com")["status"] == "pending"
    assert svc.login(dict(email="reem@test.com", password="Mufsal@123"))[1]["error"] == "pending"
    make_admin()
    uid = q.get_user_by_email("reem@test.com")["user_id"]
    assert svc.pending_requests()[1]["requests"][0]["scfhs_number"] == "12-H-48213"
    assert svc.decide_request(uid, 99, "approved")[0] == 200
    status, body, user = svc.login(dict(email="reem@test.com", password="Mufsal@123"))
    assert status == 200 and body["user"]["home"] == "/dashboard-doctor" and user["role"] == "doctor"

def test_professional_needs_phone_role_scfhs():
    for field, code in [("phone", "phone_invalid"), ("role", "role_invalid"), ("scfhsNumber", "scfhs_invalid")]:
        assert svc.register_professional({**PRO, field: ""})[1]["error"] == code
    assert svc.register_professional({**PRO, "role": "admin"})[1]["error"] == "role_invalid"

def test_professional_duplicates():
    svc.register_professional(PRO)
    assert svc.register_professional(PRO)[1]["error"] == "email_taken"
    assert svc.register_professional({**PRO, "email": "b@test.com"})[1]["error"] == "national_id_taken"
    assert svc.register_professional({**PRO, "email": "b@test.com", "nationalId": "1000000001"})[1]["error"] == "scfhs_taken"

def test_patient_email_cannot_be_reused_as_professional():
    svc.register_patient(PATIENT)
    assert svc.register_professional({**PRO, "email": "noura@test.com"})[1]["error"] == "email_taken"

def test_rejected_shows_reason_and_can_reapply():
    make_admin(); svc.register_professional(PRO)
    uid = q.get_user_by_email("reem@test.com")["user_id"]
    assert svc.decide_request(uid, 1, "rejected", "")[1]["error"] == "reason_required"
    assert svc.decide_request(uid, 1, "rejected", "Licence could not be verified")[0] == 200
    status, body, _ = svc.login(dict(email="reem@test.com", password="Mufsal@123"))
    assert (status, body["error"], body["reason"]) == (403, "rejected", "Licence could not be verified")
    # new request with the same email and corrected data
    assert svc.register_professional({**PRO, "scfhsNumber": "99-H-11111", "password": "New@12345"})[0] == 201
    assert q.get_user_by_email("reem@test.com")["status"] == "pending"
    assert len([u for u in q.users if u["email"] == "reem@test.com"]) == 1
    assert q.decisions[0]["decision"] == "rejected"          # the history stays
    assert svc.login(dict(email="reem@test.com", password="New@12345"))[1]["error"] == "pending"

def test_decide_twice_or_unknown():
    make_admin(); svc.register_professional(PRO)
    uid = q.get_user_by_email("reem@test.com")["user_id"]
    assert svc.decide_request(uid, 1, "approved")[0] == 200
    assert svc.decide_request(uid, 1, "approved")[0] == 404
    assert svc.decide_request(999, 1, "approved")[0] == 404


# ---------- login ----------
def test_login_patient():
    svc.register_patient(PATIENT)
    status, body, user = svc.login(dict(email=" NOURA@test.com ", password="Mufsal@123"))
    assert status == 200 and body["user"]["home"] == "/dashboard-patient" and user["user_id"] == 1
    assert "password_hash" not in str(body)

def test_same_answer_for_wrong_email_and_wrong_password():
    svc.register_patient(PATIENT)
    a = svc.login(dict(email="nobody@test.com", password="Mufsal@123"))
    b = svc.login(dict(email="noura@test.com", password="Wrong@1234"))
    assert a[:2] == b[:2] == (401, {"ok": False, "error": "bad_login"}) and a[2] is None

def test_empty_login():
    assert svc.login({})[1]["error"] == "bad_login"
    assert svc.login(dict(email="a@b.com", password=123))[1]["error"] == "bad_login"

def test_lockout_after_5_wrong_passwords_and_reset_on_success():
    svc.register_patient(PATIENT)
    for _ in range(4): svc.login(dict(email="noura@test.com", password="Bad@12345"))
    assert svc.login(dict(email="noura@test.com", password="Mufsal@123"))[0] == 200       # success clears the counter
    for _ in range(5): svc.login(dict(email="noura@test.com", password="Bad@12345"))
    assert svc.login(dict(email="noura@test.com", password="Mufsal@123"))[1]["error"] == "locked"


# ---------- password reset ----------
def test_reset_flow(monkeypatch):
    monkeypatch.setenv("DEV_LOGIN", "1")
    svc.register_patient(PATIENT)
    ghost = svc.forgot(dict(email="ghost@test.com"))[1]
    real = svc.forgot(dict(email="noura@test.com"))[1]
    assert ghost == {"ok": True} and real["ok"] and "devLink" in real
    token = real["devLink"].split("token=")[1]
    assert q.resets[0]["token"] != token                   # only the hash is stored
    assert svc.check_reset(token)[1]["ok"] and not svc.check_reset("nonsense")[1]["ok"]
    assert svc.reset_password(dict(token=token, password="weak"))[1]["error"] == "password_length"
    assert svc.reset_password(dict(token=token, password="New@12345"))[0] == 200
    assert svc.reset_password(dict(token=token, password="Other@12345"))[1]["error"] == "reset_invalid"   # one time only
    assert svc.login(dict(email="noura@test.com", password="New@12345"))[0] == 200
    assert svc.login(dict(email="noura@test.com", password="Mufsal@123"))[0] == 401

def test_dev_link_hidden_in_production(monkeypatch):
    monkeypatch.delenv("DEV_LOGIN", raising=False)
    svc.register_patient(PATIENT)
    assert svc.forgot(dict(email="noura@test.com"))[1] == {"ok": True}

def test_pending_account_gets_no_reset(monkeypatch):
    monkeypatch.setenv("DEV_LOGIN", "1")
    svc.register_professional(PRO)
    assert "devLink" not in svc.forgot(dict(email="reem@test.com"))[1]


# ---- radiologist finds a patient by National ID -------------------------------------------

def test_find_patient_by_id():
    pid = q.create_patient("Noura Ali", "noura2@test.com", "Mufsal@123", "966512345678", "1012345678", "1990-01-01", "female")
    status, body = svc.find_patient("1012345678", requester_id=99)
    assert status == 200 and body["patient"] == {"patientId": pid, "name": "Noura Ali"}


def test_find_patient_unknown_and_invalid():
    assert svc.find_patient("1999999999", 99)[1]["error"] == "patient_not_found"
    assert svc.find_patient("123", 99)[1]["error"] == "national_id_invalid"


def test_find_patient_only_returns_patients_and_is_limited():
    q.create_professional("Dr R", "dr@test.com", "Mufsal@123", "966511111111", "2012345678", "doctor", "SCFHS-1")
    q._add("patient", "pending", "Not approved", "p@test.com", "x", "966522222222", "1022222222")
    assert svc.find_patient("2012345678", 7)[0] == 404      # a doctor is not a patient
    assert svc.find_patient("1022222222", 7)[0] == 404      # not approved yet
    for _ in range(svc.LOOKUP_MAX):
        svc.find_patient("1999999999", 5)
    assert svc.find_patient("1999999999", 5)[0] == 429
