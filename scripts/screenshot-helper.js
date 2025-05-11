/**
 * Screenshot Helper
 * Adds functionality to prepare the page for full screenshots
 */

document.addEventListener('DOMContentLoaded', function() {
    // Detect if a screenshot tool is likely being used (via URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const screenshotMode = urlParams.get('screenshot') === 'true';
    
    // Add screenshot helper button
    addScreenshotHelper();
    
    // Automatically enable screenshot mode if URL parameter is present
    if (screenshotMode) {
        enableScreenshotMode();
    }
    
    /**
     * Add a helper button to manually enable screenshot mode
     */
    function addScreenshotHelper() {
        const helper = document.createElement('button');
        helper.id = 'screenshot-helper';
        helper.innerHTML = '<i class="fas fa-camera"></i> Prepare for Screenshot';
        helper.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: #1A3C34;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 15px;
            font-size: 14px;
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        // Add click event to toggle screenshot mode
        helper.addEventListener('click', function() {
            // Toggle screenshot mode
            if (document.body.classList.contains('screenshot-mode')) {
                disableScreenshotMode();
                helper.innerHTML = '<i class="fas fa-camera"></i> Prepare for Screenshot';
            } else {
                enableScreenshotMode();
                helper.innerHTML = '<i class="fas fa-times"></i> Exit Screenshot Mode';
            }
        });
        
        document.body.appendChild(helper);
    }
    
    /**
     * Enable screenshot mode by adding necessary classes and loading the CSS
     */
    function enableScreenshotMode() {
        // Add class to body
        document.body.classList.add('screenshot-mode');
        document.documentElement.classList.add('screenshot-mode');
        
        // Ensure the screenshot CSS is loaded
        if (!document.getElementById('screenshot-css')) {
            const link = document.createElement('link');
            link.id = 'screenshot-css';
            link.rel = 'stylesheet';
            link.href = 'styles/fullpage-screenshot-fix.css';
            document.head.appendChild(link);
        }
        
        // Apply specific fixes for yellow-highlighted areas
        fixYellowHighlightedAreas();
        
        // Pause any animations or videos
        pauseAnimations();
        
        // Ensure all content is visible
        expandAllSections();
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        console.log('Screenshot mode enabled. The page is now optimized for full-page screenshots.');
    }
    
    /**
     * Apply specific fixes for yellow-highlighted spaces in the footer
     */
    function fixYellowHighlightedAreas() {
        // Fix footer spacing issues
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.style.padding = '10px 0 5px';
        }
        
        // Fix footer columns
        const footerColumns = document.querySelectorAll('.footer-column');
        footerColumns.forEach(column => {
            column.style.margin = '0';
            column.style.padding = '0';
        });
        
        // Reduce spacing between list items
        const listItems = document.querySelectorAll('.footer-links li');
        listItems.forEach(item => {
            item.style.marginBottom = '2px';
        });
        
        // Fix footer bottom
        const footerBottom = document.querySelector('.footer-bottom');
        if (footerBottom) {
            footerBottom.style.paddingTop = '5px';
            footerBottom.style.marginTop = '5px';
        }
        
        // Add spacing fixes to force close the yellow gaps
        const css = document.createElement('style');
        css.id = 'yellow-fix-css';
        css.textContent = `
            .screenshot-mode .footer {
                padding: 10px 0 5px !important;
            }
            .screenshot-mode .footer-column {
                margin: 0 !important;
                padding: 0 !important;
            }
            .screenshot-mode .footer-title {
                margin-bottom: 3px !important;
                padding-top: 3px !important;
            }
            .screenshot-mode .footer-links li {
                margin-bottom: 2px !important;
                line-height: 1.2 !important;
            }
            .screenshot-mode .footer-content {
                margin-bottom: 5px !important;
                gap: 10px !important;
            }
            .screenshot-mode .contact-info {
                margin-top: 3px !important;
            }
            .screenshot-mode .contact-item {
                margin-bottom: 2px !important;
            }
            .screenshot-mode .social-icons {
                margin-top: 3px !important;
            }
            .screenshot-mode .footer-bottom {
                padding-top: 5px !important;
                margin-top: 5px !important;
            }
        `;
        document.head.appendChild(css);
    }
    
    /**
     * Disable screenshot mode
     */
    function disableScreenshotMode() {
        document.body.classList.remove('screenshot-mode');
        document.documentElement.classList.remove('screenshot-mode');
        
        // Remove the screenshot CSS
        const screenshotCss = document.getElementById('screenshot-css');
        if (screenshotCss) {
            screenshotCss.disabled = true;
        }
        
        // Remove yellow fix CSS
        const yellowFixCss = document.getElementById('yellow-fix-css');
        if (yellowFixCss) {
            yellowFixCss.remove();
        }
        
        // Resume animations
        resumeAnimations();
        
        console.log('Screenshot mode disabled. Page has returned to normal viewing mode.');
    }
    
    /**
     * Pause all animations and videos
     */
    function pauseAnimations() {
        // Pause CSS animations
        const animatedElements = document.querySelectorAll('[class*="animate"], [class*="fade"], [class*="slide"]');
        animatedElements.forEach(el => {
            el.style.animationPlayState = 'paused';
            el.style.webkitAnimationPlayState = 'paused';
        });
        
        // Pause videos
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (!video.paused) {
                video.pause();
            }
        });
    }
    
    /**
     * Resume animations and videos
     */
    function resumeAnimations() {
        // Resume CSS animations
        const animatedElements = document.querySelectorAll('[class*="animate"], [class*="fade"], [class*="slide"]');
        animatedElements.forEach(el => {
            el.style.animationPlayState = '';
            el.style.webkitAnimationPlayState = '';
        });
        
        // Resume videos if they were playing
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (video.getAttribute('data-was-playing') === 'true') {
                video.play();
                video.removeAttribute('data-was-playing');
            }
        });
    }
    
    /**
     * Ensure all sections are expanded and visible
     */
    function expandAllSections() {
        // Make sure all containers are fully visible
        const containers = document.querySelectorAll('section, .container, .footer');
        containers.forEach(container => {
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            container.style.height = 'auto';
            container.style.overflow = 'visible';
        });
        
        // Ensure all images are loaded
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // Force load any lazy-loaded images
            if (img.loading === 'lazy') {
                img.loading = 'eager';
            }
            
            // Add placeholder for broken images
            img.onerror = function() {
                this.style.display = 'block';
                this.style.width = '100%';
                this.style.height = '300px';
                this.style.background = '#f0f0f0';
                this.style.display = 'flex';
                this.style.alignItems = 'center';
                this.style.justifyContent = 'center';
                this.style.color = '#333';
                this.alt = 'Image could not be loaded';
            };
        });
    }
}); 