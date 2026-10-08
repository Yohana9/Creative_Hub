/* =========================================================
   Site settings.
   API_BASE points at your uploaded PHP API on chub.yeneflow.com.
   Leave it empty (API_BASE: "") to force static-only mode instead
   (hearts save on-device only, counts/comments stay hidden, and the
   contact form opens an email draft) — useful for a quick preview
   before the database side is fully working.
   ========================================================= */
window.YR_CONFIG = {
  API_BASE: "https://chub.yeneflow.com/api/index.php",
  OWNER_EMAIL: "yohanreta9@gmail.com",
  SITE_NAME: "Yohan Records",
  // Where the big audio/video files live. GitHub Pages cannot serve Git LFS files,
  // so the Pages copy loads media from the cPanel site. Leave "" to use local paths.
  MEDIA_BASE: "https://chub.yeneflow.com/"
};

/* ---- Media resolver: sends assets/audio/* and assets/videos/* to MEDIA_BASE ---- */
(function () {
  var base = (window.YR_CONFIG && window.YR_CONFIG.MEDIA_BASE) || "";
  var RE = /^assets\/(audio|videos)\//;
  var same = false;
  try { same = base && new URL(base).origin === location.origin; } catch (e) {}
  if (!base || same) { window.YR_MEDIA = function (p) { return p; }; return; }
  base = base.replace(/\/+$/, "") + "/";
  window.YR_MEDIA = function (p) {
    return RE.test(p) ? base + p.split("/").map(encodeURIComponent).join("/") : p;
  };
  function fixVideos() {
    var vids = document.querySelectorAll("video");
    Array.prototype.forEach.call(vids, function (v) {
      var changed = false;
      Array.prototype.forEach.call(v.querySelectorAll("source[src]"), function (s) {
        var o = s.getAttribute("src"), n = window.YR_MEDIA(o);
        if (n !== o) { s.setAttribute("src", n); changed = true; }
      });
      if (changed) v.load();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fixVideos);
  else fixVideos();
})();