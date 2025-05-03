/**
 * Gradient Scroll Effect
 * Changes background gradient intensity based on scroll position
 * Optimized for performance and visual appeal
 */

(function() {
    // Track if we're in the process of updating to avoid unnecessary reflows
    let ticking = false;
    
    // Cache DOM elements and values for performance
    let styleEl = null;
    let docHeight = 0;
    let viewportHeight = window.innerHeight;
    
    // Get total document height - call this only when needed (window resize)
    const getDocHeight = () => {
        return Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
        );
    };
    
    // Calculate scroll percentage (0-100) - more efficient
    const getScrollPercent = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return Math.min(100, Math.max(0, (scrollTop / (docHeight - viewportHeight)) * 100));
    };
    
    // Create the gradient style element once during initialization
    const createGradientStyle = () => {
        styleEl = document.getElementById('dynamic-gradient-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-gradient-style';
            document.head.appendChild(styleEl);
        }
        return styleEl;
    };
    
    // Update gradient based on scroll position
    const updateGradient = () => {
        if (!ticking) {
            // Use requestAnimationFrame for performance
            window.requestAnimationFrame(() => {
                const scrollPercent = getScrollPercent();
                
                // Enhanced gradient calculation - smoother transitions
                // Base color #1A3C34 (HSL: 163, 40%, 26%)
                // Create a dynamic gradient that evolves as user scrolls
                
                // Top gets slightly lighter as you scroll down (more contrast)
                const topLight = Math.max(28, 36 - (scrollPercent * 0.12));
                
                // Middle stays relatively consistent but shifts slightly
                const middleShade = Math.max(20, 26 - (scrollPercent * 0.06));
                
                // Bottom gets darker as you scroll down (more depth)
                const bottomDark = Math.max(14, 22 - (scrollPercent * 0.15));
                
                // Create enhanced gradient CSS with subtle variations
                const css = `
                    body:before {
                        background: linear-gradient(to bottom, 
                            hsl(163, 40%, ${topLight}%) 0%,
                            hsl(163, 45%, ${middleShade}%) 50%,
                            hsl(163, 50%, ${bottomDark}%) 100%
                        ) !important;
                        background-attachment: fixed !important;
                        transition: background 0.5s ease-out !important;
                    }
                    
                    /* Apply consistent styling for feature section backgrounds */
                    .features-section:before,
                    .steps-section:before,
                    .testimonials-section:before,
                    .cta-section:before,
                    .newsletter-section:before {
                        opacity: ${0.8 - (scrollPercent * 0.003)} !important;
                        transition: opacity 0.5s ease-out !important;
                    }
                    
                    /* Improve card visibility against gradient */
                    .feature-card, 
                    .step-card, 
                    .testimonial-card,
                    .premium-card {
                        background-color: rgba(26, 60, 52, ${0.6 + (scrollPercent * 0.002)}) !important;
                        backdrop-filter: blur(${5 + (scrollPercent * 0.05)}px) !important;
                    }
                `;
                
                styleEl.innerHTML = css;
                ticking = false;
            });
            
            ticking = true;
        }
    };
    
    // Reset calculations on resize
    const handleResize = () => {
        viewportHeight = window.innerHeight;
        docHeight = getDocHeight();
        updateGradient();
    };
    
    // Initialize the gradient effect
    const init = () => {
        // Create the style element
        styleEl = createGradientStyle();
        
        // Set initial document height
        docHeight = getDocHeight();
        
        // Set initial gradient
        updateGradient();
        
        // Add performance-optimized event listeners
        window.addEventListener('scroll', updateGradient, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });
        
        // Fix any remaining gray areas immediately with a separate style
        const fixGrayAreas = document.createElement('style');
        fixGrayAreas.innerHTML = `
            /* Immediate fix for gray areas */
            .hero-section, .container, .hero-content, .hero-stats, .main, main, section {
                background-color: transparent !important;
                background: transparent !important;
            }
            
            /* Force the body background */
            body {
                background-color: #1A3C34 !important;
            }
            
            /* Enhance content visibility */
            .hero-section h1, .hero-section p, 
            .features-section h2, .features-section p,
            .steps-section h2, .steps-section p,
            .testimonials-section h2, .testimonials-section p,
            .cta-section h2, .cta-section p,
            .newsletter-section h2, .newsletter-section p {
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
            }
        `;
        document.head.appendChild(fixGrayAreas);
        
        console.log('Enhanced gradient scroll effect initialized with performance optimizations');
    };
    
    // Run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 