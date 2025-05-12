/**
 * Ultimate Footer Fix
 * This script guarantees the footer will display properly in all modes
 * Directly sets critical spacing properties that are causing issues
 */

(function() {
    // Run immediately to fix any FOUC (Flash of Unstyled Content)
    fixFooterSpacing();
    
    // Listen for DOM content loaded in case script runs early
    document.addEventListener('DOMContentLoaded', fixFooterSpacing);
    
    // Also run after window fully loads to catch any late resources
    window.addEventListener('load', fixFooterSpacing);
    
    // Run on window resize for responsive adjustments
    window.addEventListener('resize', fixFooterSpacing);
    
    /**
     * Main function to fix all footer spacing issues
     */
    function fixFooterSpacing() {
        console.log('Ultimate footer fix running...');
        
        // Fix core structural elements first
        fixCoreStructure();
        
        // Fix newsletter to footer connection
        fixNewsletterSection();
        
        // Fix clean footer directly
        fixCleanFooter();
        
        // Fix footer grid layout
        fixFooterGrid();
        
        // Fix bottom footer section
        fixFooterBottom();
        
        // Set up monitoring for dynamic changes
        setupMutationObserver();
        
        console.log('Footer spacing fixed');
    }
    
    /**
     * Fix core page structure for proper footer placement
     */
    function fixCoreStructure() {
        // Force body to use flex layout
        document.body.style.display = 'flex';
        document.body.style.flexDirection = 'column';
        document.body.style.minHeight = '100vh';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflowX = 'hidden';
        
        // Get main content area
        const main = document.querySelector('main');
        if (main) {
            // Force main to grow and fill available space
            main.style.flex = '1 0 auto';
            main.style.display = 'block';
            main.style.width = '100%';
            main.style.marginBottom = '0';
            main.style.paddingBottom = '0';
            main.style.position = 'relative';
            main.style.zIndex = '1';
            
            // Fix the last section in main
            const lastSection = main.querySelector('section:last-child');
            if (lastSection) {
                lastSection.style.marginBottom = '0';
                lastSection.style.paddingBottom = '0';
                lastSection.style.borderBottom = 'none';
            }
        }
    }
    
    /**
     * Fix newsletter section spacing
     */
    function fixNewsletterSection() {
        const newsletter = document.querySelector('.newsletter-section');
        if (newsletter) {
            newsletter.style.marginBottom = '0';
            // Use less padding in regular mode to match screenshot mode
            newsletter.style.paddingBottom = '20px';
            newsletter.style.borderBottom = 'none';
            newsletter.style.position = 'relative';
            newsletter.style.zIndex = '2';
            
            // Check for screenshot mode and adjust accordingly
            if (document.body.classList.contains('screenshot-mode')) {
                newsletter.style.paddingBottom = '0';
            }
        }
    }
    
    /**
     * Fix clean footer with specific settings
     */
    function fixCleanFooter() {
        const footer = document.querySelector('.clean-footer');
        if (footer) {
            // Base structure styles
            footer.style.backgroundColor = '#0A1916';
            footer.style.color = '#ffffff';
            footer.style.position = 'relative';
            footer.style.zIndex = '10';
            footer.style.width = '100%';
            
            // Visibility styles
            footer.style.display = 'block';
            footer.style.visibility = 'visible';
            footer.style.opacity = '1';
            
            // Critical spacing styles - reduced to match screenshot mode
            footer.style.marginTop = '0';
            
            // Use specific padding based on mode
            if (document.body.classList.contains('screenshot-mode')) {
                footer.style.padding = '10px 0 5px';
            } else {
                footer.style.padding = '20px 0 15px';
            }
            
            footer.style.borderTop = '1px solid rgba(255, 255, 255, 0.05)';
            
            // Container styles
            const container = footer.querySelector('.footer-container');
            if (container) {
                container.style.maxWidth = '1200px';
                container.style.margin = '0 auto';
                container.style.padding = '0 20px';
                container.style.width = '100%';
                container.style.boxSizing = 'border-box';
            }
        }
    }
    
    /**
     * Fix footer grid layout
     */
    function fixFooterGrid() {
        const grid = document.querySelector('.footer-grid');
        if (grid) {
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
            
            // Adjust gap based on mode and screen size
            if (document.body.classList.contains('screenshot-mode')) {
                grid.style.gap = '10px';
                grid.style.marginBottom = '5px';
            } else {
                grid.style.gap = '20px';
                grid.style.marginBottom = '15px';
            }
            
            // Responsive adjustments
            if (window.innerWidth <= 992) {
                grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            }
            
            if (window.innerWidth <= 576) {
                grid.style.gridTemplateColumns = '1fr';
            }
            
            // Fix footer columns
            const columns = document.querySelectorAll('.footer-column');
            columns.forEach(column => {
                column.style.margin = '0';
                column.style.padding = '0';
                
                // Fix headings
                const heading = column.querySelector('h3');
                if (heading) {
                    heading.style.fontSize = '16px';
                    heading.style.fontWeight = '600';
                    heading.style.marginTop = '0';
                    
                    if (document.body.classList.contains('screenshot-mode')) {
                        heading.style.marginBottom = '5px';
                    } else {
                        heading.style.marginBottom = '10px';
                    }
                }
                
                // Fix links
                const linksList = column.querySelector('.footer-links');
                if (linksList) {
                    linksList.style.listStyle = 'none';
                    linksList.style.padding = '0';
                    linksList.style.margin = '0';
                    
                    const links = linksList.querySelectorAll('li');
                    links.forEach(link => {
                        if (document.body.classList.contains('screenshot-mode')) {
                            link.style.marginBottom = '3px';
                        } else {
                            link.style.marginBottom = '6px';
                        }
                    });
                }
                
                // Fix contact info
                const contactInfo = column.querySelector('.footer-contact');
                if (contactInfo) {
                    contactInfo.style.marginTop = '10px';
                    
                    const contactItems = contactInfo.querySelectorAll('.contact-item');
                    contactItems.forEach(item => {
                        item.style.marginBottom = '6px';
                        item.style.fontSize = '14px';
                        item.style.color = 'rgba(255, 255, 255, 0.8)';
                    });
                }
            });
        }
    }
    
    /**
     * Fix footer bottom section
     */
    function fixFooterBottom() {
        const footerBottom = document.querySelector('.footer-bottom');
        if (footerBottom) {
            footerBottom.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
            
            if (document.body.classList.contains('screenshot-mode')) {
                footerBottom.style.paddingTop = '5px';
            } else {
                footerBottom.style.paddingTop = '10px';
            }
            
            footerBottom.style.marginTop = '0';
            footerBottom.style.display = 'flex';
            footerBottom.style.justifyContent = 'space-between';
            footerBottom.style.alignItems = 'center';
            footerBottom.style.flexWrap = 'wrap';
            footerBottom.style.gap = '10px';
            
            // Responsive adjustments
            if (window.innerWidth <= 576) {
                footerBottom.style.flexDirection = 'column';
                footerBottom.style.textAlign = 'center';
                footerBottom.style.gap = '8px';
            }
            
            // Fix copyright
            const copyright = footerBottom.querySelector('.footer-copyright');
            if (copyright) {
                copyright.style.color = 'rgba(255, 255, 255, 0.6)';
                copyright.style.fontSize = '13px';
            }
            
            // Fix legal links
            const legal = footerBottom.querySelector('.footer-legal');
            if (legal) {
                legal.style.display = 'flex';
                legal.style.gap = '10px';
                legal.style.flexWrap = 'wrap';
                
                if (window.innerWidth <= 576) {
                    legal.style.justifyContent = 'center';
                }
                
                const links = legal.querySelectorAll('a');
                links.forEach(link => {
                    link.style.color = 'rgba(255, 255, 255, 0.6)';
                    link.style.textDecoration = 'none';
                    link.style.fontSize = '13px';
                });
            }
        }
    }
    
    /**
     * Set up mutation observer to monitor DOM changes
     */
    function setupMutationObserver() {
        // Check if we already have an observer
        if (window.footerObserver) {
            return;
        }
        
        // Create new mutation observer
        const observer = new MutationObserver(function(mutations) {
            // Debounce multiple rapid changes
            if (window.footerFixTimeout) {
                clearTimeout(window.footerFixTimeout);
            }
            
            window.footerFixTimeout = setTimeout(function() {
                // Check if screenshot mode was toggled
                for (let mutation of mutations) {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'class' && 
                        mutation.target === document.body) {
                        // Screenshot mode toggled, fix footer spacing
                        fixFooterSpacing();
                        return;
                    }
                }
                
                // Otherwise just update the parts that might have changed
                fixNewsletterSection();
                fixCleanFooter();
                fixFooterGrid();
                fixFooterBottom();
            }, 100);
        });
        
        // Watch body for class changes (screenshot mode toggle)
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Watch footer and newsletter for any changes
        const footer = document.querySelector('.clean-footer');
        const newsletter = document.querySelector('.newsletter-section');
        
        if (footer) {
            observer.observe(footer, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }
        
        if (newsletter) {
            observer.observe(newsletter, {
                attributes: true,
                childList: true
            });
        }
        
        // Store observer reference
        window.footerObserver = observer;
    }
})(); 