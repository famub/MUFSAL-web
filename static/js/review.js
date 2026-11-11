/* ==========================================================
   MUFSAL - Doctor case review (shared script for review-cases.html and review-case.html)
   - Works with MOCK data now. Every place that needs the backend is marked TODO(backend).
   - Bilingual (EN / AR) with the header's #lang-toggle button.
   ========================================================== */
(function () {
  "use strict";

  /* ---------------- Language (EN / AR) ---------------- */
  const T = {
    en: {
      reviewCases: "Case review", reviewSub: "Cases waiting for your review, highest priority first.",
      all: "All", high: "High", medium: "Medium", low: "Low",
      search: "Search by patient name", colPatient: "Patient", colSource: "Source", colDate: "Submitted",
      colPriority: "Priority", review: "Review",
      srcPatient: "Patient-submitted", srcRadiologist: "Radiologist-linked",
      noCases: "There are no pending cases.", noMatch: "No cases match your search.",
      back: "Back to cases", caseNo: "Case", pending: "Pending review", approved: "Approved",
      xray: "X-ray image", showHeat: "Show heatmap", noImage: "X-ray image will appear here",
      heatHint: "The highlighted areas are the regions that influenced the AI prediction most.",
      aiResult: "AI result", klGrade: "KL grade", confidence: "Confidence score",
      probs: "Probability for each grade", editAi: "Edit AI result", editedBy: "Edited by doctor. AI predicted KL",
      newGrade: "New KL grade (0 to 4)", save: "Save", cancel: "Cancel",
      errGrade: "Please enter a whole number from 0 to 4.",
      caseInfo: "Case information", patient: "Patient", healthId: "Health ID", source: "Source",
      submitted: "Submitted", reportLang: "Report language", priority: "Priority",
      history: "Medical history",
      noHistory: "The patient did not provide medical history.",
      decision: "Doctor decision", notes: "Clinical notes", notesPh: "Write your clinical notes about this case...",
      notesHint: "Clinical notes are required before you can confirm the result.",
      errNotes: "Please enter clinical notes before confirming.",
      finalGrade: "Final KL grade", confirm: "Confirm result",
      confirmedMsg: "Result confirmed. The simplified report was generated and is now available to the patient",
      andRad: " and the radiologist", pendingNote: "Until you confirm, the case stays pending.",
      disclaimer: "MUFSAL supports clinical decision-making and does not replace the doctor's judgment.",
      langName: { ar: "Arabic", en: "English" },
      kl: ["Healthy knee", "Doubtful", "Minimal", "Moderate", "Severe"],
      klDesc: [
        "No signs of osteoarthritis.",
        "Doubtful joint narrowing with possible osteophytic lipping.",
        "Definite osteophytes and possible joint space narrowing.",
        "Multiple osteophytes, definite joint space narrowing, mild sclerosis.",
        "Large osteophytes, significant joint narrowing, severe sclerosis."
      ],
      qn: {
        sections: [
          { title: "About your knee", rows: [{ k: "knee", q: "Which knee is bothering you?", o: { right: "Right", left: "Left", both: "Both" } }] },
          { title: "Clinical screening", rows: [
            { k: "movement", q: "Does your knee pain get worse with movement or use, and ease with rest?", o: { yes: "Yes", no: "No" } },
            { k: "stiffness", q: "When you wake up, how long does knee stiffness last?", o: { none: "No stiffness", le30: "30 minutes or less", gt30: "More than 30 minutes" } }] },
          { title: "Symptom severity (last week)", rows: [
            { k: "stairs", q: "Pain going up or down stairs", o: { none: "None", mild: "Mild", moderate: "Moderate", severe: "Severe", extreme: "Extreme" } },
            { k: "rising", q: "Difficulty rising from sitting", o: { none: "None", mild: "Mild", moderate: "Moderate", severe: "Severe", extreme: "Extreme" } }] },
          { title: "Warning signs", rows: [{ k: "warnings", q: "Do any of these apply to you now?", multi: true, o: {
            injury: "Knee injury or accident in the last 6 weeks", hot: "Knee is hot, red or very swollen", fever: "Fever along with the knee pain",
            worsened: "Pain has worsened quickly over recent weeks", night: "Pain wakes you at night, or unexplained weight loss" } }] },
          { title: "Risk factors", rows: [
            { k: "body", q: "Height and weight" },
            { k: "prior", q: "Have you ever injured this knee or had knee surgery?", o: { yes: "Yes", no: "No" } }] }
        ],
        none: "None of these", cm: "cm", kg: "kg", bmi: "BMI"
      },
      yes: "Yes", no: "No", min: "min"
    },
    ar: {
      reviewCases: "مراجعة الحالات", reviewSub: "الحالات بانتظار مراجعتك، الأعلى أولوية أولاً.",
      all: "الكل", high: "عالية", medium: "متوسطة", low: "منخفضة",
      search: "ابحث باسم المريض", colPatient: "المريض", colSource: "المصدر", colDate: "تاريخ الإرسال",
      colPriority: "الأولوية", review: "مراجعة",
      srcPatient: "مرفوعة من المريض", srcRadiologist: "مرفوعة من الأخصائي",
      noCases: "لا توجد حالات بانتظار المراجعة.", noMatch: "لا توجد حالات مطابقة للبحث.",
      back: "العودة إلى الحالات", caseNo: "الحالة", pending: "بانتظار المراجعة", approved: "معتمدة",
      xray: "صورة الأشعة", showHeat: "إظهار الخريطة الحرارية", noImage: "ستظهر صورة الأشعة هنا",
      heatHint: "المناطق المظللة هي الأجزاء التي أثّرت أكثر في تنبؤ الذكاء الاصطناعي.",
      aiResult: "نتيجة الذكاء الاصطناعي", klGrade: "درجة KL", confidence: "درجة الثقة",
      probs: "احتمال كل درجة", editAi: "تعديل النتيجة", editedBy: "عدّلها الطبيب. تنبؤ الذكاء الاصطناعي: KL",
      newGrade: "درجة KL الجديدة (من 0 إلى 4)", save: "حفظ", cancel: "إلغاء",
      errGrade: "الرجاء إدخال رقم صحيح من 0 إلى 4.",
      caseInfo: "معلومات الحالة", patient: "المريض", healthId: "الرقم الصحي", source: "المصدر",
      submitted: "تاريخ الإرسال", reportLang: "لغة التقرير", priority: "الأولوية",
      history: "التاريخ الطبي",
      noHistory: "لم يقدّم المريض تاريخاً طبياً.",
      decision: "قرار الطبيب", notes: "الملاحظات السريرية", notesPh: "اكتب ملاحظاتك السريرية عن هذه الحالة...",
      notesHint: "الملاحظات السريرية مطلوبة قبل اعتماد النتيجة.",
      errNotes: "الرجاء كتابة الملاحظات السريرية قبل الاعتماد.",
      finalGrade: "الدرجة النهائية (KL)", confirm: "اعتماد النتيجة",
      confirmedMsg: "تم اعتماد النتيجة. تم إنشاء التقرير المبسّط وأصبح متاحاً للمريض",
      andRad: " والأخصائي", pendingNote: "تبقى الحالة قيد الانتظار حتى تعتمد النتيجة.",
      disclaimer: "مُفصّل أداة لدعم القرار السريري ولا يغني عن تقدير الطبيب.",
      langName: { ar: "العربية", en: "الإنجليزية" },
      kl: ["ركبة سليمة", "مشكوك فيه", "بسيط", "متوسط", "شديد"],
      klDesc: [
        "لا توجد علامات خشونة.",
        "تضيّق مشكوك فيه في المفصل مع احتمال وجود نتوءات عظمية.",
        "وجود نتوءات عظمية مؤكد مع احتمال تضيّق في المفصل.",
        "نتوءات عظمية متعددة وتضيّق مؤكد في المفصل وتصلّب خفيف.",
        "نتوءات عظمية كبيرة وتضيّق واضح في المفصل وتصلّب شديد."
      ],
      qn: {
        sections: [
          { title: "عن ركبتك", rows: [{ k: "knee", q: "أي ركبة تزعجك؟", o: { right: "اليمنى", left: "اليسرى", both: "الاثنتان" } }] },
          { title: "الفحص السريري", rows: [
            { k: "movement", q: "هل يزداد ألم ركبتك مع الحركة أو الاستخدام ويخف مع الراحة؟", o: { yes: "نعم", no: "لا" } },
            { k: "stiffness", q: "عند الاستيقاظ، كم يدوم تيبّس الركبة؟", o: { none: "لا يوجد تيبّس", le30: "30 دقيقة أو أقل", gt30: "أكثر من 30 دقيقة" } }] },
          { title: "شدة الأعراض (الأسبوع الماضي)", rows: [
            { k: "stairs", q: "الألم عند صعود الدرج أو نزوله", o: { none: "لا يوجد", mild: "خفيف", moderate: "متوسط", severe: "شديد", extreme: "شديد جداً" } },
            { k: "rising", q: "صعوبة النهوض من الجلوس", o: { none: "لا يوجد", mild: "خفيف", moderate: "متوسط", severe: "شديد", extreme: "شديد جداً" } }] },
          { title: "علامات التحذير", rows: [{ k: "warnings", q: "هل ينطبق عليك أي مما يلي الآن؟", multi: true, o: {
            injury: "إصابة أو حادث في الركبة خلال آخر 6 أسابيع", hot: "الركبة ساخنة أو حمراء أو متورمة جداً", fever: "حمّى مع ألم الركبة",
            worsened: "ازداد الألم بسرعة خلال الأسابيع الأخيرة", night: "الألم يوقظك ليلاً أو نقص وزن غير مبرر" } }] },
          { title: "عوامل الخطر", rows: [
            { k: "body", q: "الطول والوزن" },
            { k: "prior", q: "هل سبق أن أصبت هذه الركبة أو أجريت لها جراحة؟", o: { yes: "نعم", no: "لا" } }] }
        ],
        none: "لا شيء مما سبق", cm: "سم", kg: "كجم", bmi: "مؤشر كتلة الجسم"
      },
      yes: "نعم", no: "لا", min: "دقيقة"
    }
  };

  let lang = "en";
  try { lang = localStorage.getItem("mufsal-lang") || document.documentElement.lang || "en"; } catch (e) {}
  if (lang !== "ar") lang = "en";
  const t = (k) => T[lang][k];

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("mufsal-lang", lang); } catch (e) {}
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  }

  /* ---------------- Mock data: static/js/mock-cases.js (TODO(backend): replace with API calls) ---------------- */
  // priority = derived by the backend from predicted grade + confidence (Case.priorityLevel)
  const ALL = window.MUFSAL_MOCK_CASES;
  const CASES = ALL.filter((c) => c.status === "under_review");   // doctor list = only cases waiting for review
  const RANK = { high: 3, medium: 2, low: 1 };

  /* ---------------- Helpers ---------------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (id) => document.getElementById(id);
  const locale = () => (lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB");
  const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
  const pct = (x) => Math.round(x * 100) + "%";
  const srcLabel = (s) => (s === "patient" ? t("srcPatient") : t("srcRadiologist"));
  const prioBadge = (p) => `<span class="badge badge-${p}">${t(p)}</span>`;

  /* ================= LIST PAGE ================= */
  function initList() {
    let filter = "all", query = "";
    const body = $("cases-body"), empty = $("empty-state"), table = $("table-card"), emptyText = $("empty-text");

    function render() {
      // TODO(backend): GET the cases with status UNDER_REVIEW, already sorted by priority
      const rows = CASES
        .filter((c) => filter === "all" || c.priority === filter)
        .filter((c) => c.name[lang].toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => RANK[b.priority] - RANK[a.priority] || b.grade - a.grade || b.conf - a.conf || (a.date < b.date ? 1 : -1));

      table.classList.toggle("hidden", rows.length === 0);
      empty.classList.toggle("hidden", rows.length !== 0);
      emptyText.textContent = CASES.length === 0 ? t("noCases") : t("noMatch");

      body.innerHTML = rows.map((c) => `
        <tr>
          <td data-label="${esc(t("colPatient"))}"><span class="patient-name">${esc(c.name[lang])}</span></td>
          <td data-label="${esc(t("colSource"))}"><span class="badge badge-source">${esc(srcLabel(c.source))}</span></td>
          <td data-label="${esc(t("colDate"))}">${esc(fmtDate(c.date))}</td>
          <td data-label="${esc(t("colPriority"))}">${prioBadge(c.priority)}</td>
          <td><a class="btn btn-outline" href="review-case.html?id=${c.id}">${esc(t("review"))}</a></td>
        </tr>`).join("");
    }

    document.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => {
      filter = b.dataset.filter;
      document.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      render();
    }));
    $("search").addEventListener("input", (e) => { query = e.target.value; render(); });
    return render;
  }

  /* ================= DETAIL PAGE ================= */
  function initDetail() {
    const id = new URLSearchParams(location.search).get("id");                          // e.g. 204817
    const c = ALL.find((x) => x.id === id) || CASES[0];                                  // TODO(backend): GET /cases/<id>
    if (c.status === "approved") { location.replace(`view-report.html?id=${c.id}&role=doctor`); return function () {}; }
    let finalGrade = c.grade, edited = false, confirmed = false;

    const el = {
      circle: $("grade-circle"), num: $("grade-num"), name: $("grade-name"), desc: $("grade-desc"),
      editedNote: $("edited-note"), editBtn: $("edit-btn"), editBox: $("edit-box"), gradeInput: $("grade-input"),
      gradeErr: $("grade-err"), save: $("save-grade"), cancel: $("cancel-grade"),
      notes: $("notes"), notesErr: $("notes-err"), confirm: $("confirm-btn"), banner: $("success-banner"),
      status: $("status-badge"), heat: $("heat-toggle"), box: $("xray-box"), pendingNote: $("pending-note"),
      finalGrade: $("final-grade")
    };

    function renderStatic() {
      document.title = `MUFSAL - ${t("caseNo")} ${c.id}`;
      $("case-title").textContent = `${t("caseNo")} ${c.id}`;
      $("case-name").textContent = c.name[lang];
      $("case-prio").innerHTML = prioBadge(c.priority);
      $("conf").textContent = pct(c.conf);

      $("info").innerHTML = [
        [t("patient"), esc(c.name[lang])], [t("healthId"), esc(c.healthId)], [t("source"), esc(srcLabel(c.source))],
        [t("submitted"), esc(fmtDate(c.date))], [t("reportLang"), esc(T[lang].langName[c.lang])], [t("priority"), prioBadge(c.priority)]
      ].map(([k, v]) => `<div class="kv"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("");

      const h = c.history, Q = t("qn");
      const answer = (r) => {
        if (r.k === "body") {
          const bmi = (h.weight / Math.pow(h.height / 100, 2)).toFixed(1);
          return `${h.height} ${Q.cm} / ${h.weight} ${Q.kg} - ${Q.bmi} ${bmi}`;
        }
        if (r.multi) return h[r.k].length ? h[r.k].map((x) => r.o[x]).join(lang === "ar" ? "، " : ", ") : Q.none;
        return r.o[h[r.k]];
      };
      // same questions and answers as the patient's registration questionnaire
      $("history").innerHTML = !h ? `<p class="muted">${esc(t("noHistory"))}</p>` : Q.sections.map((sec) => `
        <div class="history-block"><h3>${esc(sec.title)}</h3><ul class="qa">${
          sec.rows.map((r) => `<li><span>${esc(r.q)}</span><span>${esc(answer(r))}</span></li>`).join("")}</ul></div>`).join("");

      $("probs").innerHTML = c.probs.map((p, i) => `
        <li class="prob ${i === c.grade ? "top" : ""}">
          <span>KL${i}</span><span class="bar"><i style="width:${Math.round(p * 100)}%"></i></span><span class="pct">${pct(p)}</span>
        </li>`).join("");
      renderGrade();
    }

    function renderGrade() {
      el.num.textContent = finalGrade;
      el.name.textContent = `KL${finalGrade} - ${t("kl")[finalGrade]}`;
      el.desc.textContent = t("klDesc")[finalGrade];
      el.circle.classList.toggle("edited", edited);
      el.editedNote.classList.toggle("hidden", !edited);
      el.editedNote.textContent = `${t("editedBy")}${c.grade}`;
      el.finalGrade.textContent = `KL${finalGrade} - ${t("kl")[finalGrade]}`;
      el.status.className = "badge " + (confirmed ? "badge-approved" : "badge-pending");
      el.status.textContent = confirmed ? t("approved") : t("pending");
      if (confirmed) {
        el.banner.textContent = t("confirmedMsg") + (c.source === "radiologist" ? t("andRad") : "") + ".";
      }
    }

    /* ---- edit AI result ---- */
    function openEdit() {
      el.gradeInput.value = finalGrade; el.gradeErr.classList.add("hidden"); el.gradeInput.classList.remove("invalid");
      el.editBox.classList.remove("hidden"); el.editBtn.classList.add("hidden"); el.gradeInput.focus();
    }
    function closeEdit() { el.editBox.classList.add("hidden"); el.editBtn.classList.remove("hidden"); }
    el.editBtn.addEventListener("click", openEdit);
    el.cancel.addEventListener("click", closeEdit);                    // cancel: original result stays unchanged
    el.save.addEventListener("click", () => {
      const v = el.gradeInput.value.trim();
      if (!/^[0-4]$/.test(v)) {                                         // only an integer from 0 to 4 is valid
        el.gradeErr.textContent = t("errGrade"); el.gradeErr.classList.remove("hidden"); el.gradeInput.classList.add("invalid");
        el.gradeInput.focus(); return;
      }
      finalGrade = Number(v); edited = finalGrade !== c.grade;
      closeEdit(); renderGrade();
    });
    el.gradeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") el.save.click(); });

    /* ---- heatmap toggle ---- */
    el.heat.addEventListener("change", () => el.box.classList.toggle("show-heat", el.heat.checked));
    // TODO(backend): set the two <img> sources: #xray-img (original) and #heat-img (PredictionResult.heatmapPath)

    /* ---- confirm ---- */
    el.notes.addEventListener("input", () => { el.notesErr.classList.add("hidden"); el.notes.classList.remove("invalid"); });
    el.confirm.addEventListener("click", () => {
      if (!el.notes.value.trim()) {                                      // notes are required before confirming
        el.notesErr.textContent = t("errNotes"); el.notesErr.classList.remove("hidden"); el.notes.classList.add("invalid");
        el.notes.focus(); return;
      }
      // TODO(backend): POST finalGrade + clinical notes -> case becomes APPROVED, report is generated (Gemini)
      confirmed = true;
      [el.notes, el.confirm, el.editBtn].forEach((x) => (x.disabled = true));
      closeEdit(); el.editBtn.classList.add("hidden");
      el.banner.classList.remove("hidden"); el.pendingNote.classList.add("hidden");
      renderGrade();
    });

    return function render() { renderStatic(); };
  }

  /* ---------------- Boot ---------------- */
  const page = document.body.dataset.page;
  const render = page === "list" ? initList() : initDetail();
  function refresh() { applyLang(); render(); }
  const toggle = $("lang-toggle");
  if (toggle) toggle.addEventListener("click", () => { lang = lang === "ar" ? "en" : "ar"; refresh(); });
  refresh();
})();
