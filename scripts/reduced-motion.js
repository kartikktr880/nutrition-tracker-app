/**
 * Reduced Motion Manager
 * Handles reduced motion preferences and accessibility features
 */

class ReducedMotionManager {
    constructor() {
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.observers = new Set();
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the reduced motion manager
     */
    init() {
        // Setup reduced motion listener
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.isReducedMotion = e.matches;
            this.updateMotionState();
        });
        
        // Initial state update
        this.updateMotionState();
    }
    
    /**
     * Update motion state based on preferences
     */
    updateMotionState() {
        // Update body class
        if (this.isReducedMotion) {
            document.body.classList.add('reduce-motion');
            document.body.classList.remove('allow-motion');
        } else {
            document.body.classList.remove('reduce-motion');
            document.body.classList.add('allow-motion');
        }
        
        // Notify observers
        this.notifyObservers();
        
        // Update animation elements
        this.updateAnimationElements();
    }
    
    /**
     * Update animation elements based on motion preferences
     */
    updateAnimationElements() {
        // Get all animated elements
        const animatedElements = document.querySelectorAll('[data-animation]');
        
        animatedElements.forEach(element => {
            if (this.isReducedMotion) {
                // Apply reduced motion styles
                this.applyReducedMotion(element);
            } else {
                // Restore original animation
                this.restoreAnimation(element);
            }
        });
    }
    
    /**
     * Apply reduced motion to an element
     */
    applyReducedMotion(element) {
        const animationType = element.dataset.animation;
        
        // Store original animation
        if (!element.dataset.originalAnimation) {
            element.dataset.originalAnimation = animationType;
        }
        
        // Apply reduced motion based on animation type
        switch (animationType) {
            case 'fade-in':
            case 'fade-out':
                // Keep fade animations but make them instant
                element.style.transition = 'none';
                break;
                
            case 'slide-in-up':
            case 'slide-in-down':
            case 'slide-in-left':
            case 'slide-in-right':
                // Replace slide with fade
                element.classList.remove(animationType);
                element.classList.add('fade-in');
                break;
                
            case 'scale-in':
            case 'scale-out':
                // Replace scale with fade
                element.classList.remove(animationType);
                element.classList.add('fade-in');
                break;
                
            case 'rotate-in':
            case 'rotate-out':
                // Remove rotation
                element.classList.remove(animationType);
                break;
                
            default:
                // Disable other animations
                element.style.animation = 'none';
                element.style.transition = 'none';
        }
    }
    
    /**
     * Restore original animation
     */
    restoreAnimation(element) {
        const originalAnimation = element.dataset.originalAnimation;
        
        if (originalAnimation) {
            // Remove reduced motion classes
            element.classList.remove('fade-in', 'fade-out');
            
            // Restore original animation
            element.classList.add(originalAnimation);
            
            // Restore transitions
            element.style.transition = '';
            element.style.animation = '';
        }
    }
    
    /**
     * Add an observer for motion preference changes
     */
    addObserver(observer) {
        this.observers.add(observer);
    }
    
    /**
     * Remove an observer
     */
    removeObserver(observer) {
        this.observers.delete(observer);
    }
    
    /**
     * Notify all observers of motion preference changes
     */
    notifyObservers() {
        this.observers.forEach(observer => {
            observer(this.isReducedMotion);
        });
    }
    
    /**
     * Check if reduced motion is enabled
     */
    isMotionReduced() {
        return this.isReducedMotion;
    }
    
    /**
     * Get motion preference state
     */
    getMotionState() {
        return {
            isReduced: this.isReducedMotion,
            timestamp: Date.now()
        };
    }
}

// Export singleton instance
const reducedMotionManager = new ReducedMotionManager();
export default reducedMotionManager; 