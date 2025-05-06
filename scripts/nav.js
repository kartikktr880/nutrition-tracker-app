// nav.js - Handle navigation functionality

/**
 * Navigation Manager
 * Handles basic navigation functionality
 */
class NavManager {
    constructor() {
        this.mobileMenuOpen = false;
        this.dropdownsOpen = {};
        this.init();
    }

    /**
     * Initialize the navigation system
     */
    init() {
        try {
            console.log('Initializing navigation...');
            this.setupEventListeners();
            this.updateActiveNavItem();
            console.log('Navigation initialized successfully');
        } catch (error) {
            console.error('Failed to initialize navigation:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (window.themeManager) {
                    window.themeManager.toggleTheme();
                }
            });
        }
        
        // Language selector
        const langSelector = document.getElementById('language-selector');
        if (langSelector) {
            langSelector.addEventListener('change', (e) => {
                if (window.i18n) {
                    window.i18n.changeLanguage(e.target.value);
                }
            });
        }
        
        // Apply translations if i18n is available
        if (window.i18n) {
            window.i18n.updateContent();
        }
    }

    /**
     * Update active navigation item based on current page
     */
    updateActiveNavItem() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navItems = document.querySelectorAll('.nav-item a');
        
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href === currentPage || 
                (currentPage === 'index.html' && href === './' || href === '/') ||
                (item.getAttribute('data-page') === currentPage)) {
                item.parentElement.classList.add('active');
            } else {
                item.parentElement.classList.remove('active');
            }
        });
    }
}

// Initialize navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.navManager = new NavManager();
}); 