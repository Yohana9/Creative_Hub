particlesJS("particle2", {
    "particles": {
      "number": {
        "value": 80, // Increase number of particles
        "density": {
          "enable": true,
          "value_area": 1000 // Wider spread of particles
        }
      },
      "color": {
        "value": ["#ff4500", "#ff6347", "#ff8c00", "#ffd700", "#ff69b4"] // Gradient fire-like colors with pink accent
      },
      "shape": {
        "type": "polygon", // Use polygons instead of circles for a unique look
        "stroke": {
          "width": 1,
          "color": "#ffa500" // Add a subtle orange stroke to particles
        },
        "polygon": {
          "nb_sides": 6 // More sides for a modern geometric feel
        }
      },
      "opacity": {
        "value": 0.8, // Slightly higher opacity for more vibrant effect
        "random": true,
        "anim": {
          "enable": true,
          "speed": 2, // Faster opacity animation
          "opacity_min": 0.3, // Minimum opacity
          "sync": false
        }
      },
      "size": {
        "value": 7, // Increase size of particles
        "random": true,
        "anim": {
          "enable": true,
          "speed": 4, // Faster size animation
          "size_min": 0.5, // Minimum particle size for variety
          "sync": false
        }
      },
      "line_linked": {
        "enable": true, // Enable connections between particles
        "distance": 150, // Max distance for connection
        "color": "#ff4500", // Line color matching particles
        "opacity": 0.5, // Slightly transparent lines
        "width": 2 // Thicker lines for a more pronounced effect
      },
      "move": {
        "enable": true,
        "speed": 3, // Moderate speed for smoother movement
        "direction": "none", // Random direction for organic flow
        "random": true,
        "straight": false,
        "out_mode": "out",
        "bounce": false, // Prevent bouncing for natural movement
        "attract": {
          "enable": true,
          "rotateX": 3000, // Stronger attraction effect
          "rotateY": 3000
        }
      }
    },
    "interactivity": {
      "detect_on": "canvas",
      "events": {
        "onhover": {
          "enable": true,
          "mode": "grab" // Interaction effect that connects particles when hovered
        },
        "onclick": {
          "enable": true,
          "mode": "repulse" // Push particles away on click
        },
        "resize": true
      },
      "modes": {
        "grab": {
          "distance": 200, // Increase distance for grab effect
          "line_linked": {
            "opacity": 0.7 // Lines become more opaque when grabbed
          }
        },
        "repulse": {
          "distance": 300, // Strong repulse effect
          "duration": 0.4
        },
        "bubble": {
          "distance": 400,
          "size": 8,
          "duration": 1.5,
          "opacity": 0.8,
          "speed": 3
        },
        "push": {
          "particles_nb": 5 // Increase number of particles on click
        },
        "remove": {
          "particles_nb": 2
        }
      }
    },
    "retina_detect": true, // Enable retina display support
    "background": {
      "color": "#1a1a1a", // Dark background for contrast
      "image": "",
      "position": "50% 50%",
      "repeat": "no-repeat",
      "size": "cover"
    }
  });
  