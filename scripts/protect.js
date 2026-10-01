/* =========================================================
   YOHAN RECORDS — content-protection layer (best effort)

   IMPORTANT / HONEST LIMITATION: nothing that runs in the
   browser can fully stop someone from downloading a file the
   browser has already received, or from recording their
   screen. These measures raise the bar for casual copying
   (right-click save, drag-and-drop, view-source, simple
   automation) — they are a deterrent and a "please don't"
   layer, not real DRM. Real protection requires server-side
   controls: signed/expiring URLs, streaming instead of direct
   file links, and watermarked/lower-res previews.
   ========================================================= */
(function () {
  "use strict";

  // 1) Disable the right-click context menu on protected media.
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest("img, audio, video, .gallery-item, .card, .album-card, .video-card")) {
      e.preventDefault();
    }
  });

  // 2) Prevent dragging images/media out to the desktop.
  document.addEventListener("dragstart", (e) => {
    if (e.target.closest("img, audio, video")) e.preventDefault();
  });

  // 3) Block a few obvious "save/inspect" keyboard shortcuts.
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    const blockCombo =
      (e.ctrlKey || e.metaKey) && ["s", "u"].includes(k) || // save page / view source
      (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) || // devtools panels
      k === "f12";
    if (blockCombo) e.preventDefault();
  });

  // 4) Mark media elements as non-downloadable where the browser supports it.
  document.querySelectorAll("audio, video").forEach((m) => {
    m.setAttribute("controlsList", "nodownload noremoteplayback");
    m.setAttribute("disablePictureInPicture", "");
    m.setAttribute("oncontextmenu", "return false");
  });

  // 5) Pause playback and dim the screen while the tab is hidden or the
  //    window loses focus — reduces the value of "record my screen while
  //    I alt-tab a stream open elsewhere" style capture.
  let shield = document.querySelector(".privacy-shield");
  if (!shield) {
    shield = document.createElement("div");
    shield.className = "privacy-shield";
    shield.innerHTML = `
      <div class="msg">
        <i class="fas fa-shield-halved"></i>
        <p>Playback paused — this tab is not in focus.</p>
      </div>`;
    document.body.appendChild(shield);
  }

  function pauseAllMedia() {
    document.querySelectorAll("audio, video").forEach((m) => { if (!m.paused) m.pause(); });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseAllMedia();
      shield.classList.add("show");
    } else {
      shield.classList.remove("show");
    }
  });

  // 6) Soft watermark: stamp the site name faintly across large media
  //    surfaces so re-shared screenshots/recordings still carry a mark.
  document.querySelectorAll(".gallery-item").forEach((item) => {
    if (item.querySelector(".protect-mark")) return;
    const mark = document.createElement("div");
    mark.className = "protect-mark";
    mark.innerHTML = "<span>Yohan Records</span>";
    item.appendChild(mark);
  });
})();
