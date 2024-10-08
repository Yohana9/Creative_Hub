// Initialize Plyr players for all audio and video elements
const players = Array.from(document.querySelectorAll('audio, video')).map(p => new Plyr(p));

// Function to pause all players except the current one
function pauseAllExceptCurrent(currentPlayer) {
    players.forEach(player => {
        if (player.media !== currentPlayer) {
            player.pause();
        }
    });
}

// Add event listeners to all Plyr instances to ensure only one plays at a time
players.forEach(player => {
    player.on('play', function() {
        pauseAllExceptCurrent(player.media);
    });
});

// Remove settings button from Plyr controls in singles section only
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('#singles audio').forEach(audio => {
        const plyrControls = audio.closest('.plyr')?.querySelector('.plyr__controls');
        if (plyrControls) {
            const settingsButton = plyrControls.querySelector('[data-plyr="settings"]');
            if (settingsButton) settingsButton.remove();
        }
    });
});

// Theme Toggle Script
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Check and apply saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.classList.add(savedTheme + '-theme');
    themeToggle.textContent = savedTheme === 'dark' ? '🌜' : '🌞';

    // Toggle theme on button click
    themeToggle.addEventListener('click', function() {
        const isLightTheme = body.classList.contains('light-theme');
        body.classList.toggle('light-theme', !isLightTheme);
        body.classList.toggle('dark-theme', isLightTheme);
        themeToggle.textContent = isLightTheme ? '🌜' : '🌞';
        localStorage.setItem('theme', isLightTheme ? 'dark' : 'light');

        // Update player controls to match theme
        updatePlayerControlsTheme();
    });

    // Function to update player controls theme
    function updatePlayerControlsTheme() {
        const isDarkTheme = body.classList.contains('dark-theme');
        players.forEach(player => {
            player.elements.container.classList.toggle('plyr--dark', isDarkTheme);
        });
    }
});

// Album Toggle Function
function toggleAlbumDetails(id) {
    const details = document.getElementById(id);
    if (details) {
        details.classList.toggle('d-none');
    }
}

// Sub Menu Handling
document.addEventListener('DOMContentLoaded', function() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');

    sidebarItems.forEach(function(item) {
        const link = item.querySelector('.sidebar-link');
        const submenu = item.querySelector('.submenu');

        if (submenu) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                item.classList.toggle('active');
                sidebarItems.forEach(it => {
                    if (it !== item && it.querySelector('.submenu')) {
                        it.classList.remove('active');
                    }
                });
            });
        }

        // Preserve state when navigating between pages
        const currentPage = window.location.pathname.split("/").pop();
        const submenuLinks = submenu ? submenu.querySelectorAll('.submenu-link') : [];

        submenuLinks.forEach(subLink => {
            if (subLink.getAttribute('href') === currentPage) {
                item.classList.add('active');
            }
        });

        if (link.getAttribute('href') === currentPage) {
            item.classList.add('active');
        }
    });
});

// Gallery Section Initialize Masonry
document.addEventListener('DOMContentLoaded', function() {
    const grid = document.querySelector('.grid');
    if (grid) {
        new Masonry(grid, {
            itemSelector: 'a',
            columnWidth: 'a',
            percentPosition: true
        });
    }
});

// Initialize Fancybox
Fancybox.bind('[data-fancybox="gallery"]');

// Sidebar Toggle Script
// document.addEventListener('DOMContentLoaded', function() {
//     const menuIcon = document.querySelector('.menu-icon');
//     const sidebar = document.querySelector('.sidebar');
    
//     // Toggle sidebar visibility on menu icon click
//     menuIcon.addEventListener('click', function() {
//         sidebar.classList.toggle('collapsed');
//     });
    
//     // Hide sidebar when clicking outside of it
//     document.addEventListener('click', function(event) {
//         if (!sidebar.contains(event.target) && !menuIcon.contains(event.target)) {
//             sidebar.classList.add('collapsed');
//         }
//     });
// });


document.addEventListener('DOMContentLoaded', function() {
    const menuIcon = document.querySelector('.menu-icon');
    const sidebar = document.querySelector('.sidebar');
    
    // Toggle sidebar visibility on menu icon click
    menuIcon.addEventListener('click', function() {
        sidebar.classList.toggle('visible');
    });
    
    // Optional: Hide sidebar when clicking outside of it
    document.addEventListener('click', function(event) {
        if (!sidebar.contains(event.target) && !menuIcon.contains(event.target)) {
            sidebar.classList.remove('visible');
        }
    });
});




document.querySelectorAll('.play-pause').forEach(function(button) {
    button.addEventListener('click', function() {
        const audio = this.closest('.card-body').querySelector('audio');
        const icon = this.querySelector('i');
        if (audio.paused) {
            audio.play();
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
        } else {
            audio.pause();
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        }
    });
});


// newsletterForm
document.getElementById('newsletterForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevents the form from submitting in the traditional way

    var email = document.getElementById('newsletterEmail').value;
    var confirmationMessage = document.getElementById('confirmationMessage');

    if (email) {
        fetch('https://YOUR_MAILCHIMP_API_ENDPOINT', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email
            })
        })
        .then(response => response.json())
        .then(data => {
            confirmationMessage.style.display = 'block';
        })
        .catch(error => {
            console.error('Error:', error);
        });
    } else {
        alert('Please enter a valid email address.');
    }
});


///  Disabling download files

const player = Plyr.setup('audio', {
    controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
    settings: [],  // Empty settings to avoid additional options
});



document.querySelectorAll('audio').forEach(function(audio) {
audio.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});
});