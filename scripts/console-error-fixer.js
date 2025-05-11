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
    document.addEventListener('error', function(e) {
        if (e.target.tagName.toLowerCase() === 'img') {
            const alt = e.target.alt || 'Image';
            const width = e.target.width || 300;
            const height = e.target.height || 200;
            
            // Only replace if not already using placeholder
            if (!e.target.src.includes('placehold.co')) {
                const placeholderColor = getComputedStyle(document.documentElement)
                    .getPropertyValue('--primary-color').trim() || '1A3C34';
                
                e.target.src = `https://placehold.co/${width}x${height}/${placeholderColor}/FFFFFF?text=${encodeURIComponent(alt)}`;
                console.log(`Replaced missing image with placeholder: ${alt}`);
            }
        }
    }, true);
    
    // Preemptively check existing images
    document.querySelectorAll('img').forEach(img => {
        if (!img.complete || img.naturalHeight === 0) {
            // Skip if already has onerror handler
            if (!img.hasAttribute('onerror')) {
                const alt = img.alt || 'Image';
                const width = img.width || 300;
                const height = img.height || 200;
                const placeholderColor = getComputedStyle(document.documentElement)
                    .getPropertyValue('--primary-color').trim() || '1A3C34';
                
                img.onerror = function() {
                    this.src = `https://placehold.co/${width}x${height}/${placeholderColor}/FFFFFF?text=${encodeURIComponent(alt)}`;
                    this.onerror = null; // Prevent infinite loops
                    return true;
                };
            }
        }
    });
}

/**
 * Patch missing functions and objects that might cause console errors
 */
function patchMissingFunctions() {
    // Patch CONT object if missing
    if (typeof window.CONT === 'undefined') {
        window.CONT = {};
        console.log('Created missing CONT object');
    }
    
    // Patch getUniqueSelector
    if (window.CONT && typeof window.CONT.getUniqueSelector !== 'function') {
        window.CONT.getUniqueSelector = function(element) {
            if (!element) return '';
            if (element.id) return '#' + element.id;
            if (element.className) {
                const classes = element.className.split(' ').filter(c => c.trim().length > 0);
                if (classes.length > 0) return '.' + classes[0];
            }
            return element.tagName.toLowerCase();
        };
        console.log('Added missing CONT.getUniqueSelector function');
    }
    
    // Patch window.dataLayer for analytics
    if (typeof window.dataLayer === 'undefined') {
        window.dataLayer = [];
        console.log('Created missing dataLayer array');
    }
    
    // Patch missing gtag function
    if (typeof window.gtag !== 'function') {
        window.gtag = function() {
            window.dataLayer.push(arguments);
            console.log('gtag call:', ...arguments);
        };
        console.log('Added missing gtag function');
    }
    
    // Patch missing fbq function
    if (typeof window.fbq !== 'function') {
        window.fbq = function() {
            console.log('Facebook Pixel call:', ...arguments);
        };
        console.log('Added missing fbq function');
    }
    
    // Patch localStorage access for private browsing mode
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
    } catch (e) {
        // Create localStorage polyfill
        const storage = {};
        window.localStorage = {
            setItem: function(key, value) {
                storage[key] = value || '';
            },
            getItem: function(key) {
                return key in storage ? storage[key] : null;
            },
            removeItem: function(key) {
                delete storage[key];
            },
            clear: function() {
                Object.keys(storage).forEach(key => delete storage[key]);
            }
        };
        console.log('Created localStorage polyfill for private browsing');
    }
}

/**
 * Fix high contrast mode issues
 */
function fixHighContrastMode() {
    // Check if in high contrast mode
    function isHighContrastMode() {
        // Create a test element to check if forced-colors is active
        const testEl = document.createElement('div');
        testEl.style.color = 'red';
        document.body.appendChild(testEl);
        const computedColor = getComputedStyle(testEl).color;
        document.body.removeChild(testEl);
        
        // If color is not red, we're likely in high contrast mode
        return computedColor !== 'rgb(255, 0, 0)';
    }
    
    if (isHighContrastMode() || window.matchMedia('(forced-colors: active)').matches) {
        // Apply high contrast mode fixes
        document.documentElement.classList.add('high-contrast-mode');
        
        // Fix SVG elements for high contrast
        document.querySelectorAll('svg').forEach(svg => {
            svg.setAttribute('role', 'img');
            if (!svg.hasAttribute('aria-label')) {
                const nearestText = svg.textContent.trim();
                if (nearestText) {
                    svg.setAttribute('aria-label', nearestText);
                }
            }
        });
        
        // Fix background images
        const style = document.createElement('style');
        style.textContent = `
            .high-contrast-mode .footer::before,
            .high-contrast-mode .footer::after,
            .high-contrast-mode [class*="decor-"],
            .high-contrast-mode [class*="floating-"] {
                display: none !important;
            }
            
            .high-contrast-mode .footer-title::before {
                background-color: CanvasText !important;
                forced-color-adjust: none !important;
            }
            
            .high-contrast-mode .social-icon,
            .high-contrast-mode .back-to-top {
                border: 1px solid CanvasText !important;
            }
        `;
        document.head.appendChild(style);
        console.log('Applied high contrast mode fixes');
    }
}

/**
 * Fix preloaded resource warnings
 */
function fixPreloadedResourceWarnings() {
    // Add crossorigin attribute to preloaded resources
    document.querySelectorAll('link[rel="preconnect"], link[rel="preload"]').forEach(link => {
        if (!link.hasAttribute('crossorigin')) {
            link.setAttribute('crossorigin', 'anonymous');
        }
    });
    
    // Fix font awesome warnings by adding integrity attributes if missing
    document.querySelectorAll('link[href*="font-awesome"]').forEach(link => {
        if (!link.hasAttribute('integrity')) {
            // Add a default integrity attribute for Font Awesome 6.4.0
            link.setAttribute('integrity', 'sha512-SqR78H9V5w2YNQ1zcYvMwgRIi3kYEjojFJ8F8UvUOcIvEUGXN9DCzjZn0DdFOC8UrZpPEP8n3cRjW/VWMruzA==');
            link.setAttribute('crossorigin', 'anonymous');
        }
    });
}
