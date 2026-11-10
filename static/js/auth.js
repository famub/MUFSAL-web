/* ==========================================================
   MUFSAL - Login, registration and password pages
   (shared script: login, register-patient, register-professional, forgot-password, reset-password, logout)
   - Works with MOCK accounts now (static/js/mock-users.js). Every place that needs the backend is marked TODO(backend).
   - Bilingual (EN / AR) with the header's #lang-toggle button.
   - Which page runs is decided by <body data-page="...">.
   ========================================================== */
(function () {
  "use strict";

  const Users = window.MufsalUsers;
  const Q = window.MUFSAL_QUESTIONNAIRE || null;   // only the patient registration page loads it

  /* ---------------- Rules (change them here only) ---------------- */
  const MIN_AGE = 18;
  const HEALTH_ID_PATTERN = /^[0-9]{10}$/;           // TODO: confirm the real Sehhaty health ID format with the team
  const NATIONAL_ID_PATTERN = /^[12][0-9]{9}$/;      // National ID starts with 1, Iqama with 2
  const SCFHS_PATTERN = /^[A-Za-z0-9\-\/]{5,20}$/;   // TODO: confirm the real SCFHS licence number format

  /* ---------------- Language (EN / AR) ---------------- */
  const T = {
    en: {
      // titles
      loginTitle: "Log in to MUFSAL", loginSub: "Welcome back. Enter your email and password.",
      regTitle: "Create your account", regSub: "Choose how you will use MUFSAL.",
      patTitle: "Patient registration", patSub: "Create your account and complete your medical history. Your doctor will see it when reviewing your X-ray.",
      proTitle: "Healthcare professional registration", proSub: "An admin verifies your SCFHS licence before you can log in.",
      forgotTitle: "Forgot your password?", forgotSub: "Enter your registered email and we will send you a link to reset your password.",
      resetTitle: "Create a new password", resetSub: "Choose a new password for your account.",
      loggingOut: "Logging you out...",
      // common fields
      email: "Email address", password: "Password", confirmPassword: "Confirm password", showHidePw: "Show or hide password",
      pwHint: "8 to 20 characters, with an uppercase letter, a lowercase letter, a number and a special character.",
      fullName: "Full name", phone: "Phone number", dob: "Date of birth", gender: "Gender", genderSelect: "Select gender",
      female: "Female", male: "Male",
      // login
      loginBtn: "Log in", forgotLink: "Forgot password?", noAccount: "New to MUFSAL?", createAccount: "Create an account",
      demoTitle: "Demo accounts (for testing only)", demoNote: "Password for all of them: Mufsal@123",
      demoPatient: "Patient", demoRadiologist: "Radiologist", demoDoctor: "Doctor", demoAdmin: "Admin",
      demoPending: "Doctor, pending approval", demoRejected: "Radiologist, rejected",
      errBadLogin: "Incorrect email or password. Please try again.",
      pendingMsg: "Your account is still awaiting admin approval. You will be able to log in once it is approved.",
      rejectedMsg: "Your registration request was rejected. Please correct your information and submit a new registration request.",
      rejectedReason: "Reason:", resubmit: "Submit a new request", loggedOut: "You have been logged out.",
      sessionExpired: "Your session ended after 15 minutes without activity. Please log in again.",
      // register choice
      patientCardTitle: "I am a patient", patientCardDesc: "Upload your knee X-ray and receive a doctor-reviewed report in simple language.",
      proCardTitle: "I am a healthcare professional", proCardDesc: "Radiologists and doctors. Your SCFHS licence is verified by an admin before you can log in.",
      haveAccount: "Already have an account?", loginLink: "Log in",
      // patient
      secPersonal: "Personal information", secAccount: "Account", secMedical: "Medical history",
      healthId: "Health ID", healthIdHint: "Your Sehhaty health ID (10 digits).",
      optionalHint: "Optional. You can add it later from your profile.",
      symptoms: "Symptoms", symptomsPh: "Describe your knee symptoms, or write None.",
      medications: "Medications", medicationsPh: "List the medicines you take, or write None.",
      questionnaireTitle: "Medical questionnaire", questionnaireSub: "All questions are required. They help your doctor understand your condition together with your X-ray.",
      height: "Height (cm)", weight: "Weight (kg)", bmiLabel: "BMI",
      createBtn: "Create account", editLater: "You can edit your medical history later from your profile.",
      doneTitle: "Account created", doneBody: "Your account is ready. You can now log in.", goLogin: "Go to log in",
      // professional
      role: "Role", roleSelect: "Select your role", radiologist: "Radiologist", doctor: "Doctor",
      nationalId: "National ID / Iqama number", nationalIdHint: "10 digits.", scfhs: "SCFHS licence number",
      submitRequest: "Submit registration request",
      pendingTitle: "Request submitted", pendingBody: "Your registration request is pending admin approval. You will be able to log in once it is approved.",
      // forgot / reset
      sendLink: "Send reset link", forgotDone: "If this email is registered, a password reset link has been sent to it.",
      demoOpenReset: "Demo only: open the reset page", backToLogin: "Back to log in",
      newPassword: "New password", resetBtn: "Save new password",
      resetInvalid: "This reset link is not valid or has expired.",
      resetDone: "Your password was changed. You can now log in with your new password.",
      // errors
      errRequired: "This field is required.",
      errEmailEnglish: "Please write the email in English letters.",
      errEmail: "Please enter a valid email address, for example name@example.com",
      errPhone: "Please enter a complete mobile number, for example 0512345678",
      errDob: "Please enter a valid date of birth.",
      errMinAge: "You must be at least {n} years old to use MUFSAL.",
      errPwLength: "The password must be 8 to 20 characters long.",
      errPwRules: "The password needs an uppercase letter, a lowercase letter, a number and a special character.",
      errConfirm: "The passwords do not match.",
      errHealthId: "Please enter a valid Health ID (10 digits).",
      errNationalId: "Please enter a valid National ID or Iqama number (10 digits starting with 1 or 2).",
      errScfhs: "Please enter a valid SCFHS licence number.",
      errEmailTaken: "This email is already registered. Please log in or use another email.",
      errHealthIdTaken: "This Health ID is already registered.",
      errChoose: "Please choose an answer.",
      errHeight: "Please enter your height in cm, between 100 and 250.",
      errWeight: "Please enter your weight in kg, between 20 and 300.",
      errFixFields: "Please fix the highlighted fields and try again."
    },
    ar: {
      loginTitle: "تسجيل الدخول إلى مفصل", loginSub: "أهلًا بعودتك. أدخل بريدك الإلكتروني وكلمة المرور.",
      regTitle: "إنشاء حساب", regSub: "اختر كيف ستستخدم مفصل.",
      patTitle: "تسجيل مريض", patSub: "أنشئ حسابك وأكمل تاريخك الطبي. سيراه طبيبك عند مراجعة أشعتك.",
      proTitle: "تسجيل ممارس صحي", proSub: "يتحقق المشرف من ترخيصك في هيئة التخصصات الصحية قبل أن تتمكن من تسجيل الدخول.",
      forgotTitle: "نسيت كلمة المرور؟", forgotSub: "أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.",
      resetTitle: "إنشاء كلمة مرور جديدة", resetSub: "اختر كلمة مرور جديدة لحسابك.",
      loggingOut: "جارٍ تسجيل الخروج...",
      email: "البريد الإلكتروني", password: "كلمة المرور", confirmPassword: "تأكيد كلمة المرور", showHidePw: "إظهار أو إخفاء كلمة المرور",
      pwHint: "من 8 إلى 20 خانة، وتحتوي على حرف كبير وحرف صغير ورقم ورمز خاص.",
      fullName: "الاسم الكامل", phone: "رقم الجوال", dob: "تاريخ الميلاد", gender: "الجنس", genderSelect: "اختر الجنس",
      female: "أنثى", male: "ذكر",
      loginBtn: "تسجيل الدخول", forgotLink: "نسيت كلمة المرور؟", noAccount: "مستخدم جديد في مفصل؟", createAccount: "إنشاء حساب",
      demoTitle: "حسابات تجريبية (للاختبار فقط)", demoNote: "كلمة المرور لجميعها: Mufsal@123",
      demoPatient: "مريض", demoRadiologist: "أخصائي أشعة", demoDoctor: "طبيب", demoAdmin: "مشرف",
      demoPending: "طبيب بانتظار الموافقة", demoRejected: "أخصائي أشعة مرفوض",
      errBadLogin: "البريد الإلكتروني أو كلمة المرور غير صحيحة. حاول مرة أخرى.",
      pendingMsg: "حسابك ما زال بانتظار موافقة المشرف. ستتمكن من تسجيل الدخول بعد الموافقة عليه.",
      rejectedMsg: "تم رفض طلب تسجيلك. يرجى تصحيح معلوماتك وتقديم طلب تسجيل جديد.",
      rejectedReason: "السبب:", resubmit: "تقديم طلب جديد", loggedOut: "تم تسجيل خروجك.",
      sessionExpired: "انتهت جلستك بعد 15 دقيقة من عدم النشاط. يرجى تسجيل الدخول مرة أخرى.",
      patientCardTitle: "أنا مريض", patientCardDesc: "ارفع أشعة ركبتك واحصل على تقرير راجعه الطبيب بلغة بسيطة.",
      proCardTitle: "أنا ممارس صحي", proCardDesc: "أخصائيو الأشعة والأطباء. يتحقق المشرف من ترخيصك في هيئة التخصصات الصحية قبل أن تتمكن من تسجيل الدخول.",
      haveAccount: "لديك حساب؟", loginLink: "تسجيل الدخول",
      secPersonal: "المعلومات الشخصية", secAccount: "الحساب", secMedical: "التاريخ الطبي",
      healthId: "الهوية الصحية", healthIdHint: "رقم هويتك الصحية في صحتي (10 أرقام).",
      optionalHint: "اختياري. يمكنك إضافته لاحقًا من ملفك الشخصي.",
      symptoms: "الأعراض", symptomsPh: "صف أعراض ركبتك، أو اكتب لا يوجد.",
      medications: "الأدوية", medicationsPh: "اذكر الأدوية التي تتناولها، أو اكتب لا يوجد.",
      questionnaireTitle: "الاستبيان الطبي", questionnaireSub: "جميع الأسئلة مطلوبة. تساعد طبيبك على فهم حالتك مع أشعتك.",
      height: "الطول (سم)", weight: "الوزن (كجم)", bmiLabel: "مؤشر كتلة الجسم",
      createBtn: "إنشاء الحساب", editLater: "يمكنك تعديل تاريخك الطبي لاحقًا من ملفك الشخصي.",
      doneTitle: "تم إنشاء الحساب", doneBody: "حسابك جاهز. يمكنك الآن تسجيل الدخول.", goLogin: "الذهاب إلى تسجيل الدخول",
      role: "الدور", roleSelect: "اختر دورك", radiologist: "أخصائي أشعة", doctor: "طبيب",
      nationalId: "رقم الهوية الوطنية / الإقامة", nationalIdHint: "10 أرقام.", scfhs: "رقم ترخيص هيئة التخصصات الصحية",
      submitRequest: "إرسال طلب التسجيل",
      pendingTitle: "تم إرسال الطلب", pendingBody: "طلب تسجيلك بانتظار موافقة المشرف. ستتمكن من تسجيل الدخول بعد الموافقة عليه.",
      sendLink: "إرسال رابط إعادة التعيين", forgotDone: "إذا كان هذا البريد مسجلًا، فقد أُرسل إليه رابط لإعادة تعيين كلمة المرور.",
      demoOpenReset: "للتجربة فقط: افتح صفحة إعادة التعيين", backToLogin: "العودة إلى تسجيل الدخول",
      newPassword: "كلمة المرور الجديدة", resetBtn: "حفظ كلمة المرور الجديدة",
      resetInvalid: "رابط إعادة التعيين غير صالح أو منتهي.",
      resetDone: "تم تغيير كلمة المرور. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
      errRequired: "هذا الحقل مطلوب.",
      errEmailEnglish: "يرجى كتابة البريد الإلكتروني بأحرف إنجليزية.",
      errEmail: "يرجى إدخال بريد إلكتروني صحيح، مثال: name@example.com",
      errPhone: "يرجى إدخال رقم جوال كامل، مثال: 0512345678",
      errDob: "يرجى إدخال تاريخ ميلاد صحيح.",
      errMinAge: "يجب أن يكون عمرك {n} سنة على الأقل لاستخدام مفصل.",
      errPwLength: "يجب أن تكون كلمة المرور من 8 إلى 20 خانة.",
      errPwRules: "يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير ورقم ورمز خاص.",
      errConfirm: "كلمتا المرور غير متطابقتين.",
      errHealthId: "يرجى إدخال رقم هوية صحية صحيح (10 أرقام).",
      errNationalId: "يرجى إدخال رقم هوية وطنية أو إقامة صحيح (10 أرقام يبدأ بـ 1 أو 2).",
      errScfhs: "يرجى إدخال رقم ترخيص هيئة التخصصات الصحية بشكل صحيح.",
      errEmailTaken: "هذا البريد الإلكتروني مسجل مسبقًا. سجّل الدخول أو استخدم بريدًا آخر.",
      errHealthIdTaken: "رقم الهوية الصحية هذا مسجل مسبقًا.",
      errChoose: "يرجى اختيار إجابة.",
      errHeight: "يرجى إدخال طولك بالسنتيمتر (بين 100 و250).",
      errWeight: "يرجى إدخال وزنك بالكيلوجرام (بين 20 و300).",
      errFixFields: "يرجى تصحيح الحقول المظللة والمحاولة مرة أخرى."
    }
  };

  let lang = "en";
  try { lang = localStorage.getItem("mufsal-lang") || document.documentElement.lang || "en"; } catch (e) {}
  if (lang !== "ar") lang = "en";
  const t = (k) => T[lang][k] || k;
  const msg = (k) => t(k).replace("{n}", MIN_AGE);       // error texts can contain the minimum age

  /* ---------------- Helpers ---------------- */
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  // An element whose text exists in both languages (used for the questionnaire built by the script)
  function dual(tag, obj, cls) {
    const e = el(tag, (cls ? cls + " " : "") + "i18n-dual");
    e.dataset.en = obj.en; e.dataset.ar = obj.ar;
    e.textContent = obj[lang];
    return e;
  }

  /* ---------------- Alert box at the top of a form ---------------- */
  let alertState = null;      // { type, key, extra } so the text can be translated again

  function showAlert(type, key, extra) {
    alertState = { type: type, key: key, extra: extra || null };
    renderAlert();
  }
  function hideAlert() {
    alertState = null;
    const box = $("form-alert");
    if (box) { box.className = "alert"; box.innerHTML = ""; }
  }
  function renderAlert() {
    const box = $("form-alert");
    if (!box || !alertState) return;
    box.className = "alert alert--" + alertState.type + " is-visible";
    box.innerHTML = esc(t(alertState.key)) + (alertState.extra ? alertState.extra() : "");
  }

  /* ---------------- Language switch ---------------- */
  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("mufsal-lang", lang); } catch (e) {}

    const titleKey = document.body.dataset.title;
    if (titleKey) document.title = "MUFSAL - " + t(titleKey);

    document.querySelectorAll("[data-i18n]").forEach((e) => { e.textContent = t(e.dataset.i18n); });
    document.querySelectorAll("[data-i18n-ph]").forEach((e) => { e.placeholder = t(e.dataset.i18nPh); });
    document.querySelectorAll("[data-i18n-label]").forEach((e) => { e.setAttribute("aria-label", t(e.dataset.i18nLabel)); });
    document.querySelectorAll(".i18n-dual").forEach((e) => { e.textContent = e.dataset[lang]; });
    document.querySelectorAll(".error-message[data-err]").forEach((e) => { e.textContent = msg(e.dataset.err); });

    const label = $("lang-label");
    if (label) label.textContent = lang === "ar" ? "EN" : "ع";
    renderAlert();
  }

  /* ---------------- Error messages under the fields ---------------- */
  function setError(box, key) {
    box.classList.add("has-error");
    const e = box.querySelector(".error-message");
    e.dataset.err = key;
    e.textContent = msg(key);
  }
  function clearError(box) {
    box.classList.remove("has-error");
    const e = box.querySelector(".error-message");
    if (e) { delete e.dataset.err; e.textContent = ""; }
  }

  /* ---------------- Checking one field ---------------- */
  const EMAIL_SHAPE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const hasArabic = (s) => /[؀-ۿ]/.test(s);

  function getAge(dateOfBirth) {
    const birthday = new Date(dateOfBirth);
    if (isNaN(birthday.getTime())) return -1;
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const passed = today.getMonth() > birthday.getMonth() ||
      (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate());
    if (!passed) age -= 1;
    return age;
  }

  // Returns the key of the error message, or "" when the field is fine
  function errorKeyFor(field) {
    const value = field.value.trim();
    const isPassword = field.type === "password";
    const raw = isPassword ? field.value : value;          // do not trim passwords

    if (field.hasAttribute("required") && raw === "") return "errRequired";
    if (raw === "") return "";

    switch (field.dataset.check) {
      case "email":
        if (hasArabic(value)) return "errEmailEnglish";
        return EMAIL_SHAPE.test(value) ? "" : "errEmail";
      case "phone": {
        const digits = value.replace(/[^0-9]/g, "");
        return /^05[0-9]{8}$/.test(digits) || /^9665[0-9]{8}$/.test(digits) ? "" : "errPhone";
      }
      case "dob": {
        const age = getAge(value);
        if (age < 0) return "errDob";
        return age < MIN_AGE ? "errMinAge" : "";
      }
      case "password":
        if (raw.length < 8 || raw.length > 20) return "errPwLength";
        return /[A-Z]/.test(raw) && /[a-z]/.test(raw) && /[0-9]/.test(raw) && /[^A-Za-z0-9]/.test(raw) ? "" : "errPwRules";
      case "confirm": {
        const first = $(field.dataset.match);
        return first && first.value === raw ? "" : "errConfirm";
      }
      case "healthId":   return HEALTH_ID_PATTERN.test(value) ? "" : "errHealthId";
      case "nationalId": return NATIONAL_ID_PATTERN.test(value) ? "" : "errNationalId";
      case "scfhs":      return SCFHS_PATTERN.test(value) ? "" : "errScfhs";
      case "height": { const n = Number(value); return n >= 100 && n <= 250 ? "" : "errHeight"; }
      case "weight": { const n = Number(value); return n >= 20 && n <= 300 ? "" : "errWeight"; }
    }
    return "";
  }

  // Checks every field of the form. Returns true only when all of them are correct.
  function checkFields(form) {
    let allCorrect = true;
    form.querySelectorAll(".field").forEach((box) => {
      const field = box.querySelector("input, select, textarea");
      if (!field) return;
      const key = errorKeyFor(field);
      if (key === "") clearError(box); else { setError(box, key); allCorrect = false; }
    });
    return allCorrect;
  }

  // Clears the error of a field as soon as the user starts fixing it
  function clearErrorsWhileTyping(form) {
    const handler = (e) => {
      const box = e.target.closest(".field, .q-item");
      if (box && box.classList.contains("has-error")) clearError(box);
    };
    form.addEventListener("input", handler);
    form.addEventListener("change", handler);
  }

  function scrollToFirstError(form) {
    const first = form.querySelector(".has-error");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Eye button next to a password field
  function setupPasswordToggles() {
    document.querySelectorAll(".pw-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const input = $(button.dataset.target);
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        button.setAttribute("aria-pressed", String(show));
      });
    });
  }

  /* ================= LOGIN ================= */
  function initLogin() {
    const form = $("login-form");
    const params = new URLSearchParams(window.location.search);
    if (params.get("loggedout")) showAlert("ok", "loggedOut");
    if (params.get("expired")) showAlert("warn", "sessionExpired");     // NFR-S5: 15 minutes without activity

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();

      // Empty fields get the normal "required" message
      let filled = true;
      form.querySelectorAll(".field").forEach((box) => {
        const field = box.querySelector("input");
        if (field.value.trim() === "") { setError(box, "errRequired"); filled = false; } else clearError(box);
      });
      if (!filled) return;

      // TODO(backend): POST email + password to the server. The server compares the password hash and answers
      // with the role and the approval status. Here the mock accounts are read in the browser.
      const user = Users.findByEmail($("email").value);
      if (!user || user.password !== $("password").value) {
        showAlert("error", "errBadLogin");           // the same message for a wrong email and a wrong password
        return;
      }

      // Doctors and radiologists can log in only after the admin approved them
      if (user.status === "pending") { showAlert("warn", "pendingMsg"); return; }
      if (user.status === "rejected") {
        showAlert("error", "rejectedMsg", () => {
          const reason = user.rejectionReason ? ` <strong>${esc(t("rejectedReason"))}</strong> ${esc(user.rejectionReason)}` : "";
          return reason + ` <a class="link" href="register-professional.html">${esc(t("resubmit"))}</a>`;
        });
        return;
      }

      Users.setSession(user);
      window.location.href = Users.HOME[user.role];   // each role goes to its own home page
    });
  }

  /* ================= QUESTIONNAIRE (inside the patient registration form) ================= */
  function buildQuestionnaire(root) {
    root.innerHTML = "";
    Q.sections.forEach((section) => {
      const box = el("div", "q-section");
      box.appendChild(dual("h3", section));
      section.questions.forEach((q) => box.appendChild(buildQuestion(q)));
      root.appendChild(box);
    });
  }

  function buildQuestion(q) {
    const item = el("div", "q-item");
    item.dataset.qid = q.id;
    item.appendChild(dual("p", q, "q-question"));

    if (q.type === "body") {
      const row = el("div", "bmi-row");
      [["height", "height"], ["weight", "weight"]].forEach(([id, labelKey]) => {
        const box = el("div", "field");
        const label = el("label"); label.htmlFor = id; label.dataset.i18n = labelKey; label.textContent = t(labelKey);
        const input = el("input"); input.type = "number"; input.id = id; input.inputMode = "decimal";
        input.required = true; input.dataset.check = id; input.step = "any";
        box.append(label, input, el("p", "error-message"));
        row.appendChild(box);
      });
      item.appendChild(row);
      const bmi = el("p", "bmi-text"); bmi.id = "bmi-text";
      item.appendChild(bmi);
      return item;
    }

    const options = el("div", "q-options");
    q.options.forEach((o) => {
      const label = el("label", "q-option");
      const input = el("input");
      input.type = q.type === "single" ? "radio" : "checkbox";
      input.name = q.id; input.value = o.v;
      label.append(input, dual("span", o));
      options.appendChild(label);
    });
    item.appendChild(options);
    item.appendChild(el("p", "error-message"));

    if (q.type === "multi") {
      // "None of these" cannot be ticked together with the other answers
      options.addEventListener("change", (e) => {
        if (e.target.value === q.exclusive && e.target.checked) {
          options.querySelectorAll("input").forEach((i) => { if (i !== e.target) i.checked = false; });
        } else if (e.target.checked) {
          options.querySelector(`input[value="${q.exclusive}"]`).checked = false;
        }
        const urgent = q.urgent && q.urgent.some((v) => options.querySelector(`input[value="${v}"]`).checked);
        notice.classList.toggle("is-visible", !!urgent);
      });
      const notice = dual("p", Q.warningNotice, "notice");
      item.appendChild(notice);
    }
    return item;
  }

  // Every question needs an answer. Returns true when all of them are answered.
  function checkQuestionnaire(root) {
    let allAnswered = true;
    root.querySelectorAll(".q-item").forEach((item) => {
      if (item.querySelector(".bmi-row")) return;          // height and weight are checked as normal fields
      const answered = item.querySelector("input:checked");
      if (answered) clearError(item); else { setError(item, "errChoose"); allAnswered = false; }
    });
    return allAnswered;
  }

  function collectQuestionnaire(root) {
    const answers = { version: Q.version };
    Q.sections.forEach((section) => section.questions.forEach((q) => {
      if (q.type === "single") {
        const picked = root.querySelector(`input[name="${q.id}"]:checked`);
        answers[q.id] = picked ? picked.value : null;
      } else if (q.type === "multi") {
        answers[q.id] = Array.from(root.querySelectorAll(`input[name="${q.id}"]:checked`)).map((i) => i.value);
      } else if (q.type === "body") {
        const h = Number($("height").value), w = Number($("weight").value);
        answers.height = h; answers.weight = w;
        answers.bmi = Math.round((w / ((h / 100) * (h / 100))) * 10) / 10;
      }
    }));
    return answers;
  }

  function showBmi() {
    const h = Number($("height").value), w = Number($("weight").value), out = $("bmi-text");
    out.textContent = h >= 100 && w >= 20 ? t("bmiLabel") + ": " + (Math.round((w / ((h / 100) * (h / 100))) * 10) / 10) : "";
  }

  /* ================= REGISTER - PATIENT ================= */
  function initRegisterPatient() {
    const form = $("register-form");
    const questionnaire = $("questionnaire");
    buildQuestionnaire(questionnaire);
    clearErrorsWhileTyping(form);
    form.addEventListener("input", (e) => { if (e.target.id === "height" || e.target.id === "weight") showBmi(); });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();

      const fieldsOk = checkFields(form);
      const questionsOk = checkQuestionnaire(questionnaire);
      if (!fieldsOk || !questionsOk) {
        showAlert("error", "errFixFields");
        scrollToFirstError(form);
        return;
      }

      // TODO(backend): the server checks these two again and answers with an error if they are taken
      const email = $("email").value.trim();
      const existing = Users.findByEmail(email);
      if (existing) { setError($("email").closest(".field"), "errEmailTaken"); scrollToFirstError(form); return; }
      const healthId = $("health-id").value.trim();
      if (Users.findByHealthId(healthId)) { setError($("health-id").closest(".field"), "errHealthIdTaken"); scrollToFirstError(form); return; }

      // TODO(backend): POST this to the server, which hashes the password and saves the patient with the medical history
      Users.add({
        role: "patient", status: "approved",
        name: $("full-name").value.trim(), email: email, password: $("password").value,
        phone: $("phone").value.trim(), dob: $("dob").value, gender: $("gender").value, healthId: healthId,
        medicalHistory: {
          symptoms: $("symptoms").value.trim(),
          medications: $("medications").value.trim(),
          questionnaire: collectQuestionnaire(questionnaire),
          updated: new Date().toISOString().slice(0, 10)
        }
      });

      $("form-card").hidden = true;
      $("done-card").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ================= REGISTER - HEALTHCARE PROFESSIONAL ================= */
  function initRegisterProfessional() {
    const form = $("register-form");
    clearErrorsWhileTyping(form);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();

      if (!checkFields(form)) { showAlert("error", "errFixFields"); scrollToFirstError(form); return; }

      // A rejected professional may submit a new request. The old rejected request stays in the history.
      const email = $("email").value.trim();
      const existing = Users.findByEmail(email);
      if (existing && existing.status !== "rejected") {
        setError($("email").closest(".field"), "errEmailTaken");
        scrollToFirstError(form);
        return;
      }

      // TODO(backend): POST this to the server. It is saved with the status "pending" and appears in the admin's list.
      Users.add({
        role: $("role").value, status: "pending",
        name: $("full-name").value.trim(), email: email, password: $("password").value,
        nationalId: $("national-id").value.trim(), scfhsNumber: $("scfhs").value.trim()
      });

      $("form-card").hidden = true;
      $("done-card").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ================= FORGOT PASSWORD ================= */
  function initForgot() {
    const form = $("forgot-form");
    clearErrorsWhileTyping(form);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();
      if (!checkFields(form)) return;

      // The answer is the same whether the email exists or not, so nobody can find out who is registered.
      // TODO(backend): the server emails a one-time reset link to registered addresses only.
      const email = $("email").value.trim();
      const exists = Users.findByEmail(email);
      showAlert("ok", "forgotDone", () => exists
        ? `<br><a class="link" href="reset-password.html?email=${encodeURIComponent(email)}">${esc(t("demoOpenReset"))}</a>`
        : "");
    });
  }

  /* ================= RESET PASSWORD ================= */
  function initReset() {
    const form = $("reset-form");
    const email = new URLSearchParams(window.location.search).get("email");

    // TODO(backend): the real link carries a one-time token, not the email
    if (!email || !Users.findByEmail(email)) {
      form.hidden = true;
      showAlert("error", "resetInvalid");
      return;
    }
    clearErrorsWhileTyping(form);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();
      if (!checkFields(form)) return;

      Users.setPassword(email, $("password").value);
      form.hidden = true;
      showAlert("ok", "resetDone");
    });
  }

  /* ================= LOGOUT ================= */
  function initLogout() {
    Users.clearSession();
    window.location.replace("login.html?loggedout=1");
  }

  /* ---------------- Boot ---------------- */
  const pages = {
    login: initLogin, "register-patient": initRegisterPatient, "register-professional": initRegisterProfessional,
    forgot: initForgot, reset: initReset, logout: initLogout
  };
  const run = pages[document.body.dataset.page];
  if (run) run();
  setupPasswordToggles();
  applyLang();

  const toggle = $("lang-toggle");
  if (toggle) toggle.addEventListener("click", () => { lang = lang === "ar" ? "en" : "ar"; applyLang(); });
})();
