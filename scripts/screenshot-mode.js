import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Screenshot Mode
 * This script adds a screenshot mode toggle to make full-page screenshots possible
 */

(function() {
    /**
     * Create a toggle button for screenshot mode
     */
    function createScreenshotToggle() {
        // Create the toggle button
        const toggle = document.createElement('button');
        toggle.id = 'screenshot-mode-toggle';
        toggle.innerHTML = 'Screenshot Mode <span class="status">OFF</span>';
        toggle.title = 'Toggle screenshot mode for full-page screenshots';
        
        // Style the button
        toggle.style.position = 'fixed';
        toggle.style.bottom = '20px';
        toggle.style.right = '20px';
        toggle.style.zIndex = '999999';
        toggle.style.background = '#FF8C42';
        toggle.style.color = 'white';
        toggle.style.border = 'none';
        toggle.style.borderRadius = '4px';
        toggle.style.padding = '8px 16px';
        toggle.style.fontFamily = 'Poppins, sans-serif';
        toggle.style.fontSize = '14px';
        toggle.style.fontWeight = 'bold';
        toggle.style.cursor = 'pointer';
        toggle.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        toggle.style.transition = 'all 0.3s ease';
        
        // Add status style
        const style = document.createElement('style');
        style.textContent = `
            #screenshot-mode-toggle .status {
                display: inline-block;
                margin-left: 6px;
                font-size: 12px;
                padding: 2px 6px;
                border-radius: 3px;
                background: rgba(0,0,0,0.2);
            }
            #screenshot-mode-toggle:hover {
                background: #e67e35;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
        `;
        document.head.appendChild(style);
        
        // Add the button to the document
        document.body.appendChild(toggle);
        
        // Add event listener
        toggle.addEventListener('click', toggleScreenshotMode);
        
        return toggle;
    }
    
    /**
     * Toggle screenshot mode on and off
     */
    function toggleScreenshotMode() {
        const isEnabled = document.body.classList.toggle('screenshot-mode');
        const toggle = document.getElementById('screenshot-mode-toggle');
        const status = toggle.querySelector('.status');
        
        if (isEnabled) {
            // Enable screenshot mode
            status.textContent = 'ON';
            toggle.style.background = '#1A3C34';
            
            // Apply fixes that help with screenshot capture
            applyScreenshotFixes(true);
            
            // Show notification
            showNotification('Screenshot mode enabled. Take your screenshot now.', 'success');
        } else {
            // Disable screenshot mode
            status.textContent = 'OFF';
            toggle.style.background = '#FF8C42';
            
            // Remove screenshot-specific fixes
            applyScreenshotFixes(false);
            
            // Show notification
            showNotification('Screenshot mode disabled.', 'info');
        }
    }
    
    /**
     * Apply fixes specific to screenshot capture
     */
    function applyScreenshotFixes(enable) {
        if (enable) {
            // Disable scroll-triggered animations and effects
            const styleEl = document.createElement('style');
            styleEl.id = 'screenshot-fixes-style';
            styleEl.textContent = `
                /* Prevent animations during screenshot */
                body.screenshot-mode * {
                    animation-play-state: paused !important;
                    transition: none !important;
                    animation: none !important;
                }
                
                /* Ensure all content is visible */
                body.screenshot-mode main {
                    visibility: visible !important;
                    opacity: 1 !important;
                    height: auto !important;
                }
                
                /* Prevent header hiding while taking screenshot */
                body.screenshot-mode .premium-header {
                    transform: none !important;
                    -webkit-transform: none !important;
                }
                
                /* Fix positioning issues */
                body.screenshot-mode {
                    position: relative !important;
                    height: auto !important;
                    overflow: visible !important;
                }
                
                /* Ensure all sections are visible */
                body.screenshot-mode section {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    height: auto !important;
                    min-height: auto !important;
                    overflow: visible !important;
                    position: relative !important;
                }
                
                /* Make fixed elements absolute for proper screenshot */
                body.screenshot-mode [style*="position: fixed"]:not(#screenshot-mode-toggle),
                body.screenshot-mode [style*="position:fixed"]:not(#screenshot-mode-toggle),
                body.screenshot-mode .premium-header {
                    position: absolute !important;
                }
                
                /* Ensure the footer is visible */
                body.screenshot-mode #footer-container {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    position: relative !important;
                }
            `;
            document.head.appendChild(styleEl);
            
            // Force layout recalculation to ensure all content is properly laid out
            document.body.style.display = 'none';
            setTimeout(() => {
                document.body.style.display = '';
            }, 10);
            
        } else {
            // Remove screenshot-specific style fixes
            const styleEl = document.getElementById('screenshot-fixes-style');
            if (styleEl) {
                styleEl.remove();
            }
        }
    }
    
    /**
     * Show a notification message
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `screenshot-notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = type === 'success' ? '#1A3C34' : '#3D5A80';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.style.zIndex = '999999';
        notification.style.fontFamily = 'Poppins, sans-serif';
        notification.style.fontSize = '14px';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        notification.style.transition = 'all 0.3s ease';
        
        // Add to document
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    /**
     * Initialize the screenshot mode functionality
     */
    function init() {
        // Create the toggle button
        createScreenshotToggle();
        
        // Add shortcut key (Alt+S) for toggling screenshot mode
        document.addEventListener('keydown', function(e) {
            // Check for Alt+S
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                toggleScreenshotMode();
            }
        });
        
        // Add the screenshot mode CSS
        const linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = 'styles/screenshot-fix.css';
        document.head.appendChild(linkEl);
        
        logInfo('Screenshot mode initialized. Press Alt+S or use the button to toggle.');
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 