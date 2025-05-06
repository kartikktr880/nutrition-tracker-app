/**
 * Mobile Navigation for NutriTrack
 * Handles mobile menu toggling and navigation
 */

document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const header = document.querySelector('.homepage-header');
    const body = document.body;

    // Toggle mobile menu
    if (mobileMenuToggle && mobileNav) {
        mobileMenuToggle.addEventListener('click', () => {
            // Toggle active classes
            mobileMenuToggle.classList.toggle('active');
            mobileNav.classList.toggle('active');
            
            // Ensure header stays visible when mobile nav is open
            if (mobileNav.classList.contains('active')) {
                header.classList.remove('scrolled-down');
                header.classList.add('scrolled-up');
                body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
            } else {
                body.style.overflow = ''; // Re-enable scrolling
            }
        });
    }

    // Handle dropdowns in mobile menu
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const dropdown = toggle.closest('.dropdown');
            if (!dropdown) return;
            
            // Toggle aria-expanded attribute
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true' || false;
            toggle.setAttribute('aria-expanded', !isExpanded);
            
            // Close other dropdowns
            dropdownToggles.forEach(otherToggle => {
                if (otherToggle !== toggle) {
                    otherToggle.setAttribute('aria-expanded', 'false');
                    const otherDropdown = otherToggle.closest('.dropdown');
                    if (otherDropdown) otherDropdown.classList.remove('open');
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('open');
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        // Close mobile nav when clicking outside
        if (mobileNav && mobileMenuToggle && 
            !mobileNav.contains(e.target) && 
            !mobileMenuToggle.contains(e.target) && 
            mobileNav.classList.contains('active')) {
            
            mobileMenuToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            body.style.overflow = '';
        }
        
        // Close any open dropdowns when clicking outside
        const openDropdowns = document.querySelectorAll('.dropdown.open');
        if (openDropdowns.length > 0) {
            openDropdowns.forEach(dropdown => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('open');
                    const toggle = dropdown.querySelector('.dropdown-toggle');
                    if (toggle) toggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    });

    // Handle window resize - close mobile menu on desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992 && mobileMenuToggle && mobileNav) {
            mobileMenuToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            body.style.overflow = '';
        }
    });
    
    // Update active state based on current page
    const currentPath = window.location.pathname;
    const allNavLinks = document.querySelectorAll('.nav-link');
    allNavLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || 
            (currentPath === '/' && href === '/') ||
            (currentPath.includes(href) && href !== '/')) {
            link.classList.add('active');
            // If in dropdown, also mark parent as active
            const parentDropdown = link.closest('.dropdown');
            if (parentDropdown) {
                const parentLink = parentDropdown.querySelector('.dropdown-toggle');
                if (parentLink) parentLink.classList.add('active');
            }
        }
    });

    // Handle smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]:not(.dropdown-toggle)');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return; // Skip empty anchors
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                // Close mobile menu if open
                if (mobileMenuToggle && mobileNav && mobileNav.classList.contains('active')) {
                    mobileMenuToggle.classList.remove('active');
                    mobileNav.classList.remove('active');
                    body.style.overflow = '';
                }
                
                // Calculate position accounting for fixed header
                const headerHeight = header ? header.offsetHeight : 0;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({ 
                    top: targetPosition, 
                    behavior: 'smooth' 
                });
            }
        });
    });
}); 