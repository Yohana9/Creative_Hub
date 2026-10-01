/* Testimonials: public list, submit form with email confirmation, confirmation banner. */
(function () {
  "use strict";
  var YR = window.YR || {};
  var grid = document.getElementById("tstGrid");
  var form = document.getElementById("tstForm");
  var section = document.getElementById("testimonials");
  if (!grid && !form) return;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function stars(n) {
    var s = el("span", "tst-stars"); s.setAttribute("role", "img"); s.setAttribute("aria-label", n + " out of 5 stars");
    for (var i = 1; i <= 5; i++) { var ic = el("span", "st" + (i <= n ? " on" : ""), "\u2605"); ic.setAttribute("aria-hidden", "true"); s.appendChild(ic); }
    return s;
  }
  function when(iso) { var d = iso ? new Date(iso) : null; return d && !isNaN(d) ? d.toLocaleDateString(undefined, { month: "short", year: "numeric" }) : ""; }

  /* ---------- list ---------- */
  function card(t) {
    var c = el("article", "tst-card reveal in");
    c.appendChild(el("i", "fas fa-quote-left tst-q")).setAttribute("aria-hidden", "true");
    if (t.rating) c.appendChild(stars(t.rating));
    c.appendChild(el("p", "tst-body", t.body));
    var f = el("footer", "tst-who");
    var av = el("span", "tst-av", (t.name || "?").charAt(0).toUpperCase()); av.setAttribute("aria-hidden", "true");
    var meta = el("div", "tst-meta"); meta.appendChild(el("strong", "", t.name));
    var sub = [t.city, when(t.date)].filter(Boolean).join(" \u00b7 "); if (sub) meta.appendChild(el("span", "", sub));
    f.appendChild(av); f.appendChild(meta); c.appendChild(f);
    return c;
  }
  function showSkeleton() { if (!grid) return; for (var i = 0; i < Math.min(3, Number(grid.dataset.limit) || 3); i++) grid.appendChild(el("div", "tst-card skel")); }
  function empty(msg) { var d = el("div", "tst-empty"); d.appendChild(el("i", "fas fa-comment-dots")).setAttribute("aria-hidden", "true"); d.appendChild(el("p", "", msg)); return d; }
  function loadList() {
    if (!grid) return;
    showSkeleton();
    var limit = Number(grid.dataset.limit) || 30;
    var done = function (r) {
      grid.innerHTML = "";
      var ok = r && !r.error && r.testimonials;
      if (!ok) { if (section) section.hidden = true; else grid.appendChild(empty("Testimonials could not be loaded right now. Please try again later.")); return; }
      if (!r.testimonials.length) { grid.appendChild(empty("No testimonials yet. Be the first to share a few kind words.")); }
      r.testimonials.forEach(function (t) { grid.appendChild(card(t)); });
      var sum = document.getElementById("tstSummary");
      if (sum && r.count) { sum.textContent = ""; if (r.average) { sum.appendChild(stars(Math.round(r.average))); sum.appendChild(el("b", "", " " + r.average.toFixed(1))); } sum.appendChild(el("span", "", (r.average ? " \u00b7 " : "") + r.count + (r.count === 1 ? " testimonial" : " testimonials"))); }
    };
    if (!YR.configured) { done(null); return; }
    YR.api("testimonials", { query: { limit: limit } }).then(done);
  }

  /* ---------- confirmation banner ---------- */
  var banner = document.getElementById("tstBanner");
  if (banner) {
    var q = new URLSearchParams(location.search), msg = null, kind = "ok";
    if (q.get("confirmed") === "1") msg = "Thank you! Your email is confirmed. Your testimonial will appear after a quick review.";
    else if (q.get("confirm") === "expired") { msg = "That confirmation link has expired. Please submit your testimonial again below."; kind = "bad"; }
    else if (q.get("confirm") === "invalid") { msg = "That confirmation link is not valid or was already used."; kind = "bad"; }
    if (msg) { banner.textContent = msg; banner.className = "tst-banner " + kind; banner.hidden = false; try { history.replaceState(null, "", location.pathname); } catch (e) {} }
  }

  /* ---------- form ---------- */
  if (form) {
    var opened = Date.now(), rating = 0;
    var f = form.elements, status = document.getElementById("tstStatus"), btn = document.getElementById("tstSend");
    var count = document.getElementById("tstCount");
    var TYPOS = { "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.co": "gmail.com", "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "outlok.com": "outlook.com" };
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function setErr(name, msg) {
      var fld = form.querySelector('[data-f="' + name + '"]'); if (!fld) return;
      fld.classList.toggle("has-err", !!msg); var e = fld.querySelector(".err"); if (e) e.textContent = msg || "";
    }
    function suggest() {
      var v = f.email.value.trim().toLowerCase(), at = v.lastIndexOf("@"), hint = document.getElementById("tstHint");
      var fix = at > 0 ? TYPOS[v.slice(at + 1)] : null; hint.textContent = "";
      if (fix) { var b = el("button", "tst-fix", v.slice(0, at + 1) + fix); b.type = "button"; b.addEventListener("click", function () { f.email.value = this.textContent; hint.textContent = ""; setErr("email", ""); }); hint.appendChild(document.createTextNode("Did you mean ")); hint.appendChild(b); hint.appendChild(document.createTextNode("?")); }
    }
    f.email.addEventListener("input", function () { suggest(); if (EMAIL.test(f.email.value.trim())) setErr("email", ""); });
    f.email.addEventListener("blur", function () { var v = f.email.value.trim(); if (v && !EMAIL.test(v)) setErr("email", "Enter a valid email address."); });
    f.body.addEventListener("input", function () { var n = f.body.value.trim().length; count.textContent = n + " / 600"; count.classList.toggle("ok", n >= 20); if (n >= 20) setErr("body", ""); });

    var radios = Array.prototype.slice.call(form.querySelectorAll(".star-input button"));
    function paint(n) { radios.forEach(function (b, i) { b.classList.toggle("on", i < n); b.setAttribute("aria-checked", String(i + 1 === rating)); }); }
    radios.forEach(function (b, i) {
      b.addEventListener("click", function () { rating = rating === i + 1 ? 0 : i + 1; paint(rating); });
      b.addEventListener("mouseenter", function () { paint(i + 1); });
      b.addEventListener("mouseleave", function () { paint(rating); });
      b.addEventListener("focus", function () { paint(Math.max(rating, i + 1)); });
      b.addEventListener("blur", function () { paint(rating); });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
        if (d) { e.preventDefault(); rating = Math.max(0, Math.min(5, (rating || i + 1) + d)); paint(rating); if (rating) radios[rating - 1].focus(); }
      });
    });

    function say(msg, kind) { status.textContent = msg || ""; status.className = "form-status" + (kind ? " " + kind : ""); }
    function validate() {
      var ok = true, name = f.name.value.trim(), em = f.email.value.trim(), body = f.body.value.trim();
      setErr("name", name.length < 2 ? "Please enter your name." : ""); if (name.length < 2) ok = false;
      setErr("email", !EMAIL.test(em) ? "Enter a valid email address." : ""); if (!EMAIL.test(em)) ok = false;
      setErr("body", body.length < 20 ? "Please write a little more (at least 20 characters)." : /https?:\/\/|www\./i.test(body) ? "Please remove links." : "");
      if (body.length < 20 || /https?:\/\/|www\./i.test(body)) ok = false;
      var cErr = document.getElementById("tstConsentErr"); cErr.textContent = f.consent.checked ? "" : "Please tick this box."; if (!f.consent.checked) ok = false;
      return ok;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault(); say("");
      if (!YR.configured) { say("Testimonials are not available right now. Please use the contact page instead.", "bad"); return; }
      if (!validate()) { var bad = form.querySelector(".has-err input, .has-err textarea"); if (bad) bad.focus(); return; }
      btn.disabled = true; var label = btn.textContent; btn.textContent = "Sending\u2026";
      YR.api("testimonial_submit", { method: "POST", body: { name: f.name.value.trim(), email: f.email.value.trim(), city: f.city.value.trim(), rating: rating, body: f.body.value.trim(), consent: true, hp_site: f.hp_site.value, t: opened } }).then(function (r) {
        btn.disabled = false; btn.textContent = label;
        if (!r) { say("Could not reach the server. Check your connection and try again.", "bad"); return; }
        if (r.error) { say(r.error, "bad"); return; }
        var box = document.getElementById("tstFormPanel"), em = f.email.value.trim();
        box.innerHTML = "";
        var ok = el("div", "tst-sent"); ok.setAttribute("role", "status");
        ok.appendChild(el("i", "fas fa-envelope-circle-check")).setAttribute("aria-hidden", "true");
        ok.appendChild(el("h3", "", "Check your inbox"));
        var p = el("p", ""); p.appendChild(document.createTextNode("We sent a confirmation link to ")); p.appendChild(el("b", "", em));
        p.appendChild(document.createTextNode(". Open it within 48 hours to confirm your email. Your testimonial is published after a quick review. If you do not see it, check your spam folder."));
        ok.appendChild(p);
        var again = el("button", "btn-prime", "Write another"); again.type = "button"; again.addEventListener("click", function () { location.href = location.pathname; });
        ok.appendChild(again); box.appendChild(ok);
        box.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    if (!YR.configured) say("Testimonials are not available right now. Please use the contact page instead.", "bad");
  }

  loadList();
})();
