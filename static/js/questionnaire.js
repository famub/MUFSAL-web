/* ==========================================================
   MUFSAL - Medical questionnaire (the questions of the patient registration form)
   - 8 questions. All of them live in this ONE file: to change a question, edit it here.
   - DRAFT: the questions are taken from the team's "Medical Questionnaire - Evidence Base" document
     (NICE NG226 screening, KOOS items, risk factors). Confirm the final list with the supervisor/doctor.
   - These are KOOS-style questions, NOT the scored KOOS-JR (that needs all seven items), so no score is calculated.
   - DRAFT (Arabic): the Arabic wording is a plain translation. For the two KOOS items the document recommends
     the validated Saudi Arabic KOOS wording (Alfadhel et al. 2018) - replace it when you have it.
   - Age and gender are not asked here: they are optional fields of the registration form (and of the profile).
   - Duration of symptoms is written by the patient in the free "Symptoms" box.
   - The profile page can show the answers later by looking each saved value up in this file.
   ========================================================== */
(function () {
  "use strict";

  const YES_NO = [
    { v: "yes", en: "Yes", ar: "نعم" },
    { v: "no",  en: "No",  ar: "لا" }
  ];

  // The five answers of the KOOS questions
  const SCALE = [
    { v: "none",     en: "None",     ar: "لا يوجد" },
    { v: "mild",     en: "Mild",     ar: "خفيف" },
    { v: "moderate", en: "Moderate", ar: "متوسط" },
    { v: "severe",   en: "Severe",   ar: "شديد" },
    { v: "extreme",  en: "Extreme",  ar: "شديد جدًا" }
  ];

  window.MUFSAL_QUESTIONNAIRE = {
    version: 2,

    // Shown under the warning-signs question when a serious sign is ticked
    warningNotice: {
      en: "A hot, swollen knee with a fever needs urgent medical care. MUFSAL is not an emergency service - please go to the nearest emergency department.",
      ar: "الركبة الساخنة والمتورمة مع الحمّى تحتاج إلى رعاية طبية عاجلة. مفصل ليس خدمة طوارئ، يرجى التوجه إلى أقرب قسم طوارئ."
    },

    sections: [
      {
        id: "A", en: "About your knee", ar: "عن الركبة",
        questions: [
          // The KL grade is per knee, so the record cannot be read without this
          { id: "knee", type: "single", en: "Which knee is bothering you?", ar: "أي ركبة تؤلمك؟",
            options: [
              { v: "right", en: "Right", ar: "اليمنى" },
              { v: "left",  en: "Left",  ar: "اليسرى" },
              { v: "both",  en: "Both",  ar: "كلتاهما" }
            ] }
        ]
      },
      {
        id: "B", en: "Clinical screening", ar: "الفحص السريري",
        questions: [
          // The two NICE NG226 criteria that can be asked without examining the patient
          { id: "painWithUse", type: "single", en: "Does your knee pain get worse with movement or use, and ease with rest?",
            ar: "هل يزداد ألم ركبتك مع الحركة أو الاستخدام ويخف مع الراحة؟", options: YES_NO },
          { id: "stiffnessDuration", type: "single", en: "When you wake up, how long does knee stiffness last?",
            ar: "عند الاستيقاظ، كم تستمر ضيقة الركبة (التيبّس)؟",
            options: [
              { v: "none", en: "No stiffness",         ar: "لا يوجد تيبّس" },
              { v: "le30", en: "30 minutes or less",   ar: "30 دقيقة أو أقل" },
              { v: "gt30", en: "More than 30 minutes", ar: "أكثر من 30 دقيقة" }
            ] }
        ]
      },
      {
        id: "C", en: "Symptom severity (last week)", ar: "شدة الأعراض (خلال الأسبوع الماضي)",
        questions: [
          // One pain item and one function item, taken from the KOOS items
          { id: "stairs", type: "single", en: "Pain going up or down stairs",
            ar: "الألم عند صعود الدرج أو نزوله", options: SCALE },
          { id: "rising", type: "single", en: "Difficulty rising from sitting",
            ar: "صعوبة النهوض من وضع الجلوس", options: SCALE }
        ]
      },
      {
        id: "D", en: "Warning signs", ar: "علامات تحذيرية",
        questions: [
          { id: "warnings", type: "multi", exclusive: "none",
            // These two values show the urgent-care notice
            urgent: ["hotSwollen", "fever"],
            en: "Do any of these apply to you now? (choose all that apply)",
            ar: "هل ينطبق عليك أي مما يلي الآن؟ (اختر كل ما ينطبق)",
            options: [
              { v: "injury",     en: "Knee injury or accident in the last 6 weeks", ar: "إصابة أو حادث في الركبة خلال آخر 6 أسابيع" },
              { v: "hotSwollen", en: "Knee is hot, red or very swollen",            ar: "الركبة ساخنة أو حمراء أو متورمة كثيرًا" },
              { v: "fever",      en: "Fever along with the knee pain",               ar: "حمّى مع ألم الركبة" },
              { v: "rapid",      en: "Pain has worsened quickly over recent weeks",  ar: "ازداد الألم بسرعة خلال الأسابيع الأخيرة" },
              { v: "night",      en: "Pain wakes you at night, or unexplained weight loss", ar: "الألم يوقظك ليلًا، أو نقص وزن غير مفسَّر" },
              { v: "none",       en: "None of these",                                ar: "لا شيء مما سبق" }
            ] }
        ]
      },
      {
        id: "E", en: "Risk factors", ar: "عوامل الخطورة",
        questions: [
          { id: "body", type: "body", en: "Your height and weight (used to calculate BMI)", ar: "طولك ووزنك (لحساب مؤشر كتلة الجسم)" },
          { id: "priorInjury", type: "single", en: "Have you ever injured this knee or had knee surgery?",
            ar: "هل سبق أن أصبت في هذه الركبة أو أجريت لها عملية؟", options: YES_NO }
        ]
      }
    ]
  };
})();
