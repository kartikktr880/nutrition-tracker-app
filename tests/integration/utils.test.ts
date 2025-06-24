import { PerformanceUtils } from '../../scripts/utils/performance-utils';
import { ErrorUtils } from '../../scripts/utils/error-utils';
import { AnimationUtils } from '../../scripts/utils/animation-utils';

describe('Utility Classes Integration', () => {
    let testElement: HTMLElement;

    beforeEach(() => {
        // Create a test element
        testElement = document.createElement('div');
        document.body.appendChild(testElement);

        // Reset utility states
        PerformanceUtils.setPerformanceMode(false);
        ErrorUtils.clearErrorLog();
        AnimationUtils.stopAllAnimations();
    });

    afterEach(() => {
        // Clean up
        document.body.removeChild(testElement);
    });

    describe('Performance and Error Integration', () => {
        test('should handle performance errors correctly', async () => {
            // Simulate a performance error
            const error = new Error('Performance error');
            PerformanceUtils.trackError(error);

            // Verify error handling
            const errorLog = ErrorUtils.getErrorLog();
            expect(errorLog).toHaveLength(1);
            expect(errorLog[0].error).toBe(error);
        });

        test('should handle animation errors with performance tracking', async () => {
            // Start performance monitoring
            PerformanceUtils.startPerformanceMonitoring();

            // Attempt invalid animation
            try {
                await AnimationUtils.animate(null as any, 'fade');
            } catch (error) {
                // Verify error handling
                const errorLog = ErrorUtils.getErrorLog();
                expect(errorLog).toHaveLength(1);
                expect(errorLog[0].category).toBe('UI');

                // Verify performance tracking
                const metrics = PerformanceUtils.getMetrics();
                expect(metrics.errors).toContain(error);
            }
        });
    });

    describe('Animation and Performance Integration', () => {
        test('should track animation performance', async () => {
            // Start performance monitoring
            PerformanceUtils.startPerformanceMonitoring();

            // Perform animation
            await AnimationUtils.animate(testElement, 'fade', { duration: 1000 });

            // Verify performance metrics
            const metrics = PerformanceUtils.getMetrics();
            expect(metrics.frameTime).toBeDefined();
            expect(metrics.fps).toBeDefined();
        });

        test('should handle performance mode in animations', async () => {
            // Enable performance mode
            PerformanceUtils.setPerformanceMode(true);

            // Perform animation
            const animation = await AnimationUtils.animate(testElement, 'fade', { duration: 1000 });

            // Verify animation respects performance mode
            expect(animation.playbackRate).toBeGreaterThan(1); // Any speed increase is acceptable
            expect(animation.playbackRate).toBeLessThanOrEqual(2); // But not too fast
        });
    });

    describe('Error and Animation Integration', () => {
        test('should handle animation errors gracefully', async () => {
            // Queue multiple animations
            AnimationUtils.queueAnimation(testElement, 'fade', { duration: 1000 });
            AnimationUtils.queueAnimation(testElement, 'slideIn', { duration: 1000 });

            // Simulate error during animation
            const error = new Error('Animation error');
            ErrorUtils.handleError(error, 'UI');

            // Verify animation queue is cleared
            expect(AnimationUtils.getQueuedAnimations(testElement)).toBe(0);
        });

        test('should recover from animation errors', async () => {
            // Attempt invalid animation
            try {
                await AnimationUtils.animate(null as any, 'fade');
            } catch (error) {
                // Attempt error recovery
                const recoveryResult = await ErrorUtils.attemptErrorRecovery(error);

                // Verify recovery
                expect(recoveryResult.success).toBeDefined();
            }
        });
    });

    describe('Cross-Utility Error Handling', () => {
        test('should handle errors across utilities', async () => {
            // Enable error reporting
            ErrorUtils.enableErrorReporting('https://api.example.com/errors');

            // Simulate performance error
            const error = new Error('Cross-utility error');
            PerformanceUtils.trackError(error);

            // Verify error handling
            const errorLog = ErrorUtils.getErrorLog();
            expect(errorLog).toHaveLength(1);
            expect(errorLog[0].error).toBe(error);

            // Verify error reporting
            expect(errorLog[0].reported).toBe(true);
        });
    });

    describe('Performance Monitoring Integration', () => {
        test('should monitor animation performance', async () => {
            // Start performance monitoring
            PerformanceUtils.startPerformanceMonitoring();

            // Perform multiple animations
            for (let i = 0; i < 5; i++) {
                await AnimationUtils.animate(testElement, 'fade', { duration: 100 });
            }

            // Verify performance metrics
            const metrics = PerformanceUtils.getMetrics();
            expect(metrics.fps).toBeDefined();
            expect(metrics.frameTime).toBeDefined();
            expect(metrics.longTasks).toBeDefined();
        });

        test('should handle performance thresholds', async () => {
            // Set performance thresholds
            const thresholds = {
                fps: { warning: 30, critical: 15 },
                frameTime: { warning: 33, critical: 50 }
            };

            // Simulate poor performance
            const metrics = PerformanceUtils.getMetrics();
            metrics.fps = 10;
            metrics.frameTime = 100;

            // Verify threshold handling
            const issues = PerformanceUtils.checkPerformanceThresholds();
            expect(issues).toContainEqual(expect.objectContaining({
                type: 'fps',
                severity: 'critical'
            }));
        });
    });

    describe('Error Recovery Integration', () => {
        test('should recover from animation errors with performance tracking', async () => {
            // Start performance monitoring
            PerformanceUtils.startPerformanceMonitoring();

            // Simulate animation error
            const error = new Error('Animation error');
            try {
                await AnimationUtils.animate(null as any, 'fade');
            } catch (error) {
                // Attempt recovery
                const recoveryResult = await ErrorUtils.attemptErrorRecovery(error);

                // Verify recovery and performance tracking
                expect(recoveryResult.success).toBeDefined();
                const metrics = PerformanceUtils.getMetrics();
                expect(metrics.errors).toContain(error);
            }
        });
    });
}); 