/**
 * Fix Footer Visibility
 * This script ensures the footer is always properly displayed on the page
 */

(function() {
    /**
     * Ensure footer is visible and properly positioned
     */
    function fixFooterVisibility() {
        const footer = document.querySelector('.clean-footer');
        if (!footer) return;
        
        // Ensure footer is visible
        footer.style.display = 'block';
        footer.style.visibility = 'visible';
        footer.style.opacity = '1';
        footer.style.width = '100%';
        footer.style.position = 'relative';
        footer.style.zIndex = '5';
        footer.style.marginTop = '0';
        
        // Fix body and main layout to ensure footer is properly positioned
        document.body.style.display = 'flex';
        document.body.style.flexDirection = 'column';
        document.body.style.minHeight = '100vh';
        
        const main = document.querySelector('main');
        if (main) {
            main.style.flex = '1 0 auto';
        }
        
        // Ensure the footer container is properly styled
        const footerContainer = footer.querySelector('.footer-container');
        if (footerContainer) {
            footerContainer.style.width = '100%';
            footerContainer.style.maxWidth = '1200px';
            footerContainer.style.margin = '0 auto';
            footerContainer.style.padding = '0 20px';
        }
        
        // Fix spacing between sections and footer
        const newsletterSection = document.querySelector('.newsletter-section');
        if (newsletterSection) {
            newsletterSection.style.marginBottom = '0';
            newsletterSection.style.paddingBottom = '80px';
        }
    }
    
    /**
     * Initialize the fixes
     */
    function init() {
        // Apply fixes immediately
        fixFooterVisibility();
        
        // Also run on resize and load events
        window.addEventListener('resize', fixFooterVisibility, { passive: true });
        window.addEventListener('load', fixFooterVisibility);
        
        // Use MutationObserver to detect when the footer might be modified
        const observer = new MutationObserver(function(mutations) {
            fixFooterVisibility();
        });
        
        const footer = document.querySelector('.clean-footer');
        if (footer) {
            observer.observe(footer, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 