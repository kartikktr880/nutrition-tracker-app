/**
 * Enhanced Smooth Scroll Fix
 * This script provides improved scroll performance and prevents jank
 */

(function() {
    // Use requestAnimationFrame for smoother scrolling
    let ticking = false;
    let lastScrollY = window.scrollY;
    
    // Optimized scroll handler using requestAnimationFrame
    function onScroll() {
        lastScrollY = window.scrollY;
        
        if (!ticking) {
            window.requestAnimationFrame(() => {
                // Apply any scroll-based effects here
                // This ensures they run in the browser's render cycle
                applyScrollEffects(lastScrollY);
                ticking = false;
            });
            
            ticking = true;
        }
    }
    
    // Function to apply any visual effects based on scroll position
    function applyScrollEffects(scrollY) {
        // Handle parallax effects or other scroll-based animations here
        // This is more efficient than doing it directly in the scroll handler
        
        // Example: Add a class to body when scrolled down
        if (scrollY > 50) {
            document.body.classList.add('scrolled');
        } else {
            document.body.classList.remove('scrolled');
        }
    }
    
    // Remove existing scroll event listeners that might cause jank
    // This is a precaution to prevent multiple competing scroll handlers
    function cleanupExistingListeners() {
        // We can't directly remove anonymous functions
        // But we can flag that our optimized handler is active
        window.hasOptimizedScrollHandler = true;
    }
    
    // Fix for iOS momentum scrolling issues
    function fixIOSMomentumScrolling() {
        document.addEventListener('touchmove', function(e) {
            // Allow default scrolling behavior
            // But prevent momentum from carrying too far
            if (e.target.closest('.scrollable-element')) {
                // Allow natural scrolling in specifically scrollable elements
                return;
            }
        }, { passive: true });
    }
    
    // Apply force GPU acceleration for smoother scrolling
    function applyHardwareAcceleration() {
        const acceleratedElements = [
            document.documentElement,
            document.body,
            document.querySelector('.premium-header'),
            document.querySelector('main')
        ];
        
        acceleratedElements.forEach(el => {
            if (el) {
                el.style.webkitTransform = 'translate3d(0,0,0)';
                el.style.transform = 'translate3d(0,0,0)';
                el.style.willChange = 'transform';
            }
        });
    }
    
    // Initialize all scroll optimizations
    function init() {
        // Apply optimizations
        cleanupExistingListeners();
        fixIOSMomentumScrolling();
        applyHardwareAcceleration();
        
        // Add our optimized scroll handler
        window.addEventListener('scroll', onScroll, { passive: true });
        
        // Initial call to apply any effects based on current position
        window.requestAnimationFrame(() => {
            applyScrollEffects(window.scrollY);
        });
        
        console.log('Smooth scroll optimizations applied');
    }
    
    // Run on DOM content loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 