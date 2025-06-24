/**
 * Fix Header Scroll
 * This script ensures the header properly hides and shows during scrolling
 */

(function() {
    // Header scroll behavior variables
    let lastScrollTop = 0;
    let isHeaderVisible = true;
    const scrollThreshold = 5; // Lower threshold for more responsive behavior
    let ticking = false;
    
    /**
     * Handle header visibility on scroll
     * Force the header to hide/show based on scroll direction
     */
    function handleHeaderScroll() {
        const header = document.querySelector('.premium-header');
        if (!header) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Always show header when at the top
        if (scrollTop <= 10) {
            header.classList.remove('header-hidden');
            isHeaderVisible = true;
            lastScrollTop = scrollTop;
            return;
        }
        
        // Scrolling down & header is visible -> hide it
        if (scrollTop > lastScrollTop && isHeaderVisible && scrollTop > 80) {
            header.classList.add('header-hidden');
            isHeaderVisible = false;
        }
        // Scrolling up & header is hidden -> show it
        else if (scrollTop < lastScrollTop && !isHeaderVisible) {
            header.classList.remove('header-hidden');
            isHeaderVisible = true;
        }
        
        lastScrollTop = scrollTop;
    }
    
    /**
     * Optimize scrolling performance by removing unnecessary animations
     * during scroll and disabling expensive CSS properties
     */
    function optimizeScrollPerformance() {
        // Add a class to the body during scrolling that can disable animations
        document.body.classList.add('is-scrolling');
        
        // Create style element to inject optimizations
        const styleEl = document.createElement('style');
        styleEl.id = 'scroll-performance-optimizations';
        styleEl.innerHTML = `
            /* Disable expensive animations during scroll */
            body.is-scrolling * {
                transition: none !important;
                animation: none !important;
                will-change: auto !important;
            }
            
            /* Force hardware acceleration on critical scroll elements */
            html, body, .premium-header, main, section {
                -webkit-backface-visibility: hidden;
                -webkit-perspective: 1000;
                backface-visibility: hidden;
                perspective: 1000;
                transform: translate3d(0,0,0);
            }
            
            /* Optimize header animations specifically */
            .premium-header {
                transition: transform 0.3s ease !important;
                will-change: transform !important;
            }
            
            .premium-header.header-hidden {
                transform: translateY(-100%) !important;
            }
            
            /* Force smooth scrolling */
            html {
                scroll-behavior: smooth !important;
            }
            
            /* Remove any interference with the scrolling */
            html, body {
                overflow-x: hidden !important;
                overscroll-behavior-x: none !important;
                -webkit-overflow-scrolling: touch !important;
                max-width: 100vw !important;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    /**
     * Unified scroll handler with throttling
     */
    function handleScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleHeaderScroll();
                ticking = false;
            });
            ticking = true;
        }
        
        // Remove scrolling class after a short delay
        clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(() => {
            document.body.classList.remove('is-scrolling');
        }, 100);
    }
    
    /**
     * Initialize the script
     */
    function init() {
        // Apply initial scroll performance optimizations
        optimizeScrollPerformance();
        
        // Add scroll listener with passive flag for better performance
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Force header to correct state on initial load
        handleHeaderScroll();
        
        // Handle scrolling on resize too
        window.addEventListener('resize', () => {
            handleHeaderScroll();
        }, { passive: true });
        
        // Make sure header has proper transition
        const header = document.querySelector('.premium-header');
        if (header) {
            header.style.transition = 'transform 0.3s ease';
            header.style.willChange = 'transform';
        }
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 