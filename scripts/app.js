/* Core UI: theme, adaptive sidebar (rail on desktop, drawer on mobile), reveal, album accordion. */
(function () {
  "use strict";
  var body = document.body;
  var THEME_KEY = "yr-theme", SB_KEY = "yr-sb";
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* ---------- Theme (dark by default) ---------- */
  function applyTheme(t) {
    body.classList.toggle("light-theme", t === "light");
    body.classList.toggle("dark-theme", t !== "light");
    var ic = document.querySelector("#themeToggle i");
    if (ic) ic.className = t === "light" ? "fas fa-moon" : "fas fa-sun";
    var meta = document.querySelector("meta[name=theme-color]");
    if (meta) meta.setAttribute("content", t === "light" ? "#f5f4f9" : "#07070c");
    store(THEME_KEY, t);
  }
  applyTheme(read(THEME_KEY) === "light" ? "light" : "dark");
  var themeBtn = document.getElementById("themeToggle");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    applyTheme(body.classList.contains("light-theme") ? "dark" : "light");
  });

  /* ---------- Header shadow ---------- */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 6); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---------- Sidebar ---------- */
  var sidebar = document.getElementById("sidebar");
  var menuBtn = document.getElementById("menuToggle");
  if (sidebar) {
    var mq = window.matchMedia("(max-width: 991px)");
    var backdrop = document.querySelector(".sidebar-backdrop");
    if (!backdrop) { backdrop = document.createElement("div"); backdrop.className = "sidebar-backdrop"; document.body.appendChild(backdrop); }

    var setRail = function () {
      if (mq.matches) { body.classList.remove("sb-collapsed"); return; }
      var pref = read(SB_KEY);
      body.classList.toggle("sb-collapsed", pref !== null ? pref === "1" : window.innerWidth < 1200);
    };
    var openDrawer = function () {
      sidebar.classList.add("open"); backdrop.classList.add("show"); body.classList.add("no-scroll");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    };
    var closeDrawer = function () {
      sidebar.classList.remove("open"); backdrop.classList.remove("show"); body.classList.remove("no-scroll");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    };
    setRail();
    var rt; window.addEventListener("resize", function () {
      clearTimeout(rt); rt = setTimeout(function () { if (!mq.matches) closeDrawer(); setRail(); }, 120);
    });

    if (menuBtn) menuBtn.addEventListener("click", function () {
      if (mq.matches) { sidebar.classList.contains("open") ? closeDrawer() : openDrawer(); }
      else { var c = !body.classList.contains("sb-collapsed"); body.classList.toggle("sb-collapsed", c); store(SB_KEY, c ? "1" : "0"); }
    });
    backdrop.addEventListener("click", closeDrawer);
    var closeBtn = document.getElementById("sbClose");
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

    /* swipe left to close the drawer */
    var sx = null;
    sidebar.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    sidebar.addEventListener("touchend", function (e) {
      if (sx !== null && e.changedTouches[0].clientX - sx < -60) closeDrawer(); sx = null;
    }, { passive: true });
    /* swipe right from the left edge to open it */
    var ex = null;
    document.addEventListener("touchstart", function (e) { ex = e.touches[0].clientX < 22 ? e.touches[0].clientX : null; }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (mq.matches && ex !== null && e.changedTouches[0].clientX - ex > 70) openDrawer(); ex = null;
    }, { passive: true });

    /* submenus + active page */
    var file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    sidebar.querySelectorAll(".sb-item").forEach(function (item) {
      var toggle = item.querySelector(":scope > button.sb-link");
      if (toggle) toggle.addEventListener("click", function () {
        var open = !item.classList.contains("open");
        item.classList.toggle("open", open); toggle.setAttribute("aria-expanded", String(open));
      });
      item.querySelectorAll("a[href]").forEach(function (a) {
        if ((a.getAttribute("href") || "").toLowerCase() === file) {
          a.classList.add("active"); item.classList.add("active");
          if (item.classList.contains("has-sub")) { item.classList.add("open"); if (toggle) toggle.setAttribute("aria-expanded", "true"); }
        }
      });
    });
    sidebar.querySelectorAll("a[href]").forEach(function (a) {
      a.addEventListener("click", function () { if (mq.matches) closeDrawer(); });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var targets = document.querySelectorAll(".card, .album-card, .gallery-item, .video-card, .software-card, .trend-item, .stat-tile, .panel");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    targets.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  }

  /* ---------- Album accordion ---------- */
  document.querySelectorAll(".album-card").forEach(function (card) {
    card.addEventListener("click", function (e) {
      if (e.target.closest(".tracklist, button, a")) return;
      var was = card.classList.contains("active");
      document.querySelectorAll(".album-card.active").forEach(function (c) { c.classList.remove("active"); });
      if (!was) card.classList.add("active");
    });
  });

  document.querySelectorAll(".auto-year").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
