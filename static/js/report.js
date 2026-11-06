/* ==========================================================
   MUFSAL - View report (view-report.html)
   Who sees what:
   - patient / radiologist ("receivers"): the simplified report, only after the doctor approved.
     Before approval: only the status "Under Review" (no grade, no heatmap - NFR-R1).
   - doctor: the same report + a read-only clinical summary (AI vs final grade, clinical notes).
   The REPORT itself is always shown in the language chosen by whoever submitted the case (case.lang);
   the rest of the page follows the header's language button.
   MOCK data now (static/js/mock-cases.js). Backend hooks are marked TODO(backend).
   ========================================================== */
(function () {
  "use strict";

  /* ---------------- Page language (header button) ---------------- */
  const T = {
    en: {
      back: "Back to dashboard", caseNo: "Case", approved: "Approved", underReview: "Under review",
      download: "Download PDF", patient: "Patient", healthId: "Health ID", source: "Source",
      srcPatient: "Patient-submitted", srcRadiologist: "Radiologist-linked", submitted: "Submitted",
      approvedOn: "Approved on", doctor: "Reviewed by", reportLang: "Report language",
      langName: { ar: "Arabic", en: "English" },
      waitTitle: "Your report is not ready yet",
      waitText: "A doctor is reviewing this case. The report will appear here as soon as it is approved.",
      waitDoctorTitle: "This case is waiting for your review",
      waitDoctorText: "The report is created only after you confirm the result.",
      goReview: "Go to case review",
      clinical: "Clinical summary", aiGrade: "AI predicted grade", finalGrade: "Final grade (doctor)",
      confidence: "AI confidence", edited: "Edited by doctor", same: "Same as AI", notes: "Clinical notes",
      doctorOnly: "Visible to doctors only", notFound: "Case not found.",
      printHint: "The PDF opens in the report language."
    },
    ar: {
      back: "العودة إلى لوحة التحكم", caseNo: "الحالة", approved: "معتمدة", underReview: "قيد المراجعة",
      download: "تنزيل PDF", patient: "المريض", healthId: "الرقم الصحي", source: "المصدر",
      srcPatient: "مرفوعة من المريض", srcRadiologist: "مرفوعة من الأخصائي", submitted: "تاريخ الإرسال",
      approvedOn: "تاريخ الاعتماد", doctor: "راجعها", reportLang: "لغة التقرير",
      langName: { ar: "العربية", en: "الإنجليزية" },
      waitTitle: "تقريرك ليس جاهزاً بعد",
      waitText: "يقوم طبيب بمراجعة هذه الحالة. سيظهر التقرير هنا فور اعتماده.",
      waitDoctorTitle: "هذه الحالة بانتظار مراجعتك",
      waitDoctorText: "لا يُنشأ التقرير إلا بعد أن تعتمد النتيجة.",
      goReview: "الذهاب إلى مراجعة الحالة",
      clinical: "الملخص السريري", aiGrade: "الدرجة المتوقعة بالذكاء الاصطناعي", finalGrade: "الدرجة النهائية (الطبيب)",
      confidence: "ثقة الذكاء الاصطناعي", edited: "عدّلها الطبيب", same: "مطابقة للذكاء الاصطناعي", notes: "الملاحظات السريرية",
      doctorOnly: "تظهر للأطباء فقط", notFound: "الحالة غير موجودة.",
      printHint: "يُفتح ملف PDF بلغة التقرير."
    }
  };

  /* ---------------- Report text (plain, non-medical language - NFR-U2) ---------------- */
  // TODO(backend): in production this text comes from the Gemini report (Report.content).
  const R = {
    en: {
      title: "Your knee X-ray report", resultTitle: "Your result", grade: "Severity grade (KL)",
      names: ["Healthy knee", "Doubtful", "Mild", "Moderate", "Severe"],
      meaning: [
        "Your knee looks healthy. We did not find signs of osteoarthritis (wear of the cushion in your joint).",
        "There may be very early changes in your knee joint, but they are not a clear sign of osteoarthritis.",
        "You have mild osteoarthritis. Small bony bumps (osteophytes) are present, and the gap in your joint may be slightly narrower.",
        "You have moderate osteoarthritis. There are several bony bumps and the gap in your joint is clearly narrower, because the cushion between the bones has worn down.",
        "You have severe osteoarthritis. The gap in your joint is much narrower, with large bony bumps and hardening of the bone."
      ],
      confTitle: "How sure is the AI?", conf: (p) => `The AI is ${p}% confident in its reading, and a doctor has checked and approved the final result.`,
      heatTitle: "Where the AI looked", heatText: "The coloured areas on your X-ray show the parts of the knee that influenced the result most.", heatPh: "X-ray with heatmap",
      nextTitle: "What you can do next",
      wordsTitle: "Words explained",
      words: [["Osteophytes", "Small bony bumps that grow around a worn joint."], ["Joint space narrowing", "The gap between your bones gets smaller as the cushion (cartilage) wears down."], ["Sclerosis", "The bone under the cushion becomes harder and denser."]],
      disclaimer: "This report supports, and does not replace, your doctor's advice."
    },
    ar: {
      title: "تقرير أشعة الركبة", resultTitle: "نتيجتك", grade: "درجة الشدة (KL)",
      names: ["ركبة سليمة", "مشكوك فيها", "بسيطة", "متوسطة", "شديدة"],
      meaning: [
        "ركبتك تبدو سليمة. لم نجد علامات خشونة (تآكل في الغضروف الذي يغطي المفصل).",
        "قد توجد تغيّرات مبكرة جداً في مفصل الركبة، لكنها ليست علامة واضحة على الخشونة.",
        "لديك خشونة بسيطة في الركبة. توجد نتوءات عظمية صغيرة (osteophytes) وقد يكون الفراغ في المفصل أضيق قليلاً.",
        "لديك خشونة متوسطة في الركبة. توجد عدة نتوءات عظمية والفراغ في المفصل أضيق بوضوح، لأن الغضروف بين العظمتين تآكل.",
        "لديك خشونة شديدة في الركبة. الفراغ في المفصل أضيق كثيراً مع نتوءات عظمية كبيرة وتصلّب في العظم."
      ],
      confTitle: "ما مدى تأكّد الذكاء الاصطناعي؟", conf: (p) => `الذكاء الاصطناعي متأكد بنسبة ${p}% من قراءته، وقد راجع الطبيب النتيجة النهائية واعتمدها.`,
      heatTitle: "أين نظر الذكاء الاصطناعي؟", heatText: "المناطق الملوّنة على الأشعة هي أكثر الأجزاء تأثيراً في النتيجة.", heatPh: "الأشعة مع الخريطة الحرارية",
      nextTitle: "ماذا تفعل الآن؟",
      wordsTitle: "شرح المصطلحات",
      words: [["النتوءات العظمية (Osteophytes)", "نتوءات صغيرة تنمو حول المفصل المتآكل."], ["تضيّق المفصل (Joint space narrowing)", "يصغر الفراغ بين العظمتين عندما يتآكل الغضروف."], ["التصلّب (Sclerosis)", "يصبح العظم تحت الغضروف أقسى وأكثر كثافة."]],
      disclaimer: "هذا التقرير يدعم نصيحة طبيبك ولا يغني عنها."
    }
  };

  /* ---------------- Setup ---------------- */
  const ALL = window.MUFSAL_MOCK_CASES;
  const params = new URLSearchParams(location.search);
  // TODO(backend): the role and the allowed cases come from the logged-in session, never from the URL.
  const role = ["patient", "doctor", "radiologist"].includes(params.get("role")) ? params.get("role") : "patient";
  const c = ALL.find((x) => x.id === params.get("id")) || ALL.find((x) => x.status === "approved");

  let lang = "en";
  try { lang = localStorage.getItem("mufsal-lang") || document.documentElement.lang || "en"; } catch (e) {}
  if (lang !== "ar") lang = "en";
  const t = (k) => T[lang][k];
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const $ = (id) => document.getElementById(id);
  const fmtDate = (d, l) => new Date(d + "T00:00:00").toLocaleDateString(l === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  function render() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("mufsal-lang", lang); } catch (e) {}
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });

    const view = $("view");
    if (!c) { view.innerHTML = `<div class="card empty-state"><p>${esc(t("notFound"))}</p></div>`; return; }
    const approved = c.status === "approved";
    document.title = `MUFSAL - ${t("caseNo")} ${c.id}`;
    $("case-title").textContent = `${t("caseNo")} ${c.id}`;
    $("status-badge").className = "badge " + (approved ? "badge-approved" : "badge-pending");
    $("status-badge").textContent = approved ? t("approved") : t("underReview");

    // Who is this person? (the patient does not need to see their own name/ID as a "linked patient")
    const showPatient = role !== "patient";
    $("case-sub").textContent = showPatient ? `${c.name[lang]} - ${c.healthId}` : fmtDate(c.date, lang);

    // Download PDF: only when approved, for the receivers (patient / radiologist)
    // TODO(backend): GET /cases/<id>/report.pdf  (generated in the case language)
    const dl = $("download-btn");
    dl.classList.toggle("hidden", !(approved && role !== "doctor"));
    dl.title = t("printHint");

    /* ---- not approved yet ---- */
    if (!approved) {
      const isDoc = role === "doctor";
      view.innerHTML = `
        <section class="card wait">
          <span class="icon-box"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/></svg></span>
          <h2>${esc(isDoc ? t("waitDoctorTitle") : t("waitTitle"))}</h2>
          <p>${esc(isDoc ? t("waitDoctorText") : t("waitText"))}</p>
          ${isDoc ? `<a class="btn btn-primary" href="review-case.html?id=${esc(c.id)}">${esc(t("goReview"))}</a>` : ""}
        </section>`;
      return;
    }

    /* ---- approved: the simplified report (in the case language) ---- */
    const L = c.lang, r = R[L], g = c.finalGrade;
    const reportHtml = `
      <article class="card report" lang="${L}" dir="${L === "ar" ? "rtl" : "ltr"}">
        <div class="report-head">
          <h2>${esc(r.title)}</h2>
          <span class="muted"><bdi>${esc(c.id)}</bdi> &middot; ${esc(fmtDate(c.approvedAt, L))}</span>
        </div>

        <div class="report-grade">
          <div class="grade-circle"><small>${esc(r.grade)}</small><strong>${g}</strong></div>
          <div>
            <p class="grade-name">KL${g} - ${esc(r.names[g])}</p>
            <p class="grade-desc report-meaning">${esc(r.meaning[g])}</p>
          </div>
        </div>

        <div class="report-grid">
          <section>
            <h3>${esc(r.heatTitle)}</h3>
            <!-- TODO(backend): <img> of PredictionResult.heatmapPath -->
            <div class="xray-box small"><div class="xray-placeholder">${esc(r.heatPh)}</div></div>
            <p class="hint">${esc(r.heatText)}</p>
          </section>
          <section>
            <h3>${esc(r.confTitle)}</h3>
            <p>${esc(r.conf(Math.round(c.conf * 100)))}</p>
            <h3>${esc(r.nextTitle)}</h3>
            <ul class="advice">${c.advice[L].map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
          </section>
        </div>

        <section>
          <h3>${esc(r.wordsTitle)}</h3>
          <dl class="words">${r.words.map(([w, d]) => `<div><dt>${esc(w)}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl>
        </section>

        <p class="disclaimer left">${esc(r.disclaimer)}</p>
      </article>`;

    /* ---- doctor-only clinical summary (read-only) ---- */
    const editedFlag = c.grade !== c.finalGrade;
    const doctorHtml = role !== "doctor" ? "" : `
      <aside class="card clinical">
        <h2>${esc(t("clinical"))} <span class="badge badge-source">${esc(t("doctorOnly"))}</span></h2>
        <dl class="kv-list">
          <div class="kv"><dt>${esc(t("aiGrade"))}</dt><dd>KL${c.grade}</dd></div>
          <div class="kv"><dt>${esc(t("finalGrade"))}</dt><dd>KL${c.finalGrade} <span class="badge ${editedFlag ? "badge-pending" : "badge-approved"}">${esc(editedFlag ? t("edited") : t("same"))}</span></dd></div>
          <div class="kv"><dt>${esc(t("confidence"))}</dt><dd>${Math.round(c.conf * 100)}%</dd></div>
          <div class="kv"><dt>${esc(t("patient"))}</dt><dd>${esc(c.name[lang])} (${esc(c.healthId)})</dd></div>
          <div class="kv"><dt>${esc(t("source"))}</dt><dd>${esc(c.source === "patient" ? t("srcPatient") : t("srcRadiologist"))}</dd></div>
          <div class="kv"><dt>${esc(t("submitted"))}</dt><dd>${esc(fmtDate(c.date, lang))}</dd></div>
          <div class="kv"><dt>${esc(t("approvedOn"))}</dt><dd>${esc(fmtDate(c.approvedAt, lang))}</dd></div>
          <div class="kv"><dt>${esc(t("doctor"))}</dt><dd>${esc(c.doctor[lang])}</dd></div>
          <div class="kv"><dt>${esc(t("reportLang"))}</dt><dd>${esc(T[lang].langName[c.lang])}</dd></div>
        </dl>
        <h3 class="hint" style="margin-top:16px">${esc(t("notes"))}</h3>
        <p class="notes-text">${esc(c.notes[lang])}</p>
      </aside>`;

    view.innerHTML = role === "doctor" ? `<div class="grid-report">${reportHtml}${doctorHtml}</div>` : reportHtml;
  }

  $("download-btn").addEventListener("click", () => window.print());   // demo only: prints just the report
  const toggle = $("lang-toggle");
  if (toggle) toggle.addEventListener("click", () => { lang = lang === "ar" ? "en" : "ar"; render(); });
  render();
})();
