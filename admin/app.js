/* Yohan Records — private dashboard. Talks only to the admin_* API actions. */
(function () {
  "use strict";
  var YR = window.YR || {};
  var KEY_SESSION = "yr-admin-key";
  var gate = document.getElementById("gate"), dash = document.getElementById("dash");
  var overview = null, contactsCache = [], commentsCache = [];

  /* The key is plain ASCII. Strip spaces and invisible/odd characters that copy-paste can add
     (e.g. zero-width spaces), which would otherwise make the browser refuse to send it. */
  function cleanKey(k) { return String(k == null ? "" : k).replace(/[^\x21-\x7E]/g, ""); }
  function getKey() {
    try { return cleanKey(sessionStorage.getItem(KEY_SESSION) || localStorage.getItem(KEY_SESSION) || ""); } catch (e) { return ""; }
  }
  function setKey(k, remember) {
    try {
      sessionStorage.setItem(KEY_SESSION, k);
      if (remember) localStorage.setItem(KEY_SESSION, k); else localStorage.removeItem(KEY_SESSION);
    } catch (e) {}
  }
  /* ---------------- theme: light by default, only an explicit "dark" choice is remembered ---------------- */
  var THEME_KEY = "yr-admin-theme-v2";
  var root = document.documentElement;
  function currentTheme() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function applyTheme(t, save) {
    t = t === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", t);
    ["themeToggle", "themeToggleGate"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) { b.textContent = t === "light" ? "\u263E" : "\u2600"; b.title = t === "light" ? "Switch to dark theme" : "Switch to light theme"; }
    });
    var m = document.querySelector("meta[name=theme-color]");
    if (m) m.setAttribute("content", t === "light" ? "#f5f4f9" : "#07070c");
    if (save) { try { if (t === "dark") localStorage.setItem(THEME_KEY, "dark"); else localStorage.removeItem(THEME_KEY); } catch (e) {} }
  }
  applyTheme(currentTheme(), false);
  ["themeToggle", "themeToggleGate"].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener("click", function () { applyTheme(currentTheme() === "light" ? "dark" : "light", true); });
  });

  function clearKey() { try { sessionStorage.removeItem(KEY_SESSION); localStorage.removeItem(KEY_SESSION); } catch (e) {} }

  function call(action, opts) {
    opts = opts || {};
    opts.admin = getKey();
    return YR.api(action, opts);
  }

  function esc(s) { var m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }; return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return m[c]; }); }
  function fmt(n) { return YR.fmt ? YR.fmt(n) : String(n); }
  function dfmt(iso) { if (!iso) return ""; var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

  /* ---------------- gate ---------------- */
  function showGate(msg) {
    gate.hidden = false; dash.hidden = true; gate.style.display = ""; dash.style.display = "none";
    document.getElementById("gateErr").textContent = msg || "";
    document.getElementById("gateKey").focus();
  }
  var unlocking = false;
  function tryUnlock(k, remember, silent) {
    if (!YR.configured) { showGate("Set API_BASE in scripts/config.js first."); return; }
    if (unlocking) return;
    unlocking = true;
    var go = document.getElementById("gateGo");
    go.disabled = true; go.textContent = "Checking…";
    document.getElementById("gateErr").textContent = "";
    k = cleanKey(k);
    setKey(k, remember);
    call("admin_overview", { query: { days: 30 } }).then(function (r) {
      unlocking = false; go.disabled = false; go.textContent = "Unlock";
      if (!r) {
        clearKey();
        var why = YR.lastError || "unknown";
        console.warn("Admin login: request failed —", why);
        showGate("Couldn't get an answer from " + ((YR.cfg && YR.cfg.API_BASE) || "(API_BASE not set)") + " — reason: " + why +
          ". Open /api/index.php?action=ping in a new tab: it should show {\"ok\":true}. If it doesn't, the API files or database settings on the server need attention (check api/config.php and that api/schema.sql was imported).");
        return;
      }
      if (r.error) {
        clearKey();
        var msg = r.error;
        if (r.status === 401) msg = r.error + " It doesn't match admin_key in api/config.php on the server. Click Show to check what you typed (a saved browser password may have been auto-filled).";
        else if (r.status === 429) msg = r.error;
        else if (r.status === 500) msg = r.error + " Check the database settings in api/config.php and that the tables from api/schema.sql exist.";
        showGate(silent && r.status === 401 ? "" : msg);
        return;
      }
      gate.hidden = true; dash.hidden = false; gate.style.display = "none"; dash.style.display = "";
      boot();
    });
  }
  document.getElementById("gateGo").addEventListener("click", function () {
    var k = cleanKey(document.getElementById("gateKey").value);
    if (!k) { showGate("Enter your admin key."); return; }
    tryUnlock(k, document.getElementById("gateRemember").checked);
  });
  document.getElementById("gateEye").addEventListener("click", function () {
    var inp = document.getElementById("gateKey"), show = inp.type === "password";
    inp.type = show ? "text" : "password";
    this.textContent = show ? "Hide" : "Show";
    inp.focus();
  });
  document.getElementById("gateKey").addEventListener("keydown", function (e) { if (e.key === "Enter") document.getElementById("gateGo").click(); });
  document.getElementById("lockBtn").addEventListener("click", function () { clearKey(); location.reload(); });

  /* ---------------- chart ---------------- */
  var lastSeries = [];
  function drawChart(series) {
    lastSeries = series || [];
    var wrap = document.getElementById("chartWrap"), svg = document.getElementById("chartSvg"), tip = document.getElementById("chartTip");
    var W = Math.max(280, wrap.clientWidth || 600), H = 250, L = 34, R = 10, T = 10, B = 26;
    var n = lastSeries.length, max = 1;
    lastSeries.forEach(function (d) { max = Math.max(max, d.plays, d.views, d.visits); });
    var nice = Math.max(4, Math.ceil(max / 4) * 4);   // y-axis top, divisible by 4
    var iw = W - L - R, ih = H - T - B, stepX = n > 1 ? iw / (n - 1) : 0;
    function X(i) { return L + i * stepX; }
    function Y(v) { return T + ih - (v / nice) * ih; }
    var g = "";
    for (var k = 0; k <= 4; k++) {
      var yy = T + ih - (k / 4) * ih;
      g += '<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy + '" stroke="var(--border)" stroke-width="1"' + (k ? ' stroke-dasharray="3 4"' : '') + '/>' +
           '<text x="' + (L - 6) + '" y="' + (yy + 3.5) + '" text-anchor="end" fill="var(--text-faint)" font-size="10">' + fmt(Math.round(nice * k / 4)) + '</text>';
    }
    var every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(iw / 70))));
    lastSeries.forEach(function (d, i) {
      if (i % every === 0 || i === n - 1) g += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="' + (i === 0 ? "start" : i === n - 1 ? "end" : "middle") + '" fill="var(--text-faint)" font-size="10">' + d.date.slice(5) + '</text>';
    });
    function pts(key) { return lastSeries.map(function (d, i) { return X(i).toFixed(1) + "," + Y(d[key]).toFixed(1); }).join(" "); }
    var area = n > 1 ? '<polygon points="' + L + "," + (T + ih) + " " + pts("plays") + " " + X(n - 1).toFixed(1) + "," + (T + ih) + '" fill="url(#gPlays)" />' : "";
    var line = function (key, color) { return n ? '<polyline fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" points="' + pts(key) + '"/>' : ""; };
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("height", H);
    svg.innerHTML = '<defs><linearGradient id="gPlays" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent-2)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent-2)" stop-opacity="0"/></linearGradient></defs>' +
      g + area + line("views", "var(--accent-3)") + line("visits", "var(--accent)") + line("plays", "var(--accent-2)") +
      '<line id="chartCursor" y1="' + T + '" y2="' + (T + ih) + '" stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/>' +
      '<rect x="' + L + '" y="' + T + '" width="' + iw + '" height="' + ih + '" fill="transparent" id="chartHit"/>';
    var hit = document.getElementById("chartHit"), cur = document.getElementById("chartCursor");
    function move(ev) {
      if (!n) return;
      var r = svg.getBoundingClientRect(), px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      var i = n > 1 ? Math.round((px * (W / r.width) - L) / stepX) : 0; i = Math.max(0, Math.min(n - 1, i));
      var d = lastSeries[i]; cur.setAttribute("x1", X(i)); cur.setAttribute("x2", X(i)); cur.setAttribute("visibility", "visible");
      tip.innerHTML = "<b>" + esc(d.date) + "</b><span><i style=\"background:var(--accent-2)\"></i>Plays " + fmt(d.plays) + "</span><span><i style=\"background:var(--accent-3)\"></i>Views " + fmt(d.views) + "</span><span><i style=\"background:var(--accent)\"></i>Visits " + fmt(d.visits) + "</span>";
      tip.hidden = false;
      var left = X(i) * (r.width / W) + 12; if (left + tip.offsetWidth > r.width) left = X(i) * (r.width / W) - tip.offsetWidth - 12;
      tip.style.left = Math.max(0, left) + "px"; tip.style.top = "8px";
    }
    function leave() { cur.setAttribute("visibility", "hidden"); tip.hidden = true; }
    hit.addEventListener("mousemove", move); hit.addEventListener("touchmove", move, { passive: true }); hit.addEventListener("touchstart", move, { passive: true });
    hit.addEventListener("mouseleave", leave); hit.addEventListener("touchend", leave);
  }
  var rzT; window.addEventListener("resize", function () { clearTimeout(rzT); rzT = setTimeout(function () { if (!dash.hidden && lastSeries.length) drawChart(lastSeries); }, 150); });

  /* ---------------- bars ---------------- */
  function drawBars(el, rows, keyLabel, keyN) {
    var box = document.getElementById(el);
    if (!rows || !rows.length) { box.innerHTML = '<p style="color:var(--text-faint);font-size:.8rem;">No data yet.</p>'; return; }
    var max = Math.max.apply(null, rows.map(function (r) { return r[keyN]; }));
    box.innerHTML = rows.map(function (r) {
      var pct = max ? Math.round((r[keyN] / max) * 100) : 0;
      return '<div class="bar-row"><span class="lbl">' + esc(r[keyLabel] || "Unknown") + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%"></span></span>' +
        '<span class="n">' + fmt(r[keyN]) + '</span></div>';
    }).join("");
  }

  /* ---------------- overview ---------------- */
  function renderKpis(t) {
    t = t || {};
    var items = [
      ["fa-play", "Plays", t.plays, "k-plays"], ["fa-eye", "Views", t.views, "k-views"], ["fa-heart", "Likes", t.likes, "k-likes"],
      ["fa-comment", "Comments", t.comments, "k-comments"], ["fa-users", "Visitors (all time)", t.visitors_all, "k-visitors"],
      ["fa-envelope", "Unread messages", t.unread, "k-unread"]
    ];
    document.getElementById("kpis").innerHTML = items.map(function (it) {
      var flag = it[3] === "k-unread" && t.unread > 0 ? " flag" : "";
      return '<div class="kpi ' + it[3] + flag + '"><i class="fas ' + it[0] + '"></i><div><b>' + (it[2] == null ? "–" : fmt(it[2])) + '</b><span>' + it[1] + '</span></div></div>';
    }).join("");
  }
  function skeletonKpis() {
    document.getElementById("kpis").innerHTML = new Array(7).join('<div class="kpi skel"><i></i><div><b>&nbsp;</b><span>&nbsp;</span></div></div>');
  }

  function renderTop(o) {
    var rows = [];
    (o.top_audio || []).forEach(function (r) { rows.push({ t: r.title || r.item_key, kind: "Audio", n: r.plays, likes: r.likes, comments: r.comments }); });
    (o.top_video || []).forEach(function (r) { rows.push({ t: r.title || r.item_key, kind: "Video", n: r.views, likes: r.likes, comments: r.comments }); });
    (o.top_image || []).forEach(function (r) { rows.push({ t: r.title || r.item_key, kind: "Image", n: r.views, likes: r.likes, comments: r.comments }); });
    var body = document.getElementById("topBody");
    if (!rows.length) { body.innerHTML = '<tr class="empty-row"><td colspan="5">No plays or views yet.</td></tr>'; return; }
    body.innerHTML = rows.map(function (r) {
      return "<tr><td>" + esc(r.t) + "</td><td><span class=\"pill kind-" + r.kind.toLowerCase() + "\">" + r.kind + "</span></td><td>" + fmt(r.n) + "</td><td>" + fmt(r.likes) + "</td><td>" + fmt(r.comments) + "</td></tr>";
    }).join("");
  }

  function boot() {
    var range = document.getElementById("rangeSelect").value;
    document.getElementById("topBody").innerHTML = '<tr class="empty-row"><td colspan="5">Loading…</td></tr>';
    skeletonKpis();
    call("admin_overview", { query: { days: range } }).then(function (o) {
      if (!o || o.error) { showGate(o && o.error ? o.error : "Session expired. Enter your key again."); return; }
      overview = o;
      document.getElementById("rangeLabel").textContent = "Last " + o.days + " days";
      renderKpis(o.totals);
      drawChart(o.series);
      drawBars("barsDevice", o.devices, "label", "n");
      drawBars("barsCountry", o.countries, "label", "n");
      drawBars("barsRef", (o.referrers || []).map(function (r) { return { label: r.label || "Direct", n: r.n }; }), "label", "n");
      drawBars("barsBrowser", o.browsers, "label", "n");
      renderTop(o);
      document.getElementById("updated").textContent = "updated " + new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    });
    loadContacts(); loadComments(); loadTestimonials();
  }

  document.getElementById("rangeSelect").addEventListener("change", boot);
  document.getElementById("refreshBtn").addEventListener("click", boot);

  /* ---------------- messages ---------------- */
  function loadContacts(q) {
    call("admin_contacts", { query: q ? { q: q } : {} }).then(function (r) {
      if (!r || r.error) return;
      contactsCache = r.contacts || [];
      renderContacts();
    });
  }
  function renderContacts() {
    var body = document.getElementById("msgBody");
    document.getElementById("msgCount").textContent = contactsCache.length ? "(" + contactsCache.length + ")" : "";
    if (!contactsCache.length) { body.innerHTML = '<tr class="empty-row"><td colspan="6">No messages yet.</td></tr>'; return; }
    body.innerHTML = contactsCache.map(function (c) {
      return "<tr data-id=\"" + c.id + "\">" +
        "<td><strong>" + esc(c.full_name) + "</strong><br><span class=\"muted\">" + esc(c.email) + "</span><br><span class=\"muted\">" + esc(c.phone) + "</span></td>" +
        "<td>" + esc(c.subject) + (c.is_read ? "" : ' <span class="pill unread">NEW</span>') + "</td>" +
        "<td>" + esc(c.city) + ", " + esc(c.country) + "<br><span class=\"muted\">" + esc(c.address) + "</span></td>" +
        "<td class=\"msg-preview\">" + esc(c.message) + "</td>" +
        "<td class=\"muted\">" + dfmt(c.created_at) + "</td>" +
        "<td><div class=\"row-actions\">" +
          "<button data-act=\"" + (c.is_read ? "unread" : "read") + "\">" + (c.is_read ? "Mark unread" : "Mark read") + "</button>" +
          "<a href=\"mailto:" + esc(c.email) + "?subject=" + encodeURIComponent("Re: " + c.subject) + "\" class=\"btn-mini\" style=\"padding:.28rem .6rem;font-size:.7rem;\">Reply by email</a>" +
          "<button data-act=\"delete\" class=\"danger\">Delete</button>" +
        "</div></td></tr>";
    }).join("");
    body.querySelectorAll("button[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.closest("tr").dataset.id), act = btn.dataset.act;
        if (act === "delete" && !confirm("Delete this message permanently?")) return;
        call("admin_contact_update", { method: "POST", body: { id: id, action: act } }).then(function (r) {
          if (r && !r.error) loadContacts(document.getElementById("msgSearch").value.trim());
        });
      });
    });
  }
  var searchT;
  document.getElementById("msgSearch").addEventListener("input", function (e) {
    clearTimeout(searchT); searchT = setTimeout(function () { loadContacts(e.target.value.trim()); }, 300);
  });
  document.getElementById("exportBtn").addEventListener("click", function () {
    var url = new URL((YR.cfg && YR.cfg.API_BASE) || "", location.href);
    url.searchParams.set("action", "admin_export");
    fetch(url.toString(), { headers: { "X-Admin-Key": getKey() } }).then(function (r) {
      if (!r.ok) { YR.toast && YR.toast("Export failed.", "error"); return; }
      return r.blob();
    }).then(function (blob) {
      if (!blob) return;
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "yohan-records-messages.csv";
      document.body.appendChild(a); a.click(); a.remove();
    });
  });

  /* ---------------- comments ---------------- */
  function loadComments() {
    call("admin_comments", {}).then(function (r) {
      if (!r || r.error) return;
      commentsCache = r.comments || [];
      renderComments();
    });
  }
  function renderComments() {
    var body = document.getElementById("cmtBody");
    document.getElementById("cmtCount").textContent = commentsCache.length ? "(" + commentsCache.length + ")" : "";
    if (!commentsCache.length) { body.innerHTML = '<tr class="empty-row"><td colspan="6">No comments yet.</td></tr>'; return; }
    body.innerHTML = commentsCache.map(function (c) {
      return "<tr data-id=\"" + c.id + "\" data-item=\"" + esc(c.item_key) + "\">" +
        "<td class=\"muted\">" + esc(c.title || c.item_key) + "</td>" +
        "<td>" + esc(c.author) + (c.is_owner ? ' <span class="pill visible">OWNER</span>' : "") + "</td>" +
        "<td class=\"msg-preview\">" + esc(c.body) + "</td>" +
        "<td><span class=\"pill " + c.status + "\">" + c.status.toUpperCase() + "</span></td>" +
        "<td class=\"muted\">" + dfmt(c.created_at) + "</td>" +
        "<td><div class=\"row-actions\">" +
          (c.status === "hidden" ? '<button data-act="show">Show</button>' : '<button data-act="hide">Hide</button>') +
          '<button data-act="reply">Reply</button>' +
          '<button data-act="delete" class="danger">Delete</button>' +
        "</div><div class=\"reply-box\"><input type=\"text\" maxlength=\"600\" placeholder=\"Write a reply as the owner\"><button class=\"btn-mini\" data-act=\"send-reply\" style=\"padding:.3rem .7rem;font-size:.72rem;\">Send</button></div></td></tr>";
    }).join("");
    body.querySelectorAll("button[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tr = btn.closest("tr"), id = Number(tr.dataset.id), act = btn.dataset.act;
        if (act === "reply") { tr.querySelector(".reply-box").classList.toggle("open"); return; }
        if (act === "send-reply") {
          var input = tr.querySelector(".reply-box input"), text = input.value.trim();
          if (!text) return;
          call("admin_comment_update", { method: "POST", body: { id: id, action: "reply", body: text } }).then(function (r) {
            if (r && !r.error) { input.value = ""; loadComments(); }
          });
          return;
        }
        if (act === "delete" && !confirm("Delete this comment?")) return;
        call("admin_comment_update", { method: "POST", body: { id: id, action: act } }).then(function (r) {
          if (r && !r.error) loadComments();
        });
      });
    });
  }


  /* ---------------- testimonials ---------------- */
  var tstCache = [];
  function loadTestimonials() {
    call("admin_testimonials", {}).then(function (r) {
      if (!r || r.error) return;
      tstCache = r.testimonials || [];
      renderTestimonials();
    });
  }
  function renderTestimonials() {
    var body = document.getElementById("tstBody");
    var pend = tstCache.filter(function (t) { return t.status === "pending"; }).length;
    document.getElementById("tstCount").textContent = tstCache.length ? "(" + tstCache.length + (pend ? " \u00b7 " + pend + " to review" : "") + ")" : "";
    if (!tstCache.length) { body.innerHTML = '<tr class="empty-row"><td colspan="6">No testimonials yet.</td></tr>'; return; }
    var cls = { approved: "visible", pending: "pending", hidden: "hidden", unconfirmed: "hidden" };
    var lbl = { approved: "APPROVED", pending: "TO REVIEW", hidden: "HIDDEN", unconfirmed: "EMAIL NOT CONFIRMED" };
    body.innerHTML = tstCache.map(function (t) {
      return '<tr data-id="' + t.id + '"><td>' + esc(t.name) + '<br><span class="muted">' + esc(t.email) + (t.city ? " \u00b7 " + esc(t.city) : "") + "</span></td>" +
        "<td>" + (t.rating ? new Array(Number(t.rating) + 1).join("\u2605") : '<span class="muted">-</span>') + "</td>" +
        '<td class="msg-preview">' + esc(t.body) + "</td>" +
        '<td><span class="pill ' + (cls[t.status] || "hidden") + '">' + (lbl[t.status] || esc(t.status)) + "</span></td>" +
        '<td class="muted">' + dfmt(t.created_at) + "</td>" +
        '<td><div class="row-actions">' +
          (t.status === "pending" || t.status === "hidden" ? '<button data-act="approve">Approve</button>' : "") +
          (t.status === "approved" || t.status === "pending" ? '<button data-act="hide">Hide</button>' : "") +
          '<button data-act="delete" class="danger">Delete</button></div></td></tr>';
    }).join("");
    body.querySelectorAll("button[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.closest("tr").dataset.id), act = btn.dataset.act;
        if (act === "delete" && !confirm("Delete this testimonial?")) return;
        call("admin_testimonial_update", { method: "POST", body: { id: id, action: act } }).then(function (r) { if (r && !r.error) loadTestimonials(); });
      });
    });
  }

  /* ---------------- start ---------------- */
  var k = getKey();
  var remembered = false; try { remembered = !!localStorage.getItem(KEY_SESSION); } catch (e) {}
  if (k) tryUnlock(k, remembered, true); else showGate();
})();