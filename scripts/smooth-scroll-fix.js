/**
 * Smooth Scroll Fix
 * This script improves the smoothness of scrolling and ensures the page scrolls properly
 */

(function() {
    // Configuration
    const config = {
        scrollMultiplier: 1.0, // Adjust scroll speed (1.0 = normal)
        enableSmoothScroll: true, // Enable built-in smooth scrolling
        fixScrollJank: true, // Fix common causes of scroll jank
        fixScrollLag: true, // Fix scroll lag issues
        throttleScrollEvents: true, // Throttle scroll events for better performance
        detectBrowser: true // Apply browser-specific fixes
    };
    
    // State variables
    let isScrolling = false;
    let scrollTimeout;
    let lastScrollPosition = 0;
    let scrollDirection = null; // 'up' or 'down'
    let ticking = false;
    let browserInfo = {};
    
    /**
     * Apply smooth scroll to document
     */
    function applySmoothScroll() {
        // Create and append style element
        const styleEl = document.createElement('style');
        styleEl.id = 'smooth-scroll-styles';
        styleEl.innerHTML = `
            html {
                scroll-behavior: smooth !important;
                -webkit-overflow-scrolling: touch !important;
                height: 100% !important;
                overflow-y: auto !important;
            }
            
            body {
                overflow-x: hidden !important;
                -webkit-overflow-scrolling: touch !important;
                height: 100% !important;
                position: relative !important;
            }
            
            /* Enhanced smooth scrolling */
            @media (prefers-reduced-motion: no-preference) {
                html {
                    scroll-behavior: smooth !important;
                }
            }
            
            /* Force smooth scroll even for browsers that don't support it well */
            .js-smooth-scroll {
                transition: scroll-behavior 0.5s ease !important;
            }
        `;
        document.head.appendChild(styleEl);
        
        // Add html class
        document.documentElement.classList.add('js-smooth-scroll');
    }
    
    /**
     * Fix scroll jank issues by disabling expensive animations during scrolling
     */
    function fixScrollJank() {
        // Add class to document when scrolling
        window.addEventListener('scroll', function() {
            if (!isScrolling) {
                document.documentElement.classList.add('is-scrolling');
                isScrolling = true;
            }
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                document.documentElement.classList.remove('is-scrolling');
                isScrolling = false;
            }, 100); // Wait 100ms after scrolling stops
        }, { passive: true });
        
        // Add styles to optimize scrolling
        const styleEl = document.createElement('style');
        styleEl.id = 'scroll-jank-fix-styles';
        styleEl.innerHTML = `
            /* Disable expensive animations during scroll */
            .is-scrolling .animated,
            .is-scrolling [class*="animate__"],
            .is-scrolling [class*="fadeIn"],
            .is-scrolling [class*="slideIn"],
            .is-scrolling [class*="zoomIn"],
            .is-scrolling [class*="-animation"],
            .is-scrolling [style*="transition"],
            .is-scrolling [style*="animation"] {
                animation-play-state: paused !important;
                transition: none !important;
                animation: none !important;
            }
            
            /* Force hardware acceleration on critical elements */
            .premium-header,
            .header-hidden,
            main,
            section,
            .hero-section,
            .features-section,
            .how-it-works,
            .testimonials-section,
            .cta-section,
            #footer-container {
                transform: translateZ(0) !important;
                backface-visibility: hidden !important;
                perspective: 1000 !important;
                will-change: transform !important;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    /**
     * Fix scroll lag by removing event listeners that might be slowing down scrolling
     */
    function fixScrollLag() {
        // Store the native addEventListener
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        
        // Override addEventListener to make scroll events passive by default
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // For scroll, touchstart, touchmove, and wheel events, force passive true
            if (type === 'scroll' || type === 'touchstart' || type === 'touchmove' || type === 'wheel') {
                // If options is a boolean (useCapture), convert to object
                if (typeof options === 'boolean') {
                    options = {
                        capture: options,
                        passive: true
                    };
                } else if (typeof options === 'object') {
                    options.passive = options.passive !== false;
                } else {
                    options = { passive: true };
                }
            }
            
            // Call the original addEventListener with potentially modified options
            return originalAddEventListener.call(this, type, listener, options);
        };
    }
    
    /**
     * Detect browser and apply browser-specific fixes
     */
    function detectBrowserAndApplyFixes() {
        const ua = navigator.userAgent;
        
        // Detect browser
        browserInfo.isFirefox = ua.indexOf('Firefox') > -1;
        browserInfo.isChrome = ua.indexOf('Chrome') > -1 && ua.indexOf('Edge') === -1;
        browserInfo.isSafari = ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1;
        browserInfo.isEdge = ua.indexOf('Edge') > -1;
        browserInfo.isIE = ua.indexOf('Trident/') > -1;
        browserInfo.isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        browserInfo.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        
        // Apply browser-specific fixes
        const styleEl = document.createElement('style');
        styleEl.id = 'browser-specific-scroll-fixes';
        
        // Initialize style content
        let css = '';
        
        // Firefox specific fixes
        if (browserInfo.isFirefox) {
            css += `
                /* Firefox specific scroll fixes */
                html, body {
                    scrollbar-width: none !important;
                }
                
                .premium-header {
                    position: fixed !important;
                    transform: translateZ(0) !important;
                }
            `;
        }
        
        // Safari specific fixes
        if (browserInfo.isSafari || browserInfo.isIOS) {
            css += `
                /* Safari/iOS specific scroll fixes */
                html, body {
                    -webkit-overflow-scrolling: touch !important;
                }
                
                .premium-header {
                    -webkit-transform: translateZ(0) !important;
                    transform: translateZ(0) !important;
                }
                
                /* Fix for Safari/iOS momentum scrolling */
                body {
                    position: fixed;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    -webkit-overflow-scrolling: touch;
                }
            `;
        }
        
        // Mobile specific fixes
        if (browserInfo.isMobile) {
            css += `
                /* Mobile specific scroll fixes */
                body, html {
                    overflow-x: hidden !important;
                    max-width: 100vw !important;
                    width: 100vw !important;
                }
                
                /* Prevent pull-to-refresh and overscroll */
                body {
                    overscroll-behavior-y: none !important;
                }
            `;
        }
        
        // Apply the styles if we have any
        if (css) {
            styleEl.innerHTML = css;
            document.head.appendChild(styleEl);
        }
    }
    
    /**
     * Throttle scroll events for better performance
     */
    function setupScrollThrottling() {
        // Set up scroll event handler with throttling
        window.addEventListener('scroll', function() {
            // Skip if already processing a frame
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
                    
                    // Determine scroll direction
                    scrollDirection = currentScrollPosition > lastScrollPosition ? 'down' : 'up';
                    
                    // Update last position
                    lastScrollPosition = currentScrollPosition;
                    
                    // Reset tick flag
                    ticking = false;
                });
                
                ticking = true;
            }
        }, { passive: true });
    }
    
    /**
     * Register scroll helpers as global methods
     */
    function registerScrollHelpers() {
        // Create global scroll API
        window.scrollHelper = {
            // Get current scroll position
            getScrollPosition: function() {
                return window.pageYOffset || document.documentElement.scrollTop;
            },
            
            // Get scroll direction
            getScrollDirection: function() {
                return scrollDirection;
            },
            
            // Scroll to element smoothly
            scrollToElement: function(selector, offset = 0) {
                const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
                
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const targetPosition = rect.top + scrollTop - offset;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    return true;
                }
                
                return false;
            },
            
            // Is currently scrolling
            isScrolling: function() {
                return isScrolling;
            },
            
            // Get browser info
            getBrowserInfo: function() {
                return { ...browserInfo };
            }
        };
    }
    
    /**
     * Initialize everything
     */
    function init() {
        // Apply fixes based on configuration
        if (config.enableSmoothScroll) {
            applySmoothScroll();
        }
        
        if (config.fixScrollJank) {
            fixScrollJank();
        }
        
        if (config.fixScrollLag) {
            fixScrollLag();
        }
        
        if (config.throttleScrollEvents) {
            setupScrollThrottling();
        }
        
        if (config.detectBrowser) {
            detectBrowserAndApplyFixes();
        }
        
        // Register helper methods
        registerScrollHelpers();
        
        // Add class to signal initialization
        document.documentElement.classList.add('smooth-scroll-initialized');
        
        // Log initialization
        console.log('✅ Smooth scroll fixes initialized');
    }
    
    // Run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 