import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnimationSystem } from '../scripts/animation-system';
import { ScrollManager } from '../scripts/scroll-manager';
import { CSSConsolidator } from '../scripts/css-consolidator';
import { FoodTypeUtils } from '../scripts/food-type-utils';
import { AnalyticsCore } from '../scripts/analytics-core';
import { WaveletTransform } from '../scripts/performance-analytics';

describe('Consolidated Utility Functions', () => {
    let animationSystem: AnimationSystem;
    let scrollManager: ScrollManager;
    let cssConsolidator: CSSConsolidator;
    let foodTypeUtils: FoodTypeUtils;
    let analyticsCore: AnalyticsCore;
    let waveletTransform: WaveletTransform;

    beforeEach(() => {
        // Initialize all systems
        animationSystem = new AnimationSystem();
        animationSystem.init();
        scrollManager = new ScrollManager();
        scrollManager.init();
        cssConsolidator = new CSSConsolidator();
        if (typeof cssConsolidator.init === 'function') cssConsolidator.init();
        foodTypeUtils = new FoodTypeUtils();
        if (typeof foodTypeUtils.init === 'function') foodTypeUtils.init();
        analyticsCore = new AnalyticsCore();
        if (typeof analyticsCore.init === 'function') analyticsCore.init();
        waveletTransform = new WaveletTransform();
        if (typeof waveletTransform.init === 'function') waveletTransform.init();

        // Mock DOM elements
        document.body.innerHTML = `
            <header></header>
            <div class="gradient-overlay"></div>
            <div class="test-element"></div>
        `;
    });

    afterEach(() => {
        // Cleanup
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('Animation System', () => {
        it('should handle multiple animations concurrently', async () => {
            const element = document.querySelector('.test-element');
            const animations = [
                { properties: { opacity: [0, 1] }, duration: 100 },
                { properties: { transform: ['translateY(0)', 'translateY(20px)'] }, duration: 200 },
                { properties: { scale: [1, 1.2] }, duration: 300 }
            ];

            const promises = animations.map(anim => 
                animationSystem.animate(element, anim.properties, { duration: anim.duration })
            );

            await Promise.all(promises);
            expect(animationSystem.activeAnimations.size).toBe(0);
        });

        it('should respect maxConcurrent limit', () => {
            const element = document.querySelector('.test-element');
            const animations = Array(5).fill(null).map(() => ({
                properties: { opacity: [0, 1] },
                duration: 100
            }));

            animations.forEach(anim => {
                animationSystem.animate(element, anim.properties, { duration: anim.duration });
            });

            expect(animationSystem.activeAnimations.size).toBeLessThanOrEqual(animationSystem.maxConcurrent);
        });
    });

    describe('Scroll Manager', () => {
        it('should track scroll direction correctly', () => {
            // Simulate scroll down
            window.scrollY = 100;
            scrollManager.handleScroll();
            expect(scrollManager.state.scrollDirection).toBe('down');

            // Simulate scroll up
            window.scrollY = 50;
            scrollManager.handleScroll();
            expect(scrollManager.state.scrollDirection).toBe('up');
        });

        it('should apply scroll fixes correctly', () => {
            scrollManager.applyScrollFixes();
            expect(document.documentElement.style.scrollBehavior).toBe('smooth');
        });
    });

    describe('CSS Consolidator', () => {
        it('should consolidate stylesheets', async () => {
            const mockStylesheet = `
                .test { color: red; }
                .test { background: blue; }
                /* Comment */
                .empty { }
            `;

            const optimized = cssConsolidator.optimizeCSS(mockStylesheet);
            expect(optimized).toContain('.test{color:red;background:blue}');
            expect(optimized).not.toContain('/* Comment */');
            expect(optimized).not.toContain('.empty{}');
        });
    });

    describe('Food Type Utils', () => {
        it('should categorize food items correctly', () => {
            const result = foodTypeUtils.categorizeFood('chicken');
            expect(result.category).toBe('proteins');
            expect(result.subcategory).toBe('meat');
        });

        it('should handle unknown food items', () => {
            const result = foodTypeUtils.categorizeFood('unknown-food');
            expect(result.category).toBe('other');
        });
    });

    describe('Analytics Core', () => {
        it('should track performance metrics', () => {
            analyticsCore.trackPerformanceMetric('firstContentfulPaint', 100);
            expect(analyticsCore.performanceMetrics.firstContentfulPaint).toBe(100);
        });

        it('should detect browser features', () => {
            expect(analyticsCore.features.supportsLocalStorage).toBeDefined();
            expect(analyticsCore.features.prefersReducedMotion).toBeDefined();
        });
    });

    describe('Wavelet Transform', () => {
        it('should analyze scale groups correctly', () => {
            const features = [
                { time: 100, value: 1 },
                { time: 200, value: 2 },
                { time: 300, value: 3 },
                { time: 500, value: 4 } // Gap in time
            ];

            const groups = waveletTransform.analyzeScaleGroup(features);
            expect(groups.length).toBe(2); // Should split into two groups due to time gap
            expect(groups[0].length).toBe(3); // First group should have 3 items
            expect(groups[1].length).toBe(1); // Second group should have 1 item
        });
    });
}); 