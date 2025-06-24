/**
 * Scroll Optimizer
 * Optimizes scroll performance and handles scroll-based animations
 */

class ScrollOptimizer {
    constructor() {
        this.scrollCallbacks = new Map();
        this.throttleDelay = 16; // ~60fps
        this.lastScrollTime = 0;
        this.scrollDirection = 'none';
        this.lastScrollY = 0;
        this.scrollThreshold = 5; // pixels
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.performanceMode = false;
        this.observers = new Set();
    }

    init() {
        this.setupScrollListener();
        this.setupResizeListener();
        this.setupPerformanceMode();
    }

    setupScrollListener() {
        window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    }

    setupResizeListener() {
        window.addEventListener('resize', this.handleResize.bind(this), { passive: true });
    }

    setupPerformanceMode() {
        // Check if device is low-end
        if (navigator.hardwareConcurrency <= 4 || !navigator.hardwareConcurrency) {
            this.enablePerformanceMode();
        }

        // Listen for performance issues
        if (window.performanceMonitor) {
            window.performanceMonitor.addObserver(this.handlePerformanceIssues.bind(this));
        }
    }

    handleScroll(event) {
        const now = performance.now();
        const timeSinceLastScroll = now - this.lastScrollTime;

        // Throttle scroll events
        if (timeSinceLastScroll < this.throttleDelay) {
            return;
        }

        this.lastScrollTime = now;
        this.updateScrollDirection();
        this.processScrollCallbacks();
        this.updateScrollState();
    }

    handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.processScrollCallbacks();
        }, 100);
    }

    handlePerformanceIssues(data) {
        if (data.type === 'performanceIssues') {
            const hasCriticalIssues = data.issues.some(issue => issue.severity === 'critical');
            if (hasCriticalIssues) {
                this.enablePerformanceMode();
            }
        }
    }

    updateScrollDirection() {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - this.lastScrollY;

        if (Math.abs(scrollDelta) < this.scrollThreshold) {
            this.scrollDirection = 'none';
        } else {
            this.scrollDirection = scrollDelta > 0 ? 'down' : 'up';
        }

        this.lastScrollY = currentScrollY;
    }

    processScrollCallbacks() {
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        this.scrollCallbacks.forEach((callback, element) => {
            if (!element || !element.isConnected) {
                this.scrollCallbacks.delete(element);
                return;
            }

            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + scrollY;
            const elementBottom = elementTop + rect.height;
            const elementHeight = rect.height;

            // Calculate visibility
            const visibleTop = Math.max(scrollY, elementTop);
            const visibleBottom = Math.min(scrollY + viewportHeight, elementBottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibility = visibleHeight / elementHeight;

            // Calculate progress
            const progress = this.calculateProgress(
                elementTop,
                elementBottom,
                elementHeight,
                scrollY,
                viewportHeight,
                documentHeight
            );

            // Execute callback with optimized parameters
            callback({
                element,
                scrollY,
                direction: this.scrollDirection,
                visibility,
                progress,
                rect,
                isVisible: visibility > 0,
                isFullyVisible: visibility === 1,
                isAboveViewport: elementBottom < scrollY,
                isBelowViewport: elementTop > scrollY + viewportHeight
            });
        });
    }

    calculateProgress(elementTop, elementBottom, elementHeight, scrollY, viewportHeight, documentHeight) {
        const viewportCenter = scrollY + viewportHeight / 2;
        const elementCenter = elementTop + elementHeight / 2;
        const distance = Math.abs(viewportCenter - elementCenter);
        const maxDistance = viewportHeight / 2 + elementHeight / 2;

        return Math.max(0, Math.min(1, 1 - distance / maxDistance));
    }

    updateScrollState() {
        this.isScrolling = true;
        clearTimeout(this.scrollTimeout);

        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
            this.notifyObservers({ type: 'scrollEnd' });
        }, 150);
    }

    addScrollCallback(element, callback) {
        if (!element || typeof callback !== 'function') return;

        this.scrollCallbacks.set(element, callback);
        this.processScrollCallbacks(); // Initial callback
    }

    removeScrollCallback(element) {
        this.scrollCallbacks.delete(element);
    }

    enablePerformanceMode() {
        if (this.performanceMode) return;

        this.performanceMode = true;
        this.throttleDelay = 32; // ~30fps
        this.scrollThreshold = 10; // pixels

        // Notify observers
        this.notifyObservers({ type: 'performanceMode', enabled: true });
    }

    disablePerformanceMode() {
        if (!this.performanceMode) return;

        this.performanceMode = false;
        this.throttleDelay = 16; // ~60fps
        this.scrollThreshold = 5; // pixels

        // Notify observers
        this.notifyObservers({ type: 'performanceMode', enabled: false });
    }

    addObserver(observer) {
        this.observers.add(observer);
    }

    removeObserver(observer) {
        this.observers.delete(observer);
    }

    notifyObservers(data) {
        this.observers.forEach(observer => {
            try {
                observer(data);
            } catch (error) {
                console.error('Error in scroll observer:', error);
            }
        });
    }

    getScrollState() {
        return {
            direction: this.scrollDirection,
            isScrolling: this.isScrolling,
            performanceMode: this.performanceMode,
            scrollY: window.scrollY,
            viewportHeight: window.innerHeight,
            documentHeight: document.documentElement.scrollHeight
        };
    }
}

// Create singleton instance
const scrollOptimizer = new ScrollOptimizer();

// Export singleton instance
export default scrollOptimizer; 