import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * CSS Consolidator
 * Optimizes CSS loading and management
 */
class CSSConsolidator {
    constructor() {
        this.styles = new Map();
        this.consolidatedStyles = new Set();
        // Do not reference window or document here
    }

    /**
     * Call this method after instantiation to set up style consolidation.
     */
    init() {
        if (typeof document !== 'undefined') {
            this.consolidateExistingStyles();
            this.setupStyleObserver();
        }
    }

    /**
     * Consolidate existing styles
     */
    consolidateExistingStyles() {
        // Get all stylesheet links
        const styleLinks = Array.from(document.getElementsByTagName('link'))
            .filter(link => link.rel === 'stylesheet');

        // Process each stylesheet
        styleLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !this.consolidatedStyles.has(href)) {
                this.loadAndConsolidateStylesheet(href);
            }
        });
    }

    /**
     * Setup observer for new stylesheets
     */
    setupStyleObserver() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeName === 'LINK' && node.rel === 'stylesheet') {
                        const href = node.getAttribute('href');
                        if (href && !this.consolidatedStyles.has(href)) {
                            this.loadAndConsolidateStylesheet(href);
                        }
                    }
                });
            });
        });

        observer.observe(document.head, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Load and consolidate a stylesheet
     * @param {string} href - Stylesheet URL
     */
    async loadAndConsolidateStylesheet(href) {
        try {
            const response = await fetch(href);
            const css = await response.text();
            
            // Process and optimize CSS
            const optimizedCSS = this.optimizeCSS(css);
            
            // Create style element
            const style = document.createElement('style');
            style.textContent = optimizedCSS;
            document.head.appendChild(style);
            
            // Mark as consolidated
            this.consolidatedStyles.add(href);
            
            // Remove original link
            const originalLink = document.querySelector(`link[href="${href}"]`);
            if (originalLink) {
                originalLink.remove();
            }
        } catch (error) {
            logError(`Failed to consolidate stylesheet ${href}:`, error);
        }
    }

    /**
     * Optimize CSS
     * @param {string} css - CSS to optimize
     * @returns {string} - Optimized CSS
     */
    optimizeCSS(css) {
        // Remove comments
        css = css.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
        
        // Remove whitespace
        css = css.replace(/\s+/g, ' ');
        
        // Remove empty rules
        css = css.replace(/[^{}]*{\s*}/g, '');
        
        // Remove vendor prefixes that are no longer needed
        css = css.replace(/-webkit-|-moz-|-ms-|-o-/g, '');
        
        // Combine duplicate selectors
        const rules = new Map();
        css.split('}').forEach(rule => {
            if (rule.trim()) {
                const [selector, ...declarations] = rule.split('{');
                const key = selector.trim();
                const value = declarations.join('{').trim();
                
                if (rules.has(key)) {
                    rules.set(key, rules.get(key) + ';' + value);
                } else {
                    rules.set(key, value);
                }
            }
        });
        
        // Rebuild CSS
        return Array.from(rules.entries())
            .map(([selector, declarations]) => `${selector}{${declarations}}`)
            .join('\n');
    }

    /**
     * Add a new style rule
     * @param {string} selector - CSS selector
     * @param {Object} rules - CSS rules
     */
    addStyleRule(selector, rules) {
        const style = document.createElement('style');
        const cssText = Object.entries(rules)
            .map(([property, value]) => `${property}:${value}`)
            .join(';');
        
        style.textContent = `${selector}{${cssText}}`;
        document.head.appendChild(style);
    }
}

// Initialize CSS consolidator
window.cssConsolidator = new CSSConsolidator();
window.cssConsolidator.init(); 