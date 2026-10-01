/* Core helpers: visitor id, API client, number format, toast. */
(function () {
  "use strict";
  var YR = (window.YR = window.YR || {});
  var cfg = (YR.cfg = window.YR_CONFIG || {});

  /* Two different flags, on purpose, so the site works well in three situations:
     - no backend set up at all (pure static: GitHub Pages preview, or before cPanel is ready)
     - a backend is set up but temporarily unreachable (subscription lapsed, server down)
     - a backend is set up and reachable
     YR.configured: a backend URL is set, so real requests should be attempted and a
       failure is a real error (shown to the visitor), not just "static mode".
     YR.online: a request has actually succeeded at least once this page load. Only
       this flag reveals the "online-only" UI (counts, comment button), and it updates
       itself automatically on every call — so if the cPanel subscription lapses the
       site quietly falls back to static behavior, and it resumes on its own, with no
       redeploy, the next time a request succeeds after service is restored. */
  YR.configured = !!cfg.API_BASE;
  YR.online = false;
  YR.lastError = "";
  function setOnline(v) {
    if (v === YR.online) return;
    YR.online = v;
    document.documentElement.classList.toggle("yr-online", v);
  }

  function makeVid() {
    var v = "";
    try { v = localStorage.getItem("yr-vid") || ""; } catch (e) {}
    if (!v) {
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : Date.now().toString(16) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
      v = v.replace(/[^a-fA-F0-9-]/g, "");
      try { localStorage.setItem("yr-vid", v); } catch (e) {}
    }
    return v;
  }
  YR.vid = makeVid();

  /* Returns parsed JSON, {error,status} on a server-side rejection (still "online" —
     the server answered, it just said no), or null when there's no backend configured
     or it could not be reached at all (network failure, timeout, CORS, DNS). Every
     call is attempted independently — YR.online never blocks a call, it only reports
     the outcome of the most recent one, so reachability is re-checked on every use
     rather than decided once at page load. */
  YR.api = function (action, opts) {
    opts = opts || {};
    if (!YR.configured) return Promise.resolve(null);
    var url;
    try { url = new URL(cfg.API_BASE, location.href); } catch (e) { return Promise.resolve(null); }
    url.searchParams.set("action", action);
    if (opts.query) Object.keys(opts.query).forEach(function (k) { url.searchParams.set(k, opts.query[k]); });
    var headers = { "X-Visitor": YR.vid };
    if (opts.admin) headers["X-Admin-Key"] = String(opts.admin).replace(/[^\x21-\x7E]/g, ""); // header values must be plain ASCII
    if (opts.body) headers["Content-Type"] = "application/json";
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 10000);
    return fetch(url.toString(), {
      method: opts.method || "GET", headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctrl.signal
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (j) {
        clearTimeout(timer);
        setOnline(true); // the server answered at all, even if it rejected the request
        if (!res.ok) return { error: (j && j.error) || "Server error " + res.status, status: res.status };
        return j || {};
      });
    }).catch(function (err) {
      clearTimeout(timer);
      setOnline(false); // network failure, timeout, or the server is unreachable
      YR.lastError = err && err.name === "AbortError" ? "timeout (no answer within 10 seconds)" : ((err && err.message) || "network error");
      return null;
    });
  };

  YR.fmt = function (n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(n);
  };

  YR.toast = function (msg, type) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; wrap.setAttribute("role", "status"); document.body.appendChild(wrap); }
    var t = document.createElement("div");
    t.className = "toast " + (type || "ok");
    var i = document.createElement("i");
    i.className = "fas " + (type === "error" ? "fa-circle-exclamation" : "fa-circle-check");
    var s = document.createElement("span");
    s.textContent = msg;
    t.appendChild(i); t.appendChild(s); wrap.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(function () { t.remove(); }, 320); }, 3200);
  };

  YR.timeAgo = function (iso) {
    var d = new Date(iso); if (isNaN(d)) return "";
    var s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    var u = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
    for (var k = 0; k < u.length; k++) { if (s >= u[k][1]) { var n = Math.floor(s / u[k][1]); return n + " " + u[k][0] + (n > 1 ? "s" : "") + " ago"; } }
    return "just now";
  };
})();