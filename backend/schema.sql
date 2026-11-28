-- =====================================================================
-- MUFSAL - database schema (PostgreSQL)
-- Run this file once on an empty "mufsal" database.
--
-- ON ACCOUNTS NEVER BEING DELETED
-- An account is taken out of service, never removed. A doctor signs
-- reports, a radiologist uploads X-rays and a patient owns the case
-- itself, so deleting the row would leave a medical record with no
-- author or no owner. A professional who wants to leave is marked in
-- healthcare_professionals.deactivated_at and keeps everything already written.
--
-- That rule is not left to us to remember: every foreign key pointing
-- at users is ON DELETE RESTRICT, so the database refuses the deletion.
-- Two are not, on purpose:
--   patients.user_id and healthcare_professionals.user_id are CASCADE, because
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
    -- The day the password was last set, so a profile page can say how long
    -- ago that was. A new account's password is set the moment the row is
    -- written, which is exactly what the default records.
    password_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    national_id   CHAR(10)     NOT NULL UNIQUE,
    CONSTRAINT users_role_valid CHECK (role IN ('patient','doctor','radiologist')),
    CONSTRAINT users_email_format CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    CONSTRAINT users_national_id_format CHECK (national_id ~ '^[0-9]{10}$'),
    -- lets the two tables below point at (user_id, role) together, so the
    -- database itself refuses a doctor written into patients
    CONSTRAINT users_id_role_unique UNIQUE (user_id, role)
);

-- The same address written two ways is one address, but UNIQUE on email reads
-- 'Sara@..' and 'sara@..' as two. Enforcing it on the lowered text instead
-- stops one person holding two accounts without meaning to.
CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));

CREATE TABLE patients (
    user_id       INTEGER PRIMARY KEY
        CONSTRAINT patient_is_a_user REFERENCES users(user_id) ON DELETE CASCADE,
    -- Carried only so the key below can check it. Without it the row says it
    -- belongs to a user, not that the user is a patient, and a doctor could be
    -- written in here. The DEFAULT and the CHECK keep it from ever being
    -- anything else, so no code has to pass it.
    role          VARCHAR(20) NOT NULL DEFAULT 'patient'
                  CONSTRAINT patients_role_fixed CHECK (role = 'patient'),
    date_of_birth DATE        NOT NULL,
    gender        VARCHAR(10) NOT NULL,
    CONSTRAINT patients_is_a_patient FOREIGN KEY (user_id, role)
        REFERENCES users(user_id, role) ON DELETE CASCADE,
    CONSTRAINT patients_gender_valid CHECK (gender IN ('female','male')),
    CONSTRAINT patients_age_18_plus CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

CREATE TABLE healthcare_professionals (
    user_id                INTEGER PRIMARY KEY
        CONSTRAINT professional_is_a_user REFERENCES users(user_id) ON DELETE CASCADE,
    -- as in patients above, but here two roles are allowed
    role                   VARCHAR(20) NOT NULL
                           CONSTRAINT healthcare_professionals_role_valid
                           CHECK (role IN ('doctor','radiologist')),
    scfhs_number           VARCHAR(20) NOT NULL UNIQUE,
    license_expiry         DATE        NOT NULL,
    status                 VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at             TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pending_license_expiry DATE,
    pending_scfhs_number   VARCHAR(20),
    delete_requested_at    TIMESTAMP,
    deactivated_at         TIMESTAMP,
    CONSTRAINT healthcare_professionals_is_a_professional FOREIGN KEY (user_id, role)
        REFERENCES users(user_id, role) ON DELETE CASCADE,
    CONSTRAINT healthcare_professionals_status_valid CHECK (status IN ('pending','approved','rejected'))
);

COMMENT ON COLUMN healthcare_professionals.status IS
    'Where the application has got to: pending while the admin has not looked at it, then approved or rejected. It is here and not in users because only a doctor or a radiologist is ever approved: a patient account is live the moment it is made, and the one admin account is not applied for. In users the column would read ''approved'' for every patient and every admin for good, which is a column that says nothing.';

COMMENT ON COLUMN healthcare_professionals.created_at IS
    'When the application was made. The admin''s list is ordered by it so the oldest request is dealt with first, and it is the fallback date for when an account was approved. It sits here for the same reason as the column above: for a patient the date was never looked at anywhere in the system.';

COMMENT ON COLUMN healthcare_professionals.license_expiry IS
    'The day the practising licence runs out, given by the professional when registering. There is no "suspended" column: whether an account is suspended is read from this date (license_expiry < CURRENT_DATE), so the answer is right at every moment and no nightly job has to keep it so. What time alone decides is not stored.';

COMMENT ON COLUMN healthcare_professionals.pending_license_expiry IS
    'A renewal date waiting for the admin to accept it; empty when no renewal is in hand. The new date waits here instead of overwriting license_expiry, so a licence is never in force before the admin has said so. Accepted, it moves to license_expiry and is emptied; refused, it is emptied and the old date stands.';

COMMENT ON COLUMN healthcare_professionals.delete_requested_at IS
    'When the professional asked for the account to be closed, empty while no such request is in hand. It is here and not in users because only a doctor or a radiologist can ask, so in users it would stay empty for every patient and every admin for good. It is also the first half of one act whose second half is the column below, and keeping them together lets one row answer where a request has got to.';

COMMENT ON COLUMN healthcare_professionals.deactivated_at IS
    'When the account was taken out of service, empty while it is in service. This is the admin acting on the request above: the asking is recorded there, the decision here, so a request still waiting is one column filled and the other empty. The row is never deleted, because a doctor signs reports and a radiologist uploads X-rays, and removing it would leave medical records with no author.';

-- The admin is not a user of the clinical system but the account that runs it:
-- it holds no national id, owns no case and is never approved by anyone. Keeping
-- it out of users lets national_id be required of every row there without an
-- exception, and lets the three columns below point at the admin alone instead
-- of at any user at all.
CREATE TABLE admins (
    admin_id      SERIAL       PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    -- as in users above: the day this password was last set
    password_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admins_email_format CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

CREATE UNIQUE INDEX admins_email_lower_unique ON admins (lower(email));

-- An address may name one account only, and accounts now live in two tables.
-- No CHECK can look at another table and no foreign key can forbid a value, so
-- the rule is kept by a pair of triggers, one on each side: whichever table is
-- written to, the other is consulted first.
CREATE OR REPLACE FUNCTION email_free_in_admins() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM admins WHERE lower(email) = lower(NEW.email)) THEN
        RAISE EXCEPTION 'email_taken';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION email_free_in_users() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(NEW.email)) THEN
        RAISE EXCEPTION 'email_taken';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER users_email_not_an_admin  BEFORE INSERT OR UPDATE OF email ON users
    FOR EACH ROW EXECUTE FUNCTION email_free_in_admins();

CREATE TRIGGER admins_email_not_a_user   BEFORE INSERT OR UPDATE OF email ON admins
    FOR EACH ROW EXECUTE FUNCTION email_free_in_users();

CREATE TABLE registration_decisions (
    decision_id     SERIAL PRIMARY KEY,
    -- the applicant's name and role are not copied here either: both are read
    -- through professional_id, for the same reason as reports.doctor_id above.
    professional_id INTEGER      NOT NULL
        CONSTRAINT decision_about_a_professional REFERENCES users(user_id) ON DELETE RESTRICT,
    admin_id        INTEGER      NOT NULL
        CONSTRAINT decision_made_by_an_admin REFERENCES admins(admin_id) ON DELETE RESTRICT,
    kind            VARCHAR(15)  NOT NULL DEFAULT 'registration',
    decision        VARCHAR(10)  NOT NULL,
    reason          TEXT,
    decided_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reg_kind_valid CHECK (kind IN ('registration','renewal')),
    CONSTRAINT reg_decision_valid CHECK (decision IN ('approved','rejected')),
    CONSTRAINT reg_reason_required CHECK (decision = 'approved' OR reason IS NOT NULL)
);

COMMENT ON COLUMN registration_decisions.kind IS
    'What was being decided: a first application or a licence renewal. A professional is barred for good after two refused applications, while a refused renewal does not count against that, so the two cannot share one row type. With this column the number of tries left is counted from this table and needs no column of its own: count the rejected rows whose kind is registration.';

CREATE TABLE cases (
    case_id            SERIAL PRIMARY KEY,
    patient_id         INTEGER      NOT NULL
        CONSTRAINT case_belongs_to_a_patient REFERENCES users(user_id) ON DELETE RESTRICT,
    -- There is no "source" column saying whether the patient or a radiologist
    -- sent the X-ray in. It is these two columns compared: the same person on
    -- both sides means the patient sent her own, a different one means a
    -- radiologist sent it for her. Keeping a column as well would be the same
    -- fact written twice, and two copies can come to disagree. No account is
    -- ever deleted (see the note at the top of this file), so uploaded_by is
    -- always there to answer with.
    uploaded_by        INTEGER      NOT NULL
        CONSTRAINT case_uploaded_by_a_user REFERENCES users(user_id) ON DELETE RESTRICT,
    assigned_doctor_id INTEGER
        CONSTRAINT case_assigned_to_a_doctor REFERENCES users(user_id) ON DELETE RESTRICT,
    xray_image_path    VARCHAR(255) NOT NULL UNIQUE,
    -- The language the patient wants her own report written in. It belongs to
    -- the case, not to the account, because the report is written once for
    -- this case and never rewritten; a patient who changes her mind later
    -- would otherwise be left with a report whose language no longer matches
    -- the column. The upload form does not ask the question yet, so the
    -- default stands in until it does.
    report_language    VARCHAR(2)   NOT NULL DEFAULT 'ar',
    status             VARCHAR(20)  NOT NULL DEFAULT 'under_review',
    submitted_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cases_status_valid CHECK (status IN ('under_review','approved')),
    CONSTRAINT cases_report_language_valid CHECK (report_language IN ('ar','en'))
);

COMMENT ON COLUMN cases.uploaded_by IS
    'Who sent the X-ray in: the patient herself, or the radiologist who did it for her. Comparing it with patient_id is what answers that question, which is why there is no column of its own repeating the answer.';

COMMENT ON COLUMN cases.report_language IS
    'The language the patient asked her report to be written in: ar or en. It is chosen once, when the case is sent, and is never changed afterwards, so the report that is written from it can never end up in a language the case no longer names.';

COMMENT ON COLUMN cases.xray_image_path IS
    'Where the file sits under backend/uploads. The file name is a random id, never the case number, so one patient cannot reach another patient''s X-ray by changing a number in the address.';

CREATE TABLE case_history (
    case_id                 INTEGER      PRIMARY KEY
        CONSTRAINT history_belongs_to_a_case REFERENCES cases(case_id) ON DELETE CASCADE,
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
    CONSTRAINT history_height_range CHECK (height_cm BETWEEN 50 AND 270),
    CONSTRAINT history_weight_range CHECK (weight_kg BETWEEN 10 AND 600)
);

CREATE TABLE ai_results (
    case_id            INTEGER      PRIMARY KEY
        CONSTRAINT ai_result_belongs_to_a_case REFERENCES cases(case_id) ON DELETE CASCADE,
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
    case_id      INTEGER      PRIMARY KEY
        CONSTRAINT report_belongs_to_a_case REFERENCES cases(case_id) ON DELETE CASCADE,
    -- the doctor's name is not copied here: it is read through this id. No
    -- account is ever deleted, so the name is always reachable, and one copy
    -- cannot drift from the other.
    doctor_id    INTEGER      NOT NULL
        CONSTRAINT report_signed_by_a_doctor REFERENCES users(user_id) ON DELETE RESTRICT,
    final_grade  SMALLINT     NOT NULL,
    doctor_notes TEXT         NOT NULL,
    -- One report, in one language: the one asked for in cases.report_language.
    -- Keeping an Arabic column and an English one would mean writing every
    -- report twice when the patient only ever reads one of them.
    report_text  TEXT         NOT NULL,
    approved_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reports_grade_valid CHECK (final_grade BETWEEN 0 AND 4)
);

COMMENT ON COLUMN reports.report_text IS
    'The simplified report the patient reads, written from the final grade in the language her case asked for (cases.report_language). It is the patient''s copy of the result, not the doctor''s: doctor_notes holds what the doctor wrote for the record.';

CREATE TABLE case_activity (
    activity_id SERIAL      PRIMARY KEY,
    case_id     INTEGER     NOT NULL
        CONSTRAINT activity_belongs_to_a_case REFERENCES cases(case_id) ON DELETE CASCADE,
    event_type  VARCHAR(20) NOT NULL,
    -- the doctor the event is about, by id and not by name. Two doctors can
    -- share a name, and then a name alone cannot say which one acted.
    doctor_id   INTEGER     NOT NULL
        CONSTRAINT activity_about_a_doctor REFERENCES users(user_id) ON DELETE RESTRICT,
    note        TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT activity_event_valid CHECK (event_type IN ('assigned','reassigned','approved'))
);

CREATE TABLE support_requests (
    request_id SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL
        CONSTRAINT support_sent_by_a_user REFERENCES users(user_id) ON DELETE RESTRICT,
    -- which case the request is about, when it is about one at all.
    -- The request survives the case, so the admin can still read it.
    case_id    INTEGER
        CONSTRAINT support_about_a_case REFERENCES cases(case_id) ON DELETE SET NULL,
    body       TEXT        NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_requests_status_valid CHECK (status IN ('pending','resolved'))
);

CREATE TABLE support_replies (
    reply_id   SERIAL    PRIMARY KEY,
    request_id INTEGER   NOT NULL
        CONSTRAINT reply_answers_a_request REFERENCES support_requests(request_id) ON DELETE CASCADE,
    admin_id   INTEGER   NOT NULL
        CONSTRAINT reply_written_by_an_admin REFERENCES admins(admin_id) ON DELETE RESTRICT,
    body       TEXT      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Accounts live in two tables, so a reset row points at one or the other and
-- never at both. The check below is what makes the pair behave as one column:
-- without it a row could name nobody, or name a user and an admin at once.
CREATE TABLE password_resets (
    reset_id   SERIAL       PRIMARY KEY,
    user_id    INTEGER
        CONSTRAINT reset_for_a_user REFERENCES users(user_id)   ON DELETE CASCADE,
    admin_id   INTEGER
        CONSTRAINT reset_for_an_admin REFERENCES admins(admin_id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reset_belongs_to_one_account
        CHECK ((user_id IS NOT NULL) <> (admin_id IS NOT NULL))
);

CREATE TABLE delay_complaints (
    delay_complaint_id SERIAL      PRIMARY KEY,
    case_id            INTEGER     NOT NULL
        CONSTRAINT delay_about_a_case REFERENCES cases(case_id) ON DELETE CASCADE,
    user_id            INTEGER     NOT NULL
        CONSTRAINT delay_reported_by_a_user REFERENCES users(user_id) ON DELETE RESTRICT,
    status             VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    handled_at         TIMESTAMP,
    handled_by         INTEGER
        CONSTRAINT delay_handled_by_an_admin REFERENCES admins(admin_id) ON DELETE RESTRICT,
    CONSTRAINT delay_status_valid CHECK (status IN ('pending','handled'))
);

-- Only one open delay complaint per case at a time
CREATE UNIQUE INDEX delay_one_open_per_case
    ON delay_complaints (case_id) WHERE status = 'pending';

-- A safety copy of every uploaded image, kept for hosts that clear their disk
-- between restarts (the free Render plan does). The image itself still lives as
-- a file under backend/, and cases.xray_image_path still holds its path; this
-- table only lets filestore.py put a missing file back. It is not an entity of
-- the system, so it does not appear in the ER diagram. filestore.py also
-- creates it with CREATE TABLE IF NOT EXISTS, so a database built from an older
-- copy of this file keeps working.
CREATE TABLE IF NOT EXISTS stored_files (
    path       TEXT        PRIMARY KEY,
    data       BYTEA       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
