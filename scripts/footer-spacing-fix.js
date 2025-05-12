/**
 * Footer Spacing Fix
 * This script ensures proper footer spacing in both regular and screenshot modes
 */

(function() {
    /**
     * Fix footer spacing issues
     */
    function fixFooterSpacing() {
        // Get the footer and main elements
        const footer = document.querySelector('.clean-footer') || document.querySelector('.footer');
        const main = document.querySelector('main');
        const newsletter = document.querySelector('.newsletter-section');
        
        // Ensure elements exist before proceeding
        if (!footer || !main) return;
        
        // Fix body layout
        document.body.style.display = 'flex';
        document.body.style.flexDirection = 'column';
        document.body.style.minHeight = '100vh';
        
        // Make main content take available space
        main.style.flex = '1 0 auto';
        main.style.display = 'block';
        main.style.marginBottom = '0';
        main.style.paddingBottom = '0';
        
        // Fix footer visibility and positioning
        footer.style.display = 'block';
        footer.style.visibility = 'visible';
        footer.style.opacity = '1';
        footer.style.width = '100%';
        footer.style.position = 'relative';
        footer.style.zIndex = '10';
        footer.style.marginTop = '0';
        
        // Fix footer spacing
        footer.style.paddingTop = '40px';
        footer.style.paddingBottom = '20px';
        
        // Fix newsletter section spacing
        if (newsletter) {
            newsletter.style.marginBottom = '0';
            newsletter.style.paddingBottom = '40px';
            newsletter.style.borderBottom = 'none';
        }
        
        // Apply different styles for screenshot mode
        const isScreenshotMode = document.body.classList.contains('screenshot-mode');
        if (isScreenshotMode) {
            if (newsletter) {
                newsletter.style.paddingBottom = '0';
            }
            footer.style.paddingTop = '20px';
            footer.style.paddingBottom = '10px';
        }
        
        // Check for very short window heights
        if (window.innerHeight < 600) {
            // Reduce padding for very small screens
            if (newsletter) {
                newsletter.style.paddingBottom = '20px';
            }
            footer.style.paddingTop = '20px';
            footer.style.paddingBottom = '10px';
        }
    }
    
    /**
     * Initialize and set up event listeners
     */
    function init() {
        // Fix spacing immediately
        fixFooterSpacing();
        
        // Fix spacing on resize and load
        window.addEventListener('resize', fixFooterSpacing, { passive: true });
        window.addEventListener('load', fixFooterSpacing);
        
        // Set up mutation observer to watch for DOM changes
        const observer = new MutationObserver(function(mutations) {
            // Debounce multiple rapid changes
            if (window.footerSpacingTimeout) {
                clearTimeout(window.footerSpacingTimeout);
            }
            
            window.footerSpacingTimeout = setTimeout(function() {
                fixFooterSpacing();
            }, 100);
        });
        
        // Watch the body for class changes (like adding/removing screenshot-mode)
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Watch for changes in the footer and main content
        const footer = document.querySelector('.clean-footer') || document.querySelector('.footer');
        const main = document.querySelector('main');
        
        if (footer) {
            observer.observe(footer, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }
        
        if (main) {
            observer.observe(main, {
                childList: true,
                subtree: false
            });
        }
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Also run on load to catch late resources
    window.addEventListener('load', fixFooterSpacing);
})(); 