# تعديلات قاعدة البيانات — بانتظار التنسيق

قائمة مفتوحة نضيف لها كل ما نراجع جدول. **لا تُطبَّق واحدة واحدة** — نطبّقها دفعة
واحدة بعد التنسيق، لأن بعضها يلمس ملفات مشتركة.

كل تعديل مُختبَر على نسخة من قاعدة البيانات قبل ما ينكتب هنا.

---

## ✅ طُبِّق

### 1. مسار صورة الأشعة لا يتكرر

```sql
ALTER TABLE cases ADD CONSTRAINT cases_xray_image_path_unique UNIQUE (xray_image_path);
```

**ليش:** صورة واحدة تخص حالة واحدة. لو أشارت حالتان لنفس الملف، حذف إحداهما يخرّب الثانية.
**الحالة:** مكتوب في `schema.sql` ✅ — كل وحدة تشغّل السطر أعلاه على قاعدتها.

### 2. توثيق الأسباب داخل قاعدة البيانات

`COMMENT ON` على `cases.source` و `cases.xray_image_path` و `ai_results.priority`.
**الحالة:** في `schema.sql` ✅

---

## ⏳ جاهزة ومُختبَرة — تنتظر التنسيق

### 4. الإيميل لا يتكرر باختلاف حالة الأحرف

```sql
CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));
```

**المشكلة (مُثبتة بالتجربة):** `UNIQUE` في PostgreSQL حسّاس لحالة الأحرف، فـ`SARAH@mufsal.test`
تُقبل بجانب `sarah@mufsal.test` → حسابان بنفس الإيميل.
**يلمس الكود؟** لا. يُفضَّل أن يبحث تسجيل الدخول بـ`lower(email)` أيضًا.

### 5. السجل الفرعي يجب أن يطابق الدور

```sql
ALTER TABLE users ADD CONSTRAINT users_id_role_unique UNIQUE (user_id, role);

ALTER TABLE patients
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'patient' CHECK (role = 'patient'),
    ADD CONSTRAINT patients_is_a_patient
        FOREIGN KEY (user_id, role) REFERENCES users(user_id, role) ON DELETE CASCADE;
```

ومثلها لـ`professionals` بدورين (`doctor`, `radiologist`).

**المشكلة (مُثبتة بالتجربة):** أدخلنا طبيبة في جدول `patients` وقاعدة البيانات **قبلتها**.
المفتاح الأجنبي يتحقق أن المستخدم موجود، لا أن دوره صحيح.
**يلمس الكود؟** لا.

### 6. إجابات نعم/لا تصير BOOLEAN

```sql
ALTER TABLE case_history
    DROP CONSTRAINT history_pain_with_use_valid,
    ALTER COLUMN pain_with_use TYPE BOOLEAN USING (pain_with_use = 'yes');

ALTER TABLE case_history
    DROP CONSTRAINT history_prior_injury_valid,
    ALTER COLUMN prior_injury TYPE BOOLEAN USING (prior_injury = 'yes');
```

**المشكلة:** داخل نفس الجدول، نفس نوع الحقيقة مخزّن بطريقتين — `warning_fever` قيمتها
BOOLEAN بينما `pain_with_use` نص `'yes'/'no'`. لا يوجد سبب للفرق.
**يلمس الكود؟ نعم — ٨ مواضع في ٣ ملفات:**
`queries_cases.py` · `routes_new_case.py` · `routes_review.py`

### 7. الأدوية حقل اختياري فليقبل الفراغ

```sql
ALTER TABLE case_history ALTER COLUMN medications DROP NOT NULL;
UPDATE case_history SET medications = NULL WHERE medications IN ('-', '', 'None');
```

**المشكلة:** العمود `NOT NULL` والسؤال اختياري، فالكود يكتب `'-'` ليلتف على القيد.
النتيجة أن قاعدة البيانات لا تفرّق بين "لا تأخذ أدوية" و"تأخذ دواءً اسمه شرطة"،
والبيانات فيها الآن طريقتان لقول لا شيء: `'-'` من الكود و`'None'` من البذرة.
**يلمس الكود؟ نعم — ٣ أسطر:** `routes_patient.py:586` · `routes_new_case.py:177` · `routes_radiologist.py:124`
يُرسل `None` بدل `"-"`.

### 11. سجل الأحداث يعرف الطبيب بالاسم فقط

```sql
ALTER TABLE case_activity
    ADD COLUMN doctor_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
```

**المشكلة (مُثبتة بالتجربة):** `case_activity` يحفظ `doctor_name` بلا `doctor_id`، فسؤال
"كم حالة أُسندت للطبيبة ريم؟" يُجاب بمطابقة نص. أدخلنا طبيبة ثانية بنفس الاسم
(`Reem Alqahtani`) فصار السجل لا يميّز بينهما.

**ليش نبقي الاسم أيضًا؟** نفس نمط `reports`: المعرّف للربط والاستعلام، والاسم لقطة
تبقى بعد حذف الحساب (`ON DELETE SET NULL` يفرّغ المعرّف ويترك الاسم شاهدًا).
سجل التدقيق يجب أن يظل مقروءًا حتى لو اختفى صاحبه.

**يلمس الكود؟ نعم — ٣ مواضع `INSERT`:**
`queries_cases.py:73` (assigned) · `queries_cases.py:176` (approved) · `queries_delays.py:114` (reassigned)
كلها تمرّر `doctor["full_name"]` فقط → تمرّر `doctor["user_id"]` كمان.

---

## 🗳️ تنتظر قرارًا من خارج الفريق التقني

### 8. حالة ثالثة: صورة غير صالحة للقراءة

```sql
ALTER TABLE cases DROP CONSTRAINT cases_status_valid;
ALTER TABLE cases ADD CONSTRAINT cases_status_valid
    CHECK (status IN ('under_review','approved','needs_new_xray'));
```

**السبب:** اليوم إذا كانت الصورة ضبابية أو لغير الركبة، لا يملك الطبيب إلا أن يعتمدها بدرجة ما.
**القرار عند:** الدكتورة المشرفة.

### 9. هل مجموع احتمالات النموذج = ١؟  ← **يحتاج تحققًا قبل أي قرار**

درجة KL واحدة من خمس يستبعد بعضها بعضًا، فالمتوقع أن النموذج يعطي softmax ومجموعه ١.
**لكن هذا لم يُتحقَّق منه:** الأرقام تأتي جاهزة من النموذج على Hugging Face،
و`model_service.py` ينقلها فقط. البيانات التجريبية مجموعها ١ لأننا كتبناها كذلك — دليل دائري.

**كيف نتحقق:** بعد أول رفع حقيقي يمر على النموذج، شغّلي:

```sql
SELECT case_id, confidence,
       prob_grade_0 + prob_grade_1 + prob_grade_2 + prob_grade_3 + prob_grade_4 AS total,
       GREATEST(prob_grade_0,prob_grade_1,prob_grade_2,prob_grade_3,prob_grade_4) AS biggest
FROM ai_results ORDER BY case_id DESC LIMIT 1;
```

- `total` ≈ ١ → نضيف القيد:
  ```sql
  ALTER TABLE ai_results ADD CONSTRAINT ai_probabilities_sum_to_one
      CHECK (prob_grade_0 + prob_grade_1 + prob_grade_2 + prob_grade_3 + prob_grade_4
             BETWEEN 0.98 AND 1.02);
  ```
- `total` شيء آخر → لا نضيف شيئًا، والاحتمالات مستقلة لا متنافية.

**لماذا الانتظار:** لو أضفنا القيد وكان الافتراض خاطئًا، لفشل حفظ كل نتيجة،
و`analyze_case` يبتلع الخطأ ويسجّله بصمت — فتبقى الحالات بلا تحليل دون أن يظهر سبب.

### 10. عمود بلا أي استخدام

`ai_results.analyzed_at` — لم يُذكر في أي ملف في المشروع.
الأرجح حذفه، إلا إذا أرادته مسؤولة الذكاء الاصطناعي لقياس زمن التحليل.

---

## ✔️ قرارات اتُّخذت ولا تحتاج عملًا

- **الاحتمالات الخمسة تبقى** (قرار شهد). `predicted_grade` و`confidence` مشتقّان منها
  في البيانات التجريبية على الأقل — انظر البند ٩ قبل إضافة أي قيد يحرس ذلك.
- **`priority` يبقى مخزّنًا** لا محسوبًا تلقائيًا: هو قرار فرز اتُّخذ بلحظته، وإعادة حسابه
  تغيّر قرارات ماضية. موثّق بـ`COMMENT`.
- **`gradcam_image_path` يبقى إلزاميًا**: الكود الجديد ينتج الخريطة فعليًا، ولا يحفظ الصف إذا فشل النموذج.
- **غياب صف في `ai_results`** هو ما يعني "لم يُحلَّل بعد" — لا حاجة لعمود حالة.
- **لا حاجة لأثر تصحيح التقرير** (قرار شهد): التقرير وثيقة موقَّعة غير قابلة للتعديل
  بالتصميم. `reports_pkey` يمنع تقريرًا ثانيًا للحالة، وصفحة المراجعة ترفض فتح حالة
  معتمدة. ولو احتجنا يومًا معرفة أن الطبيب عدّل درجة الذكاء الاصطناعي، المقارنة بين
  `ai_results.predicted_grade` و`reports.final_grade` تجيب على ذلك باستعلام.

---

## 📌 ملاحظة أداء (تُجمَع في النهاية)

PostgreSQL **لا ينشئ فهارس للمفاتيح الأجنبية تلقائيًا**. فحصنا القاعدة: كل الفهارس
الموجودة هي مفاتيح أساسية و`UNIQUE` فقط — **ولا مفتاح أجنبي واحد مفهرس**، رغم أن معظم
الاستعلامات تبحث بها (حالات المريض، حالات الطبيب، شكاوى المستخدم...).
تُجمَع في أمر واحد بعد انتهاء مراجعة الجداول.
