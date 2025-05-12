/**
 * Console Error Fixer
 * 
 * This script implements fallback functionality for common browser console errors
 * by patching missing functions, handling missing resources, and providing
 * graceful degradation.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Console Error Fixer: Initializing...');
    
    // Fix missing images with placeholders
    fixMissingImages();
    
    // Patch missing functions and objects
    patchMissingFunctions();
    
    // Fix high contrast mode issues
    fixHighContrastMode();
    
    // Handle preloaded resource warnings
    fixPreloadedResourceWarnings();
    
    // Fix deprecation warnings
    fixDeprecationWarnings();
    
    console.log('Console Error Fixer: Initialization complete');
});

/**
 * Fix missing images by providing fallback placeholders
 */
function fixMissingImages() {
    // Global error handler for images
    window.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            // Already has onerror handler, don't interfere
            if (e.target.hasAttribute('onerror')) return;
            
            // Set placeholder
            e.target.src = 'https://placehold.co/400x300/1A3C34/FFFFFF?text=Image';
            e.target.style.maxWidth = '100%';
            e.target.style.height = 'auto';
            // Prevent error propagation
            e.preventDefault();
        }
    }, true);
}

/**
 * Patch missing functions and objects to prevent errors
 */
function patchMissingFunctions() {
    // Create CONT object if missing
    if (typeof CONT === 'undefined') {
        console.log('Created missing CONT object');
        window.CONT = {};
    }
    
    // Patch missing CONT.getUniqueSelector function
    if (typeof CONT.getUniqueSelector !== 'function') {
        console.log('Added missing CONT.getUniqueSelector function');
        CONT.getUniqueSelector = function(el) { return ''; };
    }
    
    // Create dataLayer if missing
    if (typeof dataLayer === 'undefined') {
        console.log('Created missing dataLayer array');
        window.dataLayer = [];
    }
    
    // Create gtag function if missing
    if (typeof gtag === 'undefined') {
        console.log('Added missing gtag function');
        window.gtag = function() {
            dataLayer.push(arguments);
        };
    }
    
    // Create Facebook Pixel function if missing
    if (typeof fbq === 'undefined') {
        console.log('Added missing fbq function');
        window.fbq = function() {};
    }
}

/**
 * Fix high contrast mode issues by updating CSS
 */
function fixHighContrastMode() {
    // Check if browser supports forced-colors media query
    const supportsModernForcedColors = CSS.supports('(forced-colors: active)');
    
    // Create a style element to fix high contrast issues using the proper approach
    const style = document.createElement('style');
    
    if (supportsModernForcedColors) {
        // Modern browsers use forced-colors
        style.textContent = `
            @media (forced-colors: active) {
                button, a, input, .clean-footer, .footer-links a, .footer-legal a, .footer-contact {
                    forced-color-adjust: none;
                }
                .footer-column h3, .footer-copyright {
                    forced-color-adjust: none;
                }
            }
        `;
    } else {
        // Legacy browsers (IE/Edge) use -ms-high-contrast
        style.textContent = `
            @media (-ms-high-contrast: active), (-ms-high-contrast: none) {
                button, a, input, .clean-footer, .footer-links a, .footer-legal a, .footer-contact {
                    -ms-high-contrast-adjust: none;
                }
                .footer-column h3, .footer-copyright {
                    -ms-high-contrast-adjust: none;
                }
            }
        `;
    }
    
    document.head.appendChild(style);
}

/**
 * Fix preloaded resource warnings
 */
function fixPreloadedResourceWarnings() {
    // Find all preloaded resources
    const preloads = document.querySelectorAll('link[rel="preload"]');
    
    // Handle each preload to ensure it's properly used or removed
    preloads.forEach(preload => {
        // If it's a CSS file
        if (preload.getAttribute('as') === 'style') {
            // Add proper onload handler if missing
            if (!preload.hasAttribute('onload')) {
                preload.setAttribute('onload', "this.onload=null;this.rel='stylesheet'");
            }
            
            // Add fetchpriority attribute if missing
            if (!preload.hasAttribute('fetchpriority')) {
                preload.setAttribute('fetchpriority', 'high');
            }
            
            // Add a crossorigin attribute if missing for font preloads
            if ((preload.getAttribute('as') === 'font' || preload.href.includes('fonts.')) 
                && !preload.hasAttribute('crossorigin')) {
                preload.setAttribute('crossorigin', 'anonymous');
            }
        }
    });
}

/**
 * Fix deprecation warnings
 */
function fixDeprecationWarnings() {
    // Fix -ms-high-contrast deprecation warnings with a proper fallback
    const msHighContrastStylesheets = Array.from(document.styleSheets).filter(sheet => {
        try {
            if (sheet.cssRules) {
                for (let i = 0; i < sheet.cssRules.length; i++) {
                    const rule = sheet.cssRules[i];
                    if (rule.cssText && rule.cssText.includes('-ms-high-contrast')) {
                        return true;
                    }
                }
            }
        } catch (e) {
            // Cross-origin stylesheet, can't access rules
        }
        return false;
    });
    
    if (msHighContrastStylesheets.length > 0) {
        // Add proper forced-colors alternative
        const style = document.createElement('style');
        style.textContent = `
            @media (forced-colors: active) {
                /* Elements that need special treatment in high contrast mode */
                button, a, input, .clean-footer, .footer-links a {
                    forced-color-adjust: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Fix console warnings on page load
window.addEventListener('load', function() {
    // Fix any remaining preload issues
    setTimeout(() => {
        const unusedPreloads = document.querySelectorAll('link[rel="preload"][as="style"]');
        unusedPreloads.forEach(preload => {
            if (!document.querySelector(`link[href="${preload.href}"][rel="stylesheet"]`)) {
                // Convert to stylesheet or remove
                preload.rel = 'stylesheet';
                preload.onload = null;
            }
        });
    }, 1000);
});
