/**
 * Unified Animation System
 * Combines functionality from:
 * - animation-system.js
 * - animation-queue.js
 * - animation-manager.js
 */

import performanceManager from './performance-manager.js';

class AnimationSystem {
    constructor() {
        this.queue = [];
        this.activeAnimations = new Set();
        this.observers = new Set();
        this.isProcessing = false;
        this.maxConcurrent = 3;
        this.history = [];
        this.debug = false;
    }

    // Core animation methods
    animate(element, keyframes, options = {}) {
        if (!element || !keyframes) return null;

        const animation = {
            element,
            keyframes,
            options: {
                duration: 300,
                easing: 'ease',
                fill: 'forwards',
                ...options
            },
            startTime: null,
            status: 'queued'
        };

        this.queue.push(animation);
        performanceManager.trackQueuedAnimation();
        this.processQueue();

        return animation;
    }

    // Queue processing
    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0 && this.activeAnimations.size < this.maxConcurrent) {
            const animation = this.queue.shift();
            performanceManager.untrackQueuedAnimation();
            
            if (this.shouldStartAnimation(animation)) {
                await this.startAnimation(animation);
            }
        }

        this.isProcessing = false;
    }

    shouldStartAnimation(animation) {
        if (!animation.element.isConnected) return false;
        if (this.activeAnimations.has(animation)) return false;
        return true;
    }

    async startAnimation(animation) {
        try {
            animation.startTime = performance.now();
            animation.status = 'running';
            this.activeAnimations.add(animation);
            performanceManager.trackAnimation();

            const result = await animation.element.animate(
                animation.keyframes,
                animation.options
            ).finished;

            this.completeAnimation(animation);
            return result;
        } catch (error) {
            this.handleAnimationError(animation, error);
        }
    }

    completeAnimation(animation) {
        animation.status = 'completed';
        this.activeAnimations.delete(animation);
        performanceManager.untrackAnimation();
        this.addToHistory(animation);
        this.notifyObservers('animationComplete', animation);
    }

    // Error handling
    handleAnimationError(animation, error) {
        animation.status = 'error';
        this.activeAnimations.delete(animation);
        performanceManager.untrackAnimation();
        console.error('Animation error:', error);
        this.notifyObservers('animationError', { animation, error });
    }

    // History management
    addToHistory(animation) {
        this.history.push({
            ...animation,
            endTime: performance.now(),
            duration: performance.now() - animation.startTime
        });

        // Keep history size manageable
        if (this.history.length > 100) {
            this.history.shift();
        }
    }

    // Observer pattern
    addObserver(observer) {
        this.observers.add(observer);
    }
    
    removeObserver(observer) {
        this.observers.delete(observer);
    }
    
    notifyObservers(type, data) {
        this.observers.forEach(observer => {
            if (typeof observer === 'function') {
                observer(type, data);
            }
        });
    }

    // Utility methods
    cancelAnimation(animation) {
        if (this.activeAnimations.has(animation)) {
            animation.element.getAnimations().forEach(anim => anim.cancel());
            this.activeAnimations.delete(animation);
            performanceManager.untrackAnimation();
            this.notifyObservers('animationCancelled', animation);
        }
    }

    cancelAllAnimations() {
        this.activeAnimations.forEach(animation => {
            this.cancelAnimation(animation);
        });
        this.queue = [];
        performanceManager.untrackQueuedAnimation();
    }

    // Debug methods
    enableDebug() {
        this.debug = true;
        this.addObserver((type, data) => {
            if (this.debug) {
                console.log(`Animation ${type}:`, data);
            }
        });
    }
    
    disableDebug() {
        this.debug = false;
    }

    // Performance optimization
    setMaxConcurrent(max) {
        this.maxConcurrent = Math.max(1, Math.min(max, 5));
    }

    // State management
    getState() {
        return {
            queueLength: this.queue.length,
            activeCount: this.activeAnimations.size,
            history: this.history,
            maxConcurrent: this.maxConcurrent
        };
    }
}

// Export singleton instance
const animationSystem = new AnimationSystem();
export default animationSystem; 