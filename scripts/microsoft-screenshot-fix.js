/**
 * Microsoft Screenshot Fix
 * This script specifically fixes issues with Microsoft's screenshot tool capture
 */

(function() {
    /**
     * Apply Microsoft-specific screenshot fixes
     */
    function applyMicrosoftScreenshotFixes() {
        // Create a style element for MS screenshot fixes
        const styleEl = document.createElement('style');
        styleEl.id = 'microsoft-screenshot-fixes';
        styleEl.textContent = `
            /* Fix for Microsoft's full-page screenshot tool */
            @media print, (-ms-high-contrast: active), (-ms-high-contrast: none) {
                /* Force visible overflow for Edge/IE */
                html, body {
                    overflow: visible !important;
                    height: auto !important;
                    width: auto !important;
                    max-width: none !important;
                    max-height: none !important;
                }
                
                /* Fix fixed positioning */
                .premium-header {
                    position: absolute !important;
                    print-color-adjust: exact !important;
                    -webkit-print-color-adjust: exact !important;
                }
                
                /* Ensure content is visible */
                main, section, .container {
                    height: auto !important;
                    min-height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                
                /* Fix gradients and backgrounds */
                body:before {
                    position: absolute !important;
                    content: "" !important;
                    height: 100% !important;
                    width: 100% !important;
                }
            }
            
            /* Always ensure these elements are visible */
            .hero-section, 
            .features-section,
            .steps-section,
            .testimonials-section,
            .cta-section,
            .newsletter-section,
            #footer-container {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                height: auto !important;
                min-height: auto !important;
                overflow: visible !important;
            }
            
            /* Fix contain properties that can break screenshots */
            section, 
            .container, 
            main, 
            .hero-section {
                contain: none !important;
                content-visibility: visible !important;
                overflow: visible !important;
                height: auto !important;
            }
            
            /* Ensure body always expands to fit all content */
            body {
                min-height: 100vh !important;
                height: auto !important;
                overflow-y: visible !important;
            }
        `;
        document.head.appendChild(styleEl);
        
        // Apply classes that help with screenshots
        document.documentElement.classList.add('capture-friendly');
        document.body.classList.add('capture-friendly');
        
        console.log('Applied Microsoft screenshot fixes');
    }
    
    /**
     * Create a specific Microsoft screenshot capture button
     */
    function createMicrosoftCaptureButton() {
        // Create button
        const button = document.createElement('button');
        button.id = 'ms-screenshot-fix-button';
        button.textContent = 'Fix Microsoft Screenshot';
        button.title = 'Apply fixes for Microsoft screenshot tools';
        
        // Style the button
        button.style.position = 'fixed';
        button.style.bottom = '70px';
        button.style.right = '20px';
        button.style.zIndex = '999999';
        button.style.background = '#3D5A80';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.padding = '8px 16px';
        button.style.fontFamily = 'Poppins, sans-serif';
        button.style.fontSize = '14px';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        
        // Add hover effect
        button.addEventListener('mouseover', function() {
            this.style.background = '#2C4F75';
            this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        });
        button.addEventListener('mouseout', function() {
            this.style.background = '#3D5A80';
            this.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        });
        
        // Add click handler
        button.addEventListener('click', function() {
            // Apply Microsoft-specific fixes
            applyMicrosoftScreenshotFixes();
            
            // Fix fixed positioning elements for Microsoft screenshots
            document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]').forEach(el => {
                if (el !== this && !el.id.includes('screenshot')) {
                    el.style.position = 'absolute';
                    el.setAttribute('data-original-position', 'fixed');
                }
            });
            
            // Force visible content
            document.querySelectorAll('section, .container, .hero-section').forEach(el => {
                el.style.height = 'auto';
                el.style.minHeight = 'auto';
                el.style.maxHeight = 'none';
                el.style.overflow = 'visible';
                el.style.display = 'block';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });
            
            // Show notification
            const notification = document.createElement('div');
            notification.id = 'ms-screenshot-notification';
            notification.textContent = 'Microsoft screenshot fixes applied. Take your screenshot now.';
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.background = '#1A3C34';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '4px';
            notification.style.zIndex = '999999';
            notification.style.fontFamily = 'Poppins, sans-serif';
            notification.style.textAlign = 'center';
            document.body.appendChild(notification);
            
            // Remove notification after 5 seconds
            setTimeout(() => {
                notification.remove();
            }, 5000);
            
            // Replace button with a reset button
            this.textContent = 'Reset Page Layout';
            this.style.background = '#FF8C42';
            this.removeEventListener('click', arguments.callee);
            this.addEventListener('click', resetPageLayout);
        });
        
        // Add to document
        document.body.appendChild(button);
    }
    
    /**
     * Reset the page layout after taking a screenshot
     */
    function resetPageLayout() {
        // Remove MS screenshot fixes style
        const styleEl = document.getElementById('microsoft-screenshot-fixes');
        if (styleEl) {
            styleEl.remove();
        }
        
        // Restore fixed positioning
        document.querySelectorAll('[data-original-position="fixed"]').forEach(el => {
            el.style.position = 'fixed';
            el.removeAttribute('data-original-position');
        });
        
        // Remove capture friendly classes
        document.documentElement.classList.remove('capture-friendly');
        document.body.classList.remove('capture-friendly');
        
        // Show notification
        const notification = document.createElement('div');
        notification.id = 'ms-screenshot-reset-notification';
        notification.textContent = 'Page layout restored.';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.background = '#3D5A80';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '999999';
        notification.style.fontFamily = 'Poppins, sans-serif';
        notification.style.textAlign = 'center';
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
        // Reset button
        const button = document.getElementById('ms-screenshot-fix-button');
        if (button) {
            button.textContent = 'Fix Microsoft Screenshot';
            button.style.background = '#3D5A80';
            button.removeEventListener('click', resetPageLayout);
            button.addEventListener('click', function() {
                applyMicrosoftScreenshotFixes();
                this.textContent = 'Reset Page Layout';
                this.style.background = '#FF8C42';
                this.removeEventListener('click', arguments.callee);
                this.addEventListener('click', resetPageLayout);
            });
        }
        
        console.log('Page layout reset after screenshot');
    }
    
    /**
     * Initialize Microsoft screenshot fixes
     */
    function init() {
        // Check if we're running in Microsoft Edge or using Windows
        const userAgent = navigator.userAgent.toLowerCase();
        const isMicrosoftBrowser = userAgent.indexOf('edge') > -1 || userAgent.indexOf('trident') > -1 || userAgent.indexOf('msie') > -1;
        const isWindows = userAgent.indexOf('windows') > -1;
        
        // Create Microsoft screenshot button only if using Windows or MS browser
        if (isWindows || isMicrosoftBrowser) {
            createMicrosoftCaptureButton();
            console.log('Microsoft screenshot fix initialized for Windows/Edge user');
        } else {
            // Still add the button for all users, just in case
            createMicrosoftCaptureButton();
            console.log('Microsoft screenshot fix initialized');
        }
        
        // Add keyboard shortcut (Alt+M) to apply Microsoft fixes
        document.addEventListener('keydown', function(e) {
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                applyMicrosoftScreenshotFixes();
                
                // Show notification
                const notification = document.createElement('div');
                notification.id = 'ms-screenshot-shortcut-notification';
                notification.textContent = 'Microsoft screenshot fixes applied (Alt+M). Take your screenshot now.';
                notification.style.position = 'fixed';
                notification.style.top = '20px';
                notification.style.left = '50%';
                notification.style.transform = 'translateX(-50%)';
                notification.style.background = '#1A3C34';
                notification.style.color = 'white';
                notification.style.padding = '10px 20px';
                notification.style.borderRadius = '4px';
                notification.style.zIndex = '999999';
                notification.style.fontFamily = 'Poppins, sans-serif';
                notification.style.textAlign = 'center';
                document.body.appendChild(notification);
                
                // Remove notification after 5 seconds
                setTimeout(() => {
                    notification.remove();
                }, 5000);
            } else if (e.altKey && e.key === 'r') {
                // Reset with Alt+R
                e.preventDefault();
                resetPageLayout();
            }
        });
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 