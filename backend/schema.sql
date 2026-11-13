-- =====================================================================
-- MUFSAL - database schema (PostgreSQL)
-- Run this file once on an empty "mufsal" database.
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
    user_id           INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    scfhs_number      VARCHAR(20)  NOT NULL UNIQUE,
    license_file_path VARCHAR(255) NOT NULL
);

CREATE TABLE registration_decisions (
    decision_id     SERIAL PRIMARY KEY,
    professional_id INTEGER      REFERENCES users(user_id) ON DELETE SET NULL,
    admin_id        INTEGER      REFERENCES users(user_id) ON DELETE SET NULL,
    applicant_name  VARCHAR(100) NOT NULL,
    applicant_role  VARCHAR(20)  NOT NULL,
    decision        VARCHAR(10)  NOT NULL,
    reason          TEXT,
    decided_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reg_applicant_role_valid CHECK (applicant_role IN ('doctor','radiologist')),
    CONSTRAINT reg_decision_valid CHECK (decision IN ('approved','rejected')),
    CONSTRAINT reg_reason_required CHECK (decision = 'approved' OR reason IS NOT NULL)
);

CREATE TABLE cases (
    case_id            SERIAL PRIMARY KEY,
    patient_id         INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    uploaded_by        INTEGER      REFERENCES users(user_id) ON DELETE SET NULL,
    source             VARCHAR(15)  NOT NULL,
    assigned_doctor_id INTEGER      REFERENCES users(user_id) ON DELETE SET NULL,
    xray_image_path    VARCHAR(255) NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'under_review',
    submitted_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cases_source_valid CHECK (source IN ('patient','radiologist')),
    CONSTRAINT cases_status_valid CHECK (status IN ('under_review','approved'))
);

CREATE TABLE case_history (
    case_id                 INTEGER      PRIMARY KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    medications             TEXT         NOT NULL,
    knee                    VARCHAR(10)  NOT NULL,
    pain_with_use           VARCHAR(3)   NOT NULL,
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
    prior_injury            VARCHAR(3)   NOT NULL,
    CONSTRAINT history_knee_valid CHECK (knee IN ('right','left')),
    CONSTRAINT history_pain_with_use_valid CHECK (pain_with_use IN ('yes','no')),
    CONSTRAINT history_stiffness_valid CHECK (stiffness_duration IN ('none','le30','gt30')),
    CONSTRAINT history_stairs_valid CHECK (stairs_pain IN ('none','mild','moderate','severe','extreme')),
    CONSTRAINT history_rising_valid CHECK (rising_difficulty IN ('none','mild','moderate','severe','extreme')),
    CONSTRAINT history_prior_injury_valid CHECK (prior_injury IN ('yes','no')),
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
);

CREATE TABLE reports (
    case_id      INTEGER      PRIMARY KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    doctor_id    INTEGER      REFERENCES users(user_id) ON DELETE SET NULL,
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
    user_id      INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    subject      VARCHAR(200) NOT NULL,
    body         TEXT         NOT NULL,
    urgency      VARCHAR(10),
    status       VARCHAR(20)  NOT NULL DEFAULT 'open',
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT complaints_status_valid CHECK (status IN ('open','investigating','resolved')),
    CONSTRAINT complaints_urgency_valid CHECK (urgency IN ('low','medium','high'))
);

CREATE TABLE complaint_replies (
    reply_id     SERIAL    PRIMARY KEY,
    complaint_id INTEGER   NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    admin_id     INTEGER   REFERENCES users(user_id) ON DELETE SET NULL,
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
