-- =====================================================================
-- MUFSAL - demo data for testing
-- Password for every account below: Mufsal@123
-- DELETE THIS FILE'S DATA BEFORE THE FINAL VERSION.
-- =====================================================================

-- Clear any previous demo data and restart the id counters
TRUNCATE TABLE users, cases RESTART IDENTITY CASCADE;

-- ---------- accounts ----------
INSERT INTO users (user_id, role, full_name, email, password_hash, phone, national_id, status) VALUES
(1, 'admin',       'MUFSAL Admin',    'admin@mufsal.test',  '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', NULL,           NULL,         'approved'),
(2, 'patient',     'Sarah Ahmed',     'sarah@mufsal.test',  '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966501111111', '1011111111', 'approved'),
(3, 'patient',     'Noura Alharbi',   'noura@mufsal.test',  '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966502222222', '1022222222', 'approved'),
(4, 'doctor',      'Reem Alqahtani',  'reem@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966503333333', '1033333333', 'approved'),
(5, 'doctor',      'Khalid Alzahrani','khalid@mufsal.test', '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966504444444', '1044444444', 'approved'),
(6, 'radiologist', 'Huda Alotaibi',   'huda@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966505555555', '1055555555', 'approved'),
(7, 'doctor',      'Maha Alsaif',     'maha@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966506666666', '1066666666', 'pending'),
(8, 'radiologist', 'Lama Alsalem',    'lama@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966507777777', '1077777777', 'rejected');

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- ---------- patient details ----------
INSERT INTO patients (user_id, date_of_birth, gender) VALUES
(2, '1990-04-12', 'female'),
(3, '1975-09-30', 'female');

-- ---------- professional details ----------
INSERT INTO professionals (user_id, scfhs_number) VALUES
(4, '12-H-48213'),
(5, '15-H-52090'),
(6, '09-R-30177'),
(7, '18-H-61004'),
(8, '07-R-21550');

-- ---------- admin decisions ----------
INSERT INTO registration_decisions (professional_id, admin_id, applicant_name, applicant_role, decision, reason) VALUES
(4, 1, 'Reem Alqahtani',   'doctor',      'approved', NULL),
(5, 1, 'Khalid Alzahrani', 'doctor',      'approved', NULL),
(6, 1, 'Huda Alotaibi',    'radiologist', 'approved', NULL),
(8, 1, 'Lama Alsalem',     'radiologist', 'rejected', 'The SCFHS registration number could not be verified.');

-- ---------- case 1: uploaded by the patient, still under review ----------
INSERT INTO cases (case_id, patient_id, uploaded_by, source, assigned_doctor_id, xray_image_path, status) VALUES
(1, 2, 2, 'patient', 4, 'uploads/xrays/1.png', 'under_review');

INSERT INTO case_history (case_id, medications, knee, pain_with_use, stiffness_duration, stairs_pain,
                          rising_difficulty, warning_hot_swollen, other_symptoms, height_cm, weight_kg, prior_injury) VALUES
(1, 'Paracetamol when needed', 'right', 'yes', 'le30', 'severe', 'moderate', TRUE,
 'Mild swelling in the evening', 162, 78.00, 'no');

INSERT INTO ai_results (case_id, predicted_grade, confidence, prob_grade_0, prob_grade_1, prob_grade_2,
                        prob_grade_3, prob_grade_4, priority, gradcam_image_path) VALUES
(1, 3, 0.910, 0.010, 0.020, 0.060, 0.910, 0.000, 'high', 'uploads/gradcam/1.png');

INSERT INTO case_activity (case_id, event_type, doctor_name, note) VALUES
(1, 'assigned', 'Reem Alqahtani', 'Assigned to the doctor with the fewest open cases.');

-- ---------- case 2: uploaded by the radiologist, approved by the doctor ----------
INSERT INTO cases (case_id, patient_id, uploaded_by, source, assigned_doctor_id, xray_image_path, status) VALUES
(2, 3, 6, 'radiologist', 5, 'uploads/xrays/2.png', 'approved');

INSERT INTO case_history (case_id, medications, knee, pain_with_use, stiffness_duration, stairs_pain,
                          rising_difficulty, height_cm, weight_kg, prior_injury) VALUES
(2, 'None', 'left', 'yes', 'gt30', 'mild', 'none', 158, 64.00, 'yes');

INSERT INTO ai_results (case_id, predicted_grade, confidence, prob_grade_0, prob_grade_1, prob_grade_2,
                        prob_grade_3, prob_grade_4, priority, gradcam_image_path) VALUES
(2, 2, 0.620, 0.080, 0.240, 0.620, 0.060, 0.000, 'medium', 'uploads/gradcam/2.png');

INSERT INTO reports (case_id, doctor_id, doctor_name, final_grade, doctor_notes, report_ar, report_en) VALUES
(2, 5, 'Khalid Alzahrani', 1,
 'Joint space narrowing is minimal and the osteophytes do not match grade 2. Changed to KL1.',
 'The X-ray shows very mild changes in the left knee. No treatment is needed for now; stay active and see your doctor if the pain increases.',
 'The X-ray shows very mild changes in the left knee. No treatment is needed for now; stay active and see your doctor if the pain increases.');

INSERT INTO case_activity (case_id, event_type, doctor_name, note) VALUES
(2, 'assigned', 'Khalid Alzahrani', 'Assigned to the doctor with the fewest open cases.'),
(2, 'approved', 'Khalid Alzahrani', 'The doctor approved the case and changed the grade from 2 to 1.');

SELECT setval('cases_case_id_seq', (SELECT MAX(case_id) FROM cases));

-- ---------- complaints ----------
INSERT INTO complaints (user_id, subject, body, status) VALUES
(2, 'The report is hard to understand', 'I received my report but the grade explanation uses medical terms I did not understand.', 'open'),
(4, 'The Grad-CAM heatmap is faint', 'On some images the heatmap is hard to see. Please review the contrast.', 'investigating');

INSERT INTO complaint_replies (complaint_id, admin_id, body) VALUES
(2, 1, 'Thank you for the note, we are working on making the heatmap clearer.');
