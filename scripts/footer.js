// footer.js - Handle loading the footer component

/**
 * Footer Component Loader
 * Responsible for loading the footer component
 */
class FooterLoader {
    constructor() {
        this.footerContainer = document.getElementById('footer-container');
        this.init();
    }

    /**
     * Initialize footer loading
     */
    async init() {
        console.log('👣 Initializing footer component...');
        if (!this.footerContainer) {
            console.error('Footer container not found. Make sure there is an element with id="footer-container"');
            return;
        }

        try {
            await this.loadFooter();
        } catch (error) {
            console.error('Failed to initialize footer:', error);
            this.createMinimalFooter();
        }
    }

    /**
     * Load the footer component
     */
    async loadFooter() {
        try {
            console.log('Loading footer component...');
            const response = await fetch('components/footer.html');
            
            if (!response.ok) {
                throw new Error(`Failed to load footer: ${response.status} ${response.statusText}`);
            }
            
            const footerHtml = await response.text();
            this.footerContainer.innerHTML = footerHtml;
            
            console.log('✅ Footer component loaded successfully');
            
            // Initialize any footer functionality
            this.setupFooterFunctionality();
        } catch (error) {
            console.error('Error loading footer component:', error);
            throw error; // Re-throw to be caught by init
        }
    }

    /**
     * Setup any footer functionality after loading
     */
    setupFooterFunctionality() {
        // Update current year
        const currentYearElements = document.querySelectorAll('[data-current-year]');
        const currentYear = new Date().getFullYear();
        
        currentYearElements.forEach(element => {
            element.textContent = currentYear;
        });
        
        // Apply internationalization if available
        if (window.i18n) {
            window.i18n.updateContent();
        }
    }

    /**
     * Create a minimal footer as fallback
     */
    createMinimalFooter() {
        this.footerContainer.innerHTML = `
            <footer class="minimal-footer">
                <div class="container">
                    <p>&copy; ${new Date().getFullYear()} Nutrition Tracker. All rights reserved.</p>
                    <div class="minimal-footer-links">
                        <a href="index.html">Home</a>
                        <a href="terms.html">Terms</a>
                        <a href="privacy.html">Privacy</a>
                        <a href="contact.html">Contact</a>
                    </div>
                </div>
            </footer>
        `;
    }
}

// Initialize the footer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.footerLoader = new FooterLoader();
});

/**
 * Initialize any functionality specific to the footer
 */
function initializeFooterFunctions() {
    // Handle language selector if present
    const languageSelector = document.getElementById('footer-language-selector');
    if (languageSelector) {
        languageSelector.addEventListener('change', function() {
            const selectedLanguage = this.value;
            
            // If i18n system is available
            if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
                window.i18n.changeLanguage(selectedLanguage);
            } else {
                // Store selection in localStorage as fallback
                localStorage.setItem('preferredLanguage', selectedLanguage);
                
                // Reload page if necessary
                window.location.reload();
            }
        });
    }
    
    // Handle newsletter subscription form if present
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const emailInput = this.querySelector('input[type="email"]');
            if (!emailInput || !emailInput.value) return;
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                const originalText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.textContent = 'Subscribing...';
                
                // Simulate API call
                setTimeout(() => {
                    submitButton.textContent = 'Subscribed!';
                    emailInput.value = '';
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = originalText;
                    }, 2000);
                }, 1500);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const footerContainer = document.getElementById('footer-container');
    
    if (footerContainer) {
        footerContainer.innerHTML = `
            <div class="container">
                <div class="footer-top">
                    <div class="footer-logo-section">
                        <img src="images/logo.png" alt="Nutrition Tracker" onerror="this.src='images/logo-placeholder.png';">
                        <div class="footer-description">
                            <p>Nutrition Tracker</p>
                            <p class="footer-text">Your personal nutrition companion. Track meals, analyze nutrients, and reach your health goals.</p>
                        </div>
                        <div class="footer-social">
                            <a href="#" class="social-link"><i class="fab fa-facebook-f"></i></a>
                            <a href="#" class="social-link"><i class="fab fa-twitter"></i></a>
                            <a href="#" class="social-link"><i class="fab fa-instagram"></i></a>
                            <a href="#" class="social-link"><i class="fab fa-linkedin-in"></i></a>
                        </div>
                    </div>
                    
                    <div class="footer-links-grid">
                        <!-- Features Column -->
                        <div class="footer-links-column">
                            <h3>Features</h3>
                            <ul class="footer-links">
                                <li><a href="dashboard.html">Dashboard</a></li>
                                <li><a href="food-log.html">Food Log</a></li>
                                <li><a href="meal-planner.html">Meal Planner</a></li>
                                <li><a href="recipes.html">Recipes</a></li>
                                <li><a href="reports.html">Reports</a></li>
                            </ul>
                        </div>
                        
                        <!-- Resources Column -->
                        <div class="footer-links-column">
                            <h3>Resources</h3>
                            <ul class="footer-links">
                                <li><a href="blog.html">Blog</a></li>
                                <li><a href="guides.html">Guides</a></li>
                                <li><a href="faq.html">FAQ</a></li>
                                <li><a href="support.html">Support</a></li>
                                <li><a href="api.html">API</a></li>
                            </ul>
                        </div>
                        
                        <!-- Company Column -->
                        <div class="footer-links-column">
                            <h3>Company</h3>
                            <ul class="footer-links">
                                <li><a href="about-us.html">About Us</a></li>
                                <li><a href="careers.html">Careers</a></li>
                                <li><a href="press.html">Press</a></li>
                                <li><a href="contact.html">Contact</a></li>
                                <li><a href="partners.html">Partners</a></li>
                            </ul>
                        </div>
                        
                        <!-- Legal Column -->
                        <div class="footer-links-column">
                            <h3>Legal</h3>
                            <ul class="footer-links">
                                <li><a href="terms-of-service.html">Terms of Service</a></li>
                                <li><a href="privacy-policy.html">Privacy Policy</a></li>
                                <li><a href="cookie-policy.html">Cookie Policy</a></li>
                                <li><a href="disclaimer.html">Disclaimer</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- Footer Bottom -->
                <div class="footer-bottom">
                    <p class="footer-copyright">© ${new Date().getFullYear()} Nutrition Tracker. All rights reserved.</p>
                    <div class="app-stores">
                        <a href="#"><img src="images/app-store.png" alt="App Store" class="app-store-badge" onerror="this.src='https://via.placeholder.com/120x40'"></a>
                        <a href="#"><img src="images/google-play.png" alt="Google Play" class="app-store-badge" onerror="this.src='https://via.placeholder.com/135x40'"></a>
                    </div>
                </div>
            </div>
        `;
    }
}); 