/**
 * Mobile Navigation for NutriTrack
 * Handles mobile menu toggling and navigation
 */

class MobileNav {
    constructor() {
        this.mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        this.mobileNav = document.querySelector('.mobile-nav');
        this.mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
        this.mobileNavClose = document.querySelector('.mobile-nav-close');
        this.body = document.body;
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        if (!this.mobileMenuToggle || !this.mobileNav) return;
        
        // Initialize event listeners
        this.mobileMenuToggle.addEventListener('click', () => this.toggle());
        this.mobileNavClose?.addEventListener('click', () => this.close());
        this.mobileNavOverlay?.addEventListener('click', () => this.close());
        
        // Handle keyboard navigation
        this.mobileNav.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Handle scroll
        window.addEventListener('scroll', () => this.handleScroll());
        
        // Update active state based on current page
        this.updateActiveState();
    }
    
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.mobileMenuToggle.classList.add('active');
        this.mobileNav.classList.add('active');
        this.mobileNavOverlay?.classList.add('active');
        this.body.style.overflow = 'hidden';
        
        // Focus first focusable element
        const firstFocusable = this.mobileNav.querySelector('a, button');
        firstFocusable?.focus();
        
        // Update ARIA attributes
        this.mobileMenuToggle.setAttribute('aria-expanded', 'true');
        this.mobileNav.setAttribute('aria-hidden', 'false');
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.mobileMenuToggle.classList.remove('active');
        this.mobileNav.classList.remove('active');
        this.mobileNavOverlay?.classList.remove('active');
        this.body.style.overflow = '';
        
        // Return focus to toggle button
        this.mobileMenuToggle.focus();
        
        // Update ARIA attributes
        this.mobileMenuToggle.setAttribute('aria-expanded', 'false');
        this.mobileNav.setAttribute('aria-hidden', 'true');
    }
    
    handleKeyboard(e) {
        if (!this.isOpen) return;
        
        switch (e.key) {
            case 'Escape':
                this.close();
                break;
            case 'Tab':
                this.handleTabKey(e);
                break;
        }
    }
    
    handleTabKey(e) {
        const focusableElements = this.mobileNav.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        // If shift + tab
        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }
    
    handleResize() {
        if (window.innerWidth > 992 && this.isOpen) {
            this.close();
        }
    }
    
    handleScroll() {
        if (!this.isOpen) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const lastScrollTop = this.lastScrollTop || 0;
        
        // Hide/show mobile menu toggle based on scroll direction
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            this.mobileMenuToggle.style.transform = 'translateY(-100%)';
            this.mobileMenuToggle.style.opacity = '0';
        } else {
            this.mobileMenuToggle.style.transform = 'translateY(0)';
            this.mobileMenuToggle.style.opacity = '1';
        }
        
        this.lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }
    
    updateActiveState() {
        const currentPath = window.location.pathname;
        const navItems = this.mobileNav.querySelectorAll('.mobile-nav-item');
        
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href === currentPath || 
                (currentPath === '/' && href === '/') ||
                (currentPath.includes(href) && href !== '/')) {
                item.classList.add('active');
            }
        });
    }
}

// Initialize mobile navigation
document.addEventListener('DOMContentLoaded', () => {
    new MobileNav();
}); 