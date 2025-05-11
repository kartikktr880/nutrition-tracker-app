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
        detectBrowser: true, // Apply browser-specific fixes
        removeHorizontalScrollbar: true // Force remove horizontal scrollbars
    };
    
    // State variables
    let isScrolling = false;
    let scrollTimeout;
    let lastScrollPosition = 0;
    let scrollDirection = null; // 'up' or 'down'
    let ticking = false;
    let browserInfo = {};
    let isInitialized = false;
    
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
                overflow-x: hidden !important;
                max-width: 100vw !important;
                width: 100vw !important;
            }
            
            body {
                overflow-x: hidden !important;
                -webkit-overflow-scrolling: touch !important;
                min-height: 100% !important;
                position: relative !important;
                max-width: 100vw !important;
                width: 100vw !important;
                margin: 0 !important;
                box-sizing: border-box !important;
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
            
            /* Force main content to take full width properly */
            main {
                width: 100% !important;
                max-width: 100% !important;
                overflow-x: hidden !important;
                display: block !important;
                box-sizing: border-box !important;
            }
            
            /* Hide scrollbar but keep functionality */
            ::-webkit-scrollbar {
                width: 0px !important;
                background: transparent !important; 
            }
            
            /* Firefox */
            html, body {
                scrollbar-width: none !important;
            }
            
            /* Force all sections to not exceed window width */
            section, .section, .container {
                max-width: 100vw !important;
                width: 100% !important;
                overflow-x: hidden !important;
                box-sizing: border-box !important;
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
     * Remove horizontal scrollbars completely
     */
    function removeHorizontalScrollbars() {
        const styleEl = document.createElement('style');
        styleEl.id = 'remove-horizontal-scrollbar-styles';
        styleEl.innerHTML = `
            /* Global horizontal overflow prevention */
            html, body, main, section, div, header, footer, nav, aside, article {
                max-width: 100% !important;
                overflow-x: hidden !important;
                box-sizing: border-box !important;
            }
            
            /* Fix width calculation issues that cause overflow */
            html, body {
                width: 100vw !important;
                min-width: auto !important;
                max-width: 100vw !important;
                overflow-x: hidden !important;
                position: relative !important;
            }
            
            /* Prevent Windows scrollbar space issue */
            @supports (-ms-ime-align:auto) {
                html {
                    overflow-x: hidden !important;
                    width: 100vw !important;
                }
                
                body {
                    overflow-x: hidden !important;
                    width: 100vw !important;
                }
            }
            
            /* Content overflow handling */
            img, video, iframe, canvas, svg, table {
                max-width: 100% !important;
                height: auto !important;
            }
        `;
        document.head.appendChild(styleEl);
        
        // Force calculation of layout to trigger fixes
        window.addEventListener('load', function() {
            document.body.style.width = '100vw';
            document.body.style.maxWidth = '100vw';
            document.body.style.overflowX = 'hidden';
        });
    }
    
    /**
     * Fix scroll lag by making scroll events passive
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
        browserInfo.isEdge = ua.indexOf('Edge') > -1 || ua.indexOf('Edg/') > -1;
        browserInfo.isIE = ua.indexOf('Trident/') > -1;
        browserInfo.isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        browserInfo.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        browserInfo.isWindows = ua.indexOf('Windows') > -1;
        
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
                
                /* Firefox width calculation fix */
                main, section, .container {
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
            `;
        }
        
        // Edge/IE specific fixes
        if (browserInfo.isEdge || browserInfo.isIE) {
            css += `
                /* Edge/IE specific fixes */
                html, body {
                    -ms-overflow-style: none !important;
                    overflow-x: hidden !important;
                    width: 100vw !important;
                }
                
                /* Fix scrollbar space issue in Edge */
                body {
                    margin-right: 0 !important;
                }
            `;
        }
        
        // Windows specific scrollbar fixes
        if (browserInfo.isWindows) {
            css += `
                /* Windows scrollbar fixes */
                html {
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    width: 100vw !important;
                }
                
                body {
                    overflow-x: hidden !important;
                    width: 100vw !important;
                }
            `;
        }
        
        // Safari specific fixes
        if (browserInfo.isSafari || browserInfo.isIOS) {
            css += `
                /* Safari/iOS specific scroll fixes */
                html, body {
                    -webkit-overflow-scrolling: touch !important;
                    overflow-x: hidden !important;
                }
                
                .premium-header {
                    -webkit-transform: translateZ(0) !important;
                    transform: translateZ(0) !important;
                }
                
                /* Fix for Safari momentum scrolling */
                @supports (-webkit-overflow-scrolling: touch) {
                    body {
                        position: relative !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow-x: hidden !important;
                        overflow-y: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }
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
                    touch-action: pan-y !important;
                }
                
                /* Prevent pull-to-refresh and overscroll */
                body {
                    overscroll-behavior-y: none !important;
                }
                
                /* Fix content sizing on mobile */
                main, section, .container, div {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }
            `;
        }
        
        // Apply the styles if we have any
        if (css) {
            styleEl.innerHTML = css;
            document.head.appendChild(styleEl);
        }
        
        // Apply explicit horizontal overflow fixes
        if (browserInfo.isWindows || browserInfo.isEdge || browserInfo.isIE) {
            // Fix Windows and Edge scrollbar issues
            setTimeout(() => {
                document.documentElement.style.overflowX = 'hidden';
                document.documentElement.style.width = '100vw';
                document.documentElement.style.maxWidth = '100vw';
                document.body.style.overflowX = 'hidden';
                document.body.style.width = '100vw';
                document.body.style.maxWidth = '100vw';
                
                if (document.querySelector('main')) {
                    document.querySelector('main').style.maxWidth = '100%';
                    document.querySelector('main').style.overflowX = 'hidden';
                }
            }, 100);
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
            },
            
            // Force remove horizontal scrollbars
            forceHideHorizontalScrollbars: function() {
                document.documentElement.style.overflowX = 'hidden';
                document.documentElement.style.maxWidth = '100vw';
                document.body.style.overflowX = 'hidden';
                document.body.style.maxWidth = '100vw';
            }
        };
    }
    
    /**
     * Fix extra wide elements that cause overflow
     */
    function fixOverflowingElements() {
        // Run on document load and resize
        function findAndFixOverflowingElements() {
            const viewportWidth = window.innerWidth;
            
            // Fix any elements wider than viewport
            const allElements = document.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
                const element = allElements[i];
                if (element.offsetWidth > viewportWidth) {
                    element.style.maxWidth = '100%';
                    element.style.width = '100%';
                    element.style.boxSizing = 'border-box';
                    element.style.overflowX = 'hidden';
                }
            }
        }
        
        // Run on load
        window.addEventListener('load', findAndFixOverflowingElements);
        
        // And on resize
        window.addEventListener('resize', function() {
            // Throttle
            if (!ticking) {
                window.requestAnimationFrame(findAndFixOverflowingElements);
                ticking = true;
                setTimeout(() => { ticking = false; }, 100);
            }
        }, { passive: true });
    }
    
    /**
     * Initialize everything
     */
    function init() {
        if (isInitialized) return;
        
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
        
        if (config.removeHorizontalScrollbar) {
            removeHorizontalScrollbars();
        }
        
        if (config.throttleScrollEvents) {
            setupScrollThrottling();
        }
        
        if (config.detectBrowser) {
            detectBrowserAndApplyFixes();
        }
        
        // Apply additional fixes
        fixOverflowingElements();
        
        // Register helper methods
        registerScrollHelpers();
        
        // Add class to signal initialization
        document.documentElement.classList.add('smooth-scroll-initialized');
        
        isInitialized = true;
        console.log('✅ Smooth scroll fixes initialized');
        
        // Additional initializations after small delay
        setTimeout(() => {
            // Force horizontal scrollbar check
            window.scrollHelper.forceHideHorizontalScrollbars();
        }, 500);
    }
    
    // Run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Re-initialize on load to ensure everything is fixed
    window.addEventListener('load', () => {
        if (!isInitialized) {
            init();
        } else {
            // Just force the horizontal scrollbar check
            window.scrollHelper.forceHideHorizontalScrollbars();
        }
    });
})(); 