/**
 * Animation Manager
 * Handles performance optimizations and animation management across the application
 */

export class AnimationManager {
    constructor() {
        this.isEnabled = true;
        this.performanceMode = false;
        this.queue = [];
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    addToQueue(animation) {
        if (!this.isEnabled) return;

        // Adjust duration based on performance mode and reduced motion preference
        if (this.performanceMode) {
            animation.duration = Math.floor(animation.duration / 2);
        }
        
        if (this.reducedMotion) {
            animation.duration = 0;
        }

        this.queue.push(animation);
    }

    async processQueue() {
        while (this.queue.length > 0) {
            const animation = this.queue.shift();
            try {
                await this.animate(animation);
            } catch (error) {
                console.error('Animation failed:', error);
            }
        }
    }

    async animate({ element, properties, duration }) {
        if (!element || !properties) return;

        return new Promise((resolve) => {
            if (duration === 0) {
                // Apply properties immediately if duration is 0
                Object.entries(properties).forEach(([property, value]) => {
                    element.style[property] = value;
                });
                resolve();
                return;
            }

            // Create animation
            const animation = element.animate(
                Object.entries(properties).map(([property, value]) => ({
                    [property]: value
                })),
                {
                    duration,
                    easing: 'ease-in-out',
                    fill: 'forwards'
                }
            );

            animation.onfinish = () => {
                // Apply final values to style
                Object.entries(properties).forEach(([property, value]) => {
                    element.style[property] = value;
                });
                resolve();
            };
        });
    }

    setPerformanceMode(enabled) {
        this.performanceMode = enabled;
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
        this.queue = []; // Clear queue when disabled
    }
}

// Export singleton instance
const animationManager = new AnimationManager();
export default animationManager; 