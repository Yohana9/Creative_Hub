/* Likes, view counts, comment counts, sharing, tracking, search/sort, trending. */
(function () {
  "use strict";
  var YR = (window.YR = window.YR || {});
  var LOCAL_KEY = "yr-likes";
  var stats = {}, mine = new Set(), totals = null;
  var localLikes = new Set();
  try { JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]").forEach(function (k) { localLikes.add(k); }); } catch (e) {}
  function saveLocal() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(localLikes))); } catch (e) {} }
  var ZERO = function () { return { plays: 0, views: 0, likes: 0, comments: 0, shares: 0 }; };
  var sel = function (k) { return (window.CSS && CSS.escape) ? CSS.escape(k) : k.replace(/"/g, '\\"'); };

  function isLiked(key) { return YR.online ? mine.has(key) : localLikes.has(key); }

  /* ---------- painting ---------- */
  function paintLike(btn) {
    var on = isLiked(btn.dataset.likeSrc);
    btn.classList.toggle("liked", on);
    var i = btn.querySelector("i");
    if (i) { i.classList.toggle("fa-solid", on); i.classList.toggle("fa-regular", !on); }
    btn.setAttribute("aria-pressed", String(on));
  }
  function sync(root) {
    root = root || document;
    root.querySelectorAll(".like-btn[data-like-src]").forEach(paintLike);
    root.querySelectorAll("[data-metric]").forEach(function (el) {
      if (!YR.online) { el.textContent = ""; return; }
      var s = stats[el.dataset.key], m = el.dataset.metric;
      var v = s ? Number(s[m]) || 0 : 0;
      el.textContent = (v === 0 && (m === "likes" || m === "comments")) ? "" : YR.fmt(v);
    });
  }
  function paintTotals() {
    if (!totals) return;
    document.querySelectorAll("[data-site-metric]").forEach(function (el) {
      var v = totals[el.dataset.siteMetric];
      el.textContent = (v === undefined) ? "" : YR.fmt(v);
    });
  }

  /* ---------- load counts ---------- */
  function collectKeys(root) {
    var set = new Set();
    root.querySelectorAll("[data-like-src],[data-comments],[data-metric][data-key]").forEach(function (el) {
      var k = el.dataset.likeSrc || el.dataset.comments || el.dataset.key;
      if (k) set.add(k);
    });
    return Array.from(set).slice(0, 300);
  }
  function load(root) {
    root = root || document;
    sync(root);
    if (!YR.configured) return Promise.resolve();
    var keys = collectKeys(root);
    return YR.api("stats", { method: "POST", body: { keys: keys } }).then(function (r) {
      if (!r || r.error) return;
      keys.forEach(function (k) {
        stats[k] = r.items && r.items[k] ? r.items[k] : ZERO();
        (r.mine || []).indexOf(k) > -1 ? mine.add(k) : mine.delete(k);
      });
      totals = r.totals || totals;
      sync(root); paintTotals();
      document.dispatchEvent(new CustomEvent("yr:stats"));
    });
  }

  /* ---------- like ---------- */
  function setLiked(key, on) {
    if (YR.online) { on ? mine.add(key) : mine.delete(key); }
    else { on ? localLikes.add(key) : localLikes.delete(key); saveLocal(); }
    document.querySelectorAll('.like-btn[data-like-src="' + sel(key) + '"]').forEach(function (b) {
      paintLike(b); b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
    });
  }
  function toggleLike(key, kind, title) {
    var was = isLiked(key), on = !was;
    setLiked(key, on);
    if (!YR.configured) return; // pure static mode: the local heart IS the final state, no server to sync to
    var s = stats[key] || (stats[key] = ZERO());
    s.likes = Math.max(0, s.likes + (on ? 1 : -1)); sync();
    YR.api("react", { method: "POST", body: { key: key, kind: kind, title: title, on: on } }).then(function (r) {
      if (!r || r.error) {
        setLiked(key, was); s.likes = Math.max(0, s.likes + (on ? -1 : 1)); sync();
        YR.toast(r && r.error ? r.error : "Could not save your like. Check your connection.", "error");
        return;
      }
      s.likes = r.likes; setLiked(key, r.liked); sync();
    });
  }

  /* ---------- tracking (counts a play/view once per visitor per 30 min) ---------- */
  var sent = new Set();
  try { JSON.parse(sessionStorage.getItem("yr-sent") || "[]").forEach(function (k) { sent.add(k); }); } catch (e) {}
  function refHost() {
    try { var h = new URL(document.referrer).hostname; return h && h !== location.hostname ? h : ""; } catch (e) { return ""; }
  }
  YR.track = function (key, kind, event, title) {
    if (!YR.configured || !key) return;
    var id = key + "|" + event;
    if (sent.has(id)) return;
    sent.add(id);
    try { sessionStorage.setItem("yr-sent", JSON.stringify(Array.from(sent).slice(-300))); } catch (e) {}
    YR.api("track", { method: "POST", body: { key: key, kind: kind, event: event, title: title || "", ref: refHost(), vid: YR.vid } })
      .then(function (r) {
        if (r && r.counted && stats[key]) {
          var f = event === "play" ? "plays" : event === "share" ? "shares" : "views";
          stats[key][f] = (stats[key][f] || 0) + 1; sync();
        }
      });
  };

  /* ---------- share ---------- */
  function share(key, kind, title) {
    var url = location.href.split("#")[0] + "#item=" + encodeURIComponent(key);
    var done = function () { YR.track(key, kind, "share", title); };
    if (navigator.share) {
      navigator.share({ title: title || document.title, text: title || "", url: url }).then(done).catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { YR.toast("Link copied"); done(); }, function () { window.prompt("Copy this link", url); });
    } else { window.prompt("Copy this link", url); }
  }

  document.addEventListener("click", function (e) {
    var like = e.target.closest(".like-btn[data-like-src]");
    if (like) { e.preventDefault(); e.stopPropagation(); toggleLike(like.dataset.likeSrc, like.dataset.kind || "audio", like.dataset.title || ""); return; }
    var sh = e.target.closest("[data-share]");
    if (sh) { e.preventDefault(); e.stopPropagation(); share(sh.dataset.share, sh.dataset.kind || "audio", sh.dataset.title || ""); return; }
    var cm = e.target.closest("[data-comments]");
    if (cm) { e.preventDefault(); e.stopPropagation(); if (YR.comments) YR.comments.open(cm.dataset.comments, cm.dataset.title || "", cm.dataset.kind || "audio"); }
  });

  /* ---------- videos: count a view after 3 seconds of playback ---------- */
  function initVideos() {
    document.querySelectorAll(".video-card video").forEach(function (v) {
      var srcEl = v.querySelector("source");
      var key = srcEl ? srcEl.getAttribute("src") : "";
      if (!key) return;
      var card = v.closest(".video-card"), t = card && card.querySelector(".card-title");
      var played = 0, last = 0;
      v.addEventListener("timeupdate", function () {
        if (v.paused) return;
        var d = v.currentTime - last;
        if (d > 0 && d < 1.5) played += d;
        last = v.currentTime;
        if (played >= 3) YR.track(key, "video", "view", t ? t.textContent : "");
      });
      v.addEventListener("seeked", function () { last = v.currentTime; });
    });
  }

  /* ---------- search + sort ---------- */
  function initFilters() {
    document.querySelectorAll("[data-filter-for]").forEach(function (bar) {
      var grid = document.querySelector(bar.dataset.filterFor);
      if (!grid) return;
      var input = bar.querySelector("input"), select = bar.querySelector("select");
      var items = Array.prototype.slice.call(grid.children).filter(function (el) { return el.dataset.key; });
      items.forEach(function (el, i) { el.dataset.idx = i; });
      var note = document.createElement("p"); note.className = "empty-note"; note.hidden = true; note.textContent = "Nothing matches your search.";
      grid.parentNode.insertBefore(note, grid.nextSibling);
      if (!YR.configured) Array.prototype.slice.call(select.options).forEach(function (o) { if (o.dataset.online) o.remove(); });
      function metric(el) { var s = stats[el.dataset.key] || {}; return (s.plays || 0) + (s.views || 0); }
      function run() {
        var q = input.value.trim().toLowerCase(), shown = 0;
        items.forEach(function (el) { var ok = !q || (el.dataset.title || "").toLowerCase().indexOf(q) > -1; el.hidden = !ok; if (ok) shown++; });
        var mode = select.value;
        var list = items.slice().sort(function (a, b) {
          if (mode === "plays") return metric(b) - metric(a);
          if (mode === "likes") return ((stats[b.dataset.key] || {}).likes || 0) - ((stats[a.dataset.key] || {}).likes || 0);
          if (mode === "az") return (a.dataset.title || "").localeCompare(b.dataset.title || "");
          return a.dataset.idx - b.dataset.idx;
        });
        list.forEach(function (el) { grid.appendChild(el); });
        note.hidden = shown > 0;
      }
      input.addEventListener("input", run); select.addEventListener("change", run);
      document.addEventListener("yr:stats", run);
    });
  }

  /* ---------- trending (home): Top 10 = pinned songs first, then most / most recently listened ---------- */
  function initTrending() {
    var box = document.querySelector("[data-trending]");
    var cat = window.YR_CATALOG;
    if (!box || !cat) return;
    var title = document.querySelector("[data-trending-title]");
    var sub = title && title.nextElementSibling && title.nextElementSibling.classList.contains("section-sub") ? title.nextElementSibling : null;
    var TOP = 10;
    var songs = cat.filter(function (c) { return c.kind === "audio"; });
    box.classList.add("trend-ten");
    if (!document.getElementById("yrtr-css")) {
      var st = document.createElement("style"); st.id = "yrtr-css";
      st.textContent =
        ".trend-grid.trend-ten{grid-template-columns:repeat(2,minmax(0,1fr));}" +
        "@media(max-width:700px){.trend-grid.trend-ten{grid-template-columns:1fr;}}" +
        ".trend-ten .trend-rank{width:1.7rem;font-size:1rem;}" +
        ".trend-ten .trend-item:nth-child(1) .trend-rank{color:#f5b942;}.trend-ten .trend-item:nth-child(2) .trend-rank{color:#c9ccd6;}.trend-ten .trend-item:nth-child(3) .trend-rank{color:#d98a52;}" +
        ".trend-ten .trend-item:nth-child(-n+3){border-color:rgba(245,185,66,.28);}" +
        ".trend-pin{margin-left:.35rem;font-size:.62rem;color:var(--accent-2,#8c6bff);opacity:.9;}" +
        ".trend-item.skel{min-height:4.6rem;animation:yrtrp 1.2s ease-in-out infinite;}@keyframes yrtrp{50%{opacity:.45}}";
      document.head.appendChild(st);
    }
    function render(rows, label, note) {
      if (title) title.textContent = label;
      if (sub && note) sub.textContent = note;
      box.textContent = "";
      rows.slice(0, TOP).forEach(function (row, i) {
        var c = row.cat, el = document.createElement("div");
        el.className = "trend-item"; el.dataset.key = c.key; el.dataset.title = c.title;
        var rank = document.createElement("span"); rank.className = "trend-rank"; rank.textContent = String(i + 1);
        var img = document.createElement("img"); img.src = c.img; img.alt = ""; img.loading = "lazy";
        var meta = document.createElement("div"); meta.className = "trend-meta";
        var stg = document.createElement("strong"); stg.textContent = c.title;
        if (row.pinned) { var pin = document.createElement("i"); pin.className = "fas fa-thumbtack trend-pin"; pin.title = "Pinned pick"; stg.appendChild(pin); }
        var sm = document.createElement("small"); sm.textContent = row.plays ? YR.fmt(row.plays) + " plays" : c.subtitle;
        meta.appendChild(stg); meta.appendChild(sm);
        var btn = document.createElement("button"); btn.className = "play-btn"; btn.setAttribute("aria-label", "Play " + c.title);
        btn.dataset.group = "trending"; btn.dataset.src = c.key; btn.dataset.title = c.title; btn.dataset.subtitle = c.subtitle; btn.dataset.art = c.img;
        btn.innerHTML = '<i class="fas fa-play"></i>';
        el.appendChild(rank); el.appendChild(img); el.appendChild(meta); el.appendChild(btn); box.appendChild(el);
        setTimeout(function () { el.classList.add("reveal", "in"); }, 0);
      });
    }
    function featured() {
      render(songs.slice(0, TOP).map(function (c) { return { cat: c, plays: 0, pinned: false }; }), "Featured picks", "The tracks worth starting with.");
    }
    if (!YR.configured) { featured(); return; }
    box.textContent = "";
    for (var k = 0; k < 6; k++) { var sk = document.createElement("div"); sk.className = "trend-item skel"; box.appendChild(sk); }
    YR.api("trending", { retries: 1, timeout: 12000 }).then(function (r) {
      var rows = [];
      if (r && r.items) r.items.forEach(function (it) {
        var c = cat.find(function (x) { return x.key === it.key; });
        if (!c && it.title) c = { key: it.key, kind: "audio", title: it.title, subtitle: it.subtitle || "Yohannes R.", img: it.art || "assets/images/Logo/YR.png" };   // newer song the catalog doesn't list yet
        else if (c && it.pinned && (it.art || it.subtitle)) c = { key: c.key, kind: c.kind, title: it.title || c.title, subtitle: it.subtitle || c.subtitle, img: it.art || c.img };
        if (c) rows.push({ cat: c, plays: it.plays, pinned: !!it.pinned });
      });
      if (!rows.length) { featured(); return; }
      var have = {}; rows.forEach(function (x) { have[x.cat.key] = 1; });
      songs.forEach(function (c) { if (rows.length < TOP && !have[c.key]) rows.push({ cat: c, plays: 0, pinned: false }); });   // top up to 10
      render(rows, "Trending now", "Top 10: my pinned picks first, then what people are playing most.");
    });
  }

  /* ---------- deep link from a shared URL ---------- */
  function openHash() {
    var m = /#item=(.+)$/.exec(location.hash);
    if (!m) return;
    var key; try { key = decodeURIComponent(m[1]); } catch (e) { return; }
    var el = document.querySelector('[data-key="' + sel(key) + '"]');
    if (!el) return;
    var album = el.closest(".album-card"); if (album) album.classList.add("active");
    setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("flash"); }, 350);
  }

  YR.social = { load: load, sync: sync, toggleLike: toggleLike, isLiked: isLiked,
    setMetric: function (key, m, v) { (stats[key] || (stats[key] = ZERO()))[m] = v; sync(); },
    stats: stats };

  function init() {
    load(document);
    initVideos(); initFilters(); initTrending(); openHash();
    var file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    YR.track("page:" + file, "page", "view", document.title);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();