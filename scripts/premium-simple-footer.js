/**
 * Premium Simple Footer Script
 * Handles footer animations and back-to-top functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize back to top button functionality
  initBackToTop();
  
  // Initialize footer link animations
  initFooterLinkAnimations();
});

/**
 * Initialize the back to top button
 */
function initBackToTop() {
  const backToTopButton = document.querySelector('.premium-back-to-top');
  
  if (!backToTopButton) return;
  
  // Show button when scrolling down
  window.addEventListener('scroll', function() {
    if (window.scrollY > 300) {
      backToTopButton.classList.add('visible');
    } else {
      backToTopButton.classList.remove('visible');
    }
  });
  
  // Scroll to top when clicked
  backToTopButton.addEventListener('click', function() {
    // Smooth scroll to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
  
  // Check initial scroll position
  if (window.scrollY > 300) {
    backToTopButton.classList.add('visible');
  }
}

/**
 * Initialize footer link animations
 */
function initFooterLinkAnimations() {
  // If IntersectionObserver is supported, use it for scroll animations
  if ('IntersectionObserver' in window) {
    const footerSections = document.querySelectorAll('.premium-footer-section');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Leave the animation to CSS, which will add the fadeInUp animation
          // The element is already set to opacity: 0 in CSS
          // When it becomes visible, the CSS animation will run based on the delay
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    footerSections.forEach(section => {
      observer.observe(section);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    // Make all sections visible immediately
    document.querySelectorAll('.premium-footer-section').forEach(section => {
      section.style.opacity = '1';
    });
  }
}

/**
 * Safely handle focus on social media icons for accessibility
 */
document.addEventListener('DOMContentLoaded', function() {
  const socialIcons = document.querySelectorAll('.premium-social-icon');
  
  socialIcons.forEach(icon => {
    // Add hover effect on focus for keyboard navigation
    icon.addEventListener('focus', function() {
      this.style.backgroundColor = '#FF8C42';
      this.style.transform = 'translateY(-3px)';
    });
    
    icon.addEventListener('blur', function() {
      this.style.backgroundColor = '';
      this.style.transform = '';
    });
  });
}); 