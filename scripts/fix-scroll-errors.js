/**
 * Fix Scroll Errors
 * This script detects and fixes potential JavaScript issues that may affect scrolling
 */

(function() {
    /**
     * Fix event listeners that might be causing scroll jank
     */
    function fixEventListeners() {
        // Store the native addEventListener
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        
        // Override addEventListener to ensure all scroll events are passive
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // For scroll, touchstart, touchmove, and wheel events, force passive true
            if (type === 'scroll' || type === 'touchstart' || type === 'touchmove' || type === 'wheel') {
                // If options is a boolean (useCapture), convert to object
                if (typeof options === 'boolean') {
                    options = { capture: options, passive: true };
                } else if (typeof options === 'object') {
                    options.passive = true;
                } else {
                    options = { passive: true };
                }
            }
            
            // Call the original with our modified options
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        console.log('Optimized event listeners for better scrolling performance');
    }
    
    /**
     * Detect and fix common scroll issues
     */
    function fixScrollIssues() {
        // Check for scroll-triggered animations that might be impacting performance
        const animatedElements = document.querySelectorAll('[data-aos], .animate, .animated, [data-animation], .fade, .fade-in');
        if (animatedElements.length > 50) {
            console.log('Warning: Large number of animated elements detected. This may impact scroll performance.');
            
            // Create a style to disable animations during scroll
            const styleEl = document.createElement('style');
            styleEl.innerHTML = `
                body.is-scrolling [data-aos], 
                body.is-scrolling .animate, 
                body.is-scrolling .animated, 
                body.is-scrolling [data-animation], 
                body.is-scrolling .fade, 
                body.is-scrolling .fade-in {
                    transition: none !important;
                    animation: none !important;
                    opacity: 1 !important;
                    transform: none !important;
                }
            `;
            document.head.appendChild(styleEl);
        }
        
        // Fix potential scroll handlers causing performance issues
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            document.body.classList.add('is-scrolling');
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                document.body.classList.remove('is-scrolling');
            }, 100);
        }, { passive: true });
    }
    
    /**
     * Fix headers that may have incorrect transitions or transforms
     */
    function fixHeaderBehavior() {
        const premiumHeader = document.querySelector('.premium-header');
        if (premiumHeader) {
            // Ensure correct transition
            premiumHeader.style.transition = 'transform 0.3s ease';
            premiumHeader.style.willChange = 'transform';
            
            // Make sure the header properly responds to scroll
            let lastScrollTop = 0;
            let scrollTimer;
            
            window.addEventListener('scroll', function() {
                clearTimeout(scrollTimer);
                
                const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                // Only show/hide after scrolling a significant amount
                if (Math.abs(currentScrollTop - lastScrollTop) > 10) {
                    if (currentScrollTop > lastScrollTop && currentScrollTop > 80) {
                        // Scrolling DOWN, hide the header
                        premiumHeader.classList.add('header-hidden');
                    } else {
                        // Scrolling UP, show the header
                        premiumHeader.classList.remove('header-hidden');
                    }
                    
                    lastScrollTop = currentScrollTop;
                }
                
                // Reset header state if page is at top
                if (currentScrollTop <= 10) {
                    premiumHeader.classList.remove('header-hidden');
                }
                
                // Check again after scrolling stops
                scrollTimer = setTimeout(function() {
                    if (window.pageYOffset <= 10) {
                        premiumHeader.classList.remove('header-hidden');
                    }
                }, 150);
                
            }, { passive: true });
            
            console.log('Fixed header scroll behavior');
        }
    }
    
    /**
     * Remove any fixed elements that might be causing layout issues
     */
    function cleanFixedElements() {
        const potentialIssues = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
        
        potentialIssues.forEach(element => {
            // Skip the premium header
            if (element.classList.contains('premium-header')) return;
            
            const computedStyle = window.getComputedStyle(element);
            
            // Check if this fixed element might be causing issues
            if (computedStyle.position === 'fixed' && 
                (computedStyle.width === '100%' || 
                 computedStyle.width === '100vw' || 
                 parseInt(computedStyle.width) > window.innerWidth)) {
                
                console.log('Fixing potentially problematic fixed element:', element);
                
                // Apply hardware acceleration
                element.style.transform = 'translateZ(0)';
                element.style.webkitTransform = 'translateZ(0)';
                element.style.willChange = 'transform';
            }
        });
    }
    
    /**
     * Initialize fixes
     */
    function init() {
        // Apply all fixes
        fixEventListeners();
        fixScrollIssues();
        fixHeaderBehavior();
        
        // Run once DOM is loaded
        window.addEventListener('load', function() {
            cleanFixedElements();
        });
        
        // Also run on resize
        window.addEventListener('resize', function() {
            cleanFixedElements();
        }, { passive: true });
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 