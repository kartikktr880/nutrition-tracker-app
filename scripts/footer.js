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
            console.warn('Footer container not found, creating one');
            this.footerContainer = document.createElement('footer');
            this.footerContainer.id = 'footer-container';
            document.body.appendChild(this.footerContainer);
        }
        
        // Inject footer HTML with dark theme styling
        this.injectFooterHTML();
        
        // Initialize footer interactions
        this.initFooterInteractions();
    }

    /**
     * Inject the HTML for the footer
     */
    injectFooterHTML() {
        // Create a stunning footer with proper dark theme
        const currentYear = new Date().getFullYear();
        
        this.footerContainer.innerHTML = `
            <footer class="site-footer" style="background: transparent !important; color: #f0f0f0; position: relative; z-index: 10; padding: 4rem 0 2rem; overflow: hidden;">
                <div class="footer-backdrop" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(26, 60, 52, 0.4); backdrop-filter: blur(10px); z-index: -1;"></div>
                
                <div class="container">
                    <!-- Footer Top Section -->
                    <div class="footer-top" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 3rem; margin-bottom: 3rem;">
                        <!-- Brand Column -->
                        <div class="footer-brand">
                            <div class="footer-logo" style="margin-bottom: 1.5rem;">
                                <h2 style="font-size: 2rem; font-weight: 700; color: #fff; margin: 0;">Nutri<span style="color: #FF8C42;">Track</span></h2>
                            </div>
                            <p style="font-size: 1rem; line-height: 1.6; color: rgba(255, 255, 255, 0.9); margin-bottom: 1.5rem;">Transform your nutrition journey with AI-powered insights and personalized recommendations.</p>
                            <div class="app-buttons" style="display: flex; gap: 1rem;">
                                <a href="#" aria-label="Download on the App Store" style="display: inline-block; transition: transform 0.3s ease;">
                                    <img src="https://placehold.co/120x40/1A3C34/FFFFFF?text=App+Store" alt="App Store" style="height: 40px; border-radius: 6px;">
                                </a>
                                <a href="#" aria-label="Get it on Google Play" style="display: inline-block; transition: transform 0.3s ease;">
                                    <img src="https://placehold.co/120x40/1A3C34/FFFFFF?text=Google+Play" alt="Google Play" style="height: 40px; border-radius: 6px;">
                                </a>
                            </div>
                        </div>
                        
                        <!-- Navigation Links Columns -->
                        <div class="footer-links">
                            <h3 style="font-size: 1.2rem; font-weight: 600; color: #fff; margin-bottom: 1.5rem;">Features</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Food Tracking</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Meal Planning</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Nutrition Analysis</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Recipe Database</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Progress Tracking</a></li>
                            </ul>
                        </div>
                        
                        <div class="footer-links">
                            <h3 style="font-size: 1.2rem; font-weight: 600; color: #fff; margin-bottom: 1.5rem;">Resources</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Blog</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Nutrition Guides</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Workout Plans</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Community Forum</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Support Center</a></li>
                            </ul>
                        </div>
                        
                        <div class="footer-links">
                            <h3 style="font-size: 1.2rem; font-weight: 600; color: #fff; margin-bottom: 1.5rem;">Company</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">About Us</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Careers</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Press</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Privacy Policy</a></li>
                                <li style="margin-bottom: 0.75rem;"><a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Footer Divider -->
                    <div class="footer-divider" style="height: 1px; background: linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.2), rgba(255,255,255,0.1)); margin: 1rem 0 2rem;"></div>
                    
                    <!-- Footer Bottom -->
                    <div class="footer-bottom" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; color: rgba(255, 255, 255, 0.7);">
                        <div class="footer-copyright" style="margin-bottom: 1rem;">
                            <p style="font-size: 0.9rem; margin: 0;">&copy; ${currentYear} NutriTrack. All rights reserved.</p>
                        </div>
                        
                        <div class="footer-social" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                            <a href="#" aria-label="Facebook" style="color: rgba(255, 255, 255, 0.9); font-size: 1.2rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255, 255, 255, 0.1); transition: all 0.3s ease;">
                                <i class="fab fa-facebook-f"></i>
                            </a>
                            <a href="#" aria-label="Twitter" style="color: rgba(255, 255, 255, 0.9); font-size: 1.2rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255, 255, 255, 0.1); transition: all 0.3s ease;">
                                <i class="fab fa-twitter"></i>
                            </a>
                            <a href="#" aria-label="Instagram" style="color: rgba(255, 255, 255, 0.9); font-size: 1.2rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255, 255, 255, 0.1); transition: all 0.3s ease;">
                                <i class="fab fa-instagram"></i>
                            </a>
                            <a href="#" aria-label="LinkedIn" style="color: rgba(255, 255, 255, 0.9); font-size: 1.2rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255, 255, 255, 0.1); transition: all 0.3s ease;">
                                <i class="fab fa-linkedin-in"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    /**
     * Initialize footer interactions and effects
     */
    initFooterInteractions() {
        // Add hover effects to footer links
        const footerLinks = this.footerContainer.querySelectorAll('.footer-links a');
        footerLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.style.color = '#FF8C42';
                link.style.paddingLeft = '5px';
            });
            
            link.addEventListener('mouseleave', () => {
                link.style.color = 'rgba(255, 255, 255, 0.9)';
                link.style.paddingLeft = '0';
            });
        });
        
        // Add hover effects to social links
        const socialLinks = this.footerContainer.querySelectorAll('.footer-social a');
        socialLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.style.backgroundColor = 'rgba(255, 140, 66, 0.2)';
                link.style.transform = 'translateY(-3px)';
            });
            
            link.addEventListener('mouseleave', () => {
                link.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                link.style.transform = 'translateY(0)';
            });
        });
        
        // Add hover effects to app buttons
        const appButtons = this.footerContainer.querySelectorAll('.app-buttons a');
        appButtons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-3px)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
            });
        });
    }
}

// Initialize the footer
const footer = new UltraPremiumFooter(); 