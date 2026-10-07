/* One audio element drives every play button. Queue per data-group, repeat, shuffle, like/comment/share, play counting. */
(function () {
  "use strict";
  var YR = (window.YR = window.YR || {});
  var bar = document.getElementById("playerBar");
  if (!bar) return;

  var audio = new Audio();
  audio.preload = "none";
  audio.disableRemotePlayback = true;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    art: $("pArt"), title: $("pTitle"), subtitle: $("pSubtitle"), like: $("pLike"), cmt: $("pComments"), share: $("pShare"),
    play: $("pPlay"), prev: $("pPrev"), next: $("pNext"), repeat: $("pRepeat"), shuffle: $("pShuffle"), close: $("pClose"),
    cur: $("pCur"), dur: $("pDur"), seek: $("pSeekTrack"), fill: $("pSeekFill"), thumb: $("pSeekThumb"), vol: $("pVolTrack"), volFill: $("pVolFill")
  };
  var group = [], index = -1, key = "", meta = { title: "", subtitle: "" };
  var played = 0, lastT = 0, counted = false;

  function get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function fmt(t) { if (!isFinite(t) || t < 0) return "0:00"; return Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0"); }
  function esc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : s; }

  /* ---------- repeat + shuffle ---------- */
  var repeat = get("yr-repeat", "all"), shuffle = get("yr-shuffle", "0") === "1";
  function paintModes() {
    els.repeat.classList.toggle("is-on", repeat !== "off");
    els.repeat.classList.toggle("is-one", repeat === "one");
    els.repeat.setAttribute("aria-label", repeat === "off" ? "Repeat off" : repeat === "all" ? "Repeat all" : "Repeat one");
    els.shuffle.classList.toggle("is-on", shuffle);
    els.shuffle.setAttribute("aria-pressed", String(shuffle));
  }
  paintModes();
  els.repeat.addEventListener("click", function () { repeat = repeat === "off" ? "all" : repeat === "all" ? "one" : "off"; put("yr-repeat", repeat); paintModes(); });
  els.shuffle.addEventListener("click", function () { shuffle = !shuffle; put("yr-shuffle", shuffle ? "1" : "0"); paintModes(); });

  /* ---------- buttons state ---------- */
  function syncButtons() {
    document.querySelectorAll(".play-btn[data-src]").forEach(function (b) {
      var cur = key && b.dataset.src === key, playing = cur && !audio.paused;
      b.classList.toggle("is-playing", playing); b.classList.toggle("is-current", !!cur);
      b.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
      var row = b.closest(".track-play-row"), lab = row && row.querySelector(".track-mini-title");
      if (lab) { lab.textContent = cur ? (playing ? "NOW PLAYING" : "PAUSED") : "TAP TO PLAY"; lab.classList.toggle("is-live", playing); }
      if (row && !cur) { var bi = row.querySelector(".track-mini-bar i"); if (bi) bi.style.width = "0%"; }
    });
    els.play.innerHTML = audio.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
  }

  function attachSocial() {
    [els.like, els.cmt, els.share].forEach(function (b) { b.dataset.title = meta.title; b.dataset.kind = "audio"; });
    els.like.dataset.likeSrc = key; els.cmt.dataset.comments = key; els.share.dataset.share = key;
    if (YR.social) YR.social.sync(bar);
  }

  function load(btn, autoplay) {
    var g = btn.dataset.group || "default";
    group = Array.prototype.slice.call(document.querySelectorAll('.play-btn[data-group="' + esc(g) + '"]'));
    index = group.indexOf(btn);
    key = btn.dataset.src; meta = { title: btn.dataset.title || "Untitled", subtitle: btn.dataset.subtitle || "Yohan Records" };
    played = 0; lastT = 0; counted = false;
    audio.src = key;
    els.title.textContent = meta.title; els.subtitle.textContent = meta.subtitle;
    els.art.src = btn.dataset.art || "assets/images/Logo/YR.png";
    bar.classList.add("active");
    attachSocial();
    if (autoplay) audio.play().catch(function () {});
    syncButtons();
  }

  function step(dir, auto) {
    if (!group.length) return;
    var i;
    if (shuffle && group.length > 1) { do { i = Math.floor(Math.random() * group.length); } while (i === index); }
    else {
      i = index + dir;
      if (i < 0) i = group.length - 1;
      if (i >= group.length) { if (auto && repeat === "off") return; i = 0; }
    }
    load(group[i], true);
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest(".play-btn[data-src]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (key && b.dataset.src === key) { audio.paused ? audio.play().catch(function () {}) : audio.pause(); }
    else load(b, true);
  });
  els.play.addEventListener("click", function () { if (key) audio.paused ? audio.play().catch(function () {}) : audio.pause(); });
  els.prev.addEventListener("click", function () {
    if (audio.currentTime > 4) { audio.currentTime = 0; return; }
    step(-1, false);
  });
  els.next.addEventListener("click", function () { step(1, false); });
  els.close.addEventListener("click", function () {
    audio.pause(); audio.removeAttribute("src"); key = ""; bar.classList.remove("active"); syncButtons();
    els.like.removeAttribute("data-like-src");
  });

  audio.addEventListener("play", syncButtons);
  audio.addEventListener("pause", syncButtons);
  audio.addEventListener("ended", function () {
    if (repeat === "one") { audio.currentTime = 0; audio.play().catch(function () {}); return; }
    step(1, true);
  });
  audio.addEventListener("error", function () { if (key) YR.toast && YR.toast("This track could not be loaded.", "error"); });

  audio.addEventListener("timeupdate", function () {
    var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    els.fill.style.width = pct + "%"; els.thumb.style.left = pct + "%"; els.cur.textContent = fmt(audio.currentTime);
    document.querySelectorAll(".play-btn.is-current").forEach(function (b) {
      var bi = b.closest(".track-play-row") && b.closest(".track-play-row").querySelector(".track-mini-bar i");
      if (bi) bi.style.width = pct + "%";
    });
    var d = audio.currentTime - lastT;
    if (!audio.paused && d > 0 && d < 1.5) played += d;
    lastT = audio.currentTime;
    if (!counted && played >= 5) { counted = true; if (YR.track) YR.track(key, "audio", "play", meta.title); }
  });
  audio.addEventListener("seeked", function () { lastT = audio.currentTime; });
  audio.addEventListener("loadedmetadata", function () { els.dur.textContent = fmt(audio.duration); });

  function drag(track, apply) {
    var down = false;
    function pos(e) { var r = track.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; apply(Math.min(1, Math.max(0, x / r.width))); }
    track.addEventListener("mousedown", function (e) { down = true; pos(e); });
    window.addEventListener("mousemove", function (e) { if (down) pos(e); });
    window.addEventListener("mouseup", function () { down = false; });
    track.addEventListener("touchstart", pos, { passive: true });
    track.addEventListener("touchmove", pos, { passive: true });
  }
  drag(els.seek, function (p) { if (audio.duration) audio.currentTime = p * audio.duration; });
  audio.volume = 0.85;
  drag(els.vol, function (p) { audio.volume = p; els.volFill.style.width = p * 100 + "%"; });

  /* only one media element at a time */
  audio.addEventListener("play", function () { document.querySelectorAll("video").forEach(function (v) { v.pause(); }); });
  document.querySelectorAll("video").forEach(function (v) { v.addEventListener("play", function () { audio.pause(); }); });

  window.addEventListener("keydown", function (e) {
    var t = document.activeElement && document.activeElement.tagName;
    if (e.code === "Space" && key && !/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t || "")) { e.preventDefault(); audio.paused ? audio.play().catch(function () {}) : audio.pause(); }
  });
})();
