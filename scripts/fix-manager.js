import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Fix Manager
 * Unified system for managing UI fixes and enhancements
 */

import { performanceManager } from './performance-manager.js';
import { scrollManager } from './scroll-manager.js';

class FixManager {
    constructor() {
        this.state = {
            fixes: new Map(),
            observers: new Set(),
            isInitialized: false,
            debug: false
        };

        // Core fixes configuration
        this.config = {
            header: {
                fixed: true,
                gradient: true,
                scrollThreshold: 50
            },
            scroll: {
                smooth: true,
                preventJump: true,
                maintainPosition: true
            },
            footer: {
                fixed: true,
                removeSpacers: true
            },
            performance: {
                optimizeAnimations: true,
                reduceMotion: false
            }
        };
    }

    /**
     * Initialize the fix manager
     */
    init() {
        if (this.state.isInitialized) return;

        // Register with performance manager
        performanceManager.addObserver(this);

        // Register with scroll manager
        scrollManager.addObserver(this);

        // Apply initial fixes
        this.applyFixes();

        // Set up mutation observer for dynamic content
        this.setupMutationObserver();

        this.state.isInitialized = true;
        this.notifyObservers('init');
    }

    /**
     * Set up mutation observer for dynamic content
     */
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    this.handleDOMChanges(mutation);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Handle DOM changes
     */
    handleDOMChanges(mutation) {
        // Check for new elements that need fixes
        for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                this.applyFixesToElement(node);
            }
        }
    }

    /**
     * Apply all fixes
     */
    applyFixes() {
        this.applyHeaderFixes();
        this.applyScrollFixes();
        this.applyFooterFixes();
        this.applyPerformanceFixes();
    }

    /**
     * Apply header-related fixes
     */
    applyHeaderFixes() {
        const header = document.querySelector('.premium-header');
        if (!header) return;

        if (this.config.header.fixed) {
            header.style.position = 'fixed';
            header.style.top = '0';
            header.style.left = '0';
            header.style.right = '0';
            header.style.zIndex = '99999';
        }

        if (this.config.header.gradient) {
            this.applyHeaderGradient(header);
        }
    }

    /**
     * Apply header gradient effect
     */
    applyHeaderGradient(header) {
        const updateGradient = () => {
            const scrollY = window.scrollY;
            const opacity = Math.min(scrollY / this.config.header.scrollThreshold, 1);
            header.style.background = `linear-gradient(to bottom, 
                rgba(var(--surface-rgb), ${opacity}) 0%,
                rgba(var(--surface-rgb), ${opacity * 0.95}) 100%
            )`;
        };

        window.addEventListener('scroll', updateGradient);
        updateGradient(); // Initial state
    }

    /**
     * Apply scroll-related fixes
     */
    applyScrollFixes() {
        if (this.config.scroll.smooth) {
            document.documentElement.style.scrollBehavior = 'smooth';
        }

        if (this.config.scroll.preventJump) {
            this.preventScrollJump();
        }

        if (this.config.scroll.maintainPosition) {
            this.maintainScrollPosition();
        }
    }

    /**
     * Prevent scroll jump on page load
     */
    preventScrollJump() {
        const scrollPosition = sessionStorage.getItem('scrollPosition');
        if (scrollPosition) {
            window.scrollTo(0, parseInt(scrollPosition));
            sessionStorage.removeItem('scrollPosition');
        }
    }

    /**
     * Maintain scroll position during page transitions
     */
    maintainScrollPosition() {
        window.addEventListener('beforeunload', () => {
            sessionStorage.setItem('scrollPosition', window.scrollY.toString());
        });
    }

    /**
     * Apply footer-related fixes
     */
    applyFooterFixes() {
        const footer = document.querySelector('.footer');
        if (!footer) return;

        if (this.config.footer.fixed) {
            footer.style.position = 'relative';
            footer.style.bottom = '0';
            footer.style.width = '100%';
        }

        if (this.config.footer.removeSpacers) {
            this.removeFooterSpacers();
        }
    }

    /**
     * Remove unnecessary footer spacers
     */
    removeFooterSpacers() {
        const spacers = document.querySelectorAll('.footer-spacer');
        spacers.forEach(spacer => spacer.remove());
    }

    /**
     * Apply performance-related fixes
     */
    applyPerformanceFixes() {
        if (this.config.performance.optimizeAnimations) {
            this.optimizeAnimations();
        }

        if (this.config.performance.reduceMotion) {
            this.reduceMotion();
        }
    }

    /**
     * Optimize animations for better performance
     */
    optimizeAnimations() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        animatedElements.forEach(element => {
            element.style.willChange = 'transform, opacity';
            element.style.transform = 'translateZ(0)';
        });
    }

    /**
     * Reduce motion for better performance
     */
    reduceMotion() {
        document.documentElement.classList.add('reduced-motion');
    }

    /**
     * Add an observer
     */
    addObserver(observer) {
        this.state.observers.add(observer);
    }

    /**
     * Remove an observer
     */
    removeObserver(observer) {
        this.state.observers.delete(observer);
    }

    /**
     * Notify all observers
     */
    notifyObservers(event, data = {}) {
        this.state.observers.forEach(observer => {
            if (typeof observer === 'function') {
                observer(event, data);
            } else if (observer && typeof observer.update === 'function') {
                observer.update(event, data);
            }
        });
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        this.state.debug = true;
        logInfo('Fix Manager: Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        this.state.debug = false;
    }

    /**
     * Get current state
     */
    getState() {
        return {
            ...this.state,
            config: { ...this.config }
        };
    }
}

// Create and export singleton instance
const fixManager = new FixManager();
export default fixManager; 