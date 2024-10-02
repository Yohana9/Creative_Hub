function createBubbles() {
    const bubbleContainer = document.getElementById('bubble-container');
  
    for (let i = 0; i < 50; i++) {
      const bubble = document.createElement('div');
      bubble.classList.add('bubble');
      bubble.style.left = Math.random() * 100 + 'vw';
      bubble.style.width = Math.random() * 30 + 'px';
      bubble.style.height = bubble.style.width;
      bubble.style.animationDuration = Math.random() * 8 + 4 + 's';
      bubble.style.animationDelay = Math.random() * 4 + 's';
      bubbleContainer.appendChild(bubble);
    }
  }
  
  window.onload = createBubbles;
  