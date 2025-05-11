/**
 * Immediate Scroll Fix
 * This script applies critical fixes immediately, even before DOMContentLoaded
 * It's intentionally kept small and should be included directly in the head
 */

(function() {
    // Critical styles to fix scrollbars and header visibility issues
    const criticalCss = `
        /* Prevent horizontal scrollbars */
        html, body {
            overflow-x: hidden !important;
            max-width: 100vw !important;
            width: 100vw !important;
            margin: 0 !important;
            box-sizing: border-box !important;
        }
        
        /* Hide scrollbar */
        ::-webkit-scrollbar {
            width: 0px !important;
            height: 0px !important;
            background: transparent !important;
        }
        
        /* Firefox scrollbar */
        * {
            scrollbar-width: none !important;
        }
        
        /* Header critical styles */
        .premium-header {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            z-index: 99999 !important;
            will-change: transform !important;
            transition: transform 0.3s ease !important;
        }
        
        /* Ensure content doesn't cause overflow */
        main, section, div, .container {
            max-width: 100% !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
        }
        
        /* Force hardware acceleration for smoother scrolling */
        html, body, .premium-header, main {
            -webkit-transform: translate3d(0,0,0) !important;
            transform: translate3d(0,0,0) !important;
            -webkit-backface-visibility: hidden !important;
            backface-visibility: hidden !important;
        }
    `;
    
    // Apply critical CSS immediately
    const style = document.createElement('style');
    style.id = 'immediate-scroll-fix-styles';
    style.innerHTML = criticalCss;
    
    if (document.head) {
        document.head.appendChild(style);
    } else {
        // If head isn't available yet, use a MutationObserver to add it ASAP
        const observer = new MutationObserver(function(mutations) {
            if (document.head && !document.getElementById('immediate-scroll-fix-styles')) {
                document.head.appendChild(style);
                observer.disconnect();
            }
        });
        
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
    
    // Force-fix horizontal scrollbars right away and after a small delay
    function fixHorizontalScrollbars() {
        document.documentElement.style.overflowX = 'hidden';
        document.documentElement.style.maxWidth = '100vw';
        
        if (document.body) {
            document.body.style.overflowX = 'hidden';
            document.body.style.maxWidth = '100vw';
        }
    }
    
    // Run immediately
    fixHorizontalScrollbars();
    
    // Run again when DOM content loaded
    document.addEventListener('DOMContentLoaded', fixHorizontalScrollbars);
    
    // And again after load
    window.addEventListener('load', fixHorizontalScrollbars);
    
    // Also schedule a fix for slightly after page load
    window.addEventListener('load', function() {
        setTimeout(fixHorizontalScrollbars, 500);
    });
})(); 