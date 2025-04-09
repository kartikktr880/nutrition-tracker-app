document.addEventListener('DOMContentLoaded', function() {
    // Get the CTA button
    const ctaButton = document.querySelector('.cta-button');
    
    // Add click event listener to CTA button if it exists
    if (ctaButton) {
        ctaButton.addEventListener('click', function() {
            // Redirect to the tracker page
            window.location.href = 'tracker.html';
        });
    }
    
    // Handle login status
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const navList = document.querySelector('nav ul');
    
    if (navList) {
        // Get login/register menu item
        const loginItem = Array.from(navList.children).find(item => {
            return item.querySelector('a').getAttribute('href') === 'login.html';
        });
        
        if (loginItem && currentUser) {
            // User is logged in, change "Login" to "Account" with dropdown
            const accountLink = document.createElement('a');
            accountLink.href = '#';
            accountLink.textContent = `Hi, ${currentUser.name.split(' ')[0]}`;
            
            const accountDropdown = document.createElement('div');
            accountDropdown.className = 'dropdown-menu';
            accountDropdown.style.display = 'none';
            
            const profileLink = document.createElement('a');
            profileLink.href = 'profile.html';
            profileLink.textContent = 'Profile';
            
            const logoutLink = document.createElement('a');
            logoutLink.href = '#';
            logoutLink.textContent = 'Logout';
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                // Clear user data and redirect to home
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
            
            accountDropdown.appendChild(profileLink);
            accountDropdown.appendChild(logoutLink);
            
            // Clear the login item and add new elements
            loginItem.innerHTML = '';
            loginItem.appendChild(accountLink);
            loginItem.appendChild(accountDropdown);
            
            // Add event listener to show/hide dropdown
            accountLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (accountDropdown.style.display === 'none') {
                    accountDropdown.style.display = 'block';
                } else {
                    accountDropdown.style.display = 'none';
                }
            });
            
            // Add style to position the dropdown
            loginItem.style.position = 'relative';
            
            // Add style to the dropdown menu
            const style = document.createElement('style');
            style.textContent = `
                .dropdown-menu {
                    position: absolute;
                    right: 0;
                    top: 100%;
                    background-color: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    min-width: 150px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    z-index: 100;
                }
                
                .dropdown-menu a {
                    display: block;
                    padding: 10px 15px;
                    text-decoration: none;
                    color: #333;
                }
                
                .dropdown-menu a:hover {
                    background-color: #f5f5f5;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Intersection Observer for scroll animations
    const sections = document.querySelectorAll('.features-section, .how-it-works, .testimonials, .cta-section');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };
    
    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                // If we only want to trigger animation once
                // observer.unobserve(entry.target);
            } else {
                // Uncomment the line below if you want animations to replay when section is out of view
                // entry.target.classList.remove('in-view');
            }
        });
    }, observerOptions);
    
    sections.forEach(section => {
        sectionObserver.observe(section);
    });
    
    // Animate individual feature cards when they come into view
    const featureCards = document.querySelectorAll('.feature-card');
    const cardObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Get the index of the card to stagger animations
                const index = Array.from(featureCards).indexOf(entry.target);
                entry.target.style.setProperty('--card-index', index + 1);
                entry.target.classList.add('animate');
                // After animation completes, we no longer need to observe
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    });
    
    featureCards.forEach(card => {
        cardObserver.observe(card);
    });
    
    // Add parallax effect to hero section
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        
        // Apply parallax to hero elements
        const heroGradient = document.querySelector('.hero-gradient');
        const heroParticles = document.querySelector('.hero-particles');
        const heroImage = document.querySelector('.hero-image');
        
        if (heroGradient && heroParticles && heroImage) {
            heroGradient.style.transform = `translateY(${scrollPosition * 0.05}px)`;
            heroParticles.style.transform = `translateY(${scrollPosition * 0.03}px)`;
            heroImage.style.transform = `translateY(${scrollPosition * 0.02}px)`;
        }
        
        // Apply subtle parallax to section backgrounds
        const sectionBackgrounds = document.querySelectorAll('.section-background');
        sectionBackgrounds.forEach(background => {
            const section = background.closest('section');
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const distanceFromTop = scrollPosition - sectionTop;
            
            if (distanceFromTop > -sectionHeight && distanceFromTop < sectionHeight) {
                background.style.transform = `translateY(${distanceFromTop * 0.05}px)`;
            }
        });
    });
    
    // Add micro-interactions for interactive elements
    const interactiveElements = document.querySelectorAll('.btn, .feature-link, .nav-link');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.classList.add('hover-effect');
        });
        
        element.addEventListener('mouseleave', function() {
            this.classList.remove('hover-effect');
        });
    });
});