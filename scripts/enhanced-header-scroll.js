import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Enhanced Header Scroll Behavior
 * Improved header visibility management during scrolling
 */

(function() {
    // Header configuration
    const config = {
        headerSelector: '.premium-header',
        hiddenClass: 'header-hidden',
        visibleClass: 'header-visible',
        showHeaderAtTop: true,
        hideHeaderThreshold: 80, // px scrolled before header can hide
        scrollTolerance: 5, // Minimum px scrolled to trigger hide/show
        mobileBreakpoint: 768 // Pixel width considered mobile
    };
    
    // Elements and state variables
    let header;
    let lastScrollTop = 0;
    let isHeaderVisible = true;
    let isHeaderLocked = false;
    let isScrolling = false;
    let scrollTimeout;
    let isMobile = window.innerWidth < config.mobileBreakpoint;
    
    /**
     * Get all DOM references and initialize header state
     */
    function init() {
        header = document.querySelector(config.headerSelector);
        
        if (!header) {
            logWarn('Enhanced header scroll: Header element not found');
            return;
        }
        
        // Set initial state
        showHeader();
        
        // Add all event listeners
        window.addEventListener('scroll', handleScrollEvent, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });
        
        // Handle initial load position (if page is refreshed while scrolled down)
        if (window.scrollY > config.hideHeaderThreshold && !isMobile) {
            hideHeader();
        }
        
        // Add CSS class to indicate script is active
        document.documentElement.classList.add('enhanced-header-active');
        
        logInfo('Enhanced header scroll initialized');
    }
    
    /**
     * Main scroll handler - uses throttling for performance
     */
    function handleScrollEvent() {
        // Clear the timeout if it's set
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        
        // Set a timeout to run the actual scroll handler
        scrollTimeout = window.requestAnimationFrame(function() {
            processScroll();
        });
        
        // Set scrolling flag
        if (!isScrolling) {
            isScrolling = true;
            document.body.classList.add('is-scrolling');
        }
        
        // Clear scrolling flag after a delay
        clearTimeout(window.isScrollingTimeout);
        window.isScrollingTimeout = setTimeout(function() {
            isScrolling = false;
            document.body.classList.remove('is-scrolling');
        }, 100);
    }
    
    /**
     * Process the scroll position and update header visibility
     */
    function processScroll() {
        if (isHeaderLocked) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Always show header at top of page if that option is enabled
        if (config.showHeaderAtTop && scrollTop <= 10) {
            showHeader();
            lastScrollTop = scrollTop;
            return;
        }
        
        // On mobile, always show header
        if (isMobile) {
            showHeader();
            lastScrollTop = scrollTop;
            return;
        }
        
        // Determine scroll direction and distance
        const isScrollingDown = scrollTop > lastScrollTop;
        const scrollDistance = Math.abs(scrollTop - lastScrollTop);
        
        // Only process significant scroll events
        if (scrollDistance > config.scrollTolerance) {
            if (isScrollingDown && isHeaderVisible && scrollTop > config.hideHeaderThreshold) {
                hideHeader();
            } else if (!isScrollingDown && !isHeaderVisible) {
                showHeader();
            }
            
            lastScrollTop = scrollTop;
        }
    }
    
    /**
     * Makes the header visible
     */
    function showHeader() {
        if (!header || isHeaderVisible) return;
        
        header.classList.remove(config.hiddenClass);
        header.classList.add(config.visibleClass);
        isHeaderVisible = true;
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('headerVisible'));
    }
    
    /**
     * Hides the header
     */
    function hideHeader() {
        if (!header || !isHeaderVisible || isHeaderLocked) return;
        
        header.classList.add(config.hiddenClass);
        header.classList.remove(config.visibleClass);
        isHeaderVisible = false;
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('headerHidden'));
    }
    
    /**
     * Handle window resize events
     */
    function handleResize() {
        isMobile = window.innerWidth < config.mobileBreakpoint;
        
        // On mobile, always show header
        if (isMobile && !isHeaderVisible) {
            showHeader();
        }
    }
    
    /**
     * Public API for controlling header from other scripts
     */
    window.enhancedHeader = {
        show: function() {
            showHeader();
        },
        hide: function() {
            hideHeader();
        },
        lock: function() {
            isHeaderLocked = true;
            showHeader();
        },
        unlock: function() {
            isHeaderLocked = false;
            processScroll();
        }
    };
    
    // Run on DOM content loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 