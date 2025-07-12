import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Fix Footer Visibility
 * This script ensures the footer is always properly displayed on the page
 */

(function() {
    /**
     * Ensure footer is visible and properly positioned
     */
    function fixFooterVisibility() {
        const footerContainer = document.getElementById('footer-container');
        if (!footerContainer) return;
        
        // Ensure footer container is visible
//         footerContainer.style.display = 'block';
//         footerContainer.style.visibility = 'visible';
//         footerContainer.style.opacity = '1';
//         footerContainer.style.width = '100%';
//         footerContainer.style.position = 'relative';
//         footerContainer.style.zIndex = '5';
//         footerContainer.style.marginTop = '0';
        
        // Check if footer is already loaded
        const footer = footerContainer.querySelector('footer');
        if (footer) {
            // Ensure the footer itself is visible
//             footer.style.display = 'block';
//             footer.style.visibility = 'visible';
//             footer.style.opacity = '1';
//             footer.style.width = '100%';
//             footer.style.marginTop = '0';
//             footer.style.position = 'relative';
//             footer.style.zIndex = '5';
        }
        
        // Fix body and main layout to ensure footer is properly positioned
        document.body.style.display = 'flex';
        document.body.style.flexDirection = 'column';
        document.body.style.minHeight = '100vh';
        
        const main = document.querySelector('main');
        if (main) {
            main.style.flex = '1 0 auto';
        }
        
        //         footerContainer.style.flexShrink = '0';
    }
    
    /**
     * Check if footer is fully loaded and retry if not
     */
    function ensureFooterIsLoaded() {
        const footerContainer = document.getElementById('footer-container');
        if (!footerContainer) return;
        
        // Check if footer content exists
        const footerContent = footerContainer.querySelector('footer');
        if (!footerContent || footerContent.offsetHeight < 10) {
            logInfo('Footer not fully loaded, retrying...');
            
            // If footer.js didn't initialize properly, manually initialize it
            if (window.UltraPremiumFooter && typeof window.UltraPremiumFooter.prototype.init === 'function') {
                const footerInstance = new window.UltraPremiumFooter();
                if (typeof footerInstance.init === 'function') {
                    footerInstance.init();
                }
            }
            
            // Retry after a short delay
            setTimeout(ensureFooterIsLoaded, 500);
        } else {
            logInfo('Footer loaded successfully');
            fixFooterVisibility();
        }
    }
    
    /**
     * Initialize the fixes
     */
    function init() {
        // Apply fixes immediately
        fixFooterVisibility();
        
        // Check if footer has loaded correctly
        setTimeout(ensureFooterIsLoaded, 500);
        
        // Also run on resize and load events
        window.addEventListener('resize', fixFooterVisibility, { passive: true });
        window.addEventListener('load', function() {
            fixFooterVisibility();
            ensureFooterIsLoaded();
        });
        
        // Use MutationObserver to detect when the footer might be added or modified
        const observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    fixFooterVisibility();
                }
            }
        });
        
        const footerContainer = document.getElementById('footer-container');
        if (footerContainer) {
            observer.observe(footerContainer, {
                childList: true,
                attributes: true,
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