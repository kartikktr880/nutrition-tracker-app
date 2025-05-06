/**
 * Dark Mode Enforcer
 * Forces dark mode on all pages and removes light mode support
 */

(function() {
    // Execute as soon as possible during page load
    function forceDarkMode() {
        // Add dark mode classes to html and body
        if (document.documentElement) {
            document.documentElement.classList.add('dark-mode', 'dark-theme');
            document.documentElement.classList.remove('light-mode', 'light-theme');
        }
        if (document.body) {
            document.body.classList.add('dark-theme', 'dark-mode', 'gradient-background');
            document.body.classList.remove('light-theme', 'light-mode');
        }
        
        // Store dark mode preference
        localStorage.setItem('darkMode', 'true');
        localStorage.setItem('dark-theme', 'true');
        localStorage.setItem('theme', 'dark');
        
        // Hide all theme toggle elements
        const themeToggleSelectors = [
            '.theme-toggle', 
            '#theme-toggle', 
            '.theme-switch', 
            '#theme-switch',
            '[data-theme-toggle]',
            '.toggle-theme',
            '.switch-theme'
        ];
        
        themeToggleSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length) {
                elements.forEach(el => {
                    el.style.display = 'none';
                    el.setAttribute('aria-hidden', 'true');
                });
            }
        });
        
        // Update meta theme color for mobile browsers
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', '#1A3C34');
        
        // Ensure the floating badge is visible
        const floatingBadges = document.querySelectorAll('.floating-badge');
        if (floatingBadges.length) {
            floatingBadges.forEach(badge => {
                badge.style.display = 'flex';
                badge.style.visibility = 'visible';
                badge.style.opacity = '1';
                badge.style.zIndex = '999';
            });
        }
        
        console.log('Dark mode enforced by dark-mode-enforcer.js');
    }
    
    // Run immediately
    forceDarkMode();
    
    // Also run when DOM is ready to ensure it works even if script is loaded later
    document.addEventListener('DOMContentLoaded', forceDarkMode);
    
    // Also run when page becomes visible (in case of tab switching)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            forceDarkMode();
        }
    });
    
    // Override any attempts to switch themes
    window.addEventListener('storage', function(e) {
        if (e.key === 'darkMode' || e.key === 'dark-theme' || e.key === 'theme') {
            // Force dark mode value back if someone changes it
            localStorage.setItem('darkMode', 'true');
            localStorage.setItem('dark-theme', 'true');
            localStorage.setItem('theme', 'dark');
        }
    });
    
    // Expose a global function that other scripts might call
    window.enforceOfficialDarkMode = forceDarkMode;
    
    // If there's an existing theme manager, override its methods
    if (window.themeManager) {
        // Override any existing theme manager functions
        window.themeManager.setTheme = function() {
            forceDarkMode();
            return true;
        };
        window.themeManager.toggleTheme = function() {
            forceDarkMode();
            return true;
        };
        window.themeManager.getCurrentTheme = function() {
            return 'dark';
        };
    }
    
    // Run again after a slight delay to catch any late theme toggles
    setTimeout(forceDarkMode, 500);
})(); 