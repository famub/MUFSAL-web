/* ==========================================================
   MUFSAL - Login, registration and password pages
   (shared script: login, register-patient, register-professional, forgot-password, reset-password, logout)
   - Talks to the Flask backend (app.py) with fetch(): /api/register/*, /api/login, /api/logout, /api/forgot, /api/reset.
   - static/js/mock-users.js is only used for the browser session helpers (guard, HOME) that the other pages call.
   - Bilingual (EN / AR) with the header's #lang-toggle button.
   - Which page runs is decided by <body data-page="...">.
   ========================================================== */
(function () {
  "use strict";

  const Users = window.MufsalUsers;

  /* ---------------- Rules (change them here only) ---------------- */
  const MIN_AGE = 18;
  const NATIONAL_ID_PATTERN = /^[12][0-9]{9}$/;      // National ID starts with 1, Iqama with 2
  const SCFHS_PATTERN = /^[A-Za-z0-9\-\/]{5,20}$/;   // TODO: confirm the real SCFHS licence number format

  /* ---------------- Language (EN / AR) ---------------- */
  const T = {
    en: {
      // titles
      loginTitle: "Log in to MUFSAL", loginSub: "Welcome back. Enter your email and password.",
      regTitle: "Create your account", regSub: "Choose how you will use MUFSAL.",
      patTitle: "Create a patient account", patSub: "Create your account. You will add your X-ray and medical details when you upload a case.",
      proTitle: "Create a healthcare professional account", proSub: "An admin verifies your SCFHS licence before you can log in.",
      forgotTitle: "Forgot your password?", forgotSub: "Enter your registered email and we will send you a link to reset your password.",
      resetTitle: "Create a new password", resetSub: "Choose a new password for your account.",
      loggingOut: "Logging you out...",
      // common fields
      email: "Email address", password: "Password", confirmPassword: "Confirm password", showHidePw: "Show or hide password",
      pwHint: "8 to 20 characters, with an uppercase letter, a lowercase letter, a number and a special character.",
      fullName: "Full name", dob: "Date of birth", gender: "Gender", genderSelect: "Select gender",
      female: "Female", male: "Male",
      // login
      loginBtn: "Log in", forgotLink: "Forgot password?", noAccount: "New to MUFSAL?", createAccount: "Create an account",
      demoTitle: "Demo accounts (for testing only)", demoNote: "Password for all of them: Mufsal@123",
      demoPatient: "Patient", demoRadiologist: "Radiologist", demoDoctor: "Doctor", demoAdmin: "Admin",
      demoPending: "Doctor, pending approval", demoRejected: "Radiologist, rejected",
      errBadLogin: "Incorrect email or password. Please try again.",
      pendingMsg: "Your account is still awaiting admin approval. You will be able to log in once it is approved.",
      rejectedMsg: "Your registration request was rejected. Please correct your information and submit a new registration request.",
      deactivatedMsg: "This account has been closed by the admin and can no longer be used. Please contact the admin if you think this is a mistake.",
      rejectedFinalMsg: "Your registration request was rejected again. You cannot submit another request. Please contact the admin if you think this is a mistake.",
      errResubmitBlocked: "This account was rejected twice, so a new request cannot be submitted. Please contact the admin.",
      rejectedReason: "Reason:", resubmit: "Submit a new request", loggedOut: "You have been logged out.",
      sessionExpired: "Your session ended after 15 minutes without activity. Please log in again.",
      // register choice
      patientCardTitle: "I am a patient", patientCardDesc: "Upload your knee X-ray and receive a doctor-reviewed report in simple language.",
      proCardTitle: "I am a healthcare professional", proCardDesc: "Radiologists and doctors. Your SCFHS licence is verified by an admin before you can log in.",
      haveAccount: "Already have an account?", loginLink: "Log in",
      // patient
      secPersonal: "Personal information", secAccount: "Account",

      createBtn: "Create account",
      doneTitle: "Account created", doneBody: "Your account is ready. You can now log in.", goLogin: "Go to log in",
      // professional
      role: "Role", roleSelect: "Select your role", radiologist: "Radiologist", doctor: "Doctor",
      nationalId: "National ID / Iqama number", nationalIdHint: "10 digits.", scfhs: "SCFHS licence number", licenseExpiry: "Licence expiry date",
      submitRequest: "Submit account request",
      pendingTitle: "Request submitted", pendingBody: "Your registration request is pending admin approval. You can log in now, but your account stays locked until the admin approves it.",
      // forgot / reset
      sendLink: "Send reset link", forgotDone: "A password reset link has been sent to your email.", errEmailNotFound: "This email is not registered. Please check it or create an account.",
      demoOpenReset: "Demo only: open the reset page", backToLogin: "Back to log in",
      newPassword: "New password", resetBtn: "Save new password",
      resetInvalid: "This reset link is not valid or has expired.",
      resetDone: "Your password was changed. You can now log in with your new password.",
      // errors
      errRequired: "This field is required.",
      errEmailEnglish: "Please write the email in English letters.",
      errEmail: "Please enter a valid email address, for example name@example.com",
      errDob: "Please enter a valid date of birth.",
      errMinAge: "You must be at least {n} years old to use MUFSAL.",
      errPwLength: "The password must be 8 to 20 characters long.",
      errPwRules: "The password needs an uppercase letter, a lowercase letter, a number and a special character.",
      errConfirm: "The passwords do not match.",

      errNationalId: "Please enter a valid National ID or Iqama number (10 digits starting with 1 or 2).",
      errScfhs: "Please enter a valid SCFHS licence number.",
      errEmailTaken: "This email is already registered. Please log in or use another email.",

      licenseExpiryHint: "The account is suspended once this date passes, until the licence is renewed.",
      errLicenseExpiry: "Choose the date the licence runs out.",
      errLicenseExpired: "That date has already passed. A licence must still be valid to register.",
      requiredNote: "Fields marked with * are required.",
      errNationalIdTaken: "This National ID / Iqama number is already registered.", errScfhsTaken: "This SCFHS licence number is already registered.",
      errInvalidData: "Some information is not accepted. Please check the fields and try again.",
      errServer: "Something went wrong on our side. Please try again in a moment.", errLocked: "Too many wrong attempts. Please wait 15 minutes and try again.", errFixFields: "Please fix the highlighted fields and try again."
    },
    ar: {
      loginTitle: "تسجيل الدخول إلى مفصل", loginSub: "أهلًا بعودتك. أدخل بريدك الإلكتروني وكلمة المرور.",
      regTitle: "إنشاء حساب", regSub: "اختر كيف ستستخدم مفصل.",
      patTitle: "إنشاء حساب مريض", patSub: "أنشئ حسابك. ستضيف أشعتك ومعلوماتك الطبية عند رفع حالة جديدة.",
      proTitle: "إنشاء حساب ممارس صحي", proSub: "يتحقق المشرف من ترخيصك في هيئة التخصصات الصحية قبل أن تتمكن من تسجيل الدخول.",
      forgotTitle: "نسيت كلمة المرور؟", forgotSub: "أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.",
      resetTitle: "إنشاء كلمة مرور جديدة", resetSub: "اختر كلمة مرور جديدة لحسابك.",
      loggingOut: "جارٍ تسجيل الخروج...",
      email: "البريد الإلكتروني", password: "كلمة المرور", confirmPassword: "تأكيد كلمة المرور", showHidePw: "إظهار أو إخفاء كلمة المرور",
      pwHint: "من 8 إلى 20 خانة، وتحتوي على حرف كبير وحرف صغير ورقم ورمز خاص.",
      fullName: "الاسم الكامل", dob: "تاريخ الميلاد", gender: "الجنس", genderSelect: "اختر الجنس",
      female: "أنثى", male: "ذكر",
      loginBtn: "تسجيل الدخول", forgotLink: "نسيت كلمة المرور؟", noAccount: "مستخدم جديد في مفصل؟", createAccount: "إنشاء حساب",
      demoTitle: "حسابات تجريبية (للاختبار فقط)", demoNote: "كلمة المرور لجميعها: Mufsal@123",
      demoPatient: "مريض", demoRadiologist: "أخصائي أشعة", demoDoctor: "طبيب", demoAdmin: "مشرف",
      demoPending: "طبيب بانتظار الموافقة", demoRejected: "أخصائي أشعة مرفوض",
      errBadLogin: "البريد الإلكتروني أو كلمة المرور غير صحيحة. حاول مرة أخرى.",
      pendingMsg: "حسابك ما زال بانتظار موافقة المشرف. ستتمكن من تسجيل الدخول بعد الموافقة عليه.",
      rejectedMsg: "تم رفض طلب تسجيلك. يرجى تصحيح معلوماتك وتقديم طلب تسجيل جديد.",
      deactivatedMsg: "تم إغلاق هذا الحساب من قبل المشرف ولم يعد قابلًا للاستخدام. يرجى التواصل مع المشرف إذا كنت ترى أن هذا خطأ.",
      rejectedFinalMsg: "تم رفض طلب تسجيلك مرة أخرى، ولا يمكنك تقديم طلب جديد. يرجى التواصل مع المشرف إذا كنت ترى أن هذا خطأ.",
      errResubmitBlocked: "تم رفض هذا الحساب مرتين، لذلك لا يمكن تقديم طلب جديد. يرجى التواصل مع المشرف.",
      rejectedReason: "السبب:", resubmit: "تقديم طلب جديد", loggedOut: "تم تسجيل خروجك.",
      sessionExpired: "انتهت جلستك بعد 15 دقيقة من عدم النشاط. يرجى تسجيل الدخول مرة أخرى.",
      patientCardTitle: "أنا مريض", patientCardDesc: "ارفع أشعة ركبتك واحصل على تقرير راجعه الطبيب بلغة بسيطة.",
      proCardTitle: "أنا ممارس صحي", proCardDesc: "أخصائيو الأشعة والأطباء. يتحقق المشرف من ترخيصك في هيئة التخصصات الصحية قبل أن تتمكن من تسجيل الدخول.",
      haveAccount: "لديك حساب؟", loginLink: "تسجيل الدخول",
      secPersonal: "المعلومات الشخصية", secAccount: "الحساب",

      createBtn: "إنشاء الحساب",
      doneTitle: "تم إنشاء الحساب", doneBody: "حسابك جاهز. يمكنك الآن تسجيل الدخول.", goLogin: "الذهاب إلى تسجيل الدخول",
      role: "الدور", roleSelect: "اختر دورك", radiologist: "أخصائي أشعة", doctor: "طبيب",
      nationalId: "رقم الهوية الوطنية / الإقامة", nationalIdHint: "10 أرقام.", scfhs: "رقم ترخيص هيئة التخصصات الصحية", licenseExpiry: "تاريخ انتهاء الرخصة",
      submitRequest: "إرسال طلب إنشاء الحساب",
      pendingTitle: "تم إرسال الطلب", pendingBody: "طلب تسجيلك بانتظار موافقة المشرف. يمكنك تسجيل الدخول الآن، لكن حسابك يبقى مقفلاً حتى يوافق المشرف.",
      sendLink: "إرسال رابط إعادة التعيين", forgotDone: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.", errEmailNotFound: "هذا البريد الإلكتروني غير مسجّل. تأكد منه أو أنشئ حسابًا.",
      demoOpenReset: "للتجربة فقط: افتح صفحة إعادة التعيين", backToLogin: "العودة إلى تسجيل الدخول",
      newPassword: "كلمة المرور الجديدة", resetBtn: "حفظ كلمة المرور الجديدة",
      resetInvalid: "رابط إعادة التعيين غير صالح أو منتهي.",
      resetDone: "تم تغيير كلمة المرور. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
      errRequired: "هذا الحقل مطلوب.",
      errEmailEnglish: "يرجى كتابة البريد الإلكتروني بأحرف إنجليزية.",
      errEmail: "يرجى إدخال بريد إلكتروني صحيح، مثال: name@example.com",
      errDob: "يرجى إدخال تاريخ ميلاد صحيح.",
      errMinAge: "يجب أن يكون عمرك {n} سنة على الأقل لاستخدام مفصل.",
      errPwLength: "يجب أن تكون كلمة المرور من 8 إلى 20 خانة.",
      errPwRules: "يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير ورقم ورمز خاص.",
      errConfirm: "كلمتا المرور غير متطابقتين.",

      errNationalId: "يرجى إدخال رقم هوية وطنية أو إقامة صحيح (10 أرقام يبدأ بـ 1 أو 2).",
      errScfhs: "يرجى إدخال رقم ترخيص هيئة التخصصات الصحية بشكل صحيح.",
      errEmailTaken: "هذا البريد الإلكتروني مسجل مسبقًا. سجّل الدخول أو استخدم بريدًا آخر.",

      licenseExpiryHint: "يُعلَّق الحساب بعد مرور هذا التاريخ حتى تُجدَّد الرخصة.",
      errLicenseExpiry: "اختر تاريخ انتهاء الرخصة.",
      errLicenseExpired: "هذا التاريخ مضى. يجب أن تكون الرخصة سارية عند التسجيل.",
      requiredNote: "الحقول المعلّمة بـ * مطلوبة.",
      errNationalIdTaken: "رقم الهوية / الإقامة هذا مسجل مسبقًا.", errScfhsTaken: "رقم ترخيص هيئة التخصصات الصحية هذا مسجل مسبقًا.",
      errInvalidData: "بعض المعلومات غير مقبولة. يرجى مراجعة الحقول والمحاولة مرة أخرى.",
      errServer: "حدث خطأ من جهتنا. حاول مرة أخرى بعد قليل.", errLocked: "محاولات خاطئة كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى.", errFixFields: "يرجى تصحيح الحقول المظللة والمحاولة مرة أخرى."
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

  // Sends JSON to the server. Always returns { status, data }.
  async function api(path, body, method) {
    try {
      const res = await fetch(path, {
        method: method || (body === undefined ? "GET" : "POST"),
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      let data = {}; try { data = await res.json(); } catch (e) {}
      return { status: res.status, data: data };
    } catch (e) {
      return { status: 0, data: { error: "network" } };
    }
  }

  // Server error code -> [field id, message key] shown under the field
  const FIELD_ERRORS = {
    email_taken: ["email", "errEmailTaken"], email_invalid: ["email", "errEmail"],
    national_id_taken: ["national-id", "errNationalIdTaken"], national_id_invalid: ["national-id", "errNationalId"],
    scfhs_taken: ["scfhs", "errScfhsTaken"], scfhs_invalid: ["scfhs", "errScfhs"],
    license_expiry_invalid: ["license-expiry", "errLicenseExpiry"],
    license_expired: ["license-expiry", "errLicenseExpired"],
    dob_invalid: ["dob", "errDob"], min_age: ["dob", "errMinAge"],
    gender_invalid: ["gender", "errRequired"], role_invalid: ["role", "errRequired"],
    password_length: ["password", "errPwLength"], password_rules: ["password", "errPwRules"],
    name_required: ["full-name", "errRequired"], name_invalid: ["full-name", "errRequired"]
  };
  function showServerError(form, data) {
    const hit = FIELD_ERRORS[data && data.error];
    if (hit && $(hit[0])) { setError($(hit[0]).closest(".field"), hit[1]); scrollToFirstError(form); }
    else if (data && data.error === "resubmit_blocked") showAlert("error", "errResubmitBlocked");
    else showAlert("error", data && data.error === "invalid_data" ? "errInvalidData" : "errServer");
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
    document.cookie = "lang=" + lang + "; path=/; max-age=31536000; SameSite=Lax";   // the server pages (Jinja) read this cookie

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
      case "licenseExpiry": {
        if (!value) return "errLicenseExpiry";
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return new Date(value) > today ? "" : "errLicenseExpired";
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
      case "nationalId": return NATIONAL_ID_PATTERN.test(value) ? "" : "errNationalId";
      case "scfhs":      return SCFHS_PATTERN.test(value) ? "" : "errScfhs";
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

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      // Empty fields get the normal "required" message
      let filled = true;
      form.querySelectorAll(".field").forEach((box) => {
        const field = box.querySelector("input");
        if (field.value.trim() === "") { setError(box, "errRequired"); filled = false; } else clearError(box);
      });
      if (!filled) return;

      // The server compares the password hash and answers with the role and the approval status
      const r = await api("/api/login", { email: $("email").value.trim(), password: $("password").value });
      if (r.data.ok) {
        Users.setSession(r.data.user);                    // browser copy used by guard() on the other pages
        window.location.href = r.data.user.home;          // each role goes to its own home page
        return;
      }
      switch (r.data.error) {
        case "bad_login": showAlert("error", "errBadLogin"); break;       // same message for a wrong email and a wrong password
        case "locked":    showAlert("error", "errLocked"); break;
        case "pending":   showAlert("warn", "pendingMsg"); break;
        case "deactivated": showAlert("error", "deactivatedMsg"); break;
        case "rejected": {
          const retry = r.data.canResubmit !== false;      // the server allows ONE new request, not more
          showAlert("error", retry ? "rejectedMsg" : "rejectedFinalMsg", () => {
            const reason = r.data.reason ? ` <strong>${esc(t("rejectedReason"))}</strong> ${esc(r.data.reason)}` : "";
            return reason + (retry ? ` <a class="link" href="register-professional.html">${esc(t("resubmit"))}</a>` : "");
          });
          break;
        }
        default: showAlert("error", "errServer");
      }
    });
  }

  /* ================= REGISTER - PATIENT ================= */
  function setupNumberInputs() {
    const nid = $("national-id");
    if (nid) nid.addEventListener("input", () => { nid.value = nid.value.replace(/[^0-9]/g, "").slice(0, 10); });
  }

  function initRegisterPatient() {
    const form = $("register-form");
    clearErrorsWhileTyping(form);
    setupNumberInputs();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      if (!checkFields(form)) { showAlert("error", "errFixFields"); scrollToFirstError(form); return; }

      // The server checks the email and the Health ID again against the database, hashes the password and saves the patient
      const r = await api("/api/register/patient", {
        name: $("full-name").value.trim(), email: $("email").value.trim(), password: $("password").value,
        nationalId: $("national-id").value.trim(),
        dob: $("dob").value, gender: $("gender").value
      });
      if (!r.data.ok) { showServerError(form, r.data); return; }

      $("form-card").hidden = true;
      $("done-card").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ================= REGISTER - HEALTHCARE PROFESSIONAL ================= */
  function initRegisterProfessional() {
    const form = $("register-form");
    clearErrorsWhileTyping(form);
    setupNumberInputs();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      if (!checkFields(form)) { showAlert("error", "errFixFields"); scrollToFirstError(form); return; }

      // Saved with the status "pending" and appears in the admin's list.
      // A rejected professional may send a new request: the server keeps the old rejected one in the history.
      const r = await api("/api/register/professional", {
        role: $("role").value, name: $("full-name").value.trim(), email: $("email").value.trim(),
        password: $("password").value,
        nationalId: $("national-id").value.trim(), scfhsNumber: $("scfhs").value.trim(),
        licenseExpiry: $("license-expiry").value
      });
      if (!r.data.ok) { showServerError(form, r.data); return; }

      $("form-card").hidden = true;
      $("done-card").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ================= FORGOT PASSWORD ================= */
  function initForgot() {
    const form = $("forgot-form");
    clearErrorsWhileTyping(form);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      if (!checkFields(form)) return;

      // The answer is the same whether the email exists or not, so nobody can find out who is registered.
      // TODO(email): the server only prints the link now. Connect an email service so it is sent to the user.
      const r = await api("/api/forgot", { email: $("email").value.trim() });
      if (r.data.error === "email_not_found") { showAlert("error", "errEmailNotFound"); return; }
      if (!r.data.ok) { showAlert("error", "errServer"); return; }
      showAlert("ok", "forgotDone", () => r.data.devLink      // devLink exists only while MUFSAL_DEV=1 (no email yet)
        ? `<br><a class="link" href="${esc(r.data.devLink)}">${esc(t("demoOpenReset"))}</a>` : "");
    });
  }

  /* ================= RESET PASSWORD ================= */
  async function initReset() {
    const form = $("reset-form");
    const token = new URLSearchParams(window.location.search).get("token") || "";

    const check = token ? await api("/api/reset/check?token=" + encodeURIComponent(token)) : null;
    if (!check || !check.data.ok) {
      form.hidden = true;
      showAlert("error", "resetInvalid");
      return;
    }
    clearErrorsWhileTyping(form);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      if (!checkFields(form)) return;

      const r = await api("/api/reset", { token: token, password: $("password").value });
      if (!r.data.ok) {
        if (r.data.error === "reset_invalid") { form.hidden = true; showAlert("error", "resetInvalid"); }
        else showServerError(form, r.data);
        return;
      }
      form.hidden = true;
      showAlert("ok", "resetDone");
    });
  }

  /* ================= LOGOUT ================= */
  async function initLogout() {
    await api("/api/logout", {});          // the server ends the session cookie
    Users.clearSession();
    window.location.replace("login.html?loggedout=1");
  }

  /* ---------------- Required fields: red star after the label + a note at the top of the form ---------------- */
  function markRequired() {
    document.querySelectorAll("input[required], select[required], textarea[required]").forEach((field) => {
      const label = document.querySelector('label[for="' + field.id + '"]');
      if (label) label.classList.add("req");
    });
    const page = document.body.dataset.page;
    if (page === "register-patient" || page === "register-professional") {
      const note = el("p", "required-note");
      note.innerHTML = '<span class="req-star">*</span> <span data-i18n="requiredNote"></span>';
      const form = $("register-form");
      form.insertBefore(note, $("form-alert").nextSibling);
    }
  }

  /* ---------------- Boot ---------------- */
  const pages = {
    login: initLogin, "register-patient": initRegisterPatient, "register-professional": initRegisterProfessional,
    forgot: initForgot, reset: initReset, logout: initLogout
  };
  const run = pages[document.body.dataset.page];
  if (run) run();
  setupPasswordToggles();
  markRequired();
  applyLang();

  const toggle = $("lang-toggle");
  if (toggle) toggle.addEventListener("click", () => { lang = lang === "ar" ? "en" : "ar"; applyLang(); });
})();
