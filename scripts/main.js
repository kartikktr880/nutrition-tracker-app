import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Main JavaScript for NutriTrack
 * Handles theme toggling, animations, and other interactive elements
 */

import { errorAnalytics } from './error-analytics.js';
import { errorHandler } from './error-handler.js';
import { errorGuide } from './error-guide.js';
import { securityAudit } from './security-audit.js';
import { securityDashboard } from './security-dashboard.js';
import { memoryLeakDetector } from './memory-leak-detector.js';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize error handling
    window.addEventListener('error', (event) => {
        errorHandler.handleError(event.error, 'unknown', {
            component: 'global',
            code: 'uncaught'
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        errorHandler.handleError(event.reason, 'unknown', {
            component: 'global',
            code: 'unhandled_promise'
        });
    });

    // Initialize security systems
    Promise.all([
        securityAudit.initialize().catch(error => {
            logWarn('Security audit initialization failed:', error);
        }),
        securityDashboard.initialize().catch(error => {
            logWarn('Security dashboard initialization failed:', error);
        })
    ]).finally(() => {
        // Continue with other initializations regardless of security system status
    initTheme();
    });

    // Initialize memory leak detection in development mode
    if (process.env.NODE_ENV === 'development') {
        memoryLeakDetector.init().catch(error => {
            logWarn('Memory leak detector initialization failed:', error);
        });
    }
    
    // Initialize animations
    initAnimations();
    
    // Initialize interactive elements
    initInteractiveElements();
    
    // Initialize responsive handlers
    initResponsiveHandlers();
    
    // Initialize smooth scrolling for anchor links
    initSmoothScrolling();

    // Initialize demo video modal
    initDemoVideoModal();
    
    // Add direct click handler for 'See How It Works' button
    initSeeHowItWorksButton();
    
    logInfo('✨ NutriTrack premium experience initialized');
});

/**
 * Initialize theme preferences
 */
function initTheme() {
    // Initialize theme using ThemeManager
    if (window.themeManager) {
        window.themeManager.init();
    }
    
    // Update theme icons
    updateThemeIcons();
    
    // Re-check icons after delays to handle any late DOM updates
    setTimeout(updateThemeIcons, 100);
    setTimeout(updateThemeIcons, 500);
}

/**
 * Initialize animations
 */
function initAnimations() {
    // Observe elements for scroll-based animations
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if (animatedElements.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

/**
 * Initialize interactive elements
 */
function initInteractiveElements() {
    // Handle dropdowns
    initDropdowns();
    
    // Handle testimonial sliders
    initTestimonialSlider();
}

/**
 * Initialize dropdown menus
 */
function initDropdowns() {
    // Get all dropdown toggles
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            
            const parentItem = this.closest('.dropdown');
            if (!parentItem) return;
            
            // Toggle active class
            parentItem.classList.toggle('active');
            
            // Close other dropdowns
            dropdownToggles.forEach(otherToggle => {
                if (otherToggle !== toggle) {
                    const otherParent = otherToggle.closest('.dropdown');
                    if (otherParent) {
                        otherParent.classList.remove('active');
                    }
                }
            });
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown.active').forEach(item => {
                item.classList.remove('active');
            });
        }
    });
}

/**
 * Initialize testimonial slider
 */
function initTestimonialSlider() {
    const slider = document.querySelector('.testimonial-slider');
    if (!slider) return;
    
    const slides = slider.querySelectorAll('.testimonial-slide');
    if (slides.length === 0) return;
    
    let currentSlide = 0;
    
    function updateVisibility() {
        slides.forEach((slide, index) => {
            slide.style.display = index === currentSlide ? 'block' : 'none';
        });
    }
    
    // Initialize first slide
        updateVisibility();
    
    // Auto-advance slides
    setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        updateVisibility();
    }, 5000);
}

/**
 * Initialize responsive handlers
 */
function initResponsiveHandlers() {
    // Handle responsive spacing
    fixSectionSpacing();
    window.addEventListener('resize', fixSectionSpacing);
    
    // Handle network status
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
}

/**
 * Fix section spacing for responsive design
 */
function fixSectionSpacing() {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        const computedStyle = window.getComputedStyle(section);
        const marginTop = parseInt(computedStyle.marginTop);
        const marginBottom = parseInt(computedStyle.marginBottom);
        
        // Adjust spacing based on viewport width
        if (window.innerWidth < 768) {
            if (marginTop > 40) section.style.marginTop = '40px';
            if (marginBottom > 40) section.style.marginBottom = '40px';
        } else {
            section.style.marginTop = '';
            section.style.marginBottom = '';
        }
    });
}

/**
 * Update network status indicator
 */
function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    showNotification(isOnline ? 'Back online' : 'Connection lost');
}

/**
 * Show notification message
 */
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    // Get all links with hash (#) in href
    const anchorLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');
    
    if (anchorLinks.length === 0) {
        logWarn('No anchor links found for smooth scrolling');
        return;
    }
    
    logInfo(`Found ${anchorLinks.length} anchor links for smooth scrolling`);
    
    anchorLinks.forEach(link => {
        // Remove any existing event listeners to prevent duplicates
        const newLink = link.cloneNode(true);
        if (link.parentNode) {
            link.parentNode.replaceChild(newLink, link);
            
            newLink.addEventListener('click', function(e) {
                // Prevent default anchor click behavior
                e.preventDefault();
                
                // Get the target element
                const targetId = this.getAttribute('href');
                logInfo(`Smooth scrolling to target: ${targetId}`);
                
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // First ensure the element is visible
                    targetElement.style.display = 'block';
                    targetElement.style.visibility = 'visible';
                    targetElement.style.opacity = '1';
                    
                    // Use scrollIntoView for better browser compatibility
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Update URL hash without causing a jump
                    history.pushState(null, null, targetId);
                    logInfo(`Scrolled to ${targetId}`);
            } else {
                    logError(`Target element not found: ${targetId}`);
                }
            });
        }
    });
    
    logInfo('Smooth scrolling initialized successfully');
}

/**
 * Initialize demo video modal
 */
function initDemoVideoModal() {
    const modal = document.getElementById('demo-video-modal');
    const btn = document.getElementById('watch-demo-btn');
    const closeBtn = modal.querySelector('.close-modal');
    
    if (!modal || !btn || !closeBtn) return;
    
    // Open modal when button is clicked
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });
    
    // Close modal when close button is clicked
    closeBtn.addEventListener('click', function() {
        closeModal();
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close modal when pressing Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });
    
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
        
        // Pause video if it's playing
        const iframe = modal.querySelector('iframe');
        if (iframe) {
            const iframeSrc = iframe.src;
            iframe.src = iframeSrc; // Reset iframe to stop video
        }
    }
}

/**
 * Initialize direct handling for the 'See How It Works' button
 * This ensures the button works even if the general smooth scrolling has issues
 */
function initSeeHowItWorksButton() {
    const seeHowItWorksBtn = document.getElementById('see-how-it-works-btn');
    const howItWorksSection = document.getElementById('how-it-works');
    
    if (!seeHowItWorksBtn || !howItWorksSection) {
        logError('See How It Works button or target section not found');
        return;
    }
    
    seeHowItWorksBtn.addEventListener('click', function(e) {
        e.preventDefault();
        logInfo('See How It Works button clicked');
        
        // Smooth scroll to the How It Works section
        howItWorksSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        // Update URL hash without causing a jump
        history.pushState(null, null, '#how-it-works');
    });
    
    logInfo('See How It Works button handler initialized');
}