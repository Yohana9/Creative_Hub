function createStars() {
    const starsContainer = document.getElementById('stars-container');
  
    for (let i = 0; i < 1000; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      star.style.left = Math.random() * 100 + 'vw';
      star.style.top = Math.random() * 100 + 'vh';
      star.style.animationDuration = Math.random() * 5 + 2 + 's';
      starsContainer.appendChild(star);
    }
  }
  
  window.onload = createStars;
  