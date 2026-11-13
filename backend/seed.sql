-- =====================================================================
-- MUFSAL - demo data for testing
-- Password for every account below: Mufsal@123
-- DELETE THIS FILE'S DATA BEFORE THE FINAL VERSION.
-- =====================================================================

-- ---------- accounts ----------
INSERT INTO users (user_id, role, full_name, email, password_hash, phone, national_id, status) VALUES
(1, 'admin',       'MUFSAL Admin',    'admin@mufsal.test',       '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', NULL,           NULL,         'approved'),
(2, 'patient',     'سارة أحمد',        'sarah@mufsal.test',       '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966501111111', '1011111111', 'approved'),
(3, 'patient',     'نورة الحربي',      'noura@mufsal.test',       '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966502222222', '1022222222', 'approved'),
(4, 'doctor',      'د. ريم القحطاني',  'reem@mufsal.test',        '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966503333333', '1033333333', 'approved'),
(5, 'doctor',      'د. خالد الزهراني', 'khalid@mufsal.test',      '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966504444444', '1044444444', 'approved'),
(6, 'radiologist', 'هدى العتيبي',      'huda@mufsal.test',        '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966505555555', '1055555555', 'approved'),
(7, 'doctor',      'د. مها السيف',     'maha@mufsal.test',        '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966506666666', '1066666666', 'pending'),
(8, 'radiologist', 'لمى الصالح',       'lama@mufsal.test',        '$2b$12$X8wlVJ1IUoITjh5DYvr0Cee2CxdVlwiG4.BtF.cXefhvSBJcoIfS.', '966507777777', '1077777777', 'rejected');

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- ---------- patient details ----------
INSERT INTO patients (user_id, date_of_birth, gender) VALUES
(2, '1990-04-12', 'female'),
(3, '1975-09-30', 'female');

-- ---------- professional details ----------
INSERT INTO professionals (user_id, scfhs_number, license_file_path) VALUES
(4, '12-H-48213', 'uploads/licenses/4.pdf'),
(5, '15-H-52090', 'uploads/licenses/5.pdf'),
(6, '09-R-30177', 'uploads/licenses/6.pdf'),
(7, '18-H-61004', 'uploads/licenses/7.pdf'),
(8, '07-R-21550', 'uploads/licenses/8.pdf');

-- ---------- admin decisions ----------
INSERT INTO registration_decisions (professional_id, admin_id, applicant_name, applicant_role, decision, reason) VALUES
(4, 1, 'د. ريم القحطاني',  'doctor',      'approved', NULL),
(5, 1, 'د. خالد الزهراني', 'doctor',      'approved', NULL),
(6, 1, 'هدى العتيبي',      'radiologist', 'approved', NULL),
(8, 1, 'لمى الصالح',       'radiologist', 'rejected', 'رقم التسجيل المهني لم يتم التحقق منه.');

-- ---------- case 1: uploaded by the patient, still under review ----------
INSERT INTO cases (case_id, patient_id, uploaded_by, source, assigned_doctor_id, xray_image_path, status) VALUES
(1, 2, 2, 'patient', 4, 'uploads/xrays/1.png', 'under_review');

INSERT INTO case_history (case_id, medications, knee, pain_with_use, stiffness_duration, stairs_pain,
                          rising_difficulty, warning_hot_swollen, other_symptoms, height_cm, weight_kg, prior_injury) VALUES
(1, 'باراسيتامول عند الحاجة', 'right', 'yes', 'le30', 'severe', 'moderate', TRUE, 'تورم خفيف في المساء', 162, 78.00, 'no');

INSERT INTO ai_results (case_id, predicted_grade, confidence, prob_grade_0, prob_grade_1, prob_grade_2,
                        prob_grade_3, prob_grade_4, priority, gradcam_image_path) VALUES
(1, 3, 0.910, 0.010, 0.020, 0.060, 0.910, 0.000, 'high', 'uploads/gradcam/1.png');

INSERT INTO case_activity (case_id, event_type, doctor_name, note) VALUES
(1, 'assigned', 'د. ريم القحطاني', 'أُسندت تلقائياً للطبيب صاحب أقل عدد حالات مفتوحة.');

-- ---------- case 2: uploaded by the radiologist, approved by the doctor ----------
INSERT INTO cases (case_id, patient_id, uploaded_by, source, assigned_doctor_id, xray_image_path, status) VALUES
(2, 3, 6, 'radiologist', 5, 'uploads/xrays/2.png', 'approved');

INSERT INTO case_history (case_id, medications, knee, pain_with_use, stiffness_duration, stairs_pain,
                          rising_difficulty, height_cm, weight_kg, prior_injury) VALUES
(2, 'لا يوجد', 'left', 'yes', 'gt30', 'mild', 'none', 158, 64.00, 'yes');

INSERT INTO ai_results (case_id, predicted_grade, confidence, prob_grade_0, prob_grade_1, prob_grade_2,
                        prob_grade_3, prob_grade_4, priority, gradcam_image_path) VALUES
(2, 2, 0.620, 0.080, 0.240, 0.620, 0.060, 0.000, 'medium', 'uploads/gradcam/2.png');

INSERT INTO reports (case_id, doctor_id, doctor_name, final_grade, doctor_notes, report_ar, report_en) VALUES
(2, 5, 'د. خالد الزهراني', 1,
 'تضيّق المفصل بسيط، والنتوءات العظمية لا تطابق الدرجة 2. تم التعديل إلى KL1.',
 'تشير صورة الأشعة إلى تغيّرات بسيطة جداً في الركبة اليسرى. لا حاجة لعلاج حالياً، مع الحفاظ على النشاط البدني ومراجعة الطبيب إذا زاد الألم.',
 'The X-ray shows very mild changes in the left knee. No treatment is needed for now; stay active and see your doctor if the pain increases.');

INSERT INTO case_activity (case_id, event_type, doctor_name, note) VALUES
(2, 'assigned', 'د. خالد الزهراني', 'أُسندت تلقائياً للطبيب صاحب أقل عدد حالات مفتوحة.'),
(2, 'approved', 'د. خالد الزهراني', 'اعتمد الطبيب الحالة وعدّل الدرجة من 2 إلى 1.');

SELECT setval('cases_case_id_seq', (SELECT MAX(case_id) FROM cases));

-- ---------- complaints ----------
INSERT INTO complaints (user_id, subject, body, urgency, status) VALUES
(2, 'التقرير صعب الفهم', 'استلمت تقريري لكن شرح الدرجة فيه مصطلحات طبية لم أفهمها.', 'medium', 'open'),
(4, 'خريطة Grad-CAM باهتة', 'في بعض الصور تكون الخريطة الحرارية صعبة الرؤية. أرجو مراجعة التباين.', 'low', 'investigating');

INSERT INTO complaint_replies (complaint_id, admin_id, body) VALUES
(2, 1, 'شكراً لملاحظتك، جارٍ العمل على تحسين وضوح الخريطة.');
