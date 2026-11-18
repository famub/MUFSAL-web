-- =====================================================================
-- MUFSAL - demo data for testing
-- Password for every account below: Mufsal@123
-- DELETE THIS FILE'S DATA BEFORE THE FINAL VERSION.
--
-- Dates are written as "so many days ago" instead of fixed dates, so the
-- ten-day delay rule keeps working however long from now the file is run.
-- =====================================================================

-- Clear any previous demo data and restart the id counters
TRUNCATE TABLE users, cases RESTART IDENTITY CASCADE;

-- ---------- accounts ----------
-- 1 admin - 6 patients - 3 doctors - 3 radiologists
INSERT INTO users (user_id, role, full_name, email, password_hash, phone, national_id, status) VALUES
(1,  'admin',       'MUFSAL Admin',      'admin@mufsal.test',    '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', NULL,           NULL,         'approved'),
(2,  'patient',     'Sarah Ahmed',       'sarah@mufsal.test',    '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966501111111', '1011111111', 'approved'),
(3,  'patient',     'Noura Alharbi',     'noura@mufsal.test',    '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966502222222', '1022222222', 'approved'),
(4,  'doctor',      'Reem Alqahtani',    'reem@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966503333333', '1033333333', 'approved'),
(5,  'doctor',      'Khalid Alzahrani',  'khalid@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966504444444', '1044444444', 'approved'),
(6,  'radiologist', 'Huda Alotaibi',     'huda@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966505555555', '1055555555', 'approved'),
(7,  'doctor',      'Maha Alsaif',       'maha@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966506666666', '1066666666', 'pending'),
(8,  'radiologist', 'Lama Alsalem',      'lama@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966507777777', '1077777777', 'rejected'),
(9,  'patient',     'Dana Alqahtani',    'dana@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966508888888', '1088888888', 'approved'),
(10, 'patient',     'Aisha Almutairi',   'aisha@mufsal.test',    '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966509999999', '1099999999', 'approved'),
(11, 'patient',     'Fatimah Alshehri',  'fatimah@mufsal.test',  '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966501212121', '1012121212', 'approved'),
(12, 'patient',     'Abdullah Alharbi',  'abdullah@mufsal.test', '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966501313131', '1013131313', 'approved'),
(13, 'radiologist', 'Yazeed Alomar',     'yazeed@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966501414141', '1014141414', 'pending');

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- ---------- patient details ----------
INSERT INTO patients (user_id, date_of_birth, gender) VALUES
(2,  '1990-04-12', 'female'),
(3,  '1975-09-30', 'female'),
(9,  '1988-01-20', 'female'),
(10, '1968-06-05', 'female'),
(11, '2001-11-02', 'female'),
(12, '1959-03-17', 'male');

-- ---------- professional details ----------
INSERT INTO professionals (user_id, scfhs_number) VALUES
(4,  '12-H-48213'),
(5,  '15-H-52090'),
(6,  '09-R-30177'),
(7,  '18-H-61004'),
(8,  '07-R-21550'),
(13, '21-R-70332');

-- ---------- admin decisions ----------
-- 7 and 13 are left out on purpose: they are the two licences still waiting
INSERT INTO registration_decisions (professional_id, admin_id, applicant_name, applicant_role, decision, reason) VALUES
(4, 1, 'Reem Alqahtani',   'doctor',      'approved', NULL),
(5, 1, 'Khalid Alzahrani', 'doctor',      'approved', NULL),
(6, 1, 'Huda Alotaibi',    'radiologist', 'approved', NULL),
(8, 1, 'Lama Alsalem',     'radiologist', 'rejected', 'The SCFHS registration number could not be verified.');

-- =====================================================================
-- CASES
-- Each one is here to test a different state of the site.
-- A patient never has two cases under review at once, which is the rule
-- the site enforces.
-- =====================================================================

INSERT INTO cases (case_id, patient_id, uploaded_by, source, assigned_doctor_id, xray_image_path, status, submitted_at) VALUES
-- 1  Sarah, 2 days ago       -> in progress, the delay button is still off
(1,  2,  2,  'patient',     4, 'uploads/xrays/1.png', 'under_review', CURRENT_TIMESTAMP - INTERVAL '2 days'),
-- 2  Noura, by a radiologist -> finished, grade 1 (green)
(2,  3,  6,  'radiologist', 5, 'uploads/xrays/2.png', 'approved',     CURRENT_TIMESTAMP - INTERVAL '20 days'),
-- 3  Dana, 12 days ago       -> in progress, the delay button is ON
(3,  9,  9,  'patient',     4, 'uploads/xrays/3.png', 'under_review', CURRENT_TIMESTAMP - INTERVAL '12 days'),
-- 4  Aisha, 15 days ago      -> in progress with a delay already reported
(4,  10, 10, 'patient',     5, 'uploads/xrays/4.png', 'under_review', CURRENT_TIMESTAMP - INTERVAL '15 days'),
-- 5  Abdullah, radiologist   -> finished, grade 3 (red)
(5,  12, 6,  'radiologist', 4, 'uploads/xrays/5.png', 'approved',     CURRENT_TIMESTAMP - INTERVAL '30 days'),
-- 6  Sarah, older case       -> finished, grade 0 (green)
(6,  2,  2,  'patient',     5, 'uploads/xrays/6.png', 'approved',     CURRENT_TIMESTAMP - INTERVAL '60 days'),
-- 7  Noura, older case       -> finished, grade 2 (amber), had a delay that was handled
(7,  3,  3,  'patient',     4, 'uploads/xrays/7.png', 'approved',     CURRENT_TIMESTAMP - INTERVAL '45 days'),
-- 8  Abdullah, 5 days ago    -> in progress with NO AI result, the way a real upload arrives today
(8,  12, 12, 'patient',     5, 'uploads/xrays/8.png', 'under_review', CURRENT_TIMESTAMP - INTERVAL '5 days'),
-- 9  Aisha, older case       -> finished, grade 4 (red)
(9,  10, 10, 'patient',     4, 'uploads/xrays/9.png', 'approved',     CURRENT_TIMESTAMP - INTERVAL '40 days');

SELECT setval('cases_case_id_seq', (SELECT MAX(case_id) FROM cases));

-- ---------- what each patient answered ----------
INSERT INTO case_history (case_id, medications, knee, pain_with_use, stiffness_duration, stairs_pain,
                          rising_difficulty, warning_injury, warning_hot_swollen, warning_fever,
                          warning_rapid_worsening, warning_night_pain, other_symptoms,
                          height_cm, weight_kg, prior_injury) VALUES
(1, 'Paracetamol when needed', 'right', 'yes', 'le30', 'severe',   'moderate', FALSE, TRUE,  FALSE, FALSE, FALSE,
    'Mild swelling in the evening', 162, 78.00, 'no'),
(2, 'None',                    'left',  'yes', 'gt30', 'mild',     'none',     FALSE, FALSE, FALSE, FALSE, FALSE,
    NULL, 158, 64.00, 'yes'),
(3, 'Ibuprofen twice a day',   'right', 'yes', 'gt30', 'moderate', 'moderate', TRUE,  FALSE, FALSE, FALSE, TRUE,
    'It clicks when I stand up', 167, 81.50, 'yes'),
(4, 'None',                    'left',  'no',  'none', 'mild',     'mild',     FALSE, FALSE, FALSE, FALSE, FALSE,
    NULL, 155, 70.00, 'no'),
(5, 'Diclofenac gel',          'right', 'yes', 'gt30', 'extreme',  'severe',   FALSE, TRUE,  FALSE, TRUE,  TRUE,
    'I cannot walk more than ten minutes', 174, 95.00, 'yes'),
(6, 'None',                    'left',  'no',  'none', 'none',     'none',     FALSE, FALSE, FALSE, FALSE, FALSE,
    NULL, 162, 76.00, 'no'),
(7, 'Paracetamol at night',    'right', 'yes', 'le30', 'moderate', 'mild',     FALSE, FALSE, FALSE, FALSE, FALSE,
    NULL, 158, 66.00, 'no'),
(8, 'None',                    'left',  'yes', 'le30', 'mild',     'none',     TRUE,  FALSE, FALSE, FALSE, FALSE,
    'I slipped on the stairs last week', 174, 94.00, 'no'),
(9, 'Panadol and a knee brace','right', 'yes', 'gt30', 'extreme',  'extreme',  FALSE, FALSE, FALSE, FALSE, TRUE,
    'The knee gives way sometimes', 155, 88.00, 'yes');

-- ---------- what the model said ----------
-- Case 8 is left out on purpose: that is how a case looks today, before the
-- model is wired in, and the doctor's page has to cope with it.
INSERT INTO ai_results (case_id, predicted_grade, confidence, prob_grade_0, prob_grade_1, prob_grade_2,
                        prob_grade_3, prob_grade_4, priority, gradcam_image_path) VALUES
(1, 3, 0.910, 0.010, 0.020, 0.060, 0.910, 0.000, 'high',   'uploads/gradcam/1.png'),
(2, 2, 0.620, 0.080, 0.240, 0.620, 0.060, 0.000, 'medium', 'uploads/gradcam/2.png'),
(3, 2, 0.740, 0.020, 0.110, 0.740, 0.120, 0.010, 'medium', 'uploads/gradcam/3.png'),
(4, 1, 0.580, 0.300, 0.580, 0.100, 0.020, 0.000, 'low',    'uploads/gradcam/4.png'),
(5, 3, 0.880, 0.000, 0.010, 0.080, 0.880, 0.030, 'high',   'uploads/gradcam/5.png'),
(6, 0, 0.930, 0.930, 0.060, 0.010, 0.000, 0.000, 'low',    'uploads/gradcam/6.png'),
(7, 2, 0.690, 0.040, 0.180, 0.690, 0.090, 0.000, 'medium', 'uploads/gradcam/7.png'),
(9, 4, 0.950, 0.000, 0.000, 0.010, 0.040, 0.950, 'high',   'uploads/gradcam/9.png');

-- ---------- the reports the doctors signed ----------
-- Grades 0, 1, 2, 3 and 4 all appear, so every colour on the scale can be seen
INSERT INTO reports (case_id, doctor_id, doctor_name, final_grade, doctor_notes, report_ar, report_en, approved_at) VALUES
(2, 5, 'Khalid Alzahrani', 1,
 'Joint space narrowing is minimal and the osteophytes do not match grade 2. Changed to KL1.',
 'نتيجة أشعة الركبة: الدرجة KL1 (تغيّرات بسيطة جدًا). راجع طبيبك لأي استفسار.',
 'Your knee X-ray result: KL1 (very mild changes). Talk to your doctor if you have questions.',
 CURRENT_TIMESTAMP - INTERVAL '18 days'),

(5, 4, 'Reem Alqahtani', 3,
 'Clear joint space narrowing with large osteophytes. The model agrees. Referred to orthopaedics.',
 'نتيجة أشعة الركبة: الدرجة KL3 (تغيّرات متوسطة إلى شديدة). راجع طبيبك لأي استفسار.',
 'Your knee X-ray result: KL3 (moderate to severe changes). Talk to your doctor if you have questions.',
 CURRENT_TIMESTAMP - INTERVAL '28 days'),

(6, 5, 'Khalid Alzahrani', 0,
 'No narrowing and no osteophytes. A healthy knee.',
 'نتيجة أشعة الركبة: الدرجة KL0 (لا توجد علامات خشونة). راجع طبيبك لأي استفسار.',
 'Your knee X-ray result: KL0 (no signs of osteoarthritis). Talk to your doctor if you have questions.',
 CURRENT_TIMESTAMP - INTERVAL '58 days'),

(7, 4, 'Reem Alqahtani', 2,
 'Definite osteophytes and possible narrowing. Grade 2 confirmed.',
 'نتيجة أشعة الركبة: الدرجة KL2 (تغيّرات بسيطة). راجع طبيبك لأي استفسار.',
 'Your knee X-ray result: KL2 (mild changes). Talk to your doctor if you have questions.',
 CURRENT_TIMESTAMP - INTERVAL '41 days'),

(9, 4, 'Reem Alqahtani', 4,
 'Severe narrowing with bone deformity. Urgent orthopaedic referral.',
 'نتيجة أشعة الركبة: الدرجة KL4 (تغيّرات شديدة). راجع طبيبك لأي استفسار.',
 'Your knee X-ray result: KL4 (severe changes). Talk to your doctor if you have questions.',
 CURRENT_TIMESTAMP - INTERVAL '37 days');

-- ---------- the trail of what happened to each case ----------
INSERT INTO case_activity (case_id, event_type, doctor_name, note, created_at) VALUES
(1, 'assigned',   'Reem Alqahtani',   'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(2, 'assigned',   'Khalid Alzahrani', 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '20 days'),
(2, 'approved',   'Khalid Alzahrani', 'The doctor approved the case and changed the grade from 2 to 1.', CURRENT_TIMESTAMP - INTERVAL '18 days'),
(3, 'assigned',   'Reem Alqahtani',   'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '12 days'),
(4, 'assigned',   'Khalid Alzahrani', 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '15 days'),
(5, 'assigned',   'Reem Alqahtani',   'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '30 days'),
(5, 'approved',   'Reem Alqahtani',   'The doctor approved the case and kept the grade at 3.', CURRENT_TIMESTAMP - INTERVAL '28 days'),
(6, 'assigned',   'Khalid Alzahrani', 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '60 days'),
(6, 'approved',   'Khalid Alzahrani', 'The doctor approved the case and kept the grade at 0.', CURRENT_TIMESTAMP - INTERVAL '58 days'),
(7, 'assigned',   'Khalid Alzahrani', 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '45 days'),
(7, 'reassigned', 'Reem Alqahtani',   'Moved to another doctor after the patient reported a delay.', CURRENT_TIMESTAMP - INTERVAL '43 days'),
(7, 'approved',   'Reem Alqahtani',   'The doctor approved the case and kept the grade at 2.', CURRENT_TIMESTAMP - INTERVAL '41 days'),
(8, 'assigned',   'Khalid Alzahrani', 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(9, 'assigned',   'Reem Alqahtani',   'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '40 days'),
(9, 'approved',   'Reem Alqahtani',   'The doctor approved the case and kept the grade at 4.', CURRENT_TIMESTAMP - INTERVAL '37 days');

-- ---------- delays reported with the button on a case ----------
-- One still open, so the admin's "Delayed requests" page has something in it,
-- and one already handled, so the history shows both states.
INSERT INTO delay_complaints (case_id, user_id, status, created_at, handled_at, handled_by) VALUES
(4, 10, 'pending', CURRENT_TIMESTAMP - INTERVAL '3 days',  NULL, NULL),
(7, 3,  'handled', CURRENT_TIMESTAMP - INTERVAL '44 days', CURRENT_TIMESTAMP - INTERVAL '43 days', 1);

-- ---------- written complaints ----------
-- The subjects match the choices the site offers, so they read the same way
-- here as they do on the screen.
INSERT INTO complaints (user_id, case_id, subject, body, status, created_at) VALUES
(2,  6,    'Something in my report',  'I received my report but the grade explanation uses medical terms I did not understand.', 'resolved',      CURRENT_TIMESTAMP - INTERVAL '50 days'),
(2,  NULL, 'A problem with the site', 'The upload box kept rejecting my X-ray photo even though it was a JPG under 5 MB.',        'open',          CURRENT_TIMESTAMP - INTERVAL '6 days'),
(9,  3,    'Something else',          'I would like to know whether I can upload the other knee before this one comes back.',     'investigating', CURRENT_TIMESTAMP - INTERVAL '9 days'),
(4,  1,    'Something in a report',   'The model marked this one high priority but the X-ray looks mild to me. Worth a check.',   'open',          CURRENT_TIMESTAMP - INTERVAL '1 day'),
(6,  NULL, 'A problem with the site', 'The page times out when I upload two X-rays one after the other.',                         'resolved',      CURRENT_TIMESTAMP - INTERVAL '25 days');

INSERT INTO complaint_replies (complaint_id, admin_id, body, created_at) VALUES
(1, 1, 'Thank you for telling us. We have rewritten the grade explanation in plainer words.', CURRENT_TIMESTAMP - INTERVAL '48 days'),
(5, 1, 'Fixed. The upload now waits for the first X-ray to finish before starting the second.', CURRENT_TIMESTAMP - INTERVAL '23 days');
