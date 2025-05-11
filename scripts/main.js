// ============================
// Premium Nutrition Tracker JavaScript
// ============================

document.addEventListener('DOMContentLoaded', function() {
    // Check if in screenshot mode from URL parameter
    const isScreenshotMode = new URLSearchParams(window.location.search).get('screenshot') === 'true';
    
    // Apply screenshot mode if URL parameter is set
    if (isScreenshotMode) {
        document.body.classList.add('screenshot-mode');
        document.documentElement.classList.add('screenshot-mode');
        applyScreenshotFixes();
    }

    // Initialize all components
    initializeMenuToggle();
    initializeTestimonials();
    initializeCounters();
    initializeBackToTop();
    initializeFormValidation();
    initializeFooterAnimations();
    
    // Function to apply all screenshot-specific fixes
    function applyScreenshotFixes() {
        console.log('Applying screenshot fixes...');
        
        // Disable all animations and transitions
        document.documentElement.style.setProperty('--animation-duration', '0s', 'important');
        document.documentElement.style.setProperty('--transition-duration', '0s', 'important');
        
        // Fix section spacing
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            section.style.marginBottom = '0';
            section.style.paddingBottom = '0';
            section.style.opacity = '1';
            section.style.visibility = 'visible';
        });
        
        // Fix newsletter section spacing
        const newsletter = document.querySelector('.newsletter-section');
        if (newsletter) {
            newsletter.style.marginBottom = '0';
            newsletter.style.paddingBottom = '0';
        }
        
        // Fix footer spacing issues
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.style.padding = '5px 0 3px';
            footer.style.marginTop = '0';
            footer.style.lineHeight = '1';
        }
        
        // Fix footer columns
        const footerColumns = document.querySelectorAll('.footer-column');
        footerColumns.forEach(column => {
            column.style.margin = '0';
            column.style.padding = '0';
            column.style.lineHeight = '1';
        });
        
        // Fix footer content layout
        const footerContent = document.querySelector('.footer-content');
        if (footerContent) {
            footerContent.style.display = 'flex';
            footerContent.style.flexWrap = 'wrap';
            footerContent.style.justifyContent = 'space-between';
            footerContent.style.gap = '5px';
            footerContent.style.marginBottom = '3px';
        }
        
        // Fix section headers
        const sectionTitles = document.querySelectorAll('.footer-title');
        sectionTitles.forEach(title => {
            title.style.marginBottom = '2px';
            title.style.paddingTop = '2px';
            title.style.lineHeight = '1';
        });
        
        // Reduce spacing between list items
        const listItems = document.querySelectorAll('.footer-links li');
        listItems.forEach(item => {
            item.style.marginBottom = '1px';
            item.style.lineHeight = '1';
        });
        
        // Fix footer bottom
        const footerBottom = document.querySelector('.footer-bottom');
        if (footerBottom) {
            footerBottom.style.paddingTop = '3px';
            footerBottom.style.marginTop = '2px';
        }
        
        // Make all elements visible
        document.querySelectorAll('.footer *, .newsletter-section *').forEach(el => {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
        });
    }
            
    // Toggle menu for mobile
    function initializeMenuToggle() {
        // Menu toggle implementation
    }

    // Testimonial carousel functionality
    function initializeTestimonials() {
        const testimonials = document.querySelectorAll('.testimonial-card');
        const paginationDots = document.querySelectorAll('.pagination-dot');
        const prevButton = document.querySelector('.testimonial-control:first-child');
        const nextButton = document.querySelector('.testimonial-control:last-child');
        let currentIndex = 0;

        if (!testimonials.length) return;

        // Show only the current testimonial
        function updateDisplay() {
            testimonials.forEach((card, index) => {
                if (index === currentIndex) {
                    card.style.display = 'block';
                    card.style.opacity = '1';
                    card.style.visibility = 'visible';
                } else {
                    card.style.display = 'none';
                }
            });

            // Update pagination dots
            paginationDots.forEach((dot, index) => {
                if (index === currentIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }

        // Initial display
        updateDisplay();

        // Next button click
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % testimonials.length;
                updateDisplay();
            });
        }

        // Previous button click
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
                updateDisplay();
            });
        }

        // Pagination dot clicks
        paginationDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
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
                currentIndex = (currentIndex + 1) % testimonials.length;
                updateDisplay();
            }, 6000);
        }
        
        // In screenshot mode, make all testimonials visible
        if (document.body.classList.contains('screenshot-mode')) {
            testimonials.forEach(card => {
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

            if (!emailValue) {
                emailInput.classList.add('error');
                return false;
            }

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
});
