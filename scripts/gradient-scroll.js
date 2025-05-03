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
        const topLight = 45 - (scrollPercent * 0.2); // Decrease lightness as scroll increases
        const bottomDark = 20 - (scrollPercent * 0.15); // Decrease darkness as scroll increases
        
        // Create the gradient CSS
        const css = `
            body:before {
                background: linear-gradient(to bottom, 
                    hsl(160, 40%, ${topLight}%) 0%,
                    hsl(160, 42%, 33%) 50%,
                    hsl(160, 45%, ${bottomDark}%) 100%
                ) !important;
                background-attachment: fixed !important;
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
        
        console.log('Gradient scroll effect initialized');
    };
    
    // Run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 