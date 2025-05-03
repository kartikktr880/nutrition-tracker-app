/**
 * Main JavaScript for NutriTrack
 * Handles theme toggling, animations, and other interactive elements
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    initTheme();
    
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
    
    console.log('✨ NutriTrack premium experience initialized');
});

/**
 * Initialize theme preferences
 */
function initTheme() {
    // Get all theme toggle buttons
    const themeToggles = document.querySelectorAll('.theme-toggle, #theme-toggle-btn');
    
    // Function to set the correct icon visibility with enhanced positioning
    function updateThemeIcons() {
        const isDarkTheme = document.documentElement.classList.contains('dark-mode') || 
                           document.documentElement.classList.contains('dark-theme');
        
        themeToggles.forEach(toggle => {
            if (!toggle) return;
            
            const sunIcon = toggle.querySelector('.sun-icon');
            const moonIcon = toggle.querySelector('.moon-icon');
            
            if (!sunIcon || !moonIcon) return;
            
            // Enhanced icon visibility with absolute positioning and z-index
            if (isDarkTheme) {
                // Show moon icon in dark mode
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            } else {
                // Show sun icon in light mode
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
            }
        });
    }
    
    // Add click handlers to theme toggles
    themeToggles.forEach(toggle => {
        if (!toggle) return;
        
        // Remove existing event listeners to prevent duplicates
        const newToggle = toggle.cloneNode(true);
        if (toggle.parentNode) {
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            newToggle.addEventListener('click', function() {
                // Toggle dark mode classes
                const isDarkMode = document.documentElement.classList.contains('dark-mode') || 
                                  document.documentElement.classList.contains('dark-theme');
                
                if (isDarkMode) {
                    document.documentElement.classList.remove('dark-mode', 'dark-theme');
                    document.body.classList.remove('dark-theme');
                    localStorage.setItem('darkMode', 'false');
                    localStorage.setItem('dark-theme', 'false');
                } else {
                    document.documentElement.classList.add('dark-mode', 'dark-theme');
                    document.body.classList.add('dark-theme');
                    localStorage.setItem('darkMode', 'true');
                    localStorage.setItem('dark-theme', 'true');
                }
                
                // Update icons immediately
                updateThemeIcons();
            });
        }
    });
    
    // Initialize icons on page load
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
        console.warn('No anchor links found for smooth scrolling');
        return;
    }
    
    console.log(`Found ${anchorLinks.length} anchor links for smooth scrolling`);
    
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
                console.log(`Smooth scrolling to target: ${targetId}`);
                
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
                    console.log(`Scrolled to ${targetId}`);
                } else {
                    console.error(`Target element not found: ${targetId}`);
                }
            });
        }
    });
    
    console.log('Smooth scrolling initialized successfully');
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
        console.error('See How It Works button or target section not found');
        return;
    }
    
    seeHowItWorksBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('See How It Works button clicked');
        
        // Smooth scroll to the How It Works section
        howItWorksSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        // Update URL hash without causing a jump
        history.pushState(null, null, '#how-it-works');
    });
    
    console.log('See How It Works button handler initialized');
}