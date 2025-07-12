import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Remove Spacers Script
 * This script finds and removes any large spacer elements that might be pushing the footer down
 */

(function() {
    /**
     * Find and remove large spacer divs and any elements causing excessive padding
     */
    function removeSpacers() {
        // Find elements with large explicit heights
        const largeSpacers = Array.from(document.querySelectorAll('div, section'))
            .filter(el => {
                // Check inline styles
                if (el.style.height && 
                    (el.style.height.includes('1000px') || 
                     el.style.height.includes('2000px') || 
                     el.style.height.includes('100vh'))) {
                    return true;
                }
                
                // Check computed style
                const computedStyle = window.getComputedStyle(el);
                const height = parseInt(computedStyle.height);
                return height > 1000 && !el.innerText.trim() && el.children.length === 0;
            });
        
        // Log and remove the spacers
        largeSpacers.forEach(spacer => {
            logInfo('Removing large spacer:', spacer);
            spacer.style.display = 'none';
            spacer.style.height = '0';
            spacer.style.padding = '0';
            spacer.style.margin = '0';
        });
        
        // Check for excessive margins or padding on main sections
        const mainSections = document.querySelectorAll('main > section, main > div');
        mainSections.forEach(section => {
            const computedStyle = window.getComputedStyle(section);
            const marginBottom = parseInt(computedStyle.marginBottom);
            const paddingBottom = parseInt(computedStyle.paddingBottom);
            
            if (marginBottom > 100) {
                logInfo('Reducing excessive margin-bottom on:', section);
                section.style.marginBottom = '50px';
            }
            
            if (paddingBottom > 100) {
                logInfo('Reducing excessive padding-bottom on:', section);
                section.style.paddingBottom = '50px';
            }
        });
        
        // Check for and fix main's bottom padding
        const main = document.querySelector('main');
        if (main) {
            const computedStyle = window.getComputedStyle(main);
            const paddingBottom = parseInt(computedStyle.paddingBottom);
            
            if (paddingBottom > 100) {
                logInfo('Reducing excessive padding-bottom on main');
                main.style.paddingBottom = '50px';
            }
        }
    }
    
    /**
     * Initialize the script
     */
    function init() {
        // Run once after DOM is loaded
        removeSpacers();
        
        // Run again after a short delay to catch dynamically added elements
        setTimeout(removeSpacers, 1000);
        
        // Run once more after everything has loaded
        window.addEventListener('load', function() {
            removeSpacers();
            setTimeout(removeSpacers, 1000);
        });
        
        // Set up a MutationObserver to watch for dynamically added spacers
        const observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    removeSpacers();
                    break;
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Run when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 