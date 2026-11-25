-- =====================================================================
-- MUFSAL - demo data for testing
-- Password for every account below: Mufsal@123
-- DELETE THIS FILE'S DATA BEFORE THE FINAL VERSION.
--
-- Dates are written as "so many days ago" instead of fixed dates, so the
-- ten-day delay rule keeps working however long from now the file is run.
-- =====================================================================

-- Clear any previous demo data and restart the id counters
TRUNCATE TABLE users, admins, cases RESTART IDENTITY CASCADE;

-- ---------- accounts ----------
-- 6 patients - 3 doctors - 3 radiologists  (the admin is in its own table below)
INSERT INTO users (user_id, role, full_name, email, password_hash, national_id) VALUES
(2,  'patient',     'Sarah Ahmed',       'sarah@mufsal.test',    '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1011111111'),
(3,  'patient',     'Noura Alharbi',     'noura@mufsal.test',    '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1022222222'),
(4,  'doctor',      'Reem Alqahtani',    'reem@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1033333333'),
(5,  'doctor',      'Khalid Alzahrani',  'khalid@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1044444444'),
(6,  'radiologist', 'Huda Alotaibi',     'huda@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1055555555'),
(7,  'doctor',      'Maha Alsaif',       'maha@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1066666666'),
(8,  'radiologist', 'Lama Alsalem',      'lama@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1077777777'),
(9,  'patient',     'Dana Alqahtani',    'dana@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1088888888'),
(10, 'patient',     'Aisha Almutairi',   'aisha@mufsal.test',    '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1099999999'),
(11, 'patient',     'Fatimah Alshehri',  'fatimah@mufsal.test',  '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1012121212'),
(12, 'patient',     'Abdullah Alharbi',  'abdullah@mufsal.test', '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1013131313'),
(13, 'radiologist', 'Yazeed Alomar',     'yazeed@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1014141414'),
-- 14 and 15 carry the two licence states. They are extra accounts so that the
-- six above keep working as the demo logins everybody already uses.
(14, 'doctor',      'Sultan Alghamdi',   'sultan@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1015151515'),
(15, 'radiologist', 'Amal Alqahtani',    'amal@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1016161616');

-- ---------- accounts whose licence has run out ----------
-- 16 to 19 are only for trying the renewal page. They are their own accounts so
-- the logins above keep working, and so 14 keeps telling the two-tries story.
INSERT INTO users (user_id, role, full_name, email, password_hash, national_id) VALUES
(16, 'doctor',      'Faisal Alharbi',    'faisal@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1017171717'),
(17, 'radiologist', 'Nouf Albarrak',     'nouf@mufsal.test',     '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1018181818'),
(18, 'doctor',      'Tariq Alshamrani',  'tariq@mufsal.test',    '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1019191919'),
(19, 'radiologist', 'Shaden Aldosari',   'shaden@mufsal.test',   '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '1020202020');

-- ---------- the admin, in its own table ----------
INSERT INTO admins (admin_id, full_name, email, password_hash) VALUES
(1, 'MUFSAL Admin', 'admin@mufsal.test', '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.');
SELECT setval('admins_admin_id_seq', 1, true);

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
-- The licence dates are written against today, so every state is there
-- whenever this file is run:
--   4 5 6 7 8 13  licence in force        -> nothing in the way
--   14            licence ran out, a renewal is waiting for the admin
--                 (users.status is 'pending', so he cannot log in meanwhile)
--   15            licence in force, but the account was taken out of service
INSERT INTO healthcare_professionals (user_id, role, scfhs_number, license_expiry, status,
                           pending_license_expiry, deactivated_at) VALUES
(4,  'doctor',      '12-H-48213', CURRENT_DATE + INTERVAL '2 years', 'approved',   NULL, NULL),
(5,  'doctor',      '15-H-52090', CURRENT_DATE + INTERVAL '18 months', 'approved', NULL, NULL),
(6,  'radiologist', '09-R-30177', CURRENT_DATE + INTERVAL '3 years', 'approved',   NULL, NULL),
(7,  'doctor',      '18-H-61004', CURRENT_DATE + INTERVAL '1 year', 'pending',    NULL, NULL),
(8,  'radiologist', '07-R-21550', CURRENT_DATE + INTERVAL '2 years', 'rejected',   NULL, NULL),
(13, 'radiologist', '21-R-70332', CURRENT_DATE + INTERVAL '4 years', 'pending',   NULL, NULL),
(14, 'doctor',      '11-H-40988', CURRENT_DATE - INTERVAL '9 days', 'pending',
                    CURRENT_DATE + INTERVAL '2 years', NULL),
(15, 'radiologist', '16-R-55471', CURRENT_DATE + INTERVAL '2 years', 'approved',
                    NULL, CURRENT_TIMESTAMP - INTERVAL '10 days');

-- ---------- the four expired licences ----------
-- Its own statement because these rows need pending_scfhs_number as well, and
-- the six rows above are left exactly as they are.
--
-- All four are 'approved'. That is not decoration: session_guard.py only sends
-- an account to /license-renewal when status is 'approved', and
-- queries_license.request_renewal only writes for an approved account, so a
-- row with any other status can never reach the page at all.
--   16  ran out 12 days ago  -> the renewal form, nothing sent yet
--   17  ran out 3 days ago   -> the same form, from the radiologist's side
--   18  ran out 40 days ago  -> a renewal already sent and waiting for the admin,
--                              so it also shows in the admin's licence queue
--   19  ran out 25 days ago  -> a renewal the admin refused: the page shows his
--                              reason, and she can send a new one
INSERT INTO healthcare_professionals (user_id, role, scfhs_number, license_expiry, status,
                           pending_scfhs_number, pending_license_expiry) VALUES
(16, 'doctor',      '13-H-44216', CURRENT_DATE - INTERVAL '12 days', 'approved', NULL, NULL),
(17, 'radiologist', '10-R-33820', CURRENT_DATE - INTERVAL '3 days',  'approved', NULL, NULL),
(18, 'doctor',      '08-H-29135', CURRENT_DATE - INTERVAL '40 days', 'approved',
                    '08-H-29135-2', CURRENT_DATE + INTERVAL '2 years'),
(19, 'radiologist', '19-R-66740', CURRENT_DATE - INTERVAL '25 days', 'approved', NULL, NULL);

-- ---------- admin decisions ----------
-- 7 and 13 are left out on purpose: they are the two licences still waiting.
--
-- The 'kind' column is what makes the two-tries rule countable. Lama was
-- turned down twice on her application, so she is barred for good. Sultan
-- was turned down once when he applied, got in on his second try, and has
-- since had a renewal turned down as well - three refusals in all, yet he
-- may still renew, because a refused renewal is not a refused application.
INSERT INTO registration_decisions (professional_id, admin_id, kind, decision, reason, decided_at) VALUES
(4,  1, 'registration', 'approved', NULL, CURRENT_TIMESTAMP - INTERVAL '200 days'),
(5,  1, 'registration', 'approved', NULL, CURRENT_TIMESTAMP - INTERVAL '180 days'),
(6,  1, 'registration', 'approved', NULL, CURRENT_TIMESTAMP - INTERVAL '150 days'),
(15, 1, 'registration', 'approved', NULL, CURRENT_TIMESTAMP - INTERVAL '140 days'),
-- Lama: two refused applications -> may never apply again
(8,  1, 'registration', 'rejected', 'The SCFHS registration number could not be verified.', CURRENT_TIMESTAMP - INTERVAL '60 days'),
(8,  1, 'registration', 'rejected', 'The number still does not match the SCFHS register.',   CURRENT_TIMESTAMP - INTERVAL '20 days'),
-- Sultan: refused once, then let in, and a renewal refused after that
(14, 1, 'registration', 'rejected', 'The licence photograph was unreadable.',  CURRENT_TIMESTAMP - INTERVAL '400 days'),
(14, 1, 'registration', 'approved', NULL,                                      CURRENT_TIMESTAMP - INTERVAL '390 days'),
(14, 1, 'renewal',      'rejected', 'The renewal certificate had no stamp.',   CURRENT_TIMESTAMP - INTERVAL '5 days');

-- The four expired accounts were all let in when they applied, years before
-- their licence ran out. Shaden is the one whose renewal was refused, which is
-- the reason her page shows below the form.
INSERT INTO registration_decisions (professional_id, admin_id, kind, decision, reason, decided_at) VALUES
(16, 1, 'registration', 'approved', NULL, CURRENT_TIMESTAMP - INTERVAL '900 days'),
(17, 1, 'registration', 'approved', NULL, CURRENT_TIMESTAMP - INTERVAL '820 days'),
(18, 1, 'registration', 'approved', NULL, CURRENT_TIMESTAMP - INTERVAL '760 days'),
(19, 1, 'registration', 'approved', NULL, CURRENT_TIMESTAMP - INTERVAL '640 days'),
(19, 1, 'renewal',      'rejected', 'The licence certificate had already expired on the day it was sent.',
                                               CURRENT_TIMESTAMP - INTERVAL '4 days');

-- =====================================================================
-- CASES
-- Each one is here to test a different state of the site.
-- A patient never has two cases under review at once, which is the rule
-- the site enforces.
-- =====================================================================

-- report_language is the language the patient asked her own report in. Both
-- values appear below, so a reader of the data can see that the choice is the
-- patient's and not the page's.
INSERT INTO cases (case_id, patient_id, uploaded_by, assigned_doctor_id, xray_image_path, report_language, status, submitted_at) VALUES
-- 1  Sarah, 2 days ago       -> in progress, the delay button is still off
(1,  2,  2,  4, 'uploads/xrays/1.png', 'ar', 'under_review', CURRENT_TIMESTAMP - INTERVAL '2 days'),
-- 2  Noura, by a radiologist -> finished, grade 1 (green)
(2,  3,  6,  5, 'uploads/xrays/2.png', 'ar', 'approved',     CURRENT_TIMESTAMP - INTERVAL '20 days'),
-- 3  Dana, 12 days ago       -> in progress, the delay button is ON
(3,  9,  9,  4, 'uploads/xrays/3.png', 'ar', 'under_review', CURRENT_TIMESTAMP - INTERVAL '12 days'),
-- 4  Aisha, 15 days ago      -> in progress with a delay already reported
(4,  10, 10, 5, 'uploads/xrays/4.png', 'en', 'under_review', CURRENT_TIMESTAMP - INTERVAL '15 days'),
-- 5  Abdullah, radiologist   -> finished, grade 3 (red), asked for English
(5,  12, 6,  4, 'uploads/xrays/5.png', 'en', 'approved',     CURRENT_TIMESTAMP - INTERVAL '30 days'),
-- 6  Sarah, older case       -> finished, grade 0 (green)
(6,  2,  2,  5, 'uploads/xrays/6.png', 'ar', 'approved',     CURRENT_TIMESTAMP - INTERVAL '60 days'),
-- 7  Noura, older case       -> finished, grade 2 (amber), had a delay that was handled
(7,  3,  3,  4, 'uploads/xrays/7.png', 'en', 'approved',     CURRENT_TIMESTAMP - INTERVAL '45 days'),
-- 8  Abdullah, 5 days ago    -> in progress with NO AI result, the way a real upload arrives today
(8,  12, 12, 5, 'uploads/xrays/8.png', 'ar', 'under_review', CURRENT_TIMESTAMP - INTERVAL '5 days'),
-- 9  Aisha, older case       -> finished, grade 4 (red)
(9,  10, 10, 4, 'uploads/xrays/9.png', 'ar', 'approved',     CURRENT_TIMESTAMP - INTERVAL '40 days');

SELECT setval('cases_case_id_seq', (SELECT MAX(case_id) FROM cases));

-- ---------- what each patient answered ----------
INSERT INTO case_history (case_id, medications, knee, pain_with_use, stiffness_duration, stairs_pain,
                          rising_difficulty, warning_injury, warning_hot_swollen, warning_fever,
                          warning_rapid_worsening, warning_night_pain, other_symptoms,
                          height_cm, weight_kg, prior_injury) VALUES
(1, 'Paracetamol when needed', 'right', TRUE,  'le30', 'severe',   'moderate', FALSE, TRUE,  FALSE, FALSE, FALSE,
    'Mild swelling in the evening', 162, 78.00, FALSE),
(2, NULL,                      'left',  TRUE,  'gt30', 'mild',     'none',     FALSE, FALSE, FALSE, FALSE, FALSE,
    NULL, 158, 64.00, TRUE),
(3, 'Ibuprofen twice a day',   'right', TRUE,  'gt30', 'moderate', 'moderate', TRUE,  FALSE, FALSE, FALSE, TRUE,
    'It clicks when I stand up', 167, 81.50, TRUE),
(4, NULL,                      'left',  FALSE, 'none', 'mild',     'mild',     FALSE, FALSE, FALSE, FALSE, FALSE,
    NULL, 155, 70.00, FALSE),
(5, 'Diclofenac gel',          'right', TRUE,  'gt30', 'extreme',  'severe',   FALSE, TRUE,  FALSE, TRUE,  TRUE,
    'I cannot walk more than ten minutes', 174, 95.00, TRUE),
(6, NULL,                      'left',  FALSE, 'none', 'none',     'none',     FALSE, FALSE, FALSE, FALSE, FALSE,
    NULL, 162, 76.00, FALSE),
(7, 'Paracetamol at night',    'right', TRUE,  'le30', 'moderate', 'mild',     FALSE, FALSE, FALSE, FALSE, FALSE,
    NULL, 158, 66.00, FALSE),
(8, NULL,                      'left',  TRUE,  'le30', 'mild',     'none',     TRUE,  FALSE, FALSE, FALSE, FALSE,
    'I slipped on the stairs last week', 174, 94.00, FALSE),
(9, 'Panadol and a knee brace','right', TRUE,  'gt30', 'extreme',  'extreme',  FALSE, FALSE, FALSE, FALSE, TRUE,
    'The knee gives way sometimes', 155, 88.00, TRUE);

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
-- Each report is written in the language its own case asked for: cases 2, 6
-- and 9 asked for Arabic, cases 5 and 7 for English.
INSERT INTO reports (case_id, doctor_id, final_grade, doctor_notes, report_text, approved_at) VALUES
(2, 5, 1,
 'Joint space narrowing is minimal and the osteophytes do not match grade 2. Changed to KL1.',
 'نتيجة أشعة الركبة: الدرجة KL1 (تغيّرات بسيطة جدًا). راجع طبيبك لأي استفسار.',
 CURRENT_TIMESTAMP - INTERVAL '18 days'),

(5, 4, 3,
 'Clear joint space narrowing with large osteophytes. The model agrees. Referred to orthopaedics.',
 'Your knee X-ray result: KL3 (moderate to severe changes). Talk to your doctor if you have questions.',
 CURRENT_TIMESTAMP - INTERVAL '28 days'),

(6, 5, 0,
 'No narrowing and no osteophytes. A healthy knee.',
 'نتيجة أشعة الركبة: الدرجة KL0 (لا توجد علامات خشونة). راجع طبيبك لأي استفسار.',
 CURRENT_TIMESTAMP - INTERVAL '58 days'),

(7, 4, 2,
 'Definite osteophytes and possible narrowing. Grade 2 confirmed.',
 'Your knee X-ray result: KL2 (mild changes). Talk to your doctor if you have questions.',
 CURRENT_TIMESTAMP - INTERVAL '41 days'),

(9, 4, 4,
 'Severe narrowing with bone deformity. Urgent orthopaedic referral.',
 'نتيجة أشعة الركبة: الدرجة KL4 (تغيّرات شديدة). راجع طبيبك لأي استفسار.',
 CURRENT_TIMESTAMP - INTERVAL '37 days');

-- ---------- the trail of what happened to each case ----------
INSERT INTO case_activity (case_id, event_type, doctor_id, note, created_at) VALUES
(1, 'assigned',   4,   'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(2, 'assigned',   5, 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '20 days'),
(2, 'approved',   5, 'The doctor approved the case and changed the grade from 2 to 1.', CURRENT_TIMESTAMP - INTERVAL '18 days'),
(3, 'assigned',   4,   'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '12 days'),
(4, 'assigned',   5, 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '15 days'),
(5, 'assigned',   4,   'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '30 days'),
(5, 'approved',   4,   'The doctor approved the case and kept the grade at 3.', CURRENT_TIMESTAMP - INTERVAL '28 days'),
(6, 'assigned',   5, 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '60 days'),
(6, 'approved',   5, 'The doctor approved the case and kept the grade at 0.', CURRENT_TIMESTAMP - INTERVAL '58 days'),
(7, 'assigned',   5, 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '45 days'),
(7, 'reassigned', 4,   'Moved to another doctor after the patient reported a delay.', CURRENT_TIMESTAMP - INTERVAL '43 days'),
(7, 'approved',   4,   'The doctor approved the case and kept the grade at 2.', CURRENT_TIMESTAMP - INTERVAL '41 days'),
(8, 'assigned',   5, 'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(9, 'assigned',   4,   'Assigned to the doctor with the fewest open cases.', CURRENT_TIMESTAMP - INTERVAL '40 days'),
(9, 'approved',   4,   'The doctor approved the case and kept the grade at 4.', CURRENT_TIMESTAMP - INTERVAL '37 days');

-- ---------- delays reported with the button on a case ----------
-- One still open, so the admin's "Delayed requests" page has something in it,
-- and one already handled, so the history shows both states.
INSERT INTO delay_complaints (case_id, user_id, status, created_at, handled_at, handled_by) VALUES
(4, 10, 'pending', CURRENT_TIMESTAMP - INTERVAL '3 days',  NULL, NULL),
(7, 3,  'handled', CURRENT_TIMESTAMP - INTERVAL '44 days', CURRENT_TIMESTAMP - INTERVAL '43 days', 1);

-- ---------- written support requests ----------
-- A request is 'pending' until the admin answers it; the answer is what
-- makes it 'resolved'. Both states appear below.
INSERT INTO support_requests (user_id, case_id, body, status, created_at) VALUES
(2,  6,    'I received my report but the grade explanation uses medical terms I did not understand.', 'resolved',      CURRENT_TIMESTAMP - INTERVAL '50 days'),
(2,  NULL, 'The upload box kept rejecting my X-ray photo even though it was a JPG under 5 MB.',        'pending',       CURRENT_TIMESTAMP - INTERVAL '6 days'),
(9,  3,    'I would like to know whether I can upload the other knee before this one comes back.',     'pending',       CURRENT_TIMESTAMP - INTERVAL '9 days'),
(4,  1,    'The model marked this one high priority but the X-ray looks mild to me. Worth a check.',   'pending',       CURRENT_TIMESTAMP - INTERVAL '1 day'),
(6,  NULL, 'The page times out when I upload two X-rays one after the other.',                         'resolved',      CURRENT_TIMESTAMP - INTERVAL '25 days');

INSERT INTO support_replies (request_id, admin_id, body, created_at) VALUES
(1, 1, 'Thank you for telling us. We have rewritten the grade explanation in plainer words.', CURRENT_TIMESTAMP - INTERVAL '48 days'),
(5, 1, 'Fixed. The upload now waits for the first X-ray to finish before starting the second.', CURRENT_TIMESTAMP - INTERVAL '23 days');
