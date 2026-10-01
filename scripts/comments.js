/* Comments drawer (YouTube style, no accounts). Uses textContent only, never innerHTML with user text. */
(function () {
  "use strict";
  var YR = (window.YR = window.YR || {});
  var root, cur = { key: "", title: "", kind: "audio" }, openedAt = 0;
  var NAME_KEY = "yr-name";

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }

  function ensure() {
    if (root) return;
    root = el("div", "cd-overlay");
    root.innerHTML =
      '<aside class="cd-panel" role="dialog" aria-modal="true" aria-label="Comments" tabindex="-1">' +
      '<header class="cd-head"><div><h3>Comments <span class="cd-count"></span></h3><p class="cd-title"></p></div>' +
      '<button class="cd-close" type="button" aria-label="Close comments"><i class="fas fa-xmark"></i></button></header>' +
      '<div class="cd-list" aria-live="polite"></div>' +
      '<form class="cd-form" novalidate>' +
      '<input type="text" name="name" maxlength="40" placeholder="Your name" autocomplete="name" required>' +
      '<textarea name="body" maxlength="600" rows="2" placeholder="Add a comment" required></textarea>' +
      '<input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="cd-err" role="alert"></div>' +
      '<div class="cd-actions"><span class="cd-left">600</span><button class="btn-prime" type="submit">Post</button></div>' +
      '</form></aside>';
    document.body.appendChild(root);
    root.addEventListener("click", function (e) { if (e.target === root) close(); });
    root.querySelector(".cd-close").addEventListener("click", close);
    window.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("show")) close(); });
    var form = root.querySelector(".cd-form"), ta = form.elements.body, left = root.querySelector(".cd-left");
    ta.addEventListener("input", function () { left.textContent = String(600 - ta.value.length); });
    try { form.elements.name.value = localStorage.getItem(NAME_KEY) || ""; } catch (e) {}
    form.addEventListener("submit", submit);
  }

  function renderOne(c) {
    var wrap = el("div", "cm");
    var av = el("div", "cm-av", (c.author || "?").trim().charAt(0).toUpperCase());
    av.style.background = c.is_owner ? "var(--gradient-brand)" : "hsl(" + hue(c.author || "") + ",55%,45%)";
    var body = el("div", "cm-body"), meta = el("div", "cm-meta");
    meta.appendChild(el("span", "cm-name", c.author));
    if (c.is_owner) meta.appendChild(el("span", "cm-owner", "OWNER"));
    meta.appendChild(el("span", "", YR.timeAgo(c.created_at)));
    body.appendChild(meta); body.appendChild(el("p", "cm-text", c.body));
    wrap.appendChild(av); wrap.appendChild(body);
    return { wrap: wrap, body: body };
  }

  function render(list) {
    var box = root.querySelector(".cd-list"); box.textContent = "";
    var tops = list.filter(function (c) { return !c.parent_id; });
    if (!tops.length) { box.appendChild(el("div", "cd-empty", "No comments yet. Be the first to say something.")); return; }
    tops.forEach(function (c) {
      var one = renderOne(c);
      var replies = list.filter(function (r) { return String(r.parent_id) === String(c.id); }).reverse();
      if (replies.length) {
        var rb = el("div", "cm-replies");
        replies.forEach(function (r) { rb.appendChild(renderOne(r).wrap); });
        one.body.appendChild(rb);
      }
      box.appendChild(one.wrap);
    });
  }

  function setCount(n) {
    root.querySelector(".cd-count").textContent = n ? String(n) : "";
    if (YR.social) YR.social.setMetric(cur.key, "comments", n);
  }

  function open(key, title, kind) {
    ensure();
    cur = { key: key, title: title, kind: kind || "audio" }; openedAt = Date.now();
    root.querySelector(".cd-title").textContent = title || "";
    root.querySelector(".cd-err").textContent = "";
    var box = root.querySelector(".cd-list"); box.textContent = ""; box.appendChild(el("div", "cd-empty", "Loading comments"));
    root.classList.add("show"); document.body.classList.add("no-scroll");
    root.querySelector(".cd-panel").focus();
    YR.api("comments", { query: { key: key } }).then(function (r) {
      if (!r || r.error) { box.textContent = ""; box.appendChild(el("div", "cd-empty", r && r.error ? r.error : "Comments are unavailable right now.")); return; }
      render(r.comments || []); setCount(r.total || 0);
    });
  }
  function close() { if (!root) return; root.classList.remove("show"); document.body.classList.remove("no-scroll"); }

  function submit(e) {
    e.preventDefault();
    var f = e.target, err = root.querySelector(".cd-err"), btn = f.querySelector("button[type=submit]");
    var name = f.elements.name.value.trim(), text = f.elements.body.value.trim();
    err.textContent = "";
    if (name.length < 2) { err.textContent = "Please enter your name."; return; }
    if (text.length < 2) { err.textContent = "Write a comment first."; return; }
    btn.disabled = true;
    YR.api("comment", { method: "POST", body: {
      key: cur.key, kind: cur.kind, title: cur.title, name: name, body: text, website: f.elements.website.value, t: openedAt
    } }).then(function (r) {
      btn.disabled = false;
      if (!r || r.error) { err.textContent = r && r.error ? r.error : "Could not post. Check your connection."; return; }
      try { localStorage.setItem(NAME_KEY, name); } catch (x) {}
      f.elements.body.value = ""; root.querySelector(".cd-left").textContent = "600";
      if (r.pending) { YR.toast("Thanks! Your comment will appear after review."); return; }
      YR.api("comments", { query: { key: cur.key } }).then(function (rr) {
        if (rr && !rr.error) { render(rr.comments || []); setCount(rr.total || 0); }
      });
    });
  }

  YR.comments = { open: open, close: close };
})();
