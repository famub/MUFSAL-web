-- MUFSAL - database migration 01
--
-- شغّلي هذا الملف مرة واحدة على قاعدتك بعد سحب (Pull) تعديلات الكود.
-- بدونه الموقع لن يستطيع حفظ أي حالة جديدة: الكود صار يرسل true/false
-- للعمودين، والعمودان ما زالا نصًّا.
--
-- إذا كانت قاعدتك فارغة أو لا يهمك ما فيها، يكفي تشغيل schema.sql ثم
-- seed.sql من جديد بدل هذا الملف — فالاثنان محدّثان أصلًا.

BEGIN;

-- ---------------------------------------------------------------- ١
-- pain_with_use و prior_injury: من 'yes'/'no' إلى BOOLEAN
--
-- داخل نفس الجدول كانت نفس الحقيقة مخزّنة بطريقتين: الأعمدة الخمسة
-- warning_* قيمتها BOOLEAN، بينما هذان العمودان نص 'yes'/'no'. لا سبب
-- للفرق، والنص يمنع الاستعلام المنطقي المباشر:
--     SELECT ... WHERE pain_with_use           ← لا تعمل على نص
--     SELECT count(*) FILTER (WHERE prior_injury)

ALTER TABLE case_history DROP CONSTRAINT IF EXISTS history_pain_with_use_valid;
ALTER TABLE case_history DROP CONSTRAINT IF EXISTS history_prior_injury_valid;

ALTER TABLE case_history
    ALTER COLUMN pain_with_use TYPE BOOLEAN USING (pain_with_use = 'yes'),
    ALTER COLUMN prior_injury  TYPE BOOLEAN USING (prior_injury  = 'yes');

-- لا نضيف CHECK بعدها: نوع BOOLEAN لا يقبل إلا true أو false.

-- ---------------------------------------------------------------- ٢
-- medications: سؤال اختياري، فليقبل الفراغ
--
-- كان العمود NOT NULL والسؤال اختياريًا، فالكود يكتب '-' ليلتفّ على القيد.
-- النتيجة أن القاعدة لا تفرّق بين "لا تأخذ أدوية" و"تأخذ دواءً اسمه شرطة"،
-- وصار في البيانات طريقتان لقول لا شيء: '-' من الكود و'None' من البذرة.
-- الشرطة انتقلت إلى صفحة العرض، حيث مكانها.

ALTER TABLE case_history ALTER COLUMN medications DROP NOT NULL;

UPDATE case_history SET medications = NULL
WHERE medications IN ('-', '', 'None', 'none');

COMMIT;

-- ---------------------------------------------------------------- تحقّق
-- شغّلي هذا بعد الترحيل. المتوقّع: boolean · boolean · YES
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'case_history'
--   AND column_name IN ('pain_with_use', 'prior_injury', 'medications')
-- ORDER BY column_name;
--
-- وهذا يثبت الفائدة — استعلام منطقي ما كان ممكنًا قبل الترحيل:
--
-- SELECT count(*) FILTER (WHERE pain_with_use)                AS pain,
--        count(*) FILTER (WHERE prior_injury)                 AS injured,
--        count(*) FILTER (WHERE pain_with_use AND prior_injury) AS both,
--        count(*) FILTER (WHERE medications IS NULL)          AS no_medicines
-- FROM case_history;
