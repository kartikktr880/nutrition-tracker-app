/**
 * Apply Enhanced Fixes Script
 * This script applies all visual fixes across the entire website
 */

(function() {
    // Configuration
    const config = {
        // Core files to include on all pages
        coreScripts: [
            'scripts/immediate-scroll-fix.js',
            'scripts/enhanced-header-scroll.js',
            'scripts/smooth-scroll-fix.js'
        ],
        coreStyles: [
            'styles/enhanced-scroll-fix.css'
        ],
        // Target all HTML files
        pageExtensions: ['.html'],
        // Debug mode
        debug: false
    };
    
    // Track which files have been fixed
    const fixedFiles = [];
    
    /**
     * Apply fixes to the current page
     */
    function applyFixesToCurrentPage() {
        try {
            // 1. Apply critical immediate fixes
            applyImmediateScrollFix();
            
            // 2. Add enhanced styles
            loadStyles();
            
            // 3. Load core scripts after a short delay to ensure DOM is ready
            setTimeout(() => {
                loadScripts();
            }, 100);
            
            // 4. Fix specific elements that might cause layout issues
            fixLayoutProblems();
            
            // Log success
            if (config.debug) {
                console.log('✅ Enhanced fixes applied to current page');
            }
        } catch (error) {
            console.error('❌ Error applying fixes:', error);
        }
    }
    
    /**
     * Apply immediate critical fixes
     */
    function applyImmediateScrollFix() {
        // Apply core fixes directly in-line for fastest execution
        const criticalCss = `
            /* Prevent horizontal scrollbars */
            html, body {
                overflow-x: hidden !important;
                max-width: 100% !important;
                width: 100% !important;
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
        `;
        
        // Apply the critical CSS immediately
        const style = document.createElement('style');
        style.id = 'critical-fixes';
        style.innerHTML = criticalCss;
        document.head.appendChild(style);
    }
    
    /**
     * Load enhanced styles
     */
    function loadStyles() {
        config.coreStyles.forEach(stylesheet => {
            if (!document.querySelector(`link[href="${stylesheet}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = stylesheet;
                document.head.appendChild(link);
                
                if (config.debug) {
                    console.log(`Added stylesheet: ${stylesheet}`);
                }
            }
        });
    }
    
    /**
     * Load core scripts
     */
    function loadScripts() {
        config.coreScripts.forEach(script => {
            if (!document.querySelector(`script[src="${script}"]`)) {
                const scriptEl = document.createElement('script');
                scriptEl.src = script;
                scriptEl.async = false; // Important: maintain execution order
                document.body.appendChild(scriptEl);
                
                if (config.debug) {
                    console.log(`Added script: ${script}`);
                }
            }
        });
    }
    
    /**
     * Fix specific elements that might cause layout issues
     */
    function fixLayoutProblems() {
        // 1. Remove any large spacer divs causing overflow
        const possibleSpacers = document.querySelectorAll('div[style*="width:100vw"], div[style*="width: 100vw"]');
        possibleSpacers.forEach(spacer => {
            if (spacer.children.length === 0 && !spacer.textContent.trim()) {
                // This is likely just a spacer causing problems
                spacer.style.maxWidth = '100%';
                spacer.style.width = '100%';
                spacer.style.overflowX = 'hidden';
                spacer.style.marginLeft = '0';
                spacer.style.marginRight = '0';
                
                if (config.debug) {
                    console.log('Fixed problematic spacer div:', spacer);
                }
            }
        });
        
        // 2. Fix footer positioning
        const footer = document.querySelector('footer');
        if (footer) {
            footer.style.width = '100%';
            footer.style.maxWidth = '100%';
            footer.style.overflowX = 'hidden';
            
            if (config.debug) {
                console.log('Fixed footer positioning');
            }
        }
        
        // 3. Fix container elements
        const containers = document.querySelectorAll('.container, .container-fluid, main, section');
        containers.forEach(container => {
            container.style.maxWidth = '100%';
            container.style.overflowX = 'hidden';
        });
    }
    
    /**
     * Initialize fixes on page load
     */
    function init() {
        // Apply fixes to current page
        applyFixesToCurrentPage();
        
        // Track successful fixes
        const currentPage = window.location.pathname;
        fixedFiles.push(currentPage);
        
        if (config.debug) {
            console.log(`Fixed page: ${currentPage}`);
            console.log('All fixed pages:', fixedFiles);
        }
    }
    
    // Run on DOMContentLoaded for best compatibility
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded, run immediately
        init();
    }
    
    // Also run on load to catch any late-loading resources
    window.addEventListener('load', () => {
        // Double-check fixes after all resources load
        fixLayoutProblems();
    });
})(); 