/**
 * Theme Manager
 * Handles theme switching between light and dark mode
 */
class ThemeManager {
    constructor() {
        this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.init();
    }

    /**
     * Initialize the theme manager
     */
    init() {
        // Check for saved preference or use system preference
        const savedTheme = localStorage.getItem('darkMode');
        
        if (savedTheme !== null) {
            // Use saved preference
            this.setTheme(savedTheme === 'true');
        } else {
            // Use system preference
            this.setTheme(this.darkModeMediaQuery.matches);
        }

        // Listen for changes in system preference
        this.darkModeMediaQuery.addEventListener('change', e => {
            // Only apply if user hasn't set a preference
            if (localStorage.getItem('darkMode') === null) {
                this.setTheme(e.matches);
            }
        });

        console.log('Theme manager initialized');
    }

    /**
     * Set the theme to dark or light
     * @param {boolean} isDark - Whether to use dark mode
     */
    setTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            this.updateThemeToggleIcons(true);
        } else {
            document.body.classList.remove('dark-mode');
            this.updateThemeToggleIcons(false);
        }
        
        // Save preference
        localStorage.setItem('darkMode', isDark);
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', isDark ? '#121212' : '#1A3C34');
        }
        
        console.log(`Theme set to ${isDark ? 'dark' : 'light'} mode`);
    }

    /**
     * Toggle between dark and light mode
     */
    toggleTheme() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        this.setTheme(!isDarkMode);
        return !isDarkMode;
    }

    /**
     * Get the current theme
     * @returns {string} 'dark' or 'light'
     */
    getCurrentTheme() {
        return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    }
    
    /**
     * Update theme toggle icons across the site
     * @param {boolean} isDark - Whether dark mode is active
     */
    updateThemeToggleIcons(isDark) {
        // Update all theme toggle buttons in the document
        const themeToggles = document.querySelectorAll('.theme-toggle');
        
        themeToggles.forEach(toggle => {
            const moonIcon = toggle.querySelector('.fa-moon');
            const sunIcon = toggle.querySelector('.fa-sun');
            
            if (moonIcon && sunIcon) {
                if (isDark) {
                    moonIcon.style.display = 'none';
                    sunIcon.style.display = 'block';
                } else {
                    moonIcon.style.display = 'block';
                    sunIcon.style.display = 'none';
                }
            } else if (toggle.querySelector('i')) {
                // If toggle has a single icon element
                const icon = toggle.querySelector('i');
                
                if (isDark) {
                    icon.classList.replace('fa-moon', 'fa-sun');
                } else {
                    icon.classList.replace('fa-sun', 'fa-moon');
                }
            }
        });
    }
}

// Initialize the theme manager
window.themeManager = new ThemeManager(); 