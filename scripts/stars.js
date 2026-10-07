/* Twinkling star field (from the original site). Same effect, star count scales with screen size. */
(function () {
  function createStars() {
    var c = document.getElementById('stars-container');
    if (!c) return;
    var count = window.innerWidth < 700 ? 160 : 420;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = document.createElement('div');
      s.className = 'star';
      s.style.left = Math.random() * 100 + 'vw';
      s.style.top = Math.random() * 100 + 'vh';
      s.style.animationDuration = (Math.random() * 5 + 2) + 's';
      frag.appendChild(s);
    }
    c.appendChild(frag);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createStars);
  else createStars();
})();
