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
      history: "Medical history", symptoms: "Symptoms", medications: "Medications",
      questionnaire: "Questionnaire answers", noHistory: "The patient did not provide medical history.",
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
      qs: { pain: "Pain level (0-10)", stiff: "Morning stiffness", stairs: "Difficulty with stairs", swell: "Knee swelling" },
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
      history: "التاريخ الطبي", symptoms: "الأعراض", medications: "الأدوية",
      questionnaire: "إجابات الاستبيان", noHistory: "لم يقدّم المريض تاريخاً طبياً.",
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
      qs: { pain: "مستوى الألم (0-10)", stiff: "تيبّس الصباح", stairs: "صعوبة في الدرج", swell: "تورّم الركبة" },
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

  /* ---------------- Mock data (TODO(backend): replace with API calls) ---------------- */
  // priority = derived by the backend from predicted grade + confidence (Case.priorityLevel)
  const CASES = [
    { id: 101, name: { en: "Noura Alharbi", ar: "نورة الحربي" }, healthId: "HID-100234", source: "patient", date: "2026-11-05", lang: "ar", priority: "high", grade: 3, conf: 0.91, probs: [0.01, 0.02, 0.06, 0.91, 0.00],
      history: { symptoms: { en: "Pain when climbing stairs, swelling after walking.", ar: "ألم عند صعود الدرج وتورّم بعد المشي." }, meds: { en: "Ibuprofen 400 mg when needed.", ar: "إيبوبروفين 400 ملغ عند الحاجة." }, q: { pain: "7", stiff: "20 min", stairs: "yes", swell: "yes" } } },
    { id: 102, name: { en: "Abdullah Alotaibi", ar: "عبدالله العتيبي" }, healthId: "HID-100871", source: "radiologist", date: "2026-11-04", lang: "en", priority: "high", grade: 4, conf: 0.88, probs: [0.00, 0.00, 0.02, 0.10, 0.88],
      history: { symptoms: { en: "Constant pain, limited bending.", ar: "ألم مستمر وصعوبة في ثني الركبة." }, meds: { en: "Paracetamol, topical diclofenac.", ar: "باراسيتامول وديكلوفيناك موضعي." }, q: { pain: "9", stiff: "45 min", stairs: "yes", swell: "yes" } } },
    { id: 103, name: { en: "Laila Alsaleh", ar: "ليلى الصالح" }, healthId: "HID-100455", source: "patient", date: "2026-11-05", lang: "en", priority: "medium", grade: 2, conf: 0.62, probs: [0.08, 0.24, 0.62, 0.06, 0.00],
      history: { symptoms: { en: "Occasional pain in the evening.", ar: "ألم متقطع في المساء." }, meds: { en: "None.", ar: "لا يوجد." }, q: { pain: "4", stiff: "10 min", stairs: "no", swell: "no" } } },
    { id: 104, name: { en: "Faisal Aldosari", ar: "فيصل الدوسري" }, healthId: "HID-100992", source: "radiologist", date: "2026-11-03", lang: "ar", priority: "low", grade: 1, conf: 0.55, probs: [0.30, 0.55, 0.13, 0.02, 0.00], history: null },
    { id: 105, name: { en: "Maha Alqahtani", ar: "مها القحطاني" }, healthId: "HID-100318", source: "patient", date: "2026-11-02", lang: "en", priority: "low", grade: 0, conf: 0.93, probs: [0.93, 0.05, 0.02, 0.00, 0.00],
      history: { symptoms: { en: "Mild discomfort after running.", ar: "انزعاج خفيف بعد الجري." }, meds: { en: "None.", ar: "لا يوجد." }, q: { pain: "2", stiff: "0 min", stairs: "no", swell: "no" } } }
  ];
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
    const id = Number(new URLSearchParams(location.search).get("id")) || CASES[0].id; // TODO(backend): GET /cases/<id>
    const c = CASES.find((x) => x.id === id) || CASES[0];
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
      document.title = `MUFSAL - ${t("caseNo")} #${c.id}`;
      $("case-title").textContent = `${t("caseNo")} #${c.id}`;
      $("case-name").textContent = c.name[lang];
      $("case-prio").innerHTML = prioBadge(c.priority);
      $("conf").textContent = pct(c.conf);

      $("info").innerHTML = [
        [t("patient"), esc(c.name[lang])], [t("healthId"), esc(c.healthId)], [t("source"), esc(srcLabel(c.source))],
        [t("submitted"), esc(fmtDate(c.date))], [t("reportLang"), esc(T[lang].langName[c.lang])], [t("priority"), prioBadge(c.priority)]
      ].map(([k, v]) => `<div class="kv"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("");

      const h = c.history;
      $("history").innerHTML = !h ? `<p class="muted">${esc(t("noHistory"))}</p>` : `
        <div class="history-block"><h3>${esc(t("symptoms"))}</h3><p>${esc(h.symptoms[lang])}</p></div>
        <div class="history-block"><h3>${esc(t("medications"))}</h3><p>${esc(h.meds[lang])}</p></div>
        <div class="history-block"><h3>${esc(t("questionnaire"))}</h3><ul class="qa">${
          Object.entries(h.q).map(([k, v]) => {
            const val = v === "yes" ? t("yes") : v === "no" ? t("no") : v.replace("min", t("min"));
            return `<li><span>${esc(t("qs")[k])}</span><span>${esc(val)}</span></li>`;
          }).join("")}</ul></div>`;

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
