import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Home Page Manager
 * Handles loading and initialization of the home page content
 */
class HomePageManager {
    constructor() {
        this.contentContainer = document.querySelector('main');
        this.init();
    }

    /**
     * Initialize the home page
     */
    async init() {
        try {
            logInfo('Initializing home page...');
            
            // Remove loader when content is loaded
            const loader = document.querySelector('.loader');
            if (loader) {
                loader.remove();
            }
            
            // Initialize components after content is loaded
            this.initComponents();
            
            logInfo('Home page initialized successfully');
        } catch (error) {
            logError('Failed to initialize home page:', error);
            this.showError('Failed to load content. Please try again.');
        }
    }

    /**
     * Initialize components after content is loaded
     */
    initComponents() {
        // Apply translations if i18n is available
        if (window.i18n) {
            window.i18n.updateContent();
        }
        
        // Initialize hero section
        this.initHeroSection();
        
        // Initialize features section
        this.initFeaturesSection();
        
        // Initialize how it works section
        this.initHowItWorksSection();
        
        // Initialize testimonials section
        this.initTestimonialsSection();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup scroll animations
        this.setupScrollAnimations();
    }

    /**
     * Initialize hero section
     */
    initHeroSection() {
        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) return;
        
        // Add animation to hero text
        const heroHeading = heroSection.querySelector('h1');
        const heroSubheading = heroSection.querySelector('p');
        const heroButtons = heroSection.querySelector('.hero-buttons');
        const heroImage = heroSection.querySelector('.hero-image');
        
        // Set initial state
        if (heroHeading) heroHeading.style.opacity = '0';
        if (heroSubheading) heroSubheading.style.opacity = '0';
        if (heroButtons) heroButtons.style.opacity = '0';
        if (heroImage) heroImage.style.opacity = '0';
        
        // Start animations after DOM is fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (heroHeading) heroHeading.classList.add('animate-in');
                if (heroSubheading) heroSubheading.classList.add('animate-in');
                if (heroButtons) heroButtons.classList.add('animate-in');
                if (heroImage) heroImage.classList.add('animate-in');
            }, 200);
        });
        
        // If DOMContentLoaded already fired, run animation immediately
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(() => {
        if (heroHeading) heroHeading.classList.add('animate-in');
                if (heroSubheading) heroSubheading.classList.add('animate-in');
                if (heroButtons) heroButtons.classList.add('animate-in');
                if (heroImage) heroImage.classList.add('animate-in');
            }, 200);
        }
        
        // Add ripple effect to the hero buttons
        const buttons = heroSection.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                button.appendChild(ripple);
                
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size * 2}px`;
                ripple.style.left = `${e.clientX - rect.left - size}px`;
                ripple.style.top = `${e.clientY - rect.top - size}px`;
                
                setTimeout(() => {
                    if (ripple && ripple.parentNode === button) {
                        button.removeChild(ripple);
                    }
                }, 600);
            });
        });
    }

    /**
     * Initialize features section
     */
    initFeaturesSection() {
        const featuresSection = document.querySelector('.features-section');
        if (!featuresSection) return;
        
        // Setup intersection observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    // Stagger animation for child elements
                    const children = entry.target.querySelectorAll('.feature-icon, h3, p, .feature-link');
                    children.forEach((child, index) => {
                        setTimeout(() => {
                            child.style.opacity = '0';
                            child.style.transform = 'translateY(20px)';
                            child.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
                            
                            setTimeout(() => {
                                child.style.opacity = '1';
                                child.style.transform = 'translateY(0)';
                            }, 50);
                        }, 50);
                    });
                    
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        
        // Observe feature cards
        const featureCards = featuresSection.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
            card.classList.add('animate-on-scroll');
            card.style.transitionDelay = `${index * 0.1}s`;
                observer.observe(card);
        });
    }

    /**
     * Initialize how it works section
     */
    initHowItWorksSection() {
        const howItWorksSection = document.querySelector('.how-it-works-section');
        if (!howItWorksSection) return;
        
        // Setup intersection observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    
                    // If this is the steps container, animate the steps sequentially
                    if (entry.target.classList.contains('steps-container')) {
                        const steps = entry.target.querySelectorAll('.step');
                        steps.forEach((step, index) => {
                            setTimeout(() => {
                                step.classList.add('animate-in');
                            }, 200 * index);
                        });
                    }
                    
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        
        // Observe section header and steps container
        const sectionHeader = howItWorksSection.querySelector('.section-header');
        const stepsContainer = howItWorksSection.querySelector('.steps-container');
        
        if (sectionHeader) {
            sectionHeader.classList.add('animate-on-scroll');
            observer.observe(sectionHeader);
        }
        
        if (stepsContainer) {
            stepsContainer.classList.add('animate-on-scroll');
            observer.observe(stepsContainer);
            
            // Add animation classes to steps
            const steps = stepsContainer.querySelectorAll('.step');
            steps.forEach(step => {
                step.classList.add('animate-on-scroll');
                step.style.opacity = '0';
                step.style.transform = 'translateY(40px)';
            });
        }
    }

    /**
     * Initialize testimonials section
     */
    initTestimonialsSection() {
        const testimonialsSection = document.querySelector('.testimonials-section');
        if (!testimonialsSection) return;
        
        const testimonials = testimonialsSection.querySelectorAll('.testimonial');
        if (testimonials.length <= 1) return;
        
        let currentIndex = 0;
        let autoRotateInterval;
        
        const showTestimonial = (index) => {
            // Clear any existing auto-rotate interval
            if (autoRotateInterval) {
                clearInterval(autoRotateInterval);
            }
            
            // Update testimonials
            testimonials.forEach((testimonial, i) => {
                testimonial.classList.toggle('active', i === index);
                testimonial.style.opacity = '0';
                testimonial.style.display = i === index ? 'block' : 'none';
                
                if (i === index) {
                    setTimeout(() => {
                        testimonial.style.opacity = '1';
                    }, 50);
                }
            });
            
            // Update navigation dots
            const dots = testimonialsSection.querySelectorAll('.testimonial-dot');
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
            
            // Restart auto-rotation
            autoRotateInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % testimonials.length;
                showTestimonial(currentIndex);
            }, 6000);
        };
        
        // Create navigation dots
        this.createTestimonialNavigation(testimonialsSection, testimonials, showTestimonial);
        
        // Initialize with first testimonial active
        showTestimonial(0);
        
        // Add swipe functionality for mobile
        this.addSwipeSupport(testimonialsSection, testimonials, showTestimonial);
    }
    
    /**
     * Add swipe support for testimonials on mobile
     */
    addSwipeSupport(container, testimonials, showTestimonialFn) {
        let touchStartX = 0;
        let touchEndX = 0;
        let currentIndex = 0;
        
        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
        
        const handleSwipe = () => {
            // Left swipe
            if (touchEndX < touchStartX - 50) {
                currentIndex = (currentIndex + 1) % testimonials.length;
                showTestimonialFn(currentIndex);
            }
            // Right swipe
            if (touchEndX > touchStartX + 50) {
                currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
                showTestimonialFn(currentIndex);
            }
        };
    }
    
    /**
     * Create navigation dots for testimonials
     */
    createTestimonialNavigation(container, testimonials, showTestimonialFn) {
        if (testimonials.length <= 1) return;
        
        const navContainer = document.createElement('div');
        navContainer.className = 'testimonial-nav';
        
        testimonials.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = 'testimonial-dot';
            dot.setAttribute('aria-label', `Testimonial ${index + 1}`);
            
            // Mark the first dot as active initially
            if (index === 0) {
                dot.classList.add('active');
            }
            
            // Add click event to each dot
            dot.addEventListener('click', () => {
                showTestimonialFn(index);
            });
            
            navContainer.appendChild(dot);
        });
        
        container.querySelector('.testimonials-container').appendChild(navContainer);
    }

    /**
     * Setup scroll animations
     */
    setupScrollAnimations() {
        logInfo('Setting up scroll animations...');
        
        // Create intersection observer for scroll animations
        const animateObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animated');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { 
                threshold: 0.15,
                rootMargin: '0px 0px -50px 0px'
            }
        );
        
        // Observe section headers
        const sectionHeaders = document.querySelectorAll('.section-header');
        sectionHeaders.forEach(header => {
            header.classList.add('animate-on-scroll');
            animateObserver.observe(header);
        });
        
        // Observe feature cards with staggered delay
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
            card.style.transitionDelay = `${index * 0.1}s`;
            animateObserver.observe(card);
        });
        
        // Observe steps with staggered delay
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            step.style.transitionDelay = `${index * 0.15}s`;
            animateObserver.observe(step);
        });
        
        // Add smooth scrolling for anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');
        anchorLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // Add parallax effect to hero section
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            window.addEventListener('scroll', () => {
                const scrollPosition = window.scrollY;
                if (scrollPosition < 600) {
                    const heroImage = document.querySelector('.hero-image');
                    if (heroImage) {
                        heroImage.style.transform = `translateY(${scrollPosition * 0.1}px)`;
                    }
                    
                    const heroText = document.querySelector('.hero-text');
                    if (heroText) {
                        heroText.style.transform = `translateY(${scrollPosition * 0.05}px)`;
                    }
                }
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Apply ripple effect to all buttons
        const allButtons = document.querySelectorAll('.btn');
        allButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Create ripple effect
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                button.appendChild(ripple);
                
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                
                ripple.style.width = ripple.style.height = `${size * 2}px`;
                ripple.style.left = `${e.clientX - rect.left - size}px`;
                ripple.style.top = `${e.clientY - rect.top - size}px`;
                
                setTimeout(() => {
                    if (ripple && ripple.parentNode === button) {
                        button.removeChild(ripple);
                    }
                }, 600);
            });
        });

        // Get started button
        const getStartedBtn = document.querySelector('.hero-buttons .btn-primary');
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'signup.html';
            });
        }
        
        // Learn more button
        const learnMoreBtn = document.querySelector('.hero-buttons .btn-secondary');
        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const featuresSection = document.querySelector('.features-section');
                if (featuresSection) {
                    featuresSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        // CTA buttons
        const ctaButtons = document.querySelectorAll('.cta-section .btn');
        ctaButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const href = button.getAttribute('href');
                if (href) {
                    window.location.href = href;
                }
            });
        });
        
        // Feature links
        const featureLinks = document.querySelectorAll('.feature-link');
        featureLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Add a ripple effect
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                link.appendChild(ripple);
                
                const rect = link.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`;
                
                setTimeout(() => {
                    if (ripple && ripple.parentNode === link) {
                        link.removeChild(ripple);
                    }
                }, 600);
            });
        });
        
        // Implement smooth scrolling for all anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    /**
     * Show error message when content fails to load
     */
    showError(message) {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <h2>Something went wrong</h2>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Reload Page</button>
                </div>
            `;
        }
    }
}

// Initialize the home page when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.homePageManager = new HomePageManager();
}); 