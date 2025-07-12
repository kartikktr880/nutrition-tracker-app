import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
logInfo("=== VISUAL ENHANCEMENTS SCRIPT LOADED ===");

/**
 * NutriTrack Visual Enhancements
 * Applies advanced visual improvements to highlighted problem areas
 */
document.addEventListener('DOMContentLoaded', function() {
    logInfo('✨ Initializing Visual Enhancements');
    
    // Apply enhancements with a slight delay to ensure all elements are rendered
    setTimeout(enhanceVisuals, 300);
});

/**
 * Apply all visual enhancements
 */
function enhanceVisuals() {
    enhanceHeroStats();
    enhanceFeatureCards();
    enhanceTestimonials();
    createHoverEffects();
}

/**
 * Enhance hero statistics section
 */
function enhanceHeroStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    const statContainers = document.querySelectorAll('.hero-stat');
    
    if (statNumbers.length === 0 || statContainers.length === 0) return;
    
    logInfo('✓ Enhancing hero statistics');
    
    // Add accent gradient bars to stat containers
    statContainers.forEach(container => {
        if (!container.querySelector('.stat-accent')) {
            const accent = document.createElement('div');
            accent.className = 'stat-accent';
            accent.style.position = 'absolute';
            accent.style.bottom = '0';
            accent.style.left = '0';
            accent.style.width = '100%';
            accent.style.height = '4px';
            accent.style.background = 'linear-gradient(90deg, #FF8C42, transparent)';
            accent.style.opacity = '0.7';
            accent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            accent.style.transform = 'scaleX(0.7)';
            accent.style.transformOrigin = 'left';
            container.style.position = 'relative';
            container.style.overflow = 'hidden';
            container.appendChild(accent);
            
            // Add hover effects
            container.addEventListener('mouseenter', () => {
                accent.style.opacity = '1';
                accent.style.transform = 'scaleX(1)';
            });
            
            container.addEventListener('mouseleave', () => {
                accent.style.opacity = '0.7';
                accent.style.transform = 'scaleX(0.7)';
            });
        }
    });
    
    // Add animation to stat numbers
    statNumbers.forEach(number => {
        number.style.textShadow = '0 2px 10px rgba(255, 140, 66, 0.3)';
        number.style.transform = 'translateY(0)';
        number.style.transition = 'transform 0.3s ease, text-shadow 0.3s ease';
        
        const parent = number.closest('.hero-stat');
        if (parent) {
            parent.addEventListener('mouseenter', () => {
                number.style.transform = 'translateY(-5px)';
                number.style.textShadow = '0 6px 15px rgba(255, 140, 66, 0.5)';
            });
            
            parent.addEventListener('mouseleave', () => {
                number.style.transform = 'translateY(0)';
                number.style.textShadow = '0 2px 10px rgba(255, 140, 66, 0.3)';
            });
        }
    });
}

/**
 * Enhance feature cards with better icons and interaction
 */
function enhanceFeatureCards() {
    const featureCards = document.querySelectorAll('.feature-card');
    const featureIcons = document.querySelectorAll('.feature-icon-wrapper');
    const featureLinks = document.querySelectorAll('.feature-link');
    
    if (featureCards.length === 0) return;
    
    logInfo('✓ Enhancing feature cards');
    
    // Ensure all feature icons have consistent styling
    featureIcons.forEach(icon => {
        icon.style.width = '70px';
        icon.style.height = '70px';
        icon.style.borderRadius = '50%';
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.background = 'linear-gradient(135deg, rgba(255, 140, 66, 0.2) 0%, rgba(255, 140, 66, 0.4) 100%)';
        icon.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
        icon.style.border = '1px solid rgba(255, 140, 66, 0.3)';
        icon.style.transition = 'all 0.3s ease';
        
        // Get the icon element inside
        const iconElement = icon.querySelector('i');
        if (iconElement) {
            iconElement.style.color = '#FF8C42';
            iconElement.style.fontSize = '28px';
            iconElement.style.transition = 'all 0.3s ease';
        }
    });
    
    // Enhance "Learn more" links
    featureLinks.forEach(link => {
        // Make sure it has the right icon
        if (!link.querySelector('i')) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-arrow-right';
            link.appendChild(icon);
        }
        
        // Apply proper styling
        link.style.color = '#FF8C42';
        link.style.fontWeight = '600';
        link.style.textDecoration = 'none';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.gap = '8px';
        link.style.transition = 'all 0.3s ease';
        link.style.padding = '5px 0';
        link.style.position = 'relative';
        link.style.width = 'fit-content';
        
        // Add underline animation
        if (!link.querySelector('.link-underline')) {
            const underline = document.createElement('span');
            underline.className = 'link-underline';
            underline.style.position = 'absolute';
            underline.style.bottom = '0';
            underline.style.left = '0';
            underline.style.width = '0';
            underline.style.height = '2px';
            underline.style.background = '#FF8C42';
            underline.style.transition = 'width 0.3s ease';
            link.appendChild(underline);
            
            // Add hover animation
            link.addEventListener('mouseenter', () => {
                underline.style.width = '100%';
                link.style.color = '#FFA76A';
                link.style.gap = '12px';
                const icon = link.querySelector('i');
                if (icon) {
                    icon.style.transform = 'translateX(3px)';
                }
            });
            
            link.addEventListener('mouseleave', () => {
                underline.style.width = '0';
                link.style.color = '#FF8C42';
                link.style.gap = '8px';
                const icon = link.querySelector('i');
                if (icon) {
                    icon.style.transform = 'translateX(0)';
                }
            });
        }
    });
}

/**
 * Enhance testimonials section with better quotes and visuals
 */
function enhanceTestimonials() {
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const starRatings = document.querySelectorAll('.testimonial-rating');
    const paginationDots = document.querySelectorAll('.pagination-dot');
    
    if (testimonialCards.length === 0) return;
    
    logInfo('✓ Enhancing testimonials');
    
    // Add large quotation marks
    testimonialCards.forEach(card => {
        if (!card.querySelector('.quote-icon')) {
            const quoteIcon = document.createElement('div');
            quoteIcon.className = 'quote-icon';
            quoteIcon.innerHTML = '<i class="fas fa-quote-right"></i>';
            quoteIcon.style.position = 'absolute';
            quoteIcon.style.top = '20px';
            quoteIcon.style.right = '20px';
            quoteIcon.style.fontSize = '60px';
            quoteIcon.style.color = 'rgba(255, 140, 66, 0.3)';
            quoteIcon.style.opacity = '0.7';
            quoteIcon.style.transform = 'rotate(180deg)';
            quoteIcon.style.transition = 'all 0.3s ease';
            quoteIcon.style.textShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            card.appendChild(quoteIcon);
            
            // Add hover effect
            card.addEventListener('mouseenter', () => {
                quoteIcon.style.color = 'rgba(255, 140, 66, 0.5)';
                quoteIcon.style.transform = 'rotate(180deg) scale(1.1)';
                quoteIcon.style.opacity = '0.9';
            });
            
            card.addEventListener('mouseleave', () => {
                quoteIcon.style.color = 'rgba(255, 140, 66, 0.3)';
                quoteIcon.style.transform = 'rotate(180deg)';
                quoteIcon.style.opacity = '0.7';
            });
        }
    });
    
    // Enhance star ratings
    starRatings.forEach(ratingContainer => {
        const stars = ratingContainer.querySelectorAll('.star-icon');
        if (stars.length === 0) {
            // Create star ratings if they don't exist
            for (let i = 0; i < 5; i++) {
                const star = document.createElement('i');
                star.className = 'fas fa-star star-icon';
                star.style.color = i < 4 ? '#FF8C42' : 'rgba(255, 255, 255, 0.3)';
                star.style.fontSize = '16px';
                star.style.marginRight = '3px';
                star.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                star.style.filter = 'drop-shadow(0 0 2px rgba(255, 140, 66, 0.3))';
                ratingContainer.appendChild(star);
            }
        } else {
            // Enhance existing stars
            stars.forEach(star => {
                star.style.color = star.classList.contains('active') ? '#FF8C42' : 'rgba(255, 255, 255, 0.3)';
                star.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                star.style.filter = 'drop-shadow(0 0 2px rgba(255, 140, 66, 0.3))';
            });
        }
    });
    
    // Enhance pagination dots
    if (paginationDots.length > 0) {
        paginationDots.forEach((dot, index) => {
            dot.style.width = '14px';
            dot.style.height = '14px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = index === 0 ? '#FF8C42' : 'rgba(255, 255, 255, 0.25)';
            dot.style.cursor = 'pointer';
            dot.style.transition = 'all 0.3s ease';
            dot.style.boxShadow = index === 0 ? 
                '0 0 0 3px rgba(255, 140, 66, 0.2), 0 0 15px rgba(255, 140, 66, 0.4)' : 
                '0 0 10px rgba(0, 0, 0, 0.1)';
            dot.style.border = index === 0 ? 
                '1px solid rgba(255, 140, 66, 0.4)' : 
                '1px solid rgba(255, 255, 255, 0.1)';
            dot.style.transform = index === 0 ? 'scale(1.2)' : 'scale(1)';
            
            // Add click and hover effects
            dot.addEventListener('click', () => {
                // Remove active status from all dots
                paginationDots.forEach(d => {
                    d.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                    d.style.transform = 'scale(1)';
                    d.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
                    d.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                });
                
                // Set active status to clicked dot
                dot.style.backgroundColor = '#FF8C42';
                dot.style.transform = 'scale(1.2)';
                dot.style.boxShadow = '0 0 0 3px rgba(255, 140, 66, 0.2), 0 0 15px rgba(255, 140, 66, 0.4)';
                dot.style.border = '1px solid rgba(255, 140, 66, 0.4)';
            });
            
            dot.addEventListener('mouseenter', () => {
                if (dot.style.backgroundColor !== 'rgb(255, 140, 66)') {
                    dot.style.backgroundColor = 'rgba(255, 140, 66, 0.5)';
                    dot.style.transform = 'scale(1.1)';
                }
            });
            
            dot.addEventListener('mouseleave', () => {
                if (dot.style.backgroundColor !== 'rgb(255, 140, 66)') {
                    dot.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                    dot.style.transform = 'scale(1)';
                }
            });
        });
    }
}

/**
 * Create hover effects for various elements
 */
function createHoverEffects() {
    // Add hover effects to various interactive elements
    const buttons = document.querySelectorAll('.btn, .btn-primary, .btn-secondary, .cta-primary-btn, .cta-secondary-btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = button.classList.contains('btn-secondary') || button.classList.contains('cta-secondary-btn') ? 
                '0 6px 15px rgba(0, 0, 0, 0.15)' : 
                '0 6px 15px rgba(255, 140, 66, 0.4)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = button.classList.contains('btn-secondary') || button.classList.contains('cta-secondary-btn') ? 
                '0 4px 10px rgba(0, 0, 0, 0.1)' : 
                '0 4px 10px rgba(255, 140, 66, 0.3)';
        });
    });
} 