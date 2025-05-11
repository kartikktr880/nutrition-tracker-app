// ============================
// Premium Nutrition Tracker JavaScript
// ============================

document.addEventListener('DOMContentLoaded', function() {
    // Check if in screenshot mode from URL parameter
    const isScreenshotMode = new URLSearchParams(window.location.search).get('screenshot') === 'true';
    
    // Initialize all components only if not in screenshot mode
    if (!isScreenshotMode) {
        initializeHeader();
        initializeAnimations();
        initializeTestimonials();
        initializeCounters();
        initializeBackToTop();
        initializeFormValidation();
        initializeFooterAnimations();
    } else {
        // If in screenshot mode, only initialize essentials
        initializeHeader();
        initializeBackToTop();
        prepareSectionsForScreenshot();
    }
});

// Screenshot preparation
function prepareSectionsForScreenshot() {
    console.log('Preparing sections for screenshot...');
    
    // Make all sections and elements fully visible
    document.querySelectorAll('section, .container, .footer, .footer-container, .footer-content, .footer-column').forEach(section => {
        section.style.display = 'block';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
        section.style.height = 'auto';
        section.style.overflow = 'visible';
    });
    
    // Stop all animations
    document.querySelectorAll('*').forEach(el => {
        if (el.style.animation) {
            el.style.animation = 'none';
        }
        if (el.style.transition) {
            el.style.transition = 'none';
        }
    });
}

// Header interactions
function initializeHeader() {
    const header = document.querySelector('.premium-header');
    const mobileMenuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.navigation-menu');
    
    // Handle header scroll effect
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            
            // Change aria-expanded attribute for accessibility
            const expanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true' || false;
            mobileMenuToggle.setAttribute('aria-expanded', !expanded);
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navMenu.contains(event.target) && !mobileMenuToggle.contains(event.target) && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
}

// Animations and visual effects
function initializeAnimations() {
    // Skip animations if in screenshot mode
    if (document.body.classList.contains('screenshot-mode')) {
        return;
    }
    
    // Animate elements when they enter viewport
    const animatedElements = document.querySelectorAll('.fade-in, .slide-in, .zoom-in');
    
    // Observer for animation triggers
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Stop observing after animation is triggered
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    
    // Observe all animated elements
    animatedElements.forEach(el => {
        observer.observe(el);
    });
    
    // Add parallax effects to decorative elements
    document.addEventListener('mousemove', function(e) {
        // Skip parallax if in screenshot mode
        if (document.body.classList.contains('screenshot-mode')) {
            return;
        }
        
        const parallaxElements = document.querySelectorAll('.parallax-element');
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        parallaxElements.forEach(el => {
            const speed = el.getAttribute('data-speed') || 0.05;
            const x = (window.innerWidth - mouseX * speed) / 100;
            const y = (window.innerHeight - mouseY * speed) / 100;
            
            el.style.transform = `translateX(${x}px) translateY(${y}px)`;
        });
    });
}

// Testimonials slider functionality
function initializeTestimonials() {
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const prevButton = document.querySelector('.testimonial-control:first-child');
    const nextButton = document.querySelector('.testimonial-control:last-child');
    const paginationDots = document.querySelectorAll('.pagination-dot');
    
    if (!testimonialCards.length) return;
    
    let currentIndex = 0;
    const cardCount = testimonialCards.length;
    
    // Initialize first card as active (for mobile view)
    testimonialCards[0].classList.add('active');
    
    // Update display based on current index
    function updateDisplay() {
        // Remove active class from all cards and dots
        testimonialCards.forEach(card => card.classList.remove('active'));
        paginationDots.forEach(dot => dot.classList.remove('active'));
        
        // Add active class to current card and dot
        testimonialCards[currentIndex].classList.add('active');
        paginationDots[currentIndex].classList.add('active');
    }
    
    // Event listeners for controls
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            currentIndex = (currentIndex - 1 + cardCount) % cardCount;
            updateDisplay();
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            currentIndex = (currentIndex + 1) % cardCount;
            updateDisplay();
        });
    }
    
    // Add click events to pagination dots
    paginationDots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            currentIndex = index;
            updateDisplay();
        });
    });
    
    // Auto rotate testimonials every 6 seconds, but only if not in screenshot mode
    if (!document.body.classList.contains('screenshot-mode')) {
        setInterval(() => {
            // Skip auto-rotation if in screenshot mode
            if (document.body.classList.contains('screenshot-mode')) {
                return;
            }
            currentIndex = (currentIndex + 1) % cardCount;
            updateDisplay();
        }, 6000);
    }

    // For screenshot mode: make all testimonials visible
    if (document.body.classList.contains('screenshot-mode')) {
        testimonialCards.forEach(card => {
            card.style.display = 'block';
            card.style.opacity = '1';
            card.style.visibility = 'visible';
        });
    }
}

// Animated counters for statistics
function initializeCounters() {
    const statElements = document.querySelectorAll('.cta-stat-number');
    
    if (!statElements.length) return;
    
    // Skip animations if in screenshot mode
    if (document.body.classList.contains('screenshot-mode')) {
        // Set final values immediately
        statElements.forEach(el => {
            const targetNumber = parseFloat(el.innerText.replace(/[^\d.-]/g, ''));
            const suffix = el.innerText.replace(/[\d.-]/g, '');
            el.innerText = targetNumber + suffix;
        });
        return;
    }
    
    // Observer for starting counter animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const targetNumber = parseFloat(target.innerText.replace(/[^\d.-]/g, ''));
                const duration = 2000; // ms
                const steps = 60;
                const stepDuration = duration / steps;
                const increment = targetNumber / steps;
                let current = 0;
                let suffix = target.innerText.replace(/[\d.-]/g, '');
                
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= targetNumber) {
                        target.innerText = targetNumber + suffix;
                        clearInterval(timer);
                    } else {
                        if (Number.isInteger(targetNumber)) {
                            target.innerText = Math.floor(current) + suffix;
                        } else {
                            target.innerText = current.toFixed(1) + suffix;
                        }
                    }
                }, stepDuration);
                
                // Stop observing after counter is triggered
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });
    
    // Observe all stat elements
    statElements.forEach(el => {
        observer.observe(el);
    });
}

// Back to top button
function initializeBackToTop() {
    const backToTopButton = document.querySelector('.back-to-top');
    
    if (!backToTopButton) return;
    
    // Show or hide button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });
    
    // Scroll to top when clicked
    backToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Check initial scroll position
    if (window.scrollY > 300) {
        backToTopButton.classList.add('visible');
    }
}

// Form validation
function initializeFormValidation() {
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (!newsletterForm) return;
    
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const emailInput = this.querySelector('input[type="email"]');
        const emailValue = emailInput.value.trim();
        
        if (!isValidEmail(emailValue)) {
            emailInput.classList.add('error');
            
            // Add error message if it doesn't exist
            if (!this.querySelector('.error-message')) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.innerText = 'Please enter a valid email address';
                emailInput.parentNode.appendChild(errorMessage);
            }
            
            return false;
        }
        
        // Remove error states
        emailInput.classList.remove('error');
        const errorMessage = this.querySelector('.error-message');
        if (errorMessage) errorMessage.remove();
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Thank you for subscribing!';
        
        // Replace form with success message
        this.innerHTML = '';
        this.appendChild(successMessage);
        
        // Here you would typically submit the form via AJAX
        console.log('Form submitted with email:', emailValue);
    });
    
    // Email validation helper
    function isValidEmail(email) {
        const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return regex.test(email);
    }
}

// Initialize footer animations
function initializeFooterAnimations() {
    const footer = document.querySelector('.footer');
    
    if (!footer) return;
    
    // Skip animations if in screenshot mode
    if (document.body.classList.contains('screenshot-mode')) {
        // Simply make all footer elements visible
        footer.querySelectorAll('.footer-logo-img, .footer-title, .social-icon, .footer-links a, .contact-item').forEach(el => {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            el.style.transform = 'none';
        });
        return;
    }
    
    // Create intersection observer to animate elements when they come into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Animate the logo
                const logoImg = footer.querySelector('.footer-logo-img');
                if (logoImg) {
                    logoImg.style.animation = 'fadeInUp 0.5s ease forwards';
                    logoImg.style.opacity = '1';
                }
                
                // Immediately show footer titles with staggered delay
                const titles = footer.querySelectorAll('.footer-title');
                titles.forEach((title, index) => {
                    setTimeout(() => {
                        title.style.opacity = '1';
                        title.style.transform = 'translateY(0)';
                    }, index * 100);
                });
                
                // Reveal social icons (animation is handled by CSS)
                const socialIcons = footer.querySelectorAll('.social-icon');
                socialIcons.forEach(icon => {
                    icon.style.visibility = 'visible';
                });
                
                // No need to remove observer as we want this to happen each time footer is in view
            }
        });
    }, { threshold: 0.2 });
    
    // Start observing the footer
    observer.observe(footer);
    
    // Add hover effects to the footer links
    const footerLinks = document.querySelectorAll('.footer-links a, .footer-link-bottom');
    footerLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s ease';
            this.style.color = '#FF8C42';
            
            // Find before element if exists
            const beforeEls = document.querySelectorAll('.footer-links a::before');
            if (beforeEls.length) {
                beforeEls.forEach(before => {
                    before.style.opacity = '1';
                    before.style.transform = 'scale(1.2)';
                });
            }
        });
        
        link.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.color = '';
            }
            
            // Reset before elements
            const beforeEls = document.querySelectorAll('.footer-links a::before');
            if (beforeEls.length) {
                beforeEls.forEach(before => {
                    before.style.opacity = '';
                    before.style.transform = '';
                });
            }
        });
    });
}
