import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Theme Manager for Nutrition Tracker
 * Handles theme switching, system preference detection, and theme persistence
 */
class ThemeManager {
    constructor() {
        this.THEME_CHANGE_EVENT = 'themechange';
        this.TRANSITION_DURATION = 300;
        this.STORAGE_KEY = 'preferred-theme';
        this.isTransitioning = false;
        this.themeChangeTimeout = null;
        
        // Store bound methods as instance properties
        this._boundToggleTheme = this.toggleTheme.bind(this);
        this._boundHandleSystemThemeChange = this.handleSystemThemeChange.bind(this);
        
        // Initialize system theme detection
        this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Initialize theme toggle
        this.themeToggle = document.querySelector('.theme-toggle');
        
        this.init();
    }

    /**
     * Initialize the theme manager
     */
    init() {
        // Add transition styles
        const style = document.createElement('style');
        style.textContent = `
            * {
                transition: background-color ${this.TRANSITION_DURATION}ms ease,
                            color ${this.TRANSITION_DURATION}ms ease,
                            border-color ${this.TRANSITION_DURATION}ms ease,
                            box-shadow ${this.TRANSITION_DURATION}ms ease;
            }
        `;
        document.head.appendChild(style);

        // Initialize theme
        this.setTheme(this.getCurrentTheme());
        
        // Listen for system theme changes
        if (window.matchMedia) {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.mediaQuery.addListener(() => this.handleSystemThemeChange());
        }
    }

    /**
     * Get saved theme preference
     * @returns {string|null} The saved theme or null if not set
     */
    getSavedTheme() {
        try {
            return localStorage.getItem(this.STORAGE_KEY);
        } catch (error) {
            logWarn('Failed to read theme from localStorage:', error);
            return null;
        }
    }

    /**
     * Save theme preference
     * @param {string} theme - The theme to save
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
        } catch (error) {
            logWarn('Failed to save theme to localStorage:', error);
        }
    }

    /**
     * Set the theme
     * @param {string} theme - 'light' or 'dark'
     */
    setTheme(theme) {
        // Clear any pending theme changes
        if (this.themeChangeTimeout) {
            clearTimeout(this.themeChangeTimeout);
        }

        // Debounce theme changes
        this.themeChangeTimeout = setTimeout(() => {
            document.documentElement.className = theme;
            localStorage.setItem(this.STORAGE_KEY, theme);
            
            // Update meta theme color
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', theme === 'dark' ? '#1A3C34' : '#ffffff');
            }

            // Dispatch theme change event
            this.dispatchThemeEvent(theme);
        }, 100);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }

    /**
     * Update meta theme color
     * @param {string} theme - The current theme
     */
    updateMetaThemeColor(theme) {
        try {
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', 
                    theme === 'dark' ? '#121212' : '#FFFFFF'
                );
            }
        } catch (error) {
            logWarn('Failed to update meta theme color:', error);
        }
    }

    /**
     * Initialize theme toggle button
     */
    initThemeToggle() {
        if (!this.themeToggle) return;
        
        try {
            this.themeToggle.addEventListener('click', this._boundToggleTheme);
            
            // Add keyboard accessibility
            this.themeToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._boundToggleTheme();
                }
            });
            
            // Set initial state
            const currentTheme = document.documentElement.className;
            this.themeToggle.setAttribute('aria-label', 
                `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`
            );
        } catch (error) {
            logError('Failed to initialize theme toggle:', error);
        }
    }

    /**
     * Listen for system theme changes
     */
    initSystemThemeListener() {
        try {
            this.systemThemeQuery.addEventListener('change', this._boundHandleSystemThemeChange);
        } catch (error) {
            logError('Failed to initialize system theme listener:', error);
        }
    }

    /**
     * Handle system theme changes
     */
    handleSystemThemeChange() {
        // Only update if user hasn't set a preference
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            this.setTheme(this.getCurrentTheme());
        }
    }

    /**
     * Dispatch theme change event
     * @param {string} theme - The current theme
     */
    dispatchThemeEvent(theme) {
        try {
            const event = new CustomEvent(this.THEME_CHANGE_EVENT, {
                detail: { theme }
            });
            document.dispatchEvent(event);
        } catch (error) {
            logWarn('Failed to dispatch theme event:', error);
        }
    }

    /**
     * Cleanup theme manager
     */
    cleanup() {
        try {
            if (this.themeToggle) {
                this.themeToggle.removeEventListener('click', this._boundToggleTheme);
            }
            this.systemThemeQuery.removeEventListener('change', this._boundHandleSystemThemeChange);
        } catch (error) {
            logError('Failed to cleanup theme manager:', error);
        }
    }

    getCurrentTheme() {
        return localStorage.getItem(this.STORAGE_KEY) || 
               (this.systemThemeQuery.matches ? 'dark' : 'light');
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();
window.themeManager = themeManager;
document.addEventListener('DOMContentLoaded', () => themeManager.init()); 