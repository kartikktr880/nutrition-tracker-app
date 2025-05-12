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
        footer.style.zIndex = '10';
        footer.style.marginTop = '0';
        
        // Fix body and main layout to ensure footer is properly positioned
        document.body.style.display = 'flex';
        document.body.style.flexDirection = 'column';
        document.body.style.minHeight = '100vh';
        document.documentElement.style.minHeight = '100vh';
        
        const main = document.querySelector('main');
        if (main) {
            main.style.flex = '1 0 auto';
            main.style.marginBottom = '0';
            main.style.paddingBottom = '0';
            main.style.display = 'block';
        }
        
        // Fix spacing between sections and footer
        const newsletterSection = document.querySelector('.newsletter-section');
        if (newsletterSection) {
            newsletterSection.style.marginBottom = '0';
            newsletterSection.style.paddingBottom = '60px';
            newsletterSection.style.borderBottom = 'none';
        }
        
        // Ensure all sections have proper visibility
        const sections = document.querySelectorAll('section');
        if (sections.length > 0) {
            const lastSection = sections[sections.length - 1];
            if (lastSection) {
                lastSection.style.marginBottom = '0';
                lastSection.style.paddingBottom = '0';
                lastSection.style.borderBottom = 'none';
            }
        }
        
        // Fix for iOS devices
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            document.documentElement.style.height = 'fill-available';
            document.body.style.height = 'fill-available';
        }
    }
    
    /**
     * Initialize the fixes
     */
    function init() {
        // Check if page is loaded in an iframe
        const isInIframe = window.self !== window.top;
        if (isInIframe) {
            // Special handling for iframe context
            document.body.classList.add('iframe-context');
        }
        
        // Apply fixes immediately
        fixFooterVisibility();
        
        // Also run on resize and load events
        window.addEventListener('resize', fixFooterVisibility, { passive: true });
        window.addEventListener('load', fixFooterVisibility);
        window.addEventListener('scroll', fixFooterVisibility, { passive: true });
        
        // Check for changes to the DOM that might affect layout
        const observer = new MutationObserver(function(mutations) {
            // Debounce multiple rapid changes
            if (window.footerFixTimeout) {
                clearTimeout(window.footerFixTimeout);
            }
            
            window.footerFixTimeout = setTimeout(function() {
                fixFooterVisibility();
            }, 100);
        });
        
        // Observe the entire document for changes
        observer.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: false
        });
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Also run on page load to catch any late-loading resources
    window.addEventListener('load', fixFooterVisibility);
})(); 