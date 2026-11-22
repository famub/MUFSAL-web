"""MUFSAL - case queries: upload, AI result, doctor review and reports."""
from db import get_connection
import filestore


def _yes_no(value):
    """The upload form sends 'yes' or 'no'; the two columns are BOOLEAN.

    Translating here keeps the forms, their templates and their texts working
    with the words the patient sees, while the database stores a real true or
    false it can filter and count on. A value that is already a boolean, as the
    tests send, passes through unchanged.
    """
    if isinstance(value, str):
        return value == "yes"
    return bool(value)


def _pick_doctor(conn):
    """Return the approved doctor with the fewest open cases."""
    row = conn.execute(
        """
        SELECT u.user_id
        FROM users u
        JOIN professionals p ON p.user_id = u.user_id
        LEFT JOIN cases c ON c.assigned_doctor_id = u.user_id
                         AND c.status = 'under_review'
        WHERE u.role = 'doctor' AND p.status = 'approved'
          AND p.deactivated_at IS NULL
        GROUP BY u.user_id
        ORDER BY COUNT(c.case_id) ASC, u.user_id ASC
        LIMIT 1
        """
    ).fetchone()
    return row["user_id"] if row else None


def create_case(patient_id, uploaded_by, xray_image_path, history):
    """Save a new X-ray with its medical history and assign it to a doctor.

    'history' is a dict with the answers of the upload form.
    Returns the new case_id.

    Who sent the X-ray in is not saved on its own. Pass the patient's own id
    as uploaded_by when she sends it herself, and the radiologist's id when he
    sends it for her; every query works the answer out by comparing the two.
    """
    with get_connection() as conn:
        doctor_id = _pick_doctor(conn)

        case = conn.execute(
            """
            INSERT INTO cases (patient_id, uploaded_by, assigned_doctor_id, xray_image_path)
            VALUES (%s, %s, %s, %s)
            RETURNING case_id
            """,
            (patient_id, uploaded_by, doctor_id, xray_image_path),
        ).fetchone()

        conn.execute(
            """
            INSERT INTO case_history (
                case_id, medications, knee, pain_with_use, stiffness_duration,
                stairs_pain, rising_difficulty, warning_injury, warning_hot_swollen,
                warning_fever, warning_rapid_worsening, warning_night_pain,
                other_symptoms, height_cm, weight_kg, prior_injury)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (case["case_id"],
             history["medications"],
             history["knee"],
             _yes_no(history["pain_with_use"]),
             history["stiffness_duration"],
             history["stairs_pain"],
             history["rising_difficulty"],
             history.get("warning_injury", False),
             history.get("warning_hot_swollen", False),
             history.get("warning_fever", False),
             history.get("warning_rapid_worsening", False),
             history.get("warning_night_pain", False),
             history.get("other_symptoms"),
             history["height_cm"],
             history["weight_kg"],
             _yes_no(history["prior_injury"])),
        )

        if doctor_id is not None:
            conn.execute(
                """
                INSERT INTO case_activity (case_id, event_type, doctor_id, note)
                VALUES (%s, 'assigned', %s, 'Assigned to the doctor with the fewest open cases.')
                """,
                (case["case_id"], doctor_id),
            )

    filestore.save(xray_image_path)   # keep a copy of the X-ray in the database
    return case["case_id"]


def save_ai_result(case_id, predicted_grade, confidence, probabilities,
                   priority, gradcam_image_path):
    """Store the model output. 'probabilities' is a list of five numbers."""
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO ai_results (
                case_id, predicted_grade, confidence,
                prob_grade_0, prob_grade_1, prob_grade_2, prob_grade_3, prob_grade_4,
                priority, gradcam_image_path)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (case_id, predicted_grade, confidence,
             probabilities[0], probabilities[1], probabilities[2],
             probabilities[3], probabilities[4],
             priority, gradcam_image_path),
        )
    filestore.save(gradcam_image_path)   # keep a copy of the heatmap in the database


def get_doctor_cases(doctor_id, status="under_review"):
    """Return one doctor's cases, most urgent first."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, c.status, c.submitted_at,
                   CASE WHEN c.uploaded_by = c.patient_id THEN 'patient' ELSE 'radiologist' END AS source,
                   p.full_name AS patient_name, p.national_id,
                   a.predicted_grade, a.confidence, a.priority
            FROM cases c
            JOIN users p ON p.user_id = c.patient_id
            LEFT JOIN ai_results a ON a.case_id = c.case_id
            WHERE c.assigned_doctor_id = %s AND c.status = %s
            ORDER BY CASE a.priority WHEN 'high' THEN 1
                                     WHEN 'medium' THEN 2
                                     ELSE 3 END,
                     a.predicted_grade DESC NULLS LAST,   -- backlog: by predicted grade
                     a.confidence DESC NULLS LAST,        -- and confidence score
                     c.submitted_at ASC
            """,
            (doctor_id, status),
        ).fetchall()


def get_case(case_id):
    """Return everything about one case: patient, history, AI result and report."""
    with get_connection() as conn:
        case = conn.execute(
            """
            SELECT c.*,
                   -- who sent the X-ray in, worked out from the two ids rather
                   -- than read from a column of its own
                   CASE WHEN c.uploaded_by = c.patient_id
                        THEN 'patient' ELSE 'radiologist' END AS source,
                   p.full_name AS patient_name, p.national_id,
                   pt.date_of_birth, pt.gender
            FROM cases c
            JOIN users p ON p.user_id = c.patient_id
            LEFT JOIN patients pt ON pt.user_id = c.patient_id
            WHERE c.case_id = %s
            """,
            (case_id,),
        ).fetchone()
        if case is None:
            return None

        case["history"] = conn.execute(
            "SELECT * FROM case_history WHERE case_id = %s", (case_id,)
        ).fetchone()
        case["ai_result"] = conn.execute(
            "SELECT * FROM ai_results WHERE case_id = %s", (case_id,)
        ).fetchone()
        case["report"] = conn.execute(
            # the doctor's name is read through doctor_id, not kept in reports
            """
            SELECT r.*, doc.full_name AS doctor_name
            FROM reports r JOIN users doc ON doc.user_id = r.doctor_id
            WHERE r.case_id = %s
            """,
            (case_id,),
        ).fetchone()
    return case


def approve_case(case_id, doctor_id, final_grade, doctor_notes, report_text):
    """Save the doctor's report and mark the case as approved.

    One report is saved, in the language the case asked for: see
    cases.report_language.
    """
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO reports (case_id, doctor_id, final_grade,
                                 doctor_notes, report_text)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (case_id, doctor_id, final_grade, doctor_notes, report_text),
        )

        conn.execute(
            "UPDATE cases SET status = 'approved' WHERE case_id = %s", (case_id,)
        )

        conn.execute(
            """
            INSERT INTO case_activity (case_id, event_type, doctor_id, note)
            VALUES (%s, 'approved', %s, 'The doctor approved the case.')
            """,
            (case_id, doctor_id),
        )


def get_patient_cases(patient_id):
    """Return a patient's own cases, newest first."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, c.status, c.submitted_at,
                   CASE WHEN c.uploaded_by = c.patient_id THEN 'patient' ELSE 'radiologist' END AS source,
                   r.final_grade, r.report_text, r.approved_at,
                   doc.full_name AS doctor_name
            FROM cases c
            LEFT JOIN reports r ON r.case_id = c.case_id
            LEFT JOIN users doc ON doc.user_id = r.doctor_id
            WHERE c.patient_id = %s
            ORDER BY c.submitted_at DESC
            """,
            (patient_id,),
        ).fetchall()


def get_patient_case_numbers(patient_id):
    """What each of this patient's cases is called on the patient's own pages.

    case_id counts every case in MUFSAL, so a patient's very first X-ray can
    land on #100 and read as though ninety-nine of hers came before it. On
    her pages a case is numbered among her own instead: her oldest is 1 and
    each new one takes the next number up, whether she uploaded it herself
    or a radiologist linked it to her.

    Nothing is stored for this. The order is worked out from the dates every
    time it is asked for, so the numbers can never drift out of step with the
    cases. The doctor, the radiologist and the administrator go on seeing the
    real case_id, which is what the whole system is filed under.

    Returns {real case_id: the number the patient sees}.
    """
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT case_id
            FROM cases
            WHERE patient_id = %s
            -- case_id breaks the tie, so two X-rays sent in the same second
            -- keep the same order every time the page is drawn
            ORDER BY submitted_at, case_id
            """,
            (patient_id,),
        ).fetchall()
    return {row["case_id"]: place for place, row in enumerate(rows, start=1)}


def find_patient_by_national_id(national_id):
    """Used by the radiologist to link an X-ray to a registered patient."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT u.user_id, u.full_name, u.national_id, pt.date_of_birth, pt.gender
            FROM users u
            JOIN patients pt ON pt.user_id = u.user_id
            WHERE u.national_id = %s
            """,
            (national_id,),
        ).fetchone()
