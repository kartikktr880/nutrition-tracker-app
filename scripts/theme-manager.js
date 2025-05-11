/**
 * Dark Mode Theme Manager
 * Forces dark mode across the site
 */
class ThemeManager {
    constructor() {
        this.init();
    }

    /**
     * Initialize the theme manager - forces dark mode
     */
    init() {
        // Always use dark mode
        this.setDarkMode();
        
        // Hide all theme toggle buttons
        this.hideThemeToggles();
        
        // console.log('Dark Mode Theme manager initialized');
    }

    /**
     * Set the theme to dark mode
     */
    setDarkMode() {
        document.documentElement.classList.add('dark-mode', 'dark-theme');
        document.body.classList.add('dark-theme');
        
        // Save preference
        localStorage.setItem('darkMode', 'true');
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', '#121212');
        }
        
        // console.log('Dark mode enforced');
    }

    /**
     * Get the current theme - always returns 'dark'
     * @returns {string} 'dark'
     */
    getCurrentTheme() {
        return 'dark';
    }
    
    /**
     * Hide all theme toggle elements
     */
    hideThemeToggles() {
        // Find all theme toggle buttons in the document
        const themeToggles = document.querySelectorAll('.theme-toggle, #theme-toggle-btn');
        
        themeToggles.forEach(toggle => {
            if (!toggle) return;
            
            // Hide the toggle button
            toggle.style.display = 'none';
            toggle.setAttribute('aria-hidden', 'true');
            
            // Find moon icon and ensure it's shown (for any styling that might depend on it)
            const moonIcon = toggle.querySelector('.moon-icon');
            if (moonIcon) {
                Object.assign(moonIcon.style, {
                    display: 'block',
                    opacity: '1',
                    visibility: 'visible',
                    position: 'absolute',
                    zIndex: '10'
                });
            }
            
            // Find sun icon and ensure it's hidden
            const sunIcon = toggle.querySelector('.sun-icon');
            if (sunIcon) {
                Object.assign(sunIcon.style, {
                    display: 'none',
                    opacity: '0',
                    visibility: 'hidden',
                    position: 'absolute',
                    zIndex: '-1'
                });
            }
        });
        
        // console.log('Theme toggles hidden');
    }
}

// Initialize the theme manager
window.themeManager = new ThemeManager(); 