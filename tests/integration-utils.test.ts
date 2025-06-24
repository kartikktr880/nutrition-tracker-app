import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnimationUtils } from '../scripts/utils/animation-utils.ts';
import { PerformanceUtils } from '../scripts/utils/performance-utils.ts';
import { ScrollUtils } from '../scripts/utils/scroll-utils.ts';
import { FoodTypeUtils } from '../scripts/utils/food-type-utils.ts';
import { ApiLayer } from '../scripts/api-layer.ts';

describe('Utility Integration Tests', () => {
    let animationUtils: AnimationUtils;
    let performanceUtils: PerformanceUtils;
    let scrollUtils: ScrollUtils;
    let foodTypeUtils: FoodTypeUtils;
    let apiLayer: ApiLayer;

    beforeEach(() => {
        // Initialize all utilities
        animationUtils = new AnimationUtils();
        performanceUtils = new PerformanceUtils();
        scrollUtils = new ScrollUtils();
        foodTypeUtils = new FoodTypeUtils();
        apiLayer = new ApiLayer();

        // Mock DOM elements
        document.body.innerHTML = `
            <div class="test-element"></div>
            <div class="scroll-container" style="height: 1000px;"></div>
        `;

        // Mock performance API
        vi.spyOn(performance, 'now').mockImplementation(() => 1000);
        vi.spyOn(performance, 'mark').mockImplementation(() => {});
        vi.spyOn(performance, 'measure').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('Animation and Performance Integration', () => {
        it('should handle performance-based animation adjustments', async () => {
            const element = document.querySelector('.test-element');
            const animation = animationUtils.createAnimation(element, {
                duration: 1000,
                properties: { opacity: [0, 1] }
            });

            // Simulate low performance
            performanceUtils.setPerformanceMode(true);
            animationUtils.queueAnimation(animation);

            expect(animation.duration).toBe(500); // Duration should be halved in performance mode
        });

        it('should handle animation cleanup during scroll', () => {
            const element = document.querySelector('.test-element');
            const animation = animationUtils.createAnimation(element, {
                duration: 1000,
                properties: { opacity: [0, 1] }
            });

            animationUtils.queueAnimation(animation);
            scrollUtils.scrollToTop();

            expect(animationUtils.state.activeAnimations.size).toBe(0);
        });
    });

    describe('Scroll and Performance Integration', () => {
        it('should optimize scroll handling in performance mode', () => {
            const callback = vi.fn();
            performanceUtils.setPerformanceMode(true);
            scrollUtils.addScrollObserver(callback);

            // Simulate rapid scrolling
            for (let i = 0; i < 10; i++) {
                scrollUtils.handleScroll();
            }

            expect(callback).toHaveBeenCalledTimes(1); // Should be throttled
        });

        it('should handle scroll position persistence with performance tracking', () => {
            scrollUtils.saveScrollPosition('test-key');
            const metrics = performanceUtils.getMetrics();
            expect(metrics).toHaveProperty('scrollOperations');
        });
    });

    describe('Food Type and API Integration', () => {
        it('should handle API caching for food type lookups', async () => {
            const foodName = 'apple';
            const result1 = await foodTypeUtils.classifyFood(foodName);
            const result2 = await foodTypeUtils.classifyFood(foodName);

            expect(result1).toBe(result2);
            expect(apiLayer.cache.has(`food-type-${foodName}`)).toBe(true);
        });

        it('should handle offline food type classification', async () => {
            // Simulate offline mode
            apiLayer.setOfflineMode(true);
            const result = await foodTypeUtils.classifyFood('apple');
            expect(result).toBeDefined();
            expect(apiLayer.offlineQueue.length).toBe(0);
        });
    });

    describe('Cross-Utility Error Handling', () => {
        it('should handle animation errors during scroll', () => {
            const element = document.querySelector('.test-element');
            const animation = animationUtils.createAnimation(element, {
                duration: 1000,
                properties: { invalid: [0, 1] }
            });

            animationUtils.queueAnimation(animation);
            scrollUtils.scrollToTop();

            expect(animationUtils.state.metrics.failedAnimations).toBe(1);
        });

        it('should handle API errors during food type lookup', async () => {
            // Simulate API error
            apiLayer.setErrorMode(true);
            const result = await foodTypeUtils.classifyFood('apple');
            expect(result).toBe('unknown');
            expect(apiLayer.errorQueue.length).toBe(1);
        });
    });

    describe('Performance Monitoring Integration', () => {
        it('should track cross-utility performance metrics', () => {
            const element = document.querySelector('.test-element');
            const animation = animationUtils.createAnimation(element, {
                duration: 1000,
                properties: { opacity: [0, 1] }
            });

            animationUtils.queueAnimation(animation);
            scrollUtils.scrollToTop();

            const metrics = performanceUtils.getMetrics();
            expect(metrics).toHaveProperty('animationOperations');
            expect(metrics).toHaveProperty('scrollOperations');
        });

        it('should handle performance mode transitions', () => {
            performanceUtils.setPerformanceMode(true);
            expect(animationUtils.config.duration.medium).toBe(150);
            expect(scrollUtils.config.throttleDelay).toBe(100);

            performanceUtils.setPerformanceMode(false);
            expect(animationUtils.config.duration.medium).toBe(300);
            expect(scrollUtils.config.throttleDelay).toBe(50);
        });
    });

    describe('Error Recovery and Resilience', () => {
        it('should recover from animation errors and continue operation', async () => {
            const element = document.querySelector('.test-element');
            const validAnimation = animationUtils.createAnimation(element, {
                duration: 1000,
                properties: { opacity: [0, 1] }
            });
            const invalidAnimation = animationUtils.createAnimation(element, {
                duration: 1000,
                properties: { invalid: [0, 1] }
            });

            animationUtils.queueAnimation(invalidAnimation);
            animationUtils.queueAnimation(validAnimation);

            await new Promise(resolve => setTimeout(resolve, 100));
            expect(animationUtils.state.activeAnimations.size).toBe(1);
            expect(animationUtils.state.metrics.failedAnimations).toBe(1);
        });

        it('should handle API recovery after errors', async () => {
            apiLayer.setErrorMode(true);
            await foodTypeUtils.classifyFood('apple');
            apiLayer.setErrorMode(false);
            const result = await foodTypeUtils.classifyFood('apple');
            expect(result).toBeDefined();
            expect(apiLayer.errorQueue.length).toBe(0);
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent animations and scroll operations', async () => {
            const element = document.querySelector('.test-element');
            const animations = Array(5).fill(null).map(() => 
                animationUtils.createAnimation(element, {
                    duration: 1000,
                    properties: { opacity: [0, 1] }
                })
            );

            animations.forEach(anim => animationUtils.queueAnimation(anim));
            scrollUtils.scrollToTop();

            await new Promise(resolve => setTimeout(resolve, 100));
            expect(animationUtils.state.activeAnimations.size).toBe(0);
            expect(scrollUtils.state.isScrolling).toBe(false);
        });

        it('should handle concurrent API and food type operations', async () => {
            const operations = Array(5).fill(null).map(() => 
                foodTypeUtils.classifyFood('apple')
            );

            const results = await Promise.all(operations);
            expect(results.every(r => r === results[0])).toBe(true);
            expect(apiLayer.cache.size).toBe(1);
        });
    });

    describe('Resource Management', () => {
        it('should properly cleanup resources after operations', () => {
            const element = document.querySelector('.test-element');
            const animation = animationUtils.createAnimation(element, {
                duration: 1000,
                properties: { opacity: [0, 1] }
            });

            animationUtils.queueAnimation(animation);
            scrollUtils.addScrollObserver(() => {});
            foodTypeUtils.classifyFood('apple');

            // Cleanup
            animationUtils.cleanup();
            scrollUtils.cleanup();
            foodTypeUtils.cleanup();

            expect(animationUtils.state.activeAnimations.size).toBe(0);
            expect(scrollUtils.state.observers.size).toBe(0);
            expect(foodTypeUtils.state.cache.size).toBe(0);
        });

        it('should prevent memory leaks during long operations', async () => {
            const element = document.querySelector('.test-element');
            const startMemory = performance.memory?.usedJSHeapSize || 0;

            // Simulate long-running operations
            for (let i = 0; i < 100; i++) {
                const animation = animationUtils.createAnimation(element, {
                    duration: 100,
                    properties: { opacity: [0, 1] }
                });
                animationUtils.queueAnimation(animation);
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            const endMemory = performance.memory?.usedJSHeapSize || 0;
            expect(endMemory - startMemory).toBeLessThan(1000000); // Less than 1MB growth
        });
    });
}); 