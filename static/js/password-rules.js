/* MUFSAL - password rules shown under a new-password box.
   Grey = not met yet, green = met, all red = the form was sent while something is missing.
   The rules are the same as in auth.js (8-20 characters, upper, lower, number, special).
   Nothing else on the page is changed; the old one-line hint is only hidden. */
(function () {
  var RULES = [
    { ok: function (v) { return v.length >= 8 && v.length <= 20; }, en: "8 to 20 characters", ar: "من 8 إلى 20 خانة" },
    { ok: function (v) { return /[A-Z]/.test(v); }, en: "An uppercase letter (A-Z)", ar: "حرف كبير (A-Z)" },
    { ok: function (v) { return /[a-z]/.test(v); }, en: "A lowercase letter (a-z)", ar: "حرف صغير (a-z)" },
    { ok: function (v) { return /[0-9]/.test(v); }, en: "A number (0-9)", ar: "رقم (0-9)" },
    { ok: function (v) { return /[^A-Za-z0-9]/.test(v); }, en: "A special character (! @ # $ ...)", ar: "رمز خاص (! @ # $ ...)" }
  ];

  var style = document.createElement("style");
  style.textContent =
    ".pwr-list{list-style:none;margin:8px 0 0;padding:0;font-size:.85rem}" +
    ".pwr-list li{color:#8a8f98;margin:3px 0;transition:color .15s}" +
    ".pwr-list li::before{content:'\\2022';display:inline-block;width:1.2em}" +
    ".pwr-list li.ok{color:#1a7f4b}" +
    ".pwr-list li.ok::before{content:'\\2713'}" +
    ".pwr-list.bad li{color:#c0392b}" +
    ".pwr-list.bad li::before{content:'\\2715'}";
  document.head.appendChild(style);

  function isArabic() { return document.documentElement.lang === "ar"; }

  function build(input) {
    var field = input.closest(".field") || input.parentNode;
    var hint = field.querySelector(".field-hint");
    if (hint) hint.style.display = "none";

    var list = document.createElement("ul");
    list.className = "pwr-list";
    list.setAttribute("aria-live", "polite");
    var items = RULES.map(function () { var li = document.createElement("li"); list.appendChild(li); return li; });

    var anchor = hint || field.querySelector(".field-with-icon") || input;
    anchor.parentNode.insertBefore(list, anchor.nextSibling);

    function labels() { RULES.forEach(function (r, i) { items[i].textContent = isArabic() ? r.ar : r.en; }); }
    function paint() {
      RULES.forEach(function (r, i) { items[i].className = r.ok(input.value) ? "ok" : ""; });
    }
    function allMet() { return RULES.every(function (r) { return r.ok(input.value); }); }

    input.addEventListener("input", function () { list.classList.remove("bad"); paint(); });
    if (input.form) {
      input.form.addEventListener("submit", function () {
        if (!allMet()) { list.classList.add("bad"); }
      }, true);
    }
    new MutationObserver(labels).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    labels(); paint();
  }

  function start() {
    var boxes = document.querySelectorAll('input[type="password"][data-check="password"]');
    for (var i = 0; i < boxes.length; i++) build(boxes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
