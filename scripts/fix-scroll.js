/**
 * Fix Scroll Issues
 * This script ensures proper layout calculation and prevents scroll issues
 */

(function() {
    /**
     * Ensures no element exceeds the viewport width
     */
    function fixHorizontalOverflow() {
        // Get the viewport width
        const viewportWidth = Math.max(
            document.documentElement.clientWidth || 0, 
            window.innerWidth || 0
        );
        
        // Calculate the threshold (slightly less than viewport to be safe)
        const threshold = viewportWidth - 5;
        
        // Get all elements that might cause overflow
        const elements = document.querySelectorAll('div, section, header, footer, main, nav');
        
        // Check each element's width and fix if necessary
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > threshold) {
                el.style.width = '100%';
                el.style.maxWidth = '100%';
                el.style.overflowX = 'hidden';
                el.style.boxSizing = 'border-box';
                
                // Log the fix if it's a significant overflow
                if (rect.width > viewportWidth + 20) {
                    console.log('Fixed overflow element:', el, rect.width);
                }
            }
        });
    }
    
    /**
     * Fix for the specific scrollbar issue on the page
     */
    function preventScrollbar() {
        // Force the body to hide horizontal overflow
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.overflowX = 'hidden';
        
        // Hide the scrollbar but keep functionality
        const style = document.createElement('style');
        style.textContent = `
            body::-webkit-scrollbar {
                width: 0 !important;
                background: transparent !important;
            }
            html {
                scrollbar-width: none !important;
            }
        `;
        document.head.appendChild(style);
        
        // Fix any remaining large elements
        const largeElements = [
            document.getElementById('footer-container'),
            document.querySelector('.steps-container'),
            document.querySelector('.features-grid'),
            document.querySelector('.testimonials-grid'),
            document.querySelector('.hero-image')
        ];
        
        largeElements.forEach(el => {
            if (el) {
                el.style.maxWidth = '100%';
                el.style.overflowX = 'hidden';
                el.style.boxSizing = 'border-box';
            }
        });
    }
    
    /**
     * Initialize fixes
     */
    function init() {
        // Apply fixes immediately
        fixHorizontalOverflow();
        preventScrollbar();
        
        // Also run on resize
        window.addEventListener('resize', function() {
            fixHorizontalOverflow();
        }, { passive: true });
        
        // Run after all content has loaded
        window.addEventListener('load', function() {
            fixHorizontalOverflow();
        });
        
        // MutationObserver to catch any dynamically added content
        const observer = new MutationObserver(function() {
            fixHorizontalOverflow();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 