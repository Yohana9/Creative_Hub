/* Testimonials: shows approved testimonials (Home grid + full page) and lets visitors send one.
   Home:  <div class="tst-grid" id="tstGrid" data-limit="3"></div>
   Page:  <div class="tst-grid" id="tstGrid"></div>  +  <form id="tstForm"> ... </form>               */
(function () {
  "use strict";
  var YR = window.YR || {};
  var grid = document.getElementById("tstGrid");
  var form = document.getElementById("tstForm");
  if (!grid && !form) return;

  /* ---- styles (injected once so the Home grid and the page always look the same) ---- */
  if (!document.getElementById("yrt-css")) {
    var st = document.createElement("style"); st.id = "yrt-css";
    st.textContent =
      ":where(.tst-grid){display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr));gap:1rem;}" +
      ".yrt-card{position:relative;display:flex;flex-direction:column;gap:.75rem;padding:1.15rem 1.2rem;border-radius:var(--radius-lg,18px);" +
      "background:linear-gradient(165deg,var(--surface-strong,rgba(255,255,255,.08)),var(--surface,rgba(255,255,255,.04)) 60%);border:1px solid var(--border,rgba(255,255,255,.1));" +
      "transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease;min-width:0;}" +
      ".yrt-card:hover{transform:translateY(-3px);border-color:rgba(140,107,255,.4);box-shadow:var(--shadow-lg,0 18px 40px -22px rgba(0,0,0,.6));}" +
      ".yrt-card>.fa-quote-right{position:absolute;top:.95rem;right:1.1rem;font-size:1.3rem;opacity:.12;}" +
      ".yrt-stars{display:flex;gap:.18rem;color:#f5b942;font-size:.82rem;}.yrt-stars .off{color:var(--text-faint,#888);opacity:.35;}" +
      ".yrt-msg{margin:0;font-size:.92rem;line-height:1.65;color:var(--text,#fff);overflow-wrap:anywhere;white-space:pre-line;}" +
      ".yrt-who{display:flex;align-items:center;gap:.7rem;margin-top:auto;padding-top:.2rem;}" +
      ".yrt-av{flex:none;width:2.4rem;height:2.4rem;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:.95rem;}" +
      ".yrt-name{font-weight:700;font-size:.9rem;line-height:1.25;}.yrt-meta{font-size:.76rem;color:var(--text-faint,#888);line-height:1.35;}" +
      ".yrt-empty{grid-column:1/-1;text-align:center;padding:1.7rem 1rem;border:1px dashed var(--border,rgba(255,255,255,.2));border-radius:var(--radius-lg,18px);color:var(--text-dim,#bbb);font-size:.92rem;}" +
      ".yrt-skel{min-height:9.5rem;border-radius:var(--radius-lg,18px);background:var(--surface,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));animation:yrtp 1.2s ease-in-out infinite;}" +
      "@keyframes yrtp{50%{opacity:.45}}" +
      /* form */
      ".yrt-form .yrt-row{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;}@media(max-width:620px){.yrt-form .yrt-row{grid-template-columns:1fr;}}" +
      ".yrt-field{display:flex;flex-direction:column;gap:.35rem;margin-bottom:.9rem;min-width:0;}" +
      ".yrt-field>label,.yrt-field>.yrt-lbl{font-size:.8rem;font-weight:700;color:var(--text-dim,#bbb);}" +
      ".yrt-field input[type=text],.yrt-field textarea{width:100%;font:inherit;font-size:.92rem;padding:.7rem .85rem;border-radius:12px;" +
      "border:1px solid var(--border,rgba(255,255,255,.15));background:var(--bg-elev-2,rgba(255,255,255,.05));color:var(--text,#fff);transition:border-color .2s,box-shadow .2s;}" +
      ".yrt-field textarea{min-height:8rem;resize:vertical;line-height:1.55;}" +
      ".yrt-field input:focus,.yrt-field textarea:focus{outline:none;border-color:var(--accent-2,#8c6bff);box-shadow:0 0 0 3px rgba(140,107,255,.22);}" +
      ".yrt-field.bad input,.yrt-field.bad textarea{border-color:#e0466c;}.yrt-err{color:#e0466c;font-size:.78rem;min-height:1em;}" +
      ".yrt-rate{display:flex;gap:.25rem;}.yrt-rate button{background:none;border:0;cursor:pointer;font-size:1.5rem;line-height:1;padding:.1rem .15rem;color:var(--text-faint,#888);opacity:.45;transition:transform .15s,opacity .15s,color .15s;}" +
      ".yrt-rate button.on{color:#f5b942;opacity:1;}.yrt-rate button:hover{transform:scale(1.15);}" +
      ".yrt-count{align-self:flex-end;font-size:.74rem;color:var(--text-faint,#888);}" +
      ".yrt-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0;}" +
      ".yrt-status{margin-top:.9rem;font-size:.88rem;line-height:1.5;}.yrt-status.ok{color:#16a870;}.yrt-status.error{color:#e0466c;}" +
      ".yrt-thanks{text-align:center;padding:1.4rem .5rem;}.yrt-thanks i{font-size:2rem;color:#16a870;margin-bottom:.6rem;}.yrt-thanks h3{margin:.2rem 0 .4rem;}";
    document.head.appendChild(st);
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }

  function card(t) {
    var c = el("article", "yrt-card");
    var q = el("i", "fas fa-quote-right"); q.setAttribute("aria-hidden", "true"); c.appendChild(q);
    var stars = el("div", "yrt-stars"); stars.setAttribute("role", "img"); stars.setAttribute("aria-label", t.rating + " out of 5 stars");
    for (var i = 1; i <= 5; i++) { var s = el("i", "fas fa-star" + (i <= t.rating ? "" : " off")); stars.appendChild(s); }
    c.appendChild(stars);
    c.appendChild(el("p", "yrt-msg", t.message));
    var who = el("div", "yrt-who");
    var h = hue(t.name || "?");
    var av = el("div", "yrt-av", (t.name || "?").trim().charAt(0).toUpperCase());
    av.style.background = "linear-gradient(135deg,hsl(" + h + ",70%,56%),hsl(" + ((h + 45) % 360) + ",72%,48%))";
    var meta = el("div");
    meta.appendChild(el("div", "yrt-name", t.name));
    var sub = [t.role, YR.timeAgo ? YR.timeAgo(t.created_at) : ""].filter(Boolean).join(" · ");
    if (sub) meta.appendChild(el("div", "yrt-meta", sub));
    who.appendChild(av); who.appendChild(meta); c.appendChild(who);
    return c;
  }

  /* ---- list ---- */
  function load() {
    if (!grid) return;
    var limit = parseInt(grid.getAttribute("data-limit"), 10) || 60;
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = "";
    var n = Math.min(limit, 3); for (var i = 0; i < n; i++) grid.appendChild(el("div", "yrt-skel"));
    if (!YR.configured || !YR.api) { showNote("Testimonials will appear here soon."); return; }
    YR.api("testimonials", { query: { limit: limit }, retries: 1, timeout: 15000 }).then(function (r) {
      grid.removeAttribute("aria-busy"); grid.innerHTML = "";
      if (!r || r.error) { showNote("Testimonials are unavailable right now. Please check back soon."); return; }
      var list = r.testimonials || [];
      if (!list.length) { showNote("No testimonials yet. Be the first to share a kind word!"); return; }
      list.forEach(function (t) { grid.appendChild(card(t)); });
    });
  }
  function showNote(msg) { grid.removeAttribute("aria-busy"); grid.innerHTML = ""; grid.appendChild(el("div", "yrt-empty", msg)); }

  /* ---- form ---- */
  if (form) {
    var opened = Date.now(), rating = 5;
    var status = document.getElementById("tstStatus"), btn = form.querySelector("button[type=submit]");
    var rate = document.getElementById("tstRate"), msg = form.elements.message, count = document.getElementById("tstCount");

    function paintStars() { [].forEach.call(rate.children, function (b, i) { b.classList.toggle("on", i < rating); b.setAttribute("aria-checked", i === rating - 1 ? "true" : "false"); }); }
    for (var i = 1; i <= 5; i++) (function (n) {
      var b = el("button", "", "\u2605"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-label", n + (n === 1 ? " star" : " stars"));
      b.addEventListener("click", function () { rating = n; paintStars(); });
      rate.appendChild(b);
    })(i);
    paintStars();

    function updateCount() { if (count) count.textContent = msg.value.length + " / 800"; }
    msg.addEventListener("input", updateCount); updateCount();

    function setErr(name, text) {
      var f = form.elements[name].closest(".yrt-field"); if (!f) return;
      f.classList.toggle("bad", !!text); var e = f.querySelector(".yrt-err"); if (e) e.textContent = text || "";
    }
    function say(text, cls) { status.textContent = text; status.className = "yrt-status " + (cls || ""); }

    form.addEventListener("submit", function (e) {
      e.preventDefault(); say("");
      var name = form.elements.name.value.trim(), role = form.elements.role.value.trim(), text = msg.value.trim();
      var okName = name.length >= 2, okMsg = text.length >= 10;
      setErr("name", okName ? "" : "Please enter your name."); setErr("message", okMsg ? "" : "Please write at least 10 characters.");
      if (!okName || !okMsg) return;
      var payload = { name: name, role: role, message: text, rating: rating, website: form.elements.website.value, t: opened };

      if (!YR.configured || !YR.api) {   // no server: open an email draft instead
        var to = (YR.cfg && YR.cfg.OWNER_EMAIL) || "yohanreta9@gmail.com";
        location.href = "mailto:" + to + "?subject=" + encodeURIComponent("[Yohan Records] Testimonial") +
          "&body=" + encodeURIComponent(name + (role ? " (" + role + ")" : "") + "\nRating: " + rating + "/5\n\n" + text);
        return;
      }
      btn.disabled = true; var label = btn.innerHTML; btn.textContent = "Sending…";
      YR.api("testimonial", { method: "POST", body: payload, retries: 1, timeout: 20000 }).then(function (r) {
        btn.disabled = false; btn.innerHTML = label;
        if (!r) { say("Couldn't reach the server. Check your connection and try again.", "error"); return; }
        if (r.error) { say(r.error, "error"); return; }
        var box = form.closest(".yrt-formwrap") || form.parentNode;
        form.hidden = true;
        var t = el("div", "yrt-thanks");
        t.appendChild(el("i", "fas fa-circle-check"));
        t.appendChild(el("h3", "", "Thank you, " + name.split(" ")[0] + "!"));
        t.appendChild(el("p", "", r.pending ? "Your testimonial was received and will appear here once it has been approved." : "Your testimonial is now live. I really appreciate it!"));
        box.appendChild(t);
        if (!r.pending) load();
      });
    });
  }

  load();
})();
