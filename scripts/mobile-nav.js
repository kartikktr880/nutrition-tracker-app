import { initializeAuth, logoutUser } from './firebase-config.js';

// Mobile Navigation Script
document.addEventListener('DOMContentLoaded', function() {
    // Setup mobile navigation toggle
    setupMobileNavToggle();
    
    // Setup scroll-based navigation visibility
    setupScrollNavigation();
    
    const menuToggle = document.querySelector('.menu-toggle');
    const sideNav = document.querySelector('.side-nav');
    const body = document.body;
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sideNav.classList.toggle('open');
            body.classList.toggle('nav-open');
        });
    }
    
    // Close side navigation when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInside = sideNav && sideNav.contains(event.target) || menuToggle && menuToggle.contains(event.target);
        
        if (sideNav && !isClickInside && sideNav.classList.contains('open')) {
            sideNav.classList.remove('open');
            body.classList.remove('nav-open');
        }
    });
    
    // Handle screen resize
    window.addEventListener('resize', function() {
        if (sideNav && window.innerWidth > 768 && sideNav.classList.contains('open')) {
            sideNav.classList.remove('open');
            body.classList.remove('nav-open');
        }
    });
    
    // Set active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.nav-link');
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Handle logout button if present
    const logoutButton = document.getElementById('mobile-nav-logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            // Use global logout function if available, otherwise redirect
            if (typeof logoutUser === 'function') {
                logoutUser();
            } else if (window.firebaseUtils && typeof window.firebaseUtils.logoutUser === 'function') {
                window.firebaseUtils.logoutUser();
            } else {
                window.location.href = 'login.html';
            }
        });
    }
});

// Setup mobile navigation toggle
function setupMobileNavToggle() {
    // Add click event to mobile nav toggle button
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', toggleMobileNav);
    }
    
    // Add click event to any element with toggle-mobile-nav class
    const toggleButtons = document.querySelectorAll('.toggle-mobile-nav');
    toggleButtons.forEach(button => {
        button.addEventListener('click', toggleMobileNav);
    });
    
    // Add click event to mobile nav overlay for closing
    const overlay = document.querySelector('.mobile-nav-overlay');
    if (overlay) {
        overlay.addEventListener('click', toggleMobileNav);
    }
    
    // Add click events to all close buttons
    const closeButtons = document.querySelectorAll('.close-mobile-nav');
    closeButtons.forEach(button => {
        button.addEventListener('click', toggleMobileNav);
    });
}

// Toggle mobile navigation
function toggleMobileNav() {
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');
    
    if (!mobileNav || !overlay) return;
    
    if (mobileNav.classList.contains('active')) {
        mobileNav.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('nav-open');
    } else {
        mobileNav.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('nav-open');
    }
}

// Setup scroll-based navigation visibility
function setupScrollNavigation() {
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        const mobileNavToggle = document.getElementById('mobileNavToggle');
        
        if (!mobileNavToggle) return;
        
        if (currentScroll > lastScrollTop && currentScroll > 100) {
            // Scrolling down - hide the button
            mobileNavToggle.style.transform = 'translateY(-100%)';
            mobileNavToggle.style.opacity = '0';
        } else {
            // Scrolling up - show the button
            mobileNavToggle.style.transform = 'translateY(0)';
            mobileNavToggle.style.opacity = '1';
        }
        
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    });
} 