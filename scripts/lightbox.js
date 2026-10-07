/* Dependency-free gallery lightbox with like / comment / share and view counting. */
(function () {
  "use strict";
  var YR = window.YR || {};
  var items = Array.prototype.slice.call(document.querySelectorAll(".gallery-item"));
  if (!items.length) return;

  var overlay = document.createElement("div");
  overlay.className = "lb-overlay";
  overlay.innerHTML =
    '<div class="lb-watermark">YOHAN RECORDS</div>' +
    '<img alt="" draggable="false">' +
    '<div class="lb-bar">' +
    '<button class="like-btn" type="button" data-kind="image" aria-label="Like"><i class="fa-regular fa-heart"></i><b data-metric="likes"></b></button>' +
    '<button class="cmt-btn online-only" type="button" data-kind="image" aria-label="Comments"><i class="fa-regular fa-comment"></i><b data-metric="comments"></b></button>' +
    '<button class="share-btn" type="button" data-kind="image" aria-label="Share"><i class="fas fa-share-nodes"></i></button>' +
    '</div>' +
    '<div class="lb-cap"></div>' +
    '<div class="lb-nav prev" role="button" aria-label="Previous"><i class="fas fa-chevron-left"></i></div>' +
    '<div class="lb-nav next" role="button" aria-label="Next"><i class="fas fa-chevron-right"></i></div>' +
    '<div class="lb-close" role="button" aria-label="Close"><i class="fas fa-xmark"></i></div>';
  document.body.appendChild(overlay);

  var img = overlay.querySelector("img"), cap = overlay.querySelector(".lb-cap");
  var likeB = overlay.querySelector(".like-btn"), cmtB = overlay.querySelector(".cmt-btn"), shB = overlay.querySelector(".share-btn");
  var likeM = likeB.querySelector("b"), cmtM = cmtB.querySelector("b");
  var index = 0;

  function show(i) {
    index = (i + items.length) % items.length;
    var it = items[index], im = it.querySelector("img");
    var key = it.dataset.key || im.getAttribute("src"), alt = im.getAttribute("alt") || "";
    img.src = im.getAttribute("src"); img.alt = alt; cap.textContent = alt;
    likeB.dataset.likeSrc = key; likeB.dataset.title = alt; likeM.dataset.key = key;
    cmtB.dataset.comments = key; cmtB.dataset.title = alt; cmtM.dataset.key = key;
    shB.dataset.share = key; shB.dataset.title = alt;
    if (YR.social) { YR.social.sync(overlay); }
    if (YR.track) YR.track(key, "image", "view", alt);
    overlay.classList.add("show"); document.body.classList.add("no-scroll");
  }
  function close() { overlay.classList.remove("show"); document.body.classList.remove("no-scroll"); img.removeAttribute("src"); }

  items.forEach(function (item, i) {
    item.addEventListener("click", function (e) { if (e.target.closest(".like-btn, .cmt-btn, .share-btn")) return; show(i); });
  });
  overlay.querySelector(".lb-close").addEventListener("click", close);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  overlay.querySelector(".prev").addEventListener("click", function () { show(index - 1); });
  overlay.querySelector(".next").addEventListener("click", function () { show(index + 1); });
  window.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("show")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });
  var sx = null;
  overlay.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  overlay.addEventListener("touchend", function (e) {
    if (sx === null) return; var d = e.changedTouches[0].clientX - sx;
    if (Math.abs(d) > 60) show(index + (d < 0 ? 1 : -1)); sx = null;
  }, { passive: true });
})();
