/**
 * Enhanced Header Scroll
 * This script ensures proper header behavior during scrolling with optimized performance
 * This file completely overrides and improves upon previous header scroll solutions
 */

(function() {
    // Configuration
    const config = {
        headerSelector: '.premium-header',
        headerHiddenClass: 'header-hidden',
        scrollThreshold: 15, // Balance between responsiveness and stability
        topOffset: 10, // Always show header when within this many pixels from top
        headerHeight: 80, // Match the CSS header height
        debounceTime: 10, // Milliseconds to wait between scroll events (for performance)
        checkDelay: 100 // Milliseconds to wait before checking header after scroll stops
    };
    
    // State variables
    let lastScrollTop = 0;
    let isHeaderVisible = true;
    let ticking = false;
    let headerCheckTimeout;
    let premiumHeader = null;
    let isInitialized = false;
    
    /**
     * Get the header element
     * @returns {HTMLElement|null} The header element or null if not found
     */
    function getHeader() {
        if (!premiumHeader) {
            premiumHeader = document.querySelector(config.headerSelector);
        }
        return premiumHeader;
    }
    
    /**
     * Handle header visibility on scroll with improved decision making
     */
    function handleHeaderScroll() {
        const header = getHeader();
        if (!header) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Priority 1: Always show header at top of page
        if (scrollTop <= config.topOffset) {
            showHeader(header);
            lastScrollTop = scrollTop;
            return;
        }
        
        // Handle significant scroll events
        const scrollDelta = Math.abs(lastScrollTop - scrollTop);
        
        if (scrollDelta > config.scrollThreshold) {
            // Priority 2: Hide header when scrolling down significantly
            if (scrollTop > lastScrollTop && isHeaderVisible && scrollTop > config.headerHeight) {
                hideHeader(header);
            } 
            // Priority 3: Show header when scrolling up significantly
            else if (scrollTop < lastScrollTop && !isHeaderVisible) {
                showHeader(header);
            }
            
            lastScrollTop = scrollTop;
        }
        
        // Safety check: after scrolling stops, double-check header state
        clearTimeout(headerCheckTimeout);
        headerCheckTimeout = setTimeout(() => {
            // At top of page, ensure header is visible
            if (window.pageYOffset <= config.topOffset) {
                showHeader(header);
            }
        }, config.checkDelay);
    }
    
    /**
     * Show the header with proper animation
     * @param {HTMLElement} header - The header element
     */
    function showHeader(header) {
        if (!isHeaderVisible) {
            header.classList.remove(config.headerHiddenClass);
            isHeaderVisible = true;
        }
    }
    
    /**
     * Hide the header with proper animation
     * @param {HTMLElement} header - The header element
     */
    function hideHeader(header) {
        if (isHeaderVisible) {
            header.classList.add(config.headerHiddenClass);
            isHeaderVisible = false;
        }
    }
    
    /**
     * Apply critical scroll performance optimizations
     */
    function applyScrollOptimizations() {
        // Create a style element for scroll optimizations
        const styleEl = document.createElement('style');
        styleEl.id = 'enhanced-scroll-optimizations';
        styleEl.innerHTML = `
            /* Force hardware acceleration for primary elements */
            html, 
            body, 
            .premium-header, 
            main, 
            section {
                -webkit-backface-visibility: hidden !important;
                -moz-backface-visibility: hidden !important;
                backface-visibility: hidden !important;
                -webkit-perspective: 1000 !important;
                -moz-perspective: 1000 !important;
                perspective: 1000 !important;
                -webkit-transform: translate3d(0,0,0) !important;
                -moz-transform: translate3d(0,0,0) !important;
                transform: translate3d(0,0,0) !important;
            }
            
            /* Critical header styles to ensure proper behavior */
            .premium-header {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                height: ${config.headerHeight}px !important;
                z-index: 99999 !important;
                transition: transform 0.3s ease !important;
                will-change: transform !important;
                box-sizing: border-box !important;
            }
            
            /* Header hide/show animation */
            .premium-header.header-hidden {
                transform: translateY(-100%) !important;
                -webkit-transform: translateY(-100%) !important;
            }
            
            /* Force smooth scrolling */
            html {
                scroll-behavior: smooth !important;
                -webkit-overflow-scrolling: touch !important;
            }
            
            /* Prevent horizontal scrolling */
            html, body {
                overflow-x: hidden !important;
                max-width: 100vw !important;
                width: 100vw !important;
                overscroll-behavior-x: none !important;
                box-sizing: border-box !important;
                margin: 0 !important;
            }
            
            /* Ensure proper body padding for fixed header */
            body {
                padding-top: ${config.headerHeight}px !important;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    /**
     * Unified scroll handler with efficient throttling
     */
    function handleScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleHeaderScroll();
                ticking = false;
            });
            ticking = true;
        }
    }
    
    /**
     * Force a header check outside of the scroll event
     * Used when page loads or when content changes dramatically
     */
    function forceHeaderCheck() {
        setTimeout(() => {
            handleHeaderScroll();
        }, 50);
    }
    
    /**
     * Initialize the enhanced header scroll functionality
     */
    function init() {
        if (isInitialized) return;
        
        // Apply critical optimizations
        applyScrollOptimizations();
        
        // Ensure header exists and apply necessary styles
        const header = getHeader();
        if (header) {
            // Force header style reset
            header.style.transition = 'transform 0.3s ease';
            header.style.willChange = 'transform';
            
            // Set initial state (start visible)
            showHeader(header);
        }
        
        // Add scroll listener with passive flag for better performance
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Add resize listener to recheck header state
        window.addEventListener('resize', forceHeaderCheck, { passive: true });
        
        // Initial header check
        forceHeaderCheck();
        
        // Add class to track initialization
        document.documentElement.classList.add('enhanced-header-scroll-initialized');
        
        isInitialized = true;
        console.log('✅ Enhanced header scroll initialized');
    }
    
    // Run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // If page has been loaded for a while, force a check
    window.addEventListener('load', forceHeaderCheck);
    
    // Expose API for other scripts to use
    window.enhancedHeaderScroll = {
        forceCheck: forceHeaderCheck,
        showHeader: () => {
            const header = getHeader();
            if (header) showHeader(header);
        },
        hideHeader: () => {
            const header = getHeader();
            if (header) hideHeader(header);
        }
    };
})(); 