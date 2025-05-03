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
            this.loadFonts()
        ]);
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
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap';
            
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
                <footer class="premium-footer">
                    <div class="footer-container">
                        <div class="footer-branding">
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
            
            resolve();
        });
    }

    /**
     * Setup all interactive elements
     */
    setupInteractions() {
        this.setupLinks();
        this.setupSocialLinks();
    }

    /**
     * Setup links hover effects
     */
    setupLinks() {
        const links = this.footerContainer.querySelectorAll('a:not(.social-icon)');
        
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
        const socialLinks = this.footerContainer.querySelectorAll('.social-icon');
        
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
     * Setup animations
     */
    setupAnimations() {
        // Add animation classes to all footer elements
        const footerElements = this.footerContainer.querySelectorAll('.footer-column, .footer-logo, .footer-description, .footer-copyright, .footer-social');
        
        footerElements.forEach((element, index) => {
            element.classList.add('animate-on-scroll');
            element.style.animationDelay = `${index * 100}ms`;
        });
    }

    /**
     * Reveal the footer with animation
     */
    revealFooter() {
        const footer = this.footerContainer.querySelector('footer');
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