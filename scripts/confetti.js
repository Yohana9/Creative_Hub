function createConfetti() {
  const confettiColors = ['#ff4500', '#ff8c00', '#ff6347', '#ffd700', '#1e90ff'];
  const container = document.getElementById('confetti-container');

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');
    confetti.style.setProperty('--confetti-color', confettiColors[Math.floor(Math.random() * confettiColors.length)]);
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.animationDelay = Math.random() * 5 + 's';
    container.appendChild(confetti);
  }
}

window.onload = createConfetti;
