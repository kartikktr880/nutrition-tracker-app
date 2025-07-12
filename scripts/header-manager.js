import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Header Manager
 * Consolidated module for handling all header-related functionality
 * Combines scroll behavior, styling, and performance optimizations
 */

class HeaderManager {
    constructor(options = {}) {
        this.lastScrollTop = 0;
        this.isHeaderVisible = true;
        this.scrollThreshold = options.scrollThreshold || 10; // Increased threshold
        this.ticking = false;
        this.headers = [];
        this.styleElement = null;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.transitionDuration = this.prefersReducedMotion ? '0.1s' : '0.2s'; // Faster transitions
        this.performanceMode = this.detectPerformanceMode();
    }

    /**
     * Detect if device needs performance optimizations
     */
    detectPerformanceMode() {
        const isLowEnd = navigator.hardwareConcurrency <= 4;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        return isLowEnd || isMobile;
    }

    /**
     * Initialize the header manager
     */
    init() {
        try {
            this.headers = Array.from(document.querySelectorAll('.premium-header'));
            if (this.headers.length === 0) {
                logWarn('HeaderManager: No premium-header elements found');
                return;
            }

            this.setupStyles();
            this.setupEventListeners();
            this.handleHeaderScroll();
        } catch (error) {
            logError('HeaderManager initialization failed:', error);
        }
    }

    /**
     * Setup all necessary styles
     */
    setupStyles() {
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'header-manager-styles';
        this.styleElement.textContent = `
            /* Core header styles */
            .premium-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                background: var(--header-bg, #ffffff);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: transform ${this.transitionDuration} ease;
                will-change: transform;
            }

            /* Header visibility states */
            .premium-header.header-hidden {
                transform: translateY(-100%);
            }

            /* Scroll performance optimizations */
            body.is-scrolling * {
                transition: none !important;
                animation: none !important;
                will-change: auto !important;
            }

            /* Hardware acceleration */
            .premium-header {
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
                -webkit-perspective: 1000;
                perspective: 1000;
                transform: translate3d(0,0,0);
            }

            /* Scroll behavior */
            html {
                scroll-behavior: ${this.prefersReducedMotion ? 'auto' : 'smooth'};
            }

            /* Prevent horizontal scroll */
            html, body {
                overflow-x: hidden;
                overscroll-behavior-x: none;
                -webkit-overflow-scrolling: touch;
                max-width: 100vw;
            }

            /* Performance mode optimizations */
            .performance-mode .premium-header {
                transition: none;
                will-change: auto;
            }
        `;
        document.head.appendChild(this.styleElement);

        // Apply performance mode class if needed
        if (this.performanceMode) {
            document.body.classList.add('performance-mode');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        window.addEventListener('resize', this.handleHeaderScroll.bind(this), { passive: true });
        
        // Listen for reduced motion preference changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.prefersReducedMotion = e.matches;
            this.updateTransitionDuration();
        });
    }

    /**
     * Update transition duration based on preferences
     */
    updateTransitionDuration() {
        this.transitionDuration = this.prefersReducedMotion ? '0.1s' : '0.2s';
        if (this.styleElement) {
            this.styleElement.textContent = this.styleElement.textContent.replace(
                /transition: transform .*?;/,
                `transition: transform ${this.transitionDuration} ease;`
            );
        }
    }

    /**
     * Handle scroll events with throttling
     */
    handleScroll() {
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.handleHeaderScroll();
                this.ticking = false;
            });
            this.ticking = true;
        }

        // Add scrolling class
        document.body.classList.add('is-scrolling');
        
        // Remove scrolling class after delay
        clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(() => {
            document.body.classList.remove('is-scrolling');
        }, 100);
    }

    /**
     * Handle header visibility based on scroll position
     */
    handleHeaderScroll() {
        try {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            // Always show header at top
            if (scrollTop <= this.scrollThreshold) {
                this.headers.forEach(header => {
                    header.classList.remove('header-hidden');
                });
                this.isHeaderVisible = true;
                this.lastScrollTop = scrollTop;
                return;
            }

            // Handle scroll direction
            if (scrollTop > this.lastScrollTop && this.isHeaderVisible && scrollTop > 80) {
                this.headers.forEach(header => {
                    header.classList.add('header-hidden');
                });
                this.isHeaderVisible = false;
            } else if (scrollTop < this.lastScrollTop && !this.isHeaderVisible) {
                this.headers.forEach(header => {
                    header.classList.remove('header-hidden');
                });
                this.isHeaderVisible = true;
            }

            this.lastScrollTop = scrollTop;
        } catch (error) {
            logError('Error handling header scroll:', error);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new HeaderManager().init();
    });
} else {
    new HeaderManager().init();
} 