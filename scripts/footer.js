/**
 * NutriTrack Ultra-Premium Footer
 * A sophisticated, high-end footer implementation with luxury animations and effects
 * - Modified for dark theme gradient background
 */
class UltraPremiumFooter {
    constructor() {
        this.isInitialized = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize the footer experience
     */
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        console.log('✧ Initializing Ultra-Premium Footer Experience (Dark Theme)');
        
        // Create footer container if it doesn't exist
        this.footerContainer = document.getElementById('footer-container');
        if (!this.footerContainer) {
            this.footerContainer = document.createElement('div');
            this.footerContainer.id = 'footer-container';
            document.body.appendChild(this.footerContainer);
        }

        // Initialize the footer with proper sequence
        this.initializeResources()
            .then(() => this.renderFooter())
            .then(() => {
                this.setupInteractions();
                this.setupAnimations();
                this.revealFooter();
            })
            .catch(error => {
                console.error('Failed to initialize premium footer:', error);
                this.renderFallbackFooter();
            });
    }
    
    /**
     * Initialize required resources (styles, fonts)
     */
    initializeResources() {
        return Promise.all([
            this.loadStyles(),
            this.loadFonts()
        ]);
    }
    
    /**
     * Load the premium footer styles
     */
    loadStyles() {
        return new Promise(resolve => {
            const styleId = 'ultra-premium-footer-styles';
            
            // Remove existing styles if any
            const existingStyles = document.getElementById(styleId);
            if (existingStyles) existingStyles.remove();
            
            // Add preconnect for performance
            const preconnect = document.createElement('link');
            preconnect.rel = 'preconnect';
            preconnect.href = 'https://fonts.googleapis.com';
            document.head.appendChild(preconnect);
            
            // Add the stylesheet
            const styles = document.createElement('link');
            styles.id = styleId;
            styles.rel = 'stylesheet';
            styles.href = 'styles/footer-elite-luxury.css';
            
            styles.onload = () => resolve();
            styles.onerror = () => {
                console.error('Failed to load footer styles');
                resolve(); // Resolve anyway to continue with fallback
            };
            
            document.head.appendChild(styles);
        });
    }
    
    /**
     * Load required premium fonts
     */
    loadFonts() {
        return new Promise(resolve => {
            if (document.getElementById('premium-fonts')) {
                resolve();
                return;
            }
            
            const fontLink = document.createElement('link');
            fontLink.id = 'premium-fonts';
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&family=Playfair+Display:wght@400;500;600;700&display=swap';
            
            fontLink.onload = () => resolve();
            fontLink.onerror = () => {
                console.warn('Premium fonts failed to load, using system fonts');
                resolve();
            };
            
            document.head.appendChild(fontLink);
        });
    }
    
    /**
     * Render the premium footer HTML
     */
    renderFooter() {
        return new Promise(resolve => {
            const currentYear = new Date().getFullYear();
            
            this.footerContainer.innerHTML = `
                <footer>
                    <div class="footer-container">
                        <div class="footer-logo">
                            <a href="index.html">
                                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="20" cy="20" r="18" fill="#1A3C34"/>
                                    <path d="M14.5 26.5C14.5 26.5 15 15 20 15C25 15 25.5 26.5 25.5 26.5" stroke="#FF8C42" stroke-width="3" stroke-linecap="round"/>
                                    <circle cx="20" cy="12" r="3" fill="#FF8C42"/>
                                </svg>
                                <span>NutriTrack</span>
                            </a>
                        </div>
                        
                        <div class="footer-description">
                            A better way to track your nutrition and take control of your health with AI-powered insights and personalized recommendations.
                        </div>
                        
                        <div class="footer-links">
                            <div class="footer-column">
                                <h3>Features</h3>
                                <ul>
                                    <li><a href="meal-planning.html">Meal Planning</a></li>
                                    <li><a href="nutrition-analytics.html">Nutrition Analytics</a></li>
                                    <li><a href="recipe-finder.html">Recipe Finder</a></li>
                                    <li><a href="progress-tracking.html">Progress Tracking</a></li>
                                </ul>
                            </div>
                            
                            <div class="footer-column">
                                <h3>Company</h3>
                                <ul>
                                    <li><a href="about.html">About Us</a></li>
                                    <li><a href="careers.html">Careers</a></li>
                                    <li><a href="press.html">Press</a></li>
                                    <li><a href="contact.html">Contact Us</a></li>
                                </ul>
                            </div>
                            
                            <div class="footer-column">
                                <h3>Resources</h3>
                                <ul>
                                    <li><a href="blog.html">Blog</a></li>
                                    <li><a href="guides.html">Guides</a></li>
                                    <li><a href="calculators.html">Calculators</a></li>
                                    <li><a href="faq.html">FAQ</a></li>
                                </ul>
                            </div>
                            
                            <div class="footer-column">
                                <h3>Legal</h3>
                                <ul>
                                    <li><a href="privacy.html">Privacy Policy</a></li>
                                    <li><a href="terms.html">Terms of Service</a></li>
                                    <li><a href="cookies.html">Cookie Policy</a></li>
                                    <li><a href="gdpr.html">GDPR</a></li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="footer-bottom">
                            <div class="footer-copyright">
                                © ${currentYear} NutriTrack. All rights reserved.
                            </div>
                            
                            <div class="footer-social">
                                <a href="#" class="social-icon" aria-label="Facebook">
                                    <i class="fab fa-facebook-f"></i>
                                </a>
                                <a href="#" class="social-icon" aria-label="Twitter">
                                    <i class="fab fa-twitter"></i>
                                </a>
                                <a href="#" class="social-icon" aria-label="Instagram">
                                    <i class="fab fa-instagram"></i>
                                </a>
                                <a href="#" class="social-icon" aria-label="LinkedIn">
                                    <i class="fab fa-linkedin-in"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </footer>
            `;
            
            // Apply dark theme styling 
            const footer = this.footerContainer.querySelector('footer');
            if (footer) {
                footer.style.backgroundColor = 'transparent';
                footer.style.color = '#f0f0f0';
                footer.style.position = 'relative';
                footer.style.zIndex = '5';
                footer.style.borderTop = '1px solid rgba(255, 255, 255, 0.05)';
                footer.style.paddingTop = '60px';
                footer.style.paddingBottom = '30px';
                footer.style.marginTop = '0';
                footer.style.width = '100%';
                footer.style.display = 'block';
                footer.style.visibility = 'visible';
                footer.style.opacity = '1';
            }
            
            // Force the footer container to be visible and positioned correctly
            this.footerContainer.style.display = 'block';
            this.footerContainer.style.width = '100%';
            this.footerContainer.style.visibility = 'visible';
            this.footerContainer.style.position = 'relative';
            this.footerContainer.style.zIndex = '5';
            this.footerContainer.style.marginTop = '0';
            this.footerContainer.style.opacity = '1';
            
            // Apply consistent styling to footer logo
            const footerLogo = this.footerContainer.querySelector('.footer-logo a');
            if (footerLogo) {
                footerLogo.style.display = 'flex';
                footerLogo.style.alignItems = 'center';
                footerLogo.style.gap = '10px';
                footerLogo.style.textDecoration = 'none';
                footerLogo.style.position = 'relative';
                footerLogo.style.zIndex = '10';
                
                const logoText = footerLogo.querySelector('span');
                if (logoText) {
                    logoText.style.fontFamily = "'Poppins', sans-serif";
                    logoText.style.fontWeight = '700';
                    logoText.style.fontSize = '20px';
                    logoText.style.letterSpacing = '0.5px';
                    logoText.style.display = 'inline-block';
                    logoText.style.whiteSpace = 'nowrap';
                    logoText.style.overflow = 'visible';
                    logoText.style.color = '#F4EDE4';
                }
                
                const logoSvg = footerLogo.querySelector('svg');
                if (logoSvg) {
                    logoSvg.style.flexShrink = '0';
                    logoSvg.style.display = 'block';
                    logoSvg.style.width = '40px';
                    logoSvg.style.height = '40px';
                    logoSvg.style.minWidth = '40px';
                    logoSvg.style.maxWidth = '40px';
                    logoSvg.style.minHeight = '40px';
                    logoSvg.style.maxHeight = '40px';
                    logoSvg.style.position = 'relative';
                    logoSvg.style.zIndex = '5';
                    
                    // Ensure SVG colors match the header logo
                    const circles = logoSvg.querySelectorAll('circle');
                    if (circles.length > 0) {
                        circles[0].setAttribute('fill', '#1A3C34'); // Main circle
                        if (circles.length > 1) {
                            circles[1].setAttribute('fill', '#FF8C42'); // Accent circle
                        }
                    }
                }
            }
            
            // Style footer container for dark theme
            const footerContainer = this.footerContainer.querySelector('.footer-container');
            if (footerContainer) {
                footerContainer.style.maxWidth = '1200px';
                footerContainer.style.margin = '0 auto';
                footerContainer.style.padding = '0 20px';
                footerContainer.style.position = 'relative';
                footerContainer.style.zIndex = '2';
            }
            
            // Style footer description
            const footerDescription = this.footerContainer.querySelector('.footer-description');
            if (footerDescription) {
                footerDescription.style.color = 'rgba(244, 237, 228, 0.8)';
                footerDescription.style.marginTop = '20px';
                footerDescription.style.marginBottom = '40px';
                footerDescription.style.maxWidth = '450px';
                footerDescription.style.lineHeight = '1.6';
            }
            
            // Style footer links
            const footerLinks = this.footerContainer.querySelectorAll('.footer-links a');
            footerLinks.forEach(link => {
                link.style.color = 'rgba(244, 237, 228, 0.8)';
                link.style.textDecoration = 'none';
                link.style.transition = 'color 0.3s ease';
            });
            
            // Style footer column headings
            const footerHeadings = this.footerContainer.querySelectorAll('.footer-column h3');
            footerHeadings.forEach(heading => {
                heading.style.color = '#F4EDE4';
                heading.style.fontSize = '18px';
                heading.style.fontWeight = '600';
                heading.style.marginBottom = '15px';
            });

            // Style footer bottom
            const footerBottom = this.footerContainer.querySelector('.footer-bottom');
            if (footerBottom) {
                footerBottom.style.borderTop = '1px solid rgba(255, 255, 255, 0.05)';
                footerBottom.style.paddingTop = '20px';
                footerBottom.style.marginTop = '40px';
                footerBottom.style.display = 'flex';
                footerBottom.style.justifyContent = 'space-between';
                footerBottom.style.alignItems = 'center';
                footerBottom.style.flexWrap = 'wrap';
                footerBottom.style.gap = '20px';
            }
            
            // Style copyright
            const footerCopyright = this.footerContainer.querySelector('.footer-copyright');
            if (footerCopyright) {
                footerCopyright.style.color = 'rgba(244, 237, 228, 0.6)';
                footerCopyright.style.fontSize = '14px';
            }
            
            // Style social icons
            const socialIcons = this.footerContainer.querySelectorAll('.social-icon');
            socialIcons.forEach(icon => {
                icon.style.width = '36px';
                icon.style.height = '36px';
                icon.style.borderRadius = '50%';
                icon.style.background = 'rgba(255, 255, 255, 0.1)';
                icon.style.display = 'flex';
                icon.style.alignItems = 'center';
                icon.style.justifyContent = 'center';
                icon.style.color = '#F4EDE4';
                icon.style.transition = 'all 0.3s ease';
            });
            
            // Set background gradient overlay
            const footerElement = this.footerContainer.querySelector('footer');
            if (footerElement) {
                // Create a pseudo-element for the background gradient
                const style = document.createElement('style');
                style.textContent = `
                    #footer-container footer::before {
                        content: "";
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: radial-gradient(circle at bottom, rgba(15, 35, 31, 0.7), rgba(10, 25, 22, 0.9));
                        z-index: -1;
                        pointer-events: none;
                    }
                `;
                document.head.appendChild(style);
            }
            
            resolve();
        });
    }

    /**
     * Setup all interactive elements
     */
    setupInteractions() {
        this.setupScrollToTop();
        this.setupLanguageSelector();
        this.setupTrustBadges();
        this.setupLinks();
        this.setupSocialLinks();
        this.createParticles();
    }

    /**
     * Setup scroll to top button
     */
    setupScrollToTop() {
        const scrollButton = document.querySelector('.scroll-top-button');
        if (!scrollButton) return;

        // Show/hide based on scroll position
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
            }
        });

        // Smooth scroll to top
        scrollButton.addEventListener('click', () => {
            scrollButton.classList.add('pressed');
            
            setTimeout(() => {
                scrollButton.classList.remove('pressed');
            }, 300);
            
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    /**
     * Setup language selector
     */
    setupLanguageSelector() {
        const selector = document.getElementById('language-select');
        if (!selector) return;
        
        // Set initial value
        const savedLanguage = localStorage.getItem('preferred-language');
        if (savedLanguage) {
            selector.value = savedLanguage;
        }
        
        // Handle changes
        selector.addEventListener('change', () => {
            localStorage.setItem('preferred-language', selector.value);
            
            // Add ripple effect to selector
            const container = selector.closest('.language-selector');
            if (container) {
                this.addRippleEffect(container);
            }
        });
    }
    
    /**
     * Setup trust badges
     */
    setupTrustBadges() {
        const badges = document.querySelectorAll('.trust-badge');
        
        badges.forEach(badge => {
            badge.addEventListener('mouseenter', () => {
                badge.classList.add('hover');
            });
            
            badge.addEventListener('mouseleave', () => {
                badge.classList.remove('hover');
            });
        });
    }
    
    /**
     * Setup links hover effects
     */
    setupLinks() {
        const links = document.querySelectorAll('.footer-link');
        
        links.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.classList.add('hover');
            });
            
            link.addEventListener('mouseleave', () => {
                link.classList.remove('hover');
            });
        });
    }
    
    /**
     * Setup social links hover effects
     */
    setupSocialLinks() {
        const socialLinks = document.querySelectorAll('.social-link');
        
        socialLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.classList.add('hover');
            });
            
            link.addEventListener('mouseleave', () => {
                link.classList.remove('hover');
            });
        });
    }

    /**
     * Create particle effects
     */
    createParticles() {
        const container = document.getElementById('footer-particles');
        if (!container) return;
        
        const particleCount = 40;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('span');
            particle.className = 'particle';
            
            // Random sizing and positioning
            const size = Math.random() * 3 + 1;
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const duration = 15 + Math.random() * 45;
            const delay = Math.random() * 5;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.top = `${top}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            container.appendChild(particle);
        }
    }
    
    /**
     * Add ripple effect to elements
     */
    addRippleEffect(element) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 800);
    }
    
    /**
     * Setup animations
     */
    setupAnimations() {
        // Setup intersection observer for animation elements
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Get animation delay if specified
                    const delay = entry.target.dataset.delay || 0;
                    
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, delay);
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            threshold: 0.1
        });
        
        // Observe all animation elements
        document.querySelectorAll('.animate-element').forEach(element => {
            observer.observe(element);
        });
    }

    /**
     * Reveal the footer with animation
     */
    revealFooter() {
        const footer = document.querySelector('.ultra-premium-footer');
        if (footer) {
            setTimeout(() => {
                footer.classList.add('initialized');
            }, 100);
        }
    }
    
    /**
     * Render a simplified fallback footer if main one fails
     */
    renderFallbackFooter() {
        const currentYear = new Date().getFullYear();
        
        this.footerContainer.innerHTML = `
            <footer class="fallback-footer">
                <div class="fallback-container">
                    <div class="fallback-content">
                        <p>&copy; ${currentYear} NutriTrack. All rights reserved.</p>
                        <nav class="fallback-links">
                            <a href="/terms">Terms</a>
                            <a href="/privacy">Privacy</a>
                            <a href="/contact">Contact</a>
                        </nav>
                </div>
            </div>
            </footer>
        `;
    }
}

// Initialize footer
const footer = new UltraPremiumFooter(); 