/**
 * Footer Improver
 * Fixes issues with footer visibility and ensures proper rendering
 */

(function() {
    // Configuration
    const config = {
        footerContainerId: 'footer-container',
        footerComponentPath: 'components/footer.html',
        footerClass: 'footer',
        debug: false
    };
    
    // Track if footer is loaded
    let footerLoaded = false;
    
    /**
     * Ensure footer is properly visible
     */
    function ensureFooterVisibility() {
        const footerContainer = document.getElementById(config.footerContainerId);
        if (!footerContainer) {
            if (config.debug) console.log('Footer container not found');
            return;
        }
        
        // Make sure footer is visible
        footerContainer.style.display = 'block';
        footerContainer.style.visibility = 'visible';
        footerContainer.style.opacity = '1';
        
        // Check for footer element inside container
        const footer = footerContainer.querySelector('.' + config.footerClass) || 
                       footerContainer.querySelector('footer');
        
        if (footer) {
            // Footer exists, ensure it's properly styled
            footer.style.display = 'block';
            footer.style.visibility = 'visible';
            footer.style.opacity = '1';
            footer.style.width = '100%';
            footer.style.maxWidth = '100%';
            footer.style.overflowX = 'hidden';
            footerLoaded = true;
        } else if (!footerLoaded) {
            // Footer doesn't exist yet, try to load it
            loadFooter(footerContainer);
        }
    }
    
    /**
     * Load footer content if it's not present
     */
    function loadFooter(container) {
        // Create a fallback footer if needed
        const createFallbackFooter = () => {
            const fallbackFooter = document.createElement('footer');
            fallbackFooter.className = config.footerClass;
            fallbackFooter.innerHTML = `
                <div class="container">
                    <div class="footer-content">
                        <div class="footer-logo">
                            <img src="images/logo.svg" alt="NutriTrack Logo" onerror="this.src='https://placehold.co/120x40/1A3C34/FFFFFF?text=NutriTrack'">
                        </div>
                        <div class="footer-links">
                            <div class="footer-links-column">
                                <h4>Features</h4>
                                <ul>
                                    <li><a href="#">Food Logger</a></li>
                                    <li><a href="#">Nutrition Analysis</a></li>
                                    <li><a href="#">Meal Planner</a></li>
                                    <li><a href="#">Recipe Database</a></li>
                                </ul>
                            </div>
                            <div class="footer-links-column">
                                <h4>Company</h4>
                                <ul>
                                    <li><a href="#">About</a></li>
                                    <li><a href="#">Blog</a></li>
                                    <li><a href="#">Careers</a></li>
                                    <li><a href="#">Press</a></li>
                                </ul>
                            </div>
                            <div class="footer-links-column">
                                <h4>Resources</h4>
                                <ul>
                                    <li><a href="#">Help</a></li>
                                    <li><a href="#">Support</a></li>
                                    <li><a href="#">Contact</a></li>
                                    <li><a href="#">FAQ</a></li>
                                </ul>
                            </div>
                            <div class="footer-links-column">
                                <h4>Legal</h4>
                                <ul>
                                    <li><a href="#">Terms</a></li>
                                    <li><a href="#">Privacy</a></li>
                                    <li><a href="#">Cookies</a></li>
                                    <li><a href="#">Licenses</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="footer-bottom">
                        <p>© ${new Date().getFullYear()} NutriTrack. All rights reserved.</p>
                        <div class="footer-social">
                            <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                            <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                            <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                            <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(fallbackFooter);
            applyFooterStyles(fallbackFooter);
            
            if (config.debug) console.log('Created fallback footer');
            footerLoaded = true;
        };
        
        // Try to load from component
        if (config.footerComponentPath) {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        container.innerHTML = xhr.responseText;
                        
                        // Apply styles to the loaded footer
                        const loadedFooter = container.querySelector('.' + config.footerClass) || 
                                             container.querySelector('footer');
                        
                        if (loadedFooter) {
                            applyFooterStyles(loadedFooter);
                            if (config.debug) console.log('Loaded footer from component');
                            footerLoaded = true;
                        } else {
                            createFallbackFooter();
                        }
                    } else {
                        createFallbackFooter();
                    }
                }
            };
            
            try {
                xhr.open('GET', config.footerComponentPath, true);
                xhr.send();
            } catch (error) {
                if (config.debug) console.error('Error loading footer:', error);
                createFallbackFooter();
            }
        } else {
            createFallbackFooter();
        }
    }
    
    /**
     * Apply consistent styles to the footer
     */
    function applyFooterStyles(footer) {
        // Basic footer styles
        const footerStyles = `
            .footer {
                width: 100%;
                background-color: #1A3C34;
                color: rgba(255, 255, 255, 0.9);
                padding: 60px 0 30px;
                margin-top: 0;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .footer-content {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                margin-bottom: 40px;
            }
            
            .footer-logo {
                flex: 0 0 200px;
                margin-bottom: 20px;
            }
            
            .footer-logo img {
                max-width: 150px;
                height: auto;
            }
            
            .footer-links {
                display: flex;
                flex-wrap: wrap;
                flex: 1;
                justify-content: space-around;
            }
            
            .footer-links-column {
                flex: 0 0 auto;
                margin-bottom: 20px;
                min-width: 150px;
            }
            
            .footer-links-column h4 {
                color: white;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 15px;
            }
            
            .footer-links-column ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .footer-links-column ul li {
                margin-bottom: 10px;
            }
            
            .footer-links-column ul li a {
                color: rgba(255, 255, 255, 0.8);
                text-decoration: none;
                transition: color 0.2s;
                font-size: 14px;
            }
            
            .footer-links-column ul li a:hover {
                color: #FF8C42;
            }
            
            .footer-bottom {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                flex-wrap: wrap;
            }
            
            .footer-bottom p {
                margin: 0;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .footer-social {
                display: flex;
                gap: 15px;
            }
            
            .footer-social a {
                color: rgba(255, 255, 255, 0.7);
                font-size: 16px;
                transition: color 0.2s;
            }
            
            .footer-social a:hover {
                color: #FF8C42;
            }
            
            @media (max-width: 768px) {
                .footer-content {
                    flex-direction: column;
                }
                
                .footer-links {
                    flex-direction: column;
                }
                
                .footer-bottom {
                    flex-direction: column;
                    gap: 15px;
                    text-align: center;
                }
            }
        `;
        
        // Create and inject the style
        const styleElement = document.createElement('style');
        styleElement.textContent = footerStyles;
        document.head.appendChild(styleElement);
        
        // Apply inline styles for critical fixes
        footer.style.display = 'block';
        footer.style.visibility = 'visible';
        footer.style.opacity = '1';
        footer.style.width = '100%';
        footer.style.maxWidth = '100%';
    }
    
    /**
     * Initialize the footer improver
     */
    function init() {
        // Check for footer immediately
        ensureFooterVisibility();
        
        // Also check after DOM loaded and window load events
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ensureFooterVisibility);
        }
        
        window.addEventListener('load', ensureFooterVisibility);
        
        // One final check after a brief delay
        setTimeout(ensureFooterVisibility, 1000);
        
        if (config.debug) console.log('Footer improver initialized');
    }
    
    // Start the improvement process
    init();
})(); 