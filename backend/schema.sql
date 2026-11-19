-- =====================================================================
-- MUFSAL - database schema (PostgreSQL)
-- Run this file once on an empty "mufsal" database.
--
-- ON ACCOUNTS NEVER BEING DELETED
-- An account is taken out of service, never removed. A doctor signs
-- reports, a radiologist uploads X-rays and a patient owns the case
-- itself, so deleting the row would leave a medical record with no
-- author or no owner. A professional who wants to leave is marked in
-- professionals.deactivated_at and keeps everything already written.
--
-- That rule is not left to us to remember: every foreign key pointing
-- at users is ON DELETE RESTRICT, so the database refuses the deletion.
-- Two are not, on purpose:
--   patients.user_id and professionals.user_id are CASCADE, because
--     those rows are parts of the same person, not references to one;
--   password_resets.user_id is CASCADE, because a one-hour token is
--     worth nothing once its account is gone.
-- =====================================================================

CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    role          VARCHAR(20)  NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone         VARCHAR(12),
    national_id   CHAR(10)     UNIQUE,
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_valid CHECK (role IN ('patient','doctor','radiologist','admin')),
    CONSTRAINT users_status_valid CHECK (status IN ('pending','approved','rejected')),
    CONSTRAINT users_email_format CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    CONSTRAINT users_phone_format CHECK (phone ~ '^966[0-9]{9}$'),
    CONSTRAINT users_national_id_format CHECK (national_id ~ '^[0-9]{10}$'),
    CONSTRAINT users_identity_required CHECK (role = 'admin' OR (national_id IS NOT NULL AND phone IS NOT NULL))
);

CREATE TABLE patients (
    user_id       INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    date_of_birth DATE        NOT NULL,
    gender        VARCHAR(10) NOT NULL,
    CONSTRAINT patients_gender_valid CHECK (gender IN ('female','male')),
    CONSTRAINT patients_age_18_plus CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

CREATE TABLE professionals (
    user_id                INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    scfhs_number           VARCHAR(20) NOT NULL UNIQUE,
    license_expiry         DATE        NOT NULL,
    pending_license_expiry DATE,
    delete_requested_at    TIMESTAMP,
    deactivated_at         TIMESTAMP
);

COMMENT ON COLUMN professionals.license_expiry IS
    'The day the practising licence runs out, given by the professional when registering. There is no "suspended" column: whether an account is suspended is read from this date (license_expiry < CURRENT_DATE), so the answer is right at every moment and no nightly job has to keep it so. What time alone decides is not stored.';

COMMENT ON COLUMN professionals.pending_license_expiry IS
    'A renewal date waiting for the admin to accept it; empty when no renewal is in hand. The new date waits here instead of overwriting license_expiry, so a licence is never in force before the admin has said so. Accepted, it moves to license_expiry and is emptied; refused, it is emptied and the old date stands.';

COMMENT ON COLUMN professionals.delete_requested_at IS
    'When the professional asked for the account to be closed, empty while no such request is in hand. It sits here rather than in users because only a doctor or a radiologist can ask: in users it would stay empty for every patient and every admin for good. It is also the first half of one act, whose second half is the column below, so both are read from a single row.';

COMMENT ON COLUMN professionals.deactivated_at IS
    'When the account was taken out of service, empty while it is in service. This is the admin acting on the request above: the asking is recorded there, the decision here, so a request still waiting is one column filled and the other empty. The row is never deleted, because a doctor signs reports and a radiologist uploads X-rays, and removing it would leave medical records with no author.';

CREATE TABLE registration_decisions (
    decision_id     SERIAL PRIMARY KEY,
    professional_id INTEGER      REFERENCES users(user_id) ON DELETE RESTRICT,
    admin_id        INTEGER      REFERENCES users(user_id) ON DELETE RESTRICT,
    applicant_name  VARCHAR(100) NOT NULL,
    applicant_role  VARCHAR(20)  NOT NULL,
    kind            VARCHAR(15)  NOT NULL DEFAULT 'registration',
    decision        VARCHAR(10)  NOT NULL,
    reason          TEXT,
    decided_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reg_applicant_role_valid CHECK (applicant_role IN ('doctor','radiologist')),
    CONSTRAINT reg_kind_valid CHECK (kind IN ('registration','renewal')),
    CONSTRAINT reg_decision_valid CHECK (decision IN ('approved','rejected')),
    CONSTRAINT reg_reason_required CHECK (decision = 'approved' OR reason IS NOT NULL)
);

COMMENT ON COLUMN registration_decisions.kind IS
    'What was being decided: a first application or a licence renewal. A professional is barred for good after two refused applications, while a refused renewal does not count against that, so the two cannot share one row type. With this column the number of tries left is counted from this table and needs no column of its own: count the rejected rows whose kind is registration.';

CREATE TABLE cases (
    case_id            SERIAL PRIMARY KEY,
    patient_id         INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    uploaded_by        INTEGER      REFERENCES users(user_id) ON DELETE RESTRICT,
    source             VARCHAR(15)  NOT NULL,
    assigned_doctor_id INTEGER      REFERENCES users(user_id) ON DELETE RESTRICT,
    xray_image_path    VARCHAR(255) NOT NULL UNIQUE,
    status             VARCHAR(20)  NOT NULL DEFAULT 'under_review',
    submitted_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cases_source_valid CHECK (source IN ('patient','radiologist')),
    CONSTRAINT cases_status_valid CHECK (status IN ('under_review','approved'))
);

-- Why `source` is stored and not worked out from `uploaded_by`:
COMMENT ON COLUMN cases.source IS
    'Kept on purpose, not worked out from uploaded_by. That column is ON DELETE SET NULL, so once the account that uploaded the X-ray is removed the source could no longer be told. Same reasoning as reports.doctor_name and registration_decisions.applicant_name.';

COMMENT ON COLUMN cases.xray_image_path IS
    'Where the file sits under backend/uploads. The file name is a random id, never the case number, so one patient cannot reach another patient''s X-ray by changing a number in the address.';

CREATE TABLE case_history (
    case_id                 INTEGER      PRIMARY KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    -- the question is optional, so nothing written is NULL, not a dash
    medications             TEXT,
    knee                    VARCHAR(10)  NOT NULL,
    pain_with_use           BOOLEAN      NOT NULL,
    stiffness_duration      VARCHAR(10)  NOT NULL,
    stairs_pain             VARCHAR(10)  NOT NULL,
    rising_difficulty       VARCHAR(10)  NOT NULL,
    warning_injury          BOOLEAN      NOT NULL DEFAULT FALSE,
    warning_hot_swollen     BOOLEAN      NOT NULL DEFAULT FALSE,
    warning_fever           BOOLEAN      NOT NULL DEFAULT FALSE,
    warning_rapid_worsening BOOLEAN      NOT NULL DEFAULT FALSE,
    warning_night_pain      BOOLEAN      NOT NULL DEFAULT FALSE,
    other_symptoms          TEXT,
    height_cm               SMALLINT     NOT NULL,
    weight_kg               NUMERIC(5,2) NOT NULL,
    prior_injury            BOOLEAN      NOT NULL,
    CONSTRAINT history_knee_valid CHECK (knee IN ('right','left')),
    -- pain_with_use and prior_injury need no CHECK: BOOLEAN already allows
    -- nothing but true and false, the same as the five warning_* columns.
    CONSTRAINT history_stiffness_valid CHECK (stiffness_duration IN ('none','le30','gt30')),
    CONSTRAINT history_stairs_valid CHECK (stairs_pain IN ('none','mild','moderate','severe','extreme')),
    CONSTRAINT history_rising_valid CHECK (rising_difficulty IN ('none','mild','moderate','severe','extreme')),
    CONSTRAINT history_height_range CHECK (height_cm BETWEEN 100 AND 250),
    CONSTRAINT history_weight_range CHECK (weight_kg BETWEEN 20 AND 400)
);

CREATE TABLE ai_results (
    case_id            INTEGER      PRIMARY KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    predicted_grade    SMALLINT     NOT NULL,
    confidence         NUMERIC(4,3) NOT NULL,
    prob_grade_0       NUMERIC(4,3) NOT NULL,
    prob_grade_1       NUMERIC(4,3) NOT NULL,
    prob_grade_2       NUMERIC(4,3) NOT NULL,
    prob_grade_3       NUMERIC(4,3) NOT NULL,
    prob_grade_4       NUMERIC(4,3) NOT NULL,
    priority           VARCHAR(10)  NOT NULL,
    gradcam_image_path VARCHAR(255) NOT NULL,
    analyzed_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_grade_valid CHECK (predicted_grade BETWEEN 0 AND 4),
    CONSTRAINT ai_priority_valid CHECK (priority IN ('low','medium','high')),
    CONSTRAINT ai_confidence_valid CHECK (confidence BETWEEN 0 AND 1),
    CONSTRAINT ai_probabilities_valid CHECK (prob_grade_0 BETWEEN 0 AND 1 AND prob_grade_1 BETWEEN 0 AND 1 AND
        prob_grade_2 BETWEEN 0 AND 1 AND prob_grade_3 BETWEEN 0 AND 1 AND prob_grade_4 BETWEEN 0 AND 1)
    -- NOT ADDED YET: a rule that the five chances add up to 1. A KL grade is one
    -- of five that exclude each other, so they should, but what the model on the
    -- Space actually returns has not been seen yet. Adding the rule before that
    -- would make every real result fail to save, and the failure is silent.
    -- Check one real analysis first - see db-changes-pending.md.
);

COMMENT ON COLUMN ai_results.priority IS
    'Stored, not worked out on the fly: it is the triage decision taken under the rule in force when the X-ray was read. Recomputing it later would quietly rewrite decisions already made. The rule itself lives in priority.py.';

CREATE TABLE reports (
    case_id      INTEGER      PRIMARY KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    doctor_id    INTEGER      REFERENCES users(user_id) ON DELETE RESTRICT,
    doctor_name  VARCHAR(100) NOT NULL,
    final_grade  SMALLINT     NOT NULL,
    doctor_notes TEXT         NOT NULL,
    report_ar    TEXT         NOT NULL,
    report_en    TEXT         NOT NULL,
    approved_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reports_grade_valid CHECK (final_grade BETWEEN 0 AND 4)
);

CREATE TABLE case_activity (
    activity_id SERIAL      PRIMARY KEY,
    case_id     INTEGER     NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    event_type  VARCHAR(20) NOT NULL,
    doctor_name VARCHAR(100),
    note        TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT activity_event_valid CHECK (event_type IN ('assigned','reassigned','approved'))
);

CREATE TABLE complaints (
    complaint_id SERIAL       PRIMARY KEY,
    user_id      INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    -- which case the complaint is about, when it is about one at all.
    -- The complaint survives the case, so the admin can still read it.
    case_id      INTEGER      REFERENCES cases(case_id) ON DELETE SET NULL,
    subject      VARCHAR(200) NOT NULL,
    body         TEXT         NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'open',
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT complaints_status_valid CHECK (status IN ('open','investigating','resolved'))
);

CREATE TABLE complaint_replies (
    reply_id     SERIAL    PRIMARY KEY,
    complaint_id INTEGER   NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    admin_id     INTEGER   REFERENCES users(user_id) ON DELETE RESTRICT,
    body         TEXT      NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE password_resets (
    reset_id   SERIAL       PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delay_complaints (
    delay_complaint_id SERIAL      PRIMARY KEY,
    case_id            INTEGER     NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    user_id            INTEGER     NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    status             VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    handled_at         TIMESTAMP,
    handled_by         INTEGER     REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT delay_status_valid CHECK (status IN ('pending','handled'))
);

-- Only one open delay complaint per case at a time
CREATE UNIQUE INDEX delay_one_open_per_case
    ON delay_complaints (case_id) WHERE status = 'pending';
