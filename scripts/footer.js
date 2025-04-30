// footer.js - Handle loading the footer component

/**
 * Ultra Premium Footer Component Loader
 * Responsible for loading the sophisticated footer component
 */
class FooterLoader {
    constructor() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.footerContainer = document.getElementById('footer-container');
        if (!this.footerContainer) {
            this.footerContainer = document.createElement('div');
            this.footerContainer.id = 'footer-container';
            document.body.appendChild(this.footerContainer);
        }

        // Load enhanced footer styles
        const footerStyles = document.createElement('link');
        footerStyles.id = 'footer-ultra-premium-styles';
        footerStyles.rel = 'stylesheet';
        footerStyles.href = 'styles/footer-ultra-premium.css';
        document.head.appendChild(footerStyles);

        // Initialize immediately
        this.init();
        
        // Add animations once styles are loaded
        footerStyles.onload = () => {
            const footer = document.querySelector('.footer');
            if (footer) {
                // Add class to enable animations
                footer.classList.add('animations-ready');
                
                // Add scroll reveal animations
                this.setupScrollReveal();
            }
        };
    }

    /**
     * Initialize footer loading
     */
    async init() {
        console.log('✨ Initializing ultra premium footer component...');
        try {
            await this.loadFooter();
            this.setupFooterFunctionality();
        } catch (error) {
            console.error('Failed to initialize footer:', error);
            this.createMinimalFooter();
        }
    }

    /**
     * Load the footer component
     */
    async loadFooter() {
        this.footerContainer.innerHTML = `
            <!-- Ultra Premium Footer -->
            <footer class="footer">
                <!-- Luxury Decorative Elements -->
                <div class="footer-decoration">
                    <div class="decoration-glow"></div>
                    <div class="decoration-particles"></div>
                    <div class="decoration-gradient-blob"></div>
                    <div class="decoration-luxury-pattern"></div>
                    <div class="decoration-gradient-circles">
                        <div class="gradient-circle circle-1"></div>
                        <div class="gradient-circle circle-2"></div>
                        <div class="gradient-circle circle-3"></div>
                    </div>
                </div>

                <div class="footer-container">
                    <!-- Main Footer Content -->
                    <div class="footer-top">
                        <!-- Brand Info -->
                        <div class="footer-info">
                            <a href="/" class="footer-logo">
                                <div class="logo-container">
                                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="26" cy="26" r="24" fill="#F4EDE4"/>
                                        <path d="M17.5 34.5C17.5 34.5 18 18 26 18C34 18 34.5 34.5 34.5 34.5" stroke="#FF8C42" stroke-width="4" stroke-linecap="round"/>
                                        <circle cx="26" cy="14" r="4.5" fill="#FF8C42"/>
                                        <circle cx="26" cy="26" r="24" stroke="rgba(255, 140, 66, 0.3)" stroke-width="1.5"/>
                                    </svg>
                                    <div class="logo-glow"></div>
                                </div>
                                <span class="footer-logo-text">NutriTrack</span>
                            </a>
                            <p class="footer-description">Your personal companion for maintaining a healthy lifestyle through smart nutrition tracking and personalized insights. Join thousands of users who have transformed their health journey.</p>
                            
                            <div class="footer-badges">
                                <div class="badge">
                                    <i class="fas fa-shield-alt"></i>
                                    <span>SSL Secured</span>
                                </div>
                                <div class="badge">
                                    <i class="fas fa-lock"></i>
                                    <span>Privacy First</span>
                                </div>
                                <div class="badge">
                                    <i class="fas fa-medal"></i>
                                    <span>Top Rated</span>
                                </div>
                            </div>
                            
                            <div class="footer-social">
                                <a href="#" class="social-link" aria-label="Follow us on Facebook">
                                    <i class="fab fa-facebook-f"></i>
                                </a>
                                <a href="#" class="social-link" aria-label="Follow us on Twitter">
                                    <i class="fab fa-twitter"></i>
                                </a>
                                <a href="#" class="social-link" aria-label="Follow us on Instagram">
                                    <i class="fab fa-instagram"></i>
                                </a>
                                <a href="#" class="social-link" aria-label="Follow us on LinkedIn">
                                    <i class="fab fa-linkedin-in"></i>
                                </a>
                                <a href="#" class="social-link" aria-label="Subscribe on YouTube">
                                    <i class="fab fa-youtube"></i>
                                </a>
                            </div>
                        </div>
                        
                        <!-- Quick Links -->
                        <div class="footer-links-column">
                            <h3>Quick Links</h3>
                            <ul class="footer-links">
                                <li><a href="/features"><i class="fas fa-chevron-right"></i>Features</a></li>
                                <li><a href="/meal-plans"><i class="fas fa-chevron-right"></i>Meal Plans</a></li>
                                <li><a href="/recipes"><i class="fas fa-chevron-right"></i>Recipes</a></li>
                                <li><a href="/nutrition-guide"><i class="fas fa-chevron-right"></i>Nutrition Guide</a></li>
                                <li><a href="/blog"><i class="fas fa-chevron-right"></i>Blog</a></li>
                                <li><a href="/pricing"><i class="fas fa-chevron-right"></i>Pricing</a></li>
                            </ul>
                        </div>
                        
                        <!-- Support -->
                        <div class="footer-links-column">
                            <h3>Support</h3>
                            <ul class="footer-links">
                                <li><a href="/help-center"><i class="fas fa-chevron-right"></i>Help Center</a></li>
                                <li><a href="/faq"><i class="fas fa-chevron-right"></i>FAQ</a></li>
                                <li><a href="/contact"><i class="fas fa-chevron-right"></i>Contact Us</a></li>
                                <li><a href="/community"><i class="fas fa-chevron-right"></i>Community</a></li>
                                <li><a href="/feedback"><i class="fas fa-chevron-right"></i>Feedback</a></li>
                                <li><a href="/careers"><i class="fas fa-chevron-right"></i>Careers</a></li>
                            </ul>
                        </div>
                        
                        <!-- Legal -->
                        <div class="footer-links-column">
                            <h3>Legal</h3>
                            <ul class="footer-links">
                                <li><a href="/privacy-policy"><i class="fas fa-chevron-right"></i>Privacy Policy</a></li>
                                <li><a href="/terms"><i class="fas fa-chevron-right"></i>Terms of Service</a></li>
                                <li><a href="/cookie-policy"><i class="fas fa-chevron-right"></i>Cookie Policy</a></li>
                                <li><a href="/security"><i class="fas fa-chevron-right"></i>Security</a></li>
                                <li><a href="/compliance"><i class="fas fa-chevron-right"></i>Compliance</a></li>
                                <li><a href="/accessibility"><i class="fas fa-chevron-right"></i>Accessibility</a></li>
                            </ul>
                        </div>
                    </div>
                
                <!-- Footer Bottom -->
                <div class="footer-bottom">
                    <div class="footer-divider"></div>
                    <div class="footer-bottom-content">
                        <div class="footer-copyright">
                            <p>&copy; ${new Date().getFullYear()} NutriTrack. All rights reserved.</p>
                        </div>
                        <div class="footer-app-downloads">
                            <a href="#" class="app-download-link" aria-label="Download on App Store">
                                <img src="images/app-store-badge.png" alt="Download on App Store" 
                                     onerror="this.src='https://via.placeholder.com/135x45/1A3C34/FFFFFF?text=App+Store'; this.onerror=null;">
                            </a>
                            <a href="#" class="app-download-link" aria-label="Get it on Google Play">
                                <img src="images/google-play-badge.png" alt="Get it on Google Play"
                                     onerror="this.src='https://via.placeholder.com/135x45/1A3C34/FFFFFF?text=Google+Play'; this.onerror=null;">
                            </a>
                        </div>
                    </div>
                    <div class="footer-bottom-extra">
                        <div class="language-selector">
                            <i class="fas fa-globe"></i>
                            <select id="footer-language-selector" aria-label="Select Language">
                                <option value="en">English</option>
                                <option value="es">Español</option>
                                <option value="fr">Français</option>
                                <option value="de">Deutsch</option>
                                <option value="zh">中文</option>
                                <option value="ja">日本語</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Scroll to Top Button -->
                <button class="scroll-to-top" aria-label="Scroll to top">
                    <div class="scroll-icon-container">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                </button>
            </footer>
        `;
    }

    /**
     * Setup footer functionality
     */
    setupFooterFunctionality() {
        this.setupScrollToTop();
        this.setupLanguageSelector();
        this.setupParticleEffects();
    }

    /**
     * Setup scroll to top button functionality
     */
    setupScrollToTop() {
        const scrollButton = document.querySelector('.scroll-to-top');
        if (!scrollButton) return;

        // Show/hide button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
            }
        });

        // Smooth scroll to top when clicked
        scrollButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    /**
     * Setup language selector functionality
     */
    setupLanguageSelector() {
        const languageSelector = document.getElementById('footer-language-selector');
        if (!languageSelector) return;

        // Set initial value from localStorage or default to 'en'
        const savedLanguage = localStorage.getItem('preferred-language');
        if (savedLanguage) {
            languageSelector.value = savedLanguage;
        }

        // Save selection to localStorage
        languageSelector.addEventListener('change', () => {
            localStorage.setItem('preferred-language', languageSelector.value);
            // Here you would typically reload the page or update the UI
            console.log('Language changed to:', languageSelector.value);
        });
    }

    /**
     * Setup scroll reveal animations
     */
    setupScrollReveal() {
        const footerElements = document.querySelectorAll('.footer-info, .footer-links-column, .footer-bottom-content');
        
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        footerElements.forEach(element => {
            observer.observe(element);
        });
    }

    /**
     * Setup particle effects for an ultra premium look
     */
    setupParticleEffects() {
        const particlesContainer = document.querySelector('.decoration-particles');
        if (!particlesContainer) return;
        
        // Create particle elements
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random position and size
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.width = `${Math.random() * 4 + 1}px`;
            particle.style.height = particle.style.width;
            
            // Random animation delay
            particle.style.animationDelay = `${Math.random() * 5}s`;
            particle.style.animationDuration = `${Math.random() * 10 + 10}s`;
            
            particlesContainer.appendChild(particle);
        }
    }

    /**
     * Create a minimal footer in case the main footer fails to load
     */
    createMinimalFooter() {
        this.footerContainer.innerHTML = `
            <footer class="footer footer-minimal">
                <div class="container">
                    <div class="footer-minimal-content">
                        <p>&copy; ${new Date().getFullYear()} NutriTrack. All rights reserved.</p>
                        <nav class="footer-minimal-links">
                            <a href="/privacy-policy">Privacy</a>
                            <a href="/terms">Terms</a>
                            <a href="/contact">Contact</a>
                        </nav>
                    </div>
                </div>
            </footer>
        `;
    }
}

// Initialize the footer loader
new FooterLoader(); 