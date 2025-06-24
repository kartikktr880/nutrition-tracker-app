/**
 * Unified Scroll Management System
 * Combines functionality from:
 * - scroll-optimizer.js
 * - scroll-manager.js
 * - fix-header-scroll.js
 * - enhanced-header-scroll.js
 * - gradient-scroll.js
 */

import performanceManager from './performance-manager.js';

class ScrollManager {
    constructor() {
        this.state = {
            scrollY: 0,
            scrollDirection: 'none',
            lastScrollY: 0,
            scrollProgress: 0,
            isScrolling: false,
            scrollTimeout: null
        };

        this.config = {
            throttleDelay: 16, // ~60fps
            scrollEndDelay: 150,
            headerThreshold: 100,
            gradientThreshold: 200,
            performanceMode: false
        };

        this.elements = {
            header: null, // Set in init
            gradient: null, // Set in init
            scrollElements: new Set()
        };

        this.observers = new Set();
        this.isInitialized = false;
        this.eventListeners = new Map();
        this.resizeTimeout = null;
        // Do not reference window or document here
    }

    /**
     * Call this method after instantiation to set up event listeners and DOM references.
     */
    init() {
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            this.elements.header = document.querySelector('header');
            this.elements.gradient = document.querySelector('.gradient-overlay');
            
            // Store bound event handlers
            const scrollHandler = this.handleScroll.bind(this);
            const resizeHandler = this.handleResize.bind(this);
            const cleanupHandler = this.cleanup.bind(this);
            
            // Add event listeners with stored references
            window.addEventListener('scroll', scrollHandler, { passive: true });
            window.addEventListener('resize', resizeHandler, { passive: true });
            window.addEventListener('beforeunload', cleanupHandler);
            
            // Store references for cleanup
            this.eventListeners.set('scroll', scrollHandler);
            this.eventListeners.set('resize', resizeHandler);
            this.eventListeners.set('beforeunload', cleanupHandler);
            
            this.applyScrollFixes();
            this.isInitialized = true;
        }
    }

    // Event listeners
    setupScrollListener() {
        let lastScrollTime = 0;
        const scrollHandler = () => {
            const now = performance.now();
            const delay = this.config.performanceMode ? 32 : this.config.throttleDelay;

            if (now - lastScrollTime >= delay) {
                lastScrollTime = now;
                this.handleScroll();
            }
        };

        window.addEventListener('scroll', scrollHandler, { passive: true });
        this.eventListeners.set('scroll', scrollHandler);
    }

    setupResizeListener() {
        const resizeHandler = () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.updateScrollElements();
            }, 100);
        };

        window.addEventListener('resize', resizeHandler, { passive: true });
        this.eventListeners.set('resize', resizeHandler);
    }

    setupPerformanceMode() {
        performanceManager.addObserver((type, data) => {
            if (type === 'metrics' && data.fps.current < 30) {
                this.config.performanceMode = true;
                this.config.throttleDelay = 32;
            } else {
                this.config.performanceMode = false;
                this.config.throttleDelay = 16;
            }
        });
    }

    // Scroll handling
    handleScroll() {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - this.state.lastScrollY;

        this.state = {
            ...this.state,
            scrollY: currentScrollY,
            scrollDirection: delta > 0 ? 'down' : delta < 0 ? 'up' : 'none',
            lastScrollY: currentScrollY,
            isScrolling: true
        };

        this.updateHeader();
        this.updateGradient();
        this.updateScrollElements();
        this.notifyObservers('scroll', this.state);

        // Clear scroll timeout
        clearTimeout(this.state.scrollTimeout);
        this.state.scrollTimeout = setTimeout(() => {
            this.state.isScrolling = false;
            this.notifyObservers('scrollEnd', this.state);
        }, this.config.scrollEndDelay);
    }

    // Header management
    updateHeader() {
        if (!this.elements.header) return;

        const { scrollY, scrollDirection } = this.state;
        const header = this.elements.header;

        if (scrollY > this.config.headerThreshold) {
            header.classList.add('header-scrolled');
            header.classList.toggle('header-hidden', scrollDirection === 'down');
            header.classList.toggle('header-visible', scrollDirection === 'up');
        } else {
            header.classList.remove('header-scrolled', 'header-hidden', 'header-visible');
        }
    }

    // Gradient management
    updateGradient() {
        if (!this.elements.gradient) return;

        const { scrollY } = this.state;
        const gradient = this.elements.gradient;
        const progress = Math.min(scrollY / this.config.gradientThreshold, 1);

        gradient.style.opacity = progress.toString();
    }

    // Scroll element management
    observeScrollElements() {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.elements.scrollElements.add(entry.target);
                    } else {
                        this.elements.scrollElements.delete(entry.target);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        document.querySelectorAll('[data-scroll]').forEach(element => {
            observer.observe(element);
        });
    }

    updateScrollElements() {
        const { scrollY } = this.state;
        const viewportHeight = window.innerHeight;

        this.elements.scrollElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + scrollY;
            const elementBottom = elementTop + rect.height;
            const viewportCenter = scrollY + viewportHeight / 2;
            const elementCenter = elementTop + rect.height / 2;
            const distance = Math.abs(viewportCenter - elementCenter);
            const maxDistance = viewportHeight / 2 + rect.height / 2;
            const progress = Math.max(0, Math.min(1, 1 - distance / maxDistance));

            element.style.setProperty('--scroll-progress', progress);
            element.classList.toggle('in-view', progress > 0);
        });
    }

    // Observer pattern
    addObserver(observer) {
        this.observers.add(observer);
    }

    removeObserver(observer) {
        this.observers.delete(observer);
    }

    notifyObservers(type, data) {
        this.observers.forEach(observer => {
            if (typeof observer === 'function') {
                observer(type, data);
            }
        });
    }

    // Utility methods
    getScrollProgress() {
        const { scrollY } = this.state;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        return maxScroll > 0 ? scrollY / maxScroll : 0;
    }

    isElementInView(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    }

    // State management
    getState() {
        return {
            ...this.state,
            config: this.config,
            elements: {
                header: !!this.elements.header,
                gradient: !!this.elements.gradient,
                scrollElements: this.elements.scrollElements.size
            }
        };
    }

    cleanup() {
        // Remove all event listeners
        this.eventListeners.forEach((handler, event) => {
            window.removeEventListener(event, handler);
        });
        this.eventListeners.clear();

        // Clear any pending timeouts
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }

        // Clear any other resources
        this.elements = {};
        this.isInitialized = false;
    }
}

// Export singleton instance
const scrollManager = new ScrollManager();
export default scrollManager;

// Add required styles
const style = document.createElement('style');
style.textContent = `
    .header-hidden {
        transform: translateY(-100%);
        transition: transform 0.3s ease-in-out;
    }

    .scroll-to-top {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
        z-index: 1000;
    }

    .scroll-to-top:hover {
        background: #0056b3;
    }

    .scroll-progress {
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: #007bff;
        z-index: 1001;
        transition: width 0.1s ease-out;
    }
`;
document.head.appendChild(style);

// Initialize scroll manager
window.scrollManager = new ScrollManager(); 