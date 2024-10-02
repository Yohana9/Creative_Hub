function createWave() {
  const waveContainer = document.getElementById('wave-container');

  for (let i = 0; i < 20; i++) {
    const wave = document.createElement('div');
    wave.classList.add('wave');
    wave.style.left = Math.random() * 100 + 'vw';
    wave.style.animationDelay = Math.random() * 10 + 's';
    waveContainer.appendChild(wave);
  }
}

window.onload = createWave;
