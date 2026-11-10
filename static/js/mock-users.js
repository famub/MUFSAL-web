/* ==========================================================
   MUFSAL - Mock accounts and login session
   - There is no database yet, so accounts are kept in the browser (localStorage).
   - Every place that needs the backend is marked TODO(backend).
   - DEMO ONLY: passwords are stored as plain text here so the pages can be tested.
     Never type a real password in this version.
     TODO(backend): hash passwords on the server (bcrypt or Argon2, work factor 12 - NFR-S4).
   ========================================================== */
(function () {
  "use strict";

  const USERS_KEY = "mufsal-users";          // accounts created from the registration pages
  const OVERRIDES_KEY = "mufsal-pw-changes"; // passwords changed from the reset page
  const SESSION_KEY = "mufsal-session";      // who is logged in now

  // NFR-S5: doctors and radiologists are logged out after 15 minutes without activity
  const TIMEOUT_MS = 15 * 60 * 1000;
  const TIMEOUT_ROLES = ["doctor", "radiologist"];

  // Where each role goes after logging in.
  // TODO: doctor dashboard and admin pages are not built yet - change these two when they exist.
  const HOME = {
    patient: "dashboard-patient.html",
    radiologist: "dashboard-radiologist.html",
    doctor: "review-cases.html",
    admin: "admin-requests.html"
  };

  // Demo accounts so every login path can be tested. Password for all of them: Mufsal@123
  const SEED = [
    { role: "patient",     status: "approved", name: "Sarah Ahmed",     email: "patient@mufsal.test",     password: "Mufsal@123", healthId: "1098765432" },
    { role: "radiologist", status: "approved", name: "Dr. Huda Alotaibi", email: "radiologist@mufsal.test", password: "Mufsal@123" },
    { role: "doctor",      status: "approved", name: "Dr. Noura Alqahtani", email: "doctor@mufsal.test",    password: "Mufsal@123" },
    { role: "admin",       status: "approved", name: "MUFSAL Admin",    email: "admin@mufsal.test",       password: "Mufsal@123" },
    { role: "doctor",      status: "pending",  name: "Dr. Reem Alharbi", email: "pending.doctor@mufsal.test", password: "Mufsal@123" },
    { role: "radiologist", status: "rejected", name: "Dr. Lama Alsaif",  email: "rejected.radiologist@mufsal.test", password: "Mufsal@123",
      rejectionReason: "The SCFHS licence number could not be verified." }
  ];

  /* ---------------- Storage helpers (never crash if the browser blocks storage) ---------------- */
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  /* ---------------- Accounts ---------------- */
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

  function all() {
    const overrides = read(OVERRIDES_KEY, {});
    return SEED.concat(read(USERS_KEY, [])).map(function (u) {
      const newPassword = overrides[u.email.toLowerCase()];
      return newPassword ? Object.assign({}, u, { password: newPassword }) : u;
    });
  }

  // The newest account with this email. A rejected professional can submit a new request,
  // so the same email can appear twice and the old rejected request stays in the history.
  function findByEmail(email) {
    const matches = all().filter(function (u) { return same(u.email, email); });
    return matches.length ? matches[matches.length - 1] : null;
  }

  function findByHealthId(healthId) {
    return all().find(function (u) { return u.healthId && u.healthId === String(healthId).trim(); }) || null;
  }

  // TODO(backend): POST the new account to the server instead of keeping it here.
  // When the admin approves a professional, the server also sends the "you can now log in" notification.
  function add(user) {
    const stored = read(USERS_KEY, []);
    user.createdAt = new Date().toISOString();
    stored.push(user);
    write(USERS_KEY, stored);
  }

  // TODO(backend): the real version sends an email with a one-time link and the server saves the new password
  function setPassword(email, newPassword) {
    const overrides = read(OVERRIDES_KEY, {});
    overrides[String(email).trim().toLowerCase()] = newPassword;
    write(OVERRIDES_KEY, overrides);
  }

  /* ---------------- Session ---------------- */
  // TODO(backend): a real server session (secure cookie). The server also applies the 15-minute timeout.
  function setSession(user) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, role: user.role, name: user.name, at: Date.now() }));
    } catch (e) { /* ignore */ }
  }
  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }

  // Put this at the top of any page that needs a logged-in user:
  //   <script src="static/js/mock-users.js"></script>
  //   <script>MufsalUsers.guard(["patient"]);</script>
  // Not logged in -> login page. Wrong role -> the user's own home page.
  function guard(roles) {
    const session = getSession();
    if (!session) { window.location.replace("login.html"); return null; }

    // A doctor or radiologist who was inactive for 15 minutes must log in again (NFR-S5)
    if (TIMEOUT_ROLES.indexOf(session.role) !== -1 && Date.now() - (session.at || 0) > TIMEOUT_MS) {
      clearSession();
      window.location.replace("login.html?expired=1");
      return null;
    }

    if (roles && roles.indexOf(session.role) === -1) { window.location.replace(HOME[session.role]); return null; }

    // Opening a page counts as activity, so the 15 minutes start again
    session.at = Date.now();
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
    return session;
  }

  window.MufsalUsers = {
    HOME: HOME, all: all, findByEmail: findByEmail, findByHealthId: findByHealthId, add: add,
    setPassword: setPassword, setSession: setSession, getSession: getSession,
    clearSession: clearSession, guard: guard
  };
})();
