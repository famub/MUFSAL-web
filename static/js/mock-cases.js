/* ==========================================================
   MUFSAL - MOCK case data shared by review.js and report.js
   TODO(backend): delete this file once the pages read real cases from the API.
   Case ID format: 6 digits (e.g. 204817). Validate with /^\d{6}$/.
   status: "under_review" (waiting for the doctor) | "approved" (doctor confirmed)
   grade      = grade predicted by the AI
   finalGrade = grade confirmed by the doctor (only when approved; can differ from grade)
   ========================================================== */
window.MUFSAL_MOCK_CASES = [
  /* ---------- waiting for the doctor ---------- */
  { id: "204817", status: "under_review", name: { en: "Noura Alharbi", ar: "نورة الحربي" }, healthId: "HID-100234", source: "patient", date: "2026-11-05", lang: "ar", priority: "high", grade: 3, conf: 0.91, probs: [0.01, 0.02, 0.06, 0.91, 0.00],
    history: { meds: { en: "Ibuprofen 400 mg when needed.", ar: "إيبوبروفين 400 ملغ عند الحاجة." }, q: { pain: "7", stiff: "20 min", stairs: "yes", swell: "yes" } } },
  { id: "381052", status: "under_review", name: { en: "Abdullah Alotaibi", ar: "عبدالله العتيبي" }, healthId: "HID-100871", source: "radiologist", date: "2026-11-04", lang: "en", priority: "high", grade: 4, conf: 0.88, probs: [0.00, 0.00, 0.02, 0.10, 0.88],
    history: { meds: { en: "Paracetamol, topical diclofenac.", ar: "باراسيتامول وديكلوفيناك موضعي." }, q: { pain: "9", stiff: "45 min", stairs: "yes", swell: "yes" } } },
  { id: "517326", status: "under_review", name: { en: "Laila Alsaleh", ar: "ليلى الصالح" }, healthId: "HID-100455", source: "patient", date: "2026-11-05", lang: "en", priority: "medium", grade: 2, conf: 0.62, probs: [0.08, 0.24, 0.62, 0.06, 0.00],
    history: { meds: { en: "None.", ar: "لا يوجد." }, q: { pain: "4", stiff: "10 min", stairs: "no", swell: "no" } } },
  { id: "640293", status: "under_review", name: { en: "Faisal Aldosari", ar: "فيصل الدوسري" }, healthId: "HID-100992", source: "radiologist", date: "2026-11-03", lang: "ar", priority: "low", grade: 1, conf: 0.55, probs: [0.30, 0.55, 0.13, 0.02, 0.00], history: null },
  { id: "729418", status: "under_review", name: { en: "Maha Alqahtani", ar: "مها القحطاني" }, healthId: "HID-100318", source: "patient", date: "2026-11-02", lang: "en", priority: "low", grade: 0, conf: 0.93, probs: [0.93, 0.05, 0.02, 0.00, 0.00],
    history: { meds: { en: "None.", ar: "لا يوجد." }, q: { pain: "2", stiff: "0 min", stairs: "no", swell: "no" } } },

  /* ---------- approved by the doctor (report available) ---------- */
  { id: "118604", status: "approved", name: { en: "Reem Alshehri", ar: "ريم الشهري" }, healthId: "HID-100640", source: "patient", date: "2026-10-28", approvedAt: "2026-10-29",
    lang: "ar", priority: "high", grade: 3, finalGrade: 2, conf: 0.71, probs: [0.02, 0.10, 0.17, 0.71, 0.00],
    doctor: { en: "Dr. Huda Alghamdi", ar: "د. هدى الغامدي" },
    notes: { en: "Joint space narrowing is mild; osteophytes are present but do not match grade 3. Edited to KL2. Advise weight management and physiotherapy; follow-up in 6 months.", ar: "تضيّق المفصل بسيط والنتوءات العظمية موجودة لكنها لا تطابق الدرجة 3. تم التعديل إلى KL2. ننصح بإدارة الوزن والعلاج الطبيعي مع متابعة بعد 6 أشهر." },
    advice: { en: ["Try low-impact exercise such as walking or swimming.", "Keep a healthy weight to reduce pressure on your knee.", "Book a follow-up visit in about 6 months."], ar: ["جرّبي الرياضة الخفيفة على المفاصل مثل المشي أو السباحة.", "حافظي على وزن صحي لتقليل الضغط على الركبة.", "احجزي موعد متابعة بعد 6 أشهر تقريباً."] } },
  { id: "295771", status: "approved", name: { en: "Khalid Almutairi", ar: "خالد المطيري" }, healthId: "HID-100127", source: "radiologist", date: "2026-10-25", approvedAt: "2026-10-26",
    lang: "en", priority: "low", grade: 1, finalGrade: 1, conf: 0.74, probs: [0.20, 0.74, 0.05, 0.01, 0.00],
    doctor: { en: "Dr. Omar Alzahrani", ar: "د. عمر الزهراني" },
    notes: { en: "Doubtful changes only. No treatment needed; recheck if symptoms increase.", ar: "تغيّرات مشكوك فيها فقط. لا حاجة لعلاج، ويُعاد الفحص إذا زادت الأعراض." },
    advice: { en: ["No treatment is needed right now.", "Stay active and keep your leg muscles strong.", "Come back for a check if the pain increases."], ar: ["لا حاجة لعلاج حالياً.", "حافظ على نشاطك وقوّ عضلات الساق.", "راجع الطبيب إذا زاد الألم."] } }
];
