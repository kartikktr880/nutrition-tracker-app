// nav.js - Handle loading the navigation components

/**
 * Navigation Manager
 * Handles loading and functionality of the navigation header
 */
class NavManager {
    constructor() {
        this.headerContainer = document.getElementById('header-container');
        this.mobileMenuOpen = false;
        this.dropdownsOpen = {};
        this.init();
    }

    /**
     * Initialize the navigation system
     */
    async init() {
        try {
            console.log('Initializing navigation...');
            
            // Load the header content
            await this.loadHeader();
            
            // Setup event listeners after header is loaded
            this.setupEventListeners();
            
            // Handle initial active state
            this.updateActiveNavItem();
            
            console.log('Navigation initialized successfully');
        } catch (error) {
            console.error('Failed to initialize navigation:', error);
            this.createMinimalHeader();
        }
    }

    /**
     * Load the header content
     */
    async loadHeader() {
        if (!this.headerContainer) {
            console.error('Header container not found');
            return;
        }

        try {
            const response = await fetch('components/header.html');
            if (!response.ok) {
                throw new Error(`Failed to load header: ${response.status}`);
            }
            
            const html = await response.text();
            this.headerContainer.innerHTML = html;
            
            console.log('Header loaded successfully');
        } catch (error) {
            console.error('Error loading header:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
        }
        
        // Dropdown toggles
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const dropdownId = toggle.getAttribute('data-dropdown');
                if (dropdownId) {
                    this.toggleDropdown(dropdownId);
                }
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-container') && !e.target.closest('.dropdown-toggle')) {
                this.closeAllDropdowns();
            }
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.mobileMenuOpen && 
                !e.target.closest('.mobile-nav') && 
                !e.target.closest('#mobile-menu-toggle')) {
                this.closeMobileMenu();
            }
        });
        
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
        
        // Login and signup buttons
        const loginBtn = document.querySelector('.nav-item a[href="login.html"]');
        const signupBtn = document.querySelector('.nav-item a[href="signup.html"]');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'login.html';
            });
        }
        
        if (signupBtn) {
            signupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'signup.html';
            });
        }
        
        // Apply translations if i18n is available
        if (window.i18n) {
            window.i18n.updateContent();
        }
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const mobileNav = document.querySelector('.mobile-nav');
        const backdrop = document.querySelector('.mobile-backdrop');
        const toggle = document.getElementById('mobile-menu-toggle');
        
        if (!mobileNav || !toggle) return;
        
        if (this.mobileMenuOpen) {
            mobileNav.classList.remove('open');
            backdrop?.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<i class="fas fa-bars"></i>';
            document.body.classList.remove('no-scroll');
            this.mobileMenuOpen = false;
        } else {
            mobileNav.classList.add('open');
            backdrop?.classList.add('active');
            toggle.setAttribute('aria-expanded', 'true');
            toggle.innerHTML = '<i class="fas fa-times"></i>';
            document.body.classList.add('no-scroll');
            this.mobileMenuOpen = true;
        }
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        const mobileNav = document.querySelector('.mobile-nav');
        const backdrop = document.querySelector('.mobile-backdrop');
        const toggle = document.getElementById('mobile-menu-toggle');
        
        if (!mobileNav || !toggle) return;
        
        mobileNav.classList.remove('open');
        backdrop?.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.classList.remove('no-scroll');
        this.mobileMenuOpen = false;
    }

    /**
     * Toggle dropdown menu
     */
    toggleDropdown(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        const toggle = document.querySelector(`[data-dropdown="${dropdownId}"]`);
        
        if (!dropdown || !toggle) return;
        
        const isOpen = dropdown.classList.contains('active');
        
        // Close all other dropdowns first
        this.closeAllDropdowns();
        
        if (!isOpen) {
            dropdown.classList.add('active');
            toggle.setAttribute('aria-expanded', 'true');
            this.dropdownsOpen[dropdownId] = true;
        }
    }

    /**
     * Close all dropdown menus
     */
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        const toggles = document.querySelectorAll('.dropdown-toggle');
        
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
        
        toggles.forEach(toggle => {
            toggle.setAttribute('aria-expanded', 'false');
        });
        
        this.dropdownsOpen = {};
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

    /**
     * Create a minimal header if loading fails
     */
    createMinimalHeader() {
        if (this.headerContainer) {
            this.headerContainer.innerHTML = `
                <header class="header minimal-header">
                    <div class="container">
                        <div class="header-content">
                            <div class="logo">
                                <a href="index.html">
                                    <img src="images/logo.png" alt="Nutrition Tracker" onerror="this.onerror=null; this.src='images/fallback-logo.png';">
                                </a>
                            </div>
                            <nav class="nav-minimal">
                                <ul>
                                    <li><a href="index.html">Home</a></li>
                                    <li><a href="login.html">Login</a></li>
                                    <li><a href="signup.html">Sign Up</a></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </header>
            `;
        }
    }
}

// Initialize the navigation when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navManager = new NavManager();
}); 