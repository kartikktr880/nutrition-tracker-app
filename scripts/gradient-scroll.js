/**
 * Unified Scroll Effect Handler
 * Handles both gradient and header scroll behavior
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
    
    // Header scroll behavior variables
    let lastScrollTop = 0;
    let isHeaderVisible = true;
    const scrollThreshold = 30; // Increased threshold for more stable behavior
    let ticking = false;
    let headerCheckTimeout;
    
    // Handle header visibility on scroll
    const handleHeaderScroll = () => {
        const header = document.querySelector('.premium-header');
        if (!header) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Always show header when at the top
        if (scrollTop <= 10) {
            header.classList.remove('header-hidden');
            isHeaderVisible = true;
            lastScrollTop = scrollTop;
            return;
        }
        
        // Only trigger header change after significant scroll
        if (Math.abs(lastScrollTop - scrollTop) > scrollThreshold) {
            // Scrolling down & header is visible -> hide it
            if (scrollTop > lastScrollTop && isHeaderVisible && scrollTop > 80) {
                header.classList.add('header-hidden');
                isHeaderVisible = false;
            }
            // Scrolling up & header is hidden -> show it
            else if (scrollTop < lastScrollTop && !isHeaderVisible) {
                header.classList.remove('header-hidden');
                isHeaderVisible = true;
            }
            
            lastScrollTop = scrollTop;
        }
        
        // Double-check header visibility after scrolling stops
        clearTimeout(headerCheckTimeout);
        headerCheckTimeout = setTimeout(() => {
            // At top of page, ensure header is visible
            if (window.pageYOffset <= 10) {
                header.classList.remove('header-hidden');
                isHeaderVisible = true;
            }
        }, 150);
    };
    
    // Create and update the gradient style element
    const createGradientStyle = () => {
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
        
        const topLight = 36 - (scrollPercent * 0.15);
        const bottomDark = 18 - (scrollPercent * 0.12);
        
        const css = `
            body:before {
                background: linear-gradient(to bottom, 
                    hsl(163, 40%, ${topLight}%) 0%,
                    hsl(163, 45%, 26%) 40%,
                    hsl(163, 50%, ${bottomDark}%) 100%
                ) !important;
                background-attachment: fixed !important;
                z-index: -1 !important;
                content: "" !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
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
            .container,
            .footer,
            .footer-container,
            .footer-links-column,
            .footer-column {
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
    
    // Unified scroll handler with requestAnimationFrame for better performance
    const handleScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateGradient();
                handleHeaderScroll();
                ticking = false;
            });
            ticking = true;
        }
    };
    
    // Initialize
    const init = () => {
        // Add dark mode classes
        document.documentElement.classList.add('dark-mode', 'dark-theme');
        document.body.classList.add('dark-theme', 'dark-mode', 'gradient-background');
        
        // Add fixed header visibility style
        const headerStyle = document.createElement('style');
        headerStyle.innerHTML = `
            .premium-header {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                height: 80px !important;
                transition: transform 0.3s ease !important;
                will-change: transform !important;
                z-index: 99999 !important;
                transform: translateZ(0) !important;
                -webkit-transform: translateZ(0) !important;
                backface-visibility: hidden !important;
                -webkit-backface-visibility: hidden !important;
            }
            
            .premium-header.header-hidden {
                transform: translateY(-100%) !important;
                -webkit-transform: translateY(-100%) !important;
            }
            
            body {
                padding-top: 80px !important; /* Account for fixed header */
                overflow-x: hidden !important;
                max-width: 100vw !important;
                width: 100vw !important;
            }
            
            html, body {
                overflow-x: hidden !important;
                max-width: 100vw !important;
                width: 100vw !important;
            }
        `;
        document.head.appendChild(headerStyle);
        
        // Set initial states
        updateGradient();
        // Initial header check
        setTimeout(() => {
            handleHeaderScroll();
        }, 100);
        
        // Add scroll listener with passive flag for better performance
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Update on resize
        window.addEventListener('resize', () => {
            window.requestAnimationFrame(() => {
                updateGradient();
                handleHeaderScroll();
            });
        }, { passive: true });
        
        // Fix any remaining gray areas
        const fixGrayAreas = document.createElement('style');
        fixGrayAreas.innerHTML = `
            /* Immediate fix for gray areas */
            .hero-section, .container, .hero-content, .hero-stats, .main, main, section,
            .footer, .footer-container, .footer-links, .footer-column, .footer-links-column {
                background-color: transparent !important;
                background: transparent !important;
            }
            
            /* Force the body background */
            body {
                background-color: transparent !important;
                max-width: 100vw !important;
                overflow-x: hidden !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                padding-right: 0 !important;
            }
            
            /* Ensure the floating badge is visible */
            .floating-badge {
                animation: definitiveBadgeFloat 2.2s ease-in-out infinite alternate !important;
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            @keyframes definitiveBadgeFloat {
                0% { transform: translateX(-50%) translateY(0); }
                100% { transform: translateX(-50%) translateY(-10px); }
            }
            
            /* Force smooth scroll */
            html {
                scroll-behavior: smooth !important;
            }
            
            /* Ensure premium header components are visible */
            .premium-header-container,
            .premium-header-logo,
            .premium-header-actions,
            .header-icon {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
        `;
        document.head.appendChild(fixGrayAreas);
        
        console.log('Gradient and scroll effects initialized successfully');
    };
    
    // Run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();