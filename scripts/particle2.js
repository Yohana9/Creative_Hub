
// Particle effect for section with ID "particle2"
particlesJS("particle2", {
  "particles": {
      "number": {
          "value": 60,
          "density": {
              "enable": true,
              "value_area": 800
          }
      },
      "color": {
          "value": ["#ff4500", "#ff8c00", "#ff6347"]  // Fire-like colors
      },
      "shape": {
          "type": "circle",
          "stroke": {
              "width": 0,
              "color": "#ff4500"
          },
          "polygon": {
              "nb_sides": 5
          },
      },
      "opacity": {
          "value": 0.6,
          "random": true,
          "anim": {
              "enable": true,
              "speed": 1,
              "opacity_min": 0.1,
              "sync": false
          }
      },
      "size": {
          "value": 6,
          "random": true,
          "anim": {
              "enable": true,
              "speed": 3,
              "size_min": 0.1,
              "sync": false
          }
      },
      "line_linked": {
          "enable": false
      },
      "move": {
          "enable": true,
          "speed": 4,
          "direction": "top",
          "random": false,
          "straight": false,
          "out_mode": "out",
          "attract": {
              "enable": false,
              "rotateX": 600,
              "rotateY": 1200
          }
      }
  },
  "interactivity": {
      "detect_on": "canvas",
      "events": {
          "onhover": {
              "enable": false
          },
          "onclick": {
              "enable": true,
              "mode": "push"
          },
          "resize": true
      },
      "modes": {
          "push": {
              "particles_nb": 4
          },
          "remove": {
              "particles_nb": 2
          }
      }
  },
  "retina_detect": true
});





