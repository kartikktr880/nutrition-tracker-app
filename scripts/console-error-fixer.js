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
    // Check if the browser uses high contrast mode
    if (window.matchMedia('(-ms-high-contrast: active), (-ms-high-contrast: none)').matches) {
        // Create a style element to fix high contrast issues
        const style = document.createElement('style');
        style.textContent = `
            @media (forced-colors: active) {
                button, a, input, .clean-footer, .footer-links a {
                    forced-color-adjust: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
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
                preload.onload = function() {
                    // Check if we should apply this stylesheet
                    const isScreenshotMode = new URLSearchParams(window.location.search).get('screenshot') === 'true';
                    
                    if (isScreenshotMode && preload.href.includes('screenshot')) {
                        // Apply the stylesheet
                        preload.rel = 'stylesheet';
                        // Remove the onload handler to prevent warning
                        preload.onload = null;
                    } else if (!isScreenshotMode) {
                        // Remove the preload to prevent warning
                        preload.remove();
                    }
                };
            }
            
            // Add fetchpriority attribute if missing
            if (!preload.hasAttribute('fetchpriority')) {
                preload.setAttribute('fetchpriority', 'low');
            }
        }
    });
}

// Fix console warnings on page load
window.addEventListener('load', function() {
    // Fix any remaining preload issues
    setTimeout(() => {
        const unusedPreloads = document.querySelectorAll('link[rel="preload"][as="style"]');
        unusedPreloads.forEach(preload => {
            if (!document.querySelector(`link[href="${preload.href}"][rel="stylesheet"]`)) {
                preload.remove();
            }
        });
    }, 3000);
});
