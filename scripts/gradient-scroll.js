/**
 * Gradient Scroll Effect
 * Changes background gradient intensity based on scroll position
 */

(function() {
    // Get total document height
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
    
    // Calculate scroll percentage (0-100)
    const getScrollPercent = () => {
        const h = getDocHeight();
        const st = window.pageYOffset || document.documentElement.scrollTop;
        const vh = window.innerHeight;
        return Math.min(100, Math.max(0, (st / (h - vh)) * 100));
    };
    
    // Create and update the gradient style element
    const createGradientStyle = () => {
        // Create style element if it doesn't exist
        let styleEl = document.getElementById('dynamic-gradient-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-gradient-style';
            document.head.appendChild(styleEl);
        }
        return styleEl;
    };
    
    // Update gradient based on scroll position
    const updateGradient = () => {
        const scrollPercent = getScrollPercent();
        const styleEl = createGradientStyle();
        
        // Calculate gradient stops based on scroll position
        // As user scrolls down, make the gradient darker
        const topLight = 36 - (scrollPercent * 0.15); // Use a darker green at the top
        const bottomDark = 18 - (scrollPercent * 0.12); // Make it even darker at the bottom
        
        // Create the gradient CSS with our #1A3C34 shade
        const css = `
            body:before {
                background: linear-gradient(to bottom, 
                    hsl(163, 40%, ${topLight}%) 0%,
                    hsl(163, 45%, 26%) 40%,
                    hsl(163, 50%, ${bottomDark}%) 100%
                ) !important;
                background-attachment: fixed !important;
            }
            
            /* Override any remaining gray areas */
            .hero-section, 
            .hero-content, 
            .hero-text,
            .hero-stats,
            .stat-number,
            .stat-label,
            .hero-gradient,
            .section-background,
            main > section,
            .container {
                background-color: transparent !important;
                background: transparent !important;
            }
            
            /* Fix stat cards */
            .hero-stat, .stat-card {
                background-color: rgba(26, 60, 52, 0.6) !important;
                backdrop-filter: blur(5px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
        `;
        
        styleEl.innerHTML = css;
    };
    
    // Initialize and add scroll event listener
    const init = () => {
        // Set initial gradient
        updateGradient();
        
        // Update gradient on scroll
        window.addEventListener('scroll', () => {
            window.requestAnimationFrame(updateGradient);
        });
        
        // Update gradient on resize
        window.addEventListener('resize', () => {
            window.requestAnimationFrame(updateGradient);
        });
        
        // Fix any remaining gray areas immediately
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
        `;
        document.head.appendChild(fixGrayAreas);
        
        console.log('Enhanced gradient scroll effect initialized');
    };
    
    // Run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 