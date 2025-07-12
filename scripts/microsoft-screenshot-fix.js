import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Microsoft Screenshot Fix
 * This script detects when Microsoft's screenshot tool is being used and applies fixes
 * to ensure the page looks correct in screenshots
 */

(function() {
    // Configuration
    const config = {
        // CSS class to apply when in screenshot mode
        screenshotModeClass: 'screenshot-mode',
        // CSS to inject when screenshot mode is detected
        screenshotCss: `
            /* Fix for Microsoft Screenshot Tool */
            .screenshot-mode {
                /* Ensure full visibility */
                max-height: none !important;
                overflow: visible !important;
                overflow-x: visible !important;
                overflow-y: visible !important;
            }
            
            /* Show all content */
            .screenshot-mode html,
            .screenshot-mode body,
            .screenshot-mode main,
            .screenshot-mode section,
            .screenshot-mode footer {
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                overflow-x: visible !important;
                overflow-y: visible !important;
            }
            
            /* Force header to display */
            .screenshot-mode .premium-header {
                transform: none !important;
                position: absolute !important;
                opacity: 1 !important;
                visibility: visible !important;
            }
            
            /* Eliminate any fixed positioning that might affect screenshots */
            .screenshot-mode .fixed-element,
            .screenshot-mode .sticky-element {
                position: absolute !important;
            }
            
            /* Ensure all animations are complete */
            .screenshot-mode * {
                animation-play-state: paused !important;
                transition: none !important;
            }
            
            /* Ensure all content is visible */
            .screenshot-mode .hidden,
            .screenshot-mode [hidden],
            .screenshot-mode .collapse:not(.show),
            .screenshot-mode .d-none {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
        `,
        
        // Debug mode
        debug: false
    };
    
    // State
    let isScreenshotMode = false;
    let styleElement = null;
    
    /**
     * Initialize screenshot detection
     */
    function init() {
        // Check if URL has screenshot parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('screenshot') || urlParams.has('print')) {
            enableScreenshotMode();
        }
        
        // Create the style element but don't inject it yet
        createScreenshotStyles();
        
        // Add screenshot mode toggle
        window.toggleScreenshotMode = toggleScreenshotMode;
        
        // Create UI toggle if needed
        createScreenshotToggle();
        
        if (config.debug) {
            logInfo('Microsoft screenshot fix initialized');
        }
    }
    
    /**
     * Toggle screenshot mode on/off
     */
    function toggleScreenshotMode() {
        if (isScreenshotMode) {
            disableScreenshotMode();
        } else {
            enableScreenshotMode();
        }
        return isScreenshotMode;
    }
    
    /**
     * Enable screenshot mode
     */
    function enableScreenshotMode() {
        document.documentElement.classList.add(config.screenshotModeClass);
        
        // Apply the screenshot styles
        if (styleElement && !styleElement.parentNode) {
            document.head.appendChild(styleElement);
        }
        
        // Update state
        isScreenshotMode = true;
        
        // Show all elements that might be hidden
        document.querySelectorAll('.hidden, [hidden], .collapse:not(.show), .d-none')
            .forEach(el => {
                el.style.display = 'block';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });
        
        // Ensure header is visible
        const header = document.querySelector('.premium-header');
        if (header) {
            header.style.transform = 'none';
            header.style.visibility = 'visible';
            header.style.opacity = '1';
            header.style.position = 'absolute';
        }
        
        // Ensure all content is visible
        document.querySelectorAll('section, footer')
            .forEach(el => {
                el.style.display = 'block';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });
        
        // Log state
        if (config.debug) {
            logInfo('Screenshot mode enabled');
        }
    }
    
    /**
     * Disable screenshot mode
     */
    function disableScreenshotMode() {
        document.documentElement.classList.remove(config.screenshotModeClass);
        
        // Remove the screenshot styles
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
        }
        
        // Update state
        isScreenshotMode = false;
        
        // Reset visibility to default
        document.querySelectorAll('.hidden, [hidden], .collapse:not(.show), .d-none')
            .forEach(el => {
                el.style.display = '';
                el.style.visibility = '';
                el.style.opacity = '';
            });
        
        // Reset header styling
        const header = document.querySelector('.premium-header');
        if (header) {
            header.style.transform = '';
            header.style.visibility = '';
            header.style.opacity = '';
            header.style.position = '';
        }
        
        // Log state
        if (config.debug) {
            logInfo('Screenshot mode disabled');
        }
    }
    
    /**
     * Create the screenshot styles
     */
    function createScreenshotStyles() {
        styleElement = document.createElement('style');
        styleElement.id = 'microsoft-screenshot-fix-styles';
        styleElement.type = 'text/css';
        styleElement.innerHTML = config.screenshotCss;
    }
    
    /**
     * Create a UI toggle for screenshot mode
     */
    function createScreenshotToggle() {
        // Only create in development environment
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('vercel.app')) {
            
            const toggle = document.createElement('button');
            toggle.id = 'screenshot-mode-toggle';
            toggle.innerHTML = 'Screenshot Mode';
            toggle.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                z-index: 9999;
                background: #1A3C34;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                font-family: sans-serif;
                font-size: 12px;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            `;
            
            toggle.addEventListener('mouseenter', () => {
                toggle.style.opacity = '1';
            });
            
            toggle.addEventListener('mouseleave', () => {
                toggle.style.opacity = '0.7';
            });
            
            toggle.addEventListener('click', () => {
                const isEnabled = toggleScreenshotMode();
                toggle.innerHTML = isEnabled ? 'Exit Screenshot Mode' : 'Screenshot Mode';
            });
            
            // Add to DOM after body loads
            if (document.body) {
                document.body.appendChild(toggle);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(toggle);
                });
            }
        }
    }
    
    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 