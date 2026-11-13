"""MUFSAL - case queries: upload, AI result, doctor review and reports."""
from db import get_connection


def _pick_doctor(conn):
    """Return the approved doctor with the fewest open cases."""
    row = conn.execute(
        """
        SELECT u.user_id
        FROM users u
        LEFT JOIN cases c ON c.assigned_doctor_id = u.user_id
                         AND c.status = 'under_review'
        WHERE u.role = 'doctor' AND u.status = 'approved'
        GROUP BY u.user_id
        ORDER BY COUNT(c.case_id) ASC, u.user_id ASC
        LIMIT 1
        """
    ).fetchone()
    return row["user_id"] if row else None


def create_case(patient_id, uploaded_by, source, xray_image_path, history):
    """Save a new X-ray with its medical history and assign it to a doctor.

    'history' is a dict with the answers of the upload form.
    Returns the new case_id.
    """
    with get_connection() as conn:
        doctor_id = _pick_doctor(conn)

        case = conn.execute(
            """
            INSERT INTO cases (patient_id, uploaded_by, source, assigned_doctor_id, xray_image_path)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING case_id
            """,
            (patient_id, uploaded_by, source, doctor_id, xray_image_path),
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
             history["pain_with_use"],
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
             history["prior_injury"]),
        )

        if doctor_id is not None:
            doctor = conn.execute(
                "SELECT full_name FROM users WHERE user_id = %s", (doctor_id,)
            ).fetchone()
            conn.execute(
                """
                INSERT INTO case_activity (case_id, event_type, doctor_name, note)
                VALUES (%s, 'assigned', %s, 'Assigned to the doctor with the fewest open cases.')
                """,
                (case["case_id"], doctor["full_name"]),
            )

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


def get_doctor_cases(doctor_id, status="under_review"):
    """Return one doctor's cases, most urgent first."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, c.status, c.source, c.submitted_at,
                   p.full_name AS patient_name, p.national_id,
                   a.predicted_grade, a.confidence, a.priority
            FROM cases c
            JOIN users p ON p.user_id = c.patient_id
            LEFT JOIN ai_results a ON a.case_id = c.case_id
            WHERE c.assigned_doctor_id = %s AND c.status = %s
            ORDER BY CASE a.priority WHEN 'high' THEN 1
                                     WHEN 'medium' THEN 2
                                     ELSE 3 END,
                     c.submitted_at ASC
            """,
            (doctor_id, status),
        ).fetchall()


def get_case(case_id):
    """Return everything about one case: patient, history, AI result and report."""
    with get_connection() as conn:
        case = conn.execute(
            """
            SELECT c.*, p.full_name AS patient_name, p.national_id, p.phone,
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
            "SELECT * FROM reports WHERE case_id = %s", (case_id,)
        ).fetchone()
    return case


def approve_case(case_id, doctor_id, final_grade, doctor_notes, report_ar, report_en):
    """Save the doctor's report and mark the case as approved."""
    with get_connection() as conn:
        doctor = conn.execute(
            "SELECT full_name FROM users WHERE user_id = %s", (doctor_id,)
        ).fetchone()

        conn.execute(
            """
            INSERT INTO reports (case_id, doctor_id, doctor_name, final_grade,
                                 doctor_notes, report_ar, report_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (case_id, doctor_id, doctor["full_name"], final_grade,
             doctor_notes, report_ar, report_en),
        )

        conn.execute(
            "UPDATE cases SET status = 'approved' WHERE case_id = %s", (case_id,)
        )

        conn.execute(
            """
            INSERT INTO case_activity (case_id, event_type, doctor_name, note)
            VALUES (%s, 'approved', %s, 'The doctor approved the case.')
            """,
            (case_id, doctor["full_name"]),
        )


def get_patient_cases(patient_id):
    """Return a patient's own cases, newest first."""
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.case_id, c.status, c.submitted_at, c.source,
                   r.final_grade, r.report_ar, r.report_en, r.approved_at, r.doctor_name
            FROM cases c
            LEFT JOIN reports r ON r.case_id = c.case_id
            WHERE c.patient_id = %s
            ORDER BY c.submitted_at DESC
            """,
            (patient_id,),
        ).fetchall()


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