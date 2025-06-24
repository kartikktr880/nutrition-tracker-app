import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceUtils } from '../scripts/utils/performance-utils';

describe('PerformanceUtils', () => {
    beforeEach(() => {
        // Reset state before each test
        PerformanceUtils.setPerformanceMode(false);
        PerformanceUtils.clearMarks();
        PerformanceUtils.clearMeasures();
    });

    describe('Performance Mode', () => {
        it('should set and get performance mode', () => {
            PerformanceUtils.setPerformanceMode(true);
            expect(PerformanceUtils.isPerformanceMode()).toBe(true);
            
            PerformanceUtils.setPerformanceMode(false);
            expect(PerformanceUtils.isPerformanceMode()).toBe(false);
        });
    });

    describe('Debounce', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });
        it('should debounce function calls', () => {
            const fn = vi.fn();
            const debouncedFn = PerformanceUtils.debounce(fn, 100);
            
            debouncedFn();
            debouncedFn();
            debouncedFn();
            
            expect(fn).not.toHaveBeenCalled();
            
            // Fast-forward time
            vi.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });

    describe('Throttle', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });
        it('should throttle function calls', () => {
            const fn = vi.fn();
            const throttledFn = PerformanceUtils.throttle(fn, 100);
            
            throttledFn();
            throttledFn();
            throttledFn();
            
            expect(fn).toHaveBeenCalledTimes(1);
            
            // Fast-forward time
            vi.advanceTimersByTime(100);
            throttledFn();
            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    describe('Animation Frame', () => {
        it('should handle requestAnimationFrame and cancelAnimationFrame', () => {
            const callback = vi.fn();
            const id = PerformanceUtils.requestAnimationFrame(callback);
            
            expect(typeof id).toBe('number');
            
            PerformanceUtils.cancelAnimationFrame(id);
            // Note: We can't easily test if the callback was cancelled
            // as it depends on the browser's implementation
        });
    });

    describe('Performance Measurement', () => {
        it('should measure execution time', () => {
            const fn = () => {
                let sum = 0;
                for (let i = 0; i < 1000; i++) {
                    sum += i;
                }
                return sum;
            };
            
            const executionTime = PerformanceUtils.measureExecutionTime(fn);
            expect(typeof executionTime).toBe('number');
            // In test env, may be 0, so just check for >= 0
            expect(executionTime).toBeGreaterThanOrEqual(0);
        });

        it('should handle marks and measures', () => {
            PerformanceUtils.mark('start');
            // Simulate some work
            let sum = 0;
            for (let i = 0; i < 1000; i++) {
                sum += i;
            }
            PerformanceUtils.mark('end');
            
            PerformanceUtils.measure('test-measure', 'start', 'end');
            const measure = PerformanceUtils.getMeasure('test-measure');
            
            expect(measure).toBeDefined();
            expect(typeof measure).toBe('number');
            expect(measure).toBeGreaterThanOrEqual(0);
        });

        it('should handle async measurements', async () => {
            vi.useFakeTimers();
            const asyncOperation = async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return 'result';
            };
            
            const result = await PerformanceUtils.measureAsync('async-test', asyncOperation);
            expect(result).toBe('result');
            
            const measure = PerformanceUtils.getMeasure('async-test');
            expect(measure).toBeDefined();
            expect(measure).toBeGreaterThanOrEqual(0);
            vi.useRealTimers();
        });

        it('should handle sync measurements', () => {
            const syncOperation = () => {
                let sum = 0;
                for (let i = 0; i < 1000; i++) {
                    sum += i;
                }
                return sum;
            };
            
            const result = PerformanceUtils.measureSync('sync-test', syncOperation);
            expect(typeof result).toBe('number');
            
            const measure = PerformanceUtils.getMeasure('sync-test');
            expect(measure).toBeDefined();
            expect(measure).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Metrics', () => {
        it('should track long tasks', () => {
            // Simulate a long task by mocking performance.now
            const originalNow = performance.now;
            let now = 0;
            performance.now = () => {
                const value = now;
                now += 100; // Simulate 100ms per call
                return value;
            };
            const longTask = () => {
                let sum = 0;
                for (let i = 0; i < 1000000; i++) {
                    sum += i;
                }
            };
            
            PerformanceUtils.trackLongTask(longTask);
            const metrics = PerformanceUtils.getMetrics();
            expect(metrics.longTasks).toBeGreaterThan(0);
            performance.now = originalNow;
        });

        it('should track errors', () => {
            const error = new Error('Test error');
            PerformanceUtils.trackError(error);
            const metrics = PerformanceUtils.getMetrics();
            expect(metrics.errors).toContain(error);
        });

        it('should get detailed metrics', () => {
            const metrics = PerformanceUtils.getDetailedMetrics();
            expect(metrics).toHaveProperty('longTasks');
            expect(metrics).toHaveProperty('errors');
            expect(metrics).toHaveProperty('memoryUsage');
            expect(metrics).toHaveProperty('fps');
            expect(metrics).toHaveProperty('frameTime');
            expect(metrics).toHaveProperty('cpuUsage');
            expect(metrics).toHaveProperty('lastUpdate');
        });
    });

    describe('Memory Usage', () => {
        it('should get memory usage if available', () => {
            // Mock performance.memory
            const mockMemory = {
                totalJSHeapSize: 1000000,
                usedJSHeapSize: 500000,
                jsHeapSizeLimit: 2000000
            };
            
            Object.defineProperty(performance, 'memory', {
                value: mockMemory,
                writable: true
            });
            
            const memoryUsage = PerformanceUtils.getMemoryUsage();
            expect(memoryUsage).toEqual(mockMemory);
        });
    });

    describe('Navigation Timing', () => {
        it('should get navigation timing', () => {
            // Mock performance.getEntriesByType
            const mockNavigation = { navigationStart: 1, loadEventEnd: 2 };
            const originalGetEntriesByType = performance.getEntriesByType;
            performance.getEntriesByType = (type) => {
                if (type === 'navigation') return [mockNavigation];
                return [];
            };
            const navigation = PerformanceUtils.getNavigationTiming();
            expect(navigation).toBeDefined();
            expect(navigation).toHaveProperty('navigationStart');
            expect(navigation).toHaveProperty('loadEventEnd');
            performance.getEntriesByType = originalGetEntriesByType;
        });
    });

    describe('Resource Timing', () => {
        it('should get resource timing', () => {
            const resources = PerformanceUtils.getResourceTiming();
            expect(Array.isArray(resources)).toBe(true);
        });
    });

    describe('Performance History', () => {
        beforeEach(() => {
            PerformanceUtils.clearPerformanceHistory();
        });

        it('should track performance history', () => {
            // Simulate performance issues
            const mockMetrics = {
                fps: 15,
                frameTime: 40,
                memoryUsage: 60 * 1024 * 1024,
                cpuUsage: 80,
                longTasks: 0,
                errors: [],
                lastUpdate: Date.now()
            };

            // Mock the metrics
            Object.defineProperty(PerformanceUtils, 'metrics', {
                get: () => mockMetrics
            });

            // Trigger performance check
            PerformanceUtils['checkPerformanceThresholds']();

            const history = PerformanceUtils.getPerformanceHistory();
            expect(history.length).toBe(1);
            expect(history[0].issues.length).toBeGreaterThan(0);
            expect(history[0].metrics).toEqual(mockMetrics);
        });

        it('should limit history size', () => {
            // Simulate performance issues multiple times
            for (let i = 0; i < 150; i++) {
                PerformanceUtils['addToHistory']([{
                    type: 'test',
                    severity: 'warning',
                    value: i
                }]);
            }

            const history = PerformanceUtils.getPerformanceHistory();
            expect(history.length).toBe(100); // Should be limited to HISTORY_MAX_ENTRIES
        });

        it('should clear history', () => {
            // Add some history
            PerformanceUtils['addToHistory']([{
                type: 'test',
                severity: 'warning',
                value: 1
            }]);

            // Clear history
            PerformanceUtils.clearPerformanceHistory();
            const history = PerformanceUtils.getPerformanceHistory();
            expect(history.length).toBe(0);
        });
    });

    describe('Performance Analytics', () => {
        beforeEach(() => {
            PerformanceUtils.clearPerformanceHistory();
        });

        it('should return default values when no history exists', () => {
            const analytics = PerformanceUtils.getPerformanceAnalytics();
            expect(analytics).toEqual({
                averageFPS: 0,
                averageFrameTime: 0,
                averageMemoryUsage: 0,
                averageCPUUsage: 0,
                criticalIssuesCount: 0,
                warningIssuesCount: 0,
                performanceModeDuration: 0,
                issueDistribution: {},
                timeInPerformanceMode: 0
            });
        });

        it('should calculate correct averages from history', () => {
            // Add some test history entries
            const mockHistory = [
                {
                    timestamp: Date.now() - 1000,
                    metrics: {
                        fps: 30,
                        frameTime: 33.33,
                        memoryUsage: 50 * 1024 * 1024,
                        cpuUsage: 50,
                        longTasks: 0,
                        errors: [],
                        lastUpdate: Date.now()
                    },
                    issues: []
                },
                {
                    timestamp: Date.now() - 500,
                    metrics: {
                        fps: 60,
                        frameTime: 16.67,
                        memoryUsage: 60 * 1024 * 1024,
                        cpuUsage: 60,
                        longTasks: 0,
                        errors: [],
                        lastUpdate: Date.now()
                    },
                    issues: []
                }
            ];

            // Mock the performance history
            Object.defineProperty(PerformanceUtils, 'performanceHistory', {
                get: () => mockHistory
            });

            const analytics = PerformanceUtils.getPerformanceAnalytics();
            expect(analytics.averageFPS).toBe(45); // (30 + 60) / 2
            expect(analytics.averageFrameTime).toBe(25); // (33.33 + 16.67) / 2
            expect(analytics.averageMemoryUsage).toBe(55 * 1024 * 1024); // (50 + 60) / 2 * 1024 * 1024
            expect(analytics.averageCPUUsage).toBe(55); // (50 + 60) / 2
        });

        it('should count issues correctly', () => {
            const mockHistory = [
                {
                    timestamp: Date.now() - 1000,
                    metrics: {
                        fps: 15,
                        frameTime: 40,
                        memoryUsage: 70 * 1024 * 1024,
                        cpuUsage: 80,
                        longTasks: 0,
                        errors: [],
                        lastUpdate: Date.now()
                    },
                    issues: [
                        { type: 'fps', severity: 'critical', value: 15 },
                        { type: 'memory', severity: 'warning', value: 70 * 1024 * 1024 }
                    ]
                }
            ];

            Object.defineProperty(PerformanceUtils, 'performanceHistory', {
                get: () => mockHistory
            });

            const analytics = PerformanceUtils.getPerformanceAnalytics();
            expect(analytics.criticalIssuesCount).toBe(1);
            expect(analytics.warningIssuesCount).toBe(1);
            expect(analytics.issueDistribution).toEqual({
                fps: 1,
                memory: 1
            });
        });

        it('should calculate performance mode duration correctly', () => {
            const now = Date.now();
            const mockHistory = [
                {
                    timestamp: now - 2000,
                    metrics: {
                        fps: 15,
                        frameTime: 40,
                        memoryUsage: 70 * 1024 * 1024,
                        cpuUsage: 80,
                        longTasks: 0,
                        errors: [],
                        lastUpdate: now - 2000
                    },
                    issues: []
                },
                {
                    timestamp: now - 1000,
                    metrics: {
                        fps: 60,
                        frameTime: 16.67,
                        memoryUsage: 50 * 1024 * 1024,
                        cpuUsage: 50,
                        longTasks: 0,
                        errors: [],
                        lastUpdate: now - 1000
                    },
                    issues: []
                }
            ];

            Object.defineProperty(PerformanceUtils, 'performanceHistory', {
                get: () => mockHistory
            });

            const analytics = PerformanceUtils.getPerformanceAnalytics();
            expect(analytics.performanceModeDuration).toBe(1000); // 1 second in performance mode
            expect(analytics.timeInPerformanceMode).toBe(1000); // 1 second in performance mode
        });
    });

    describe('Performance Trends', () => {
        beforeEach(() => {
            PerformanceUtils.clearPerformanceHistory();
        });

        it('should return stable trends when history is empty', () => {
            const trends = PerformanceUtils.getPerformanceTrends();
            expect(trends.fps.trend).toBe('stable');
            expect(trends.memory.trend).toBe('stable');
            expect(trends.cpu.trend).toBe('stable');
            expect(trends.issues.trend).toBe('stable');
            expect(trends.fps.change).toBe(0);
        });

        it('should detect improving trends', () => {
            // Add history entries with improving metrics
            const now = Date.now();
            PerformanceUtils['performanceHistory'] = [
                {
                    timestamp: now - 1000,
                    metrics: { fps: 30, frameTime: 33, memoryUsage: 100, cpuUsage: 80, longTasks: 0, errors: [], lastUpdate: now - 1000 },
                    issues: []
                },
                {
                    timestamp: now,
                    metrics: { fps: 60, frameTime: 16, memoryUsage: 50, cpuUsage: 40, longTasks: 0, errors: [], lastUpdate: now },
                    issues: []
                }
            ];

            const trends = PerformanceUtils.getPerformanceTrends();
            expect(trends.fps.trend).toBe('improving');
            expect(trends.memory.trend).toBe('improving');
            expect(trends.cpu.trend).toBe('improving');
            expect(trends.issues.trend).toBe('stable');
        });

        it('should detect degrading trends', () => {
            // Add history entries with degrading metrics
            const now = Date.now();
            PerformanceUtils['performanceHistory'] = [
                {
                    timestamp: now - 1000,
                    metrics: { fps: 60, frameTime: 16, memoryUsage: 50, cpuUsage: 40, longTasks: 0, errors: [], lastUpdate: now - 1000 },
                    issues: []
                },
                {
                    timestamp: now,
                    metrics: { fps: 30, frameTime: 33, memoryUsage: 100, cpuUsage: 80, longTasks: 0, errors: [], lastUpdate: now },
                    issues: [{ type: 'fps', severity: 'warning', value: 30 }]
                }
            ];

            const trends = PerformanceUtils.getPerformanceTrends();
            expect(trends.fps.trend).toBe('degrading');
            expect(trends.memory.trend).toBe('degrading');
            expect(trends.cpu.trend).toBe('degrading');
            expect(trends.issues.trend).toBe('degrading');
        });
    });

    describe('Performance Alerts', () => {
        let alertCallback: jest.Mock;
        
        beforeEach(() => {
            alertCallback = jest.fn();
            PerformanceUtils.addAlertCallback(alertCallback);
        });

        afterEach(() => {
            PerformanceUtils.removeAlertCallback(alertCallback);
        });

        it('should trigger alerts when metrics exceed thresholds', () => {
            // Mock metrics to trigger alerts
            const mockMetrics = {
                fps: 15, // Below critical threshold
                frameTime: 60, // Above critical threshold
                memoryUsage: 120 * 1024 * 1024, // Above critical threshold
                cpuUsage: 95, // Above critical threshold
                longTasks: 0,
                errors: [],
                lastUpdate: Date.now()
            };

            // Update metrics
            Object.assign(PerformanceUtils['metrics'], mockMetrics);

            // Trigger alert check
            PerformanceUtils['checkAlertThresholds']();

            // Verify alerts were triggered
            expect(alertCallback).toHaveBeenCalledTimes(4);
            
            // Verify FPS alert
            expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'fps',
                severity: 'critical',
                value: 15
            }));

            // Verify frame time alert
            expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'frameTime',
                severity: 'critical',
                value: 60
            }));

            // Verify memory alert
            expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'memory',
                severity: 'critical',
                value: 120 * 1024 * 1024
            }));

            // Verify CPU alert
            expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'cpu',
                severity: 'critical',
                value: 95
            }));
        });

        it('should allow customizing alert thresholds', () => {
            const customThresholds = {
                fps: { warning: 40, critical: 30 },
                frameTime: { warning: 25, critical: 40 }
            };

            PerformanceUtils.setAlertThresholds(customThresholds);

            // Mock metrics to trigger alerts with new thresholds
            const mockMetrics = {
                fps: 35, // Between warning and critical
                frameTime: 30, // Between warning and critical
                memoryUsage: 0,
                cpuUsage: 0,
                longTasks: 0,
                errors: [],
                lastUpdate: Date.now()
            };

            // Update metrics
            Object.assign(PerformanceUtils['metrics'], mockMetrics);

            // Trigger alert check
            PerformanceUtils['checkAlertThresholds']();

            // Verify alerts were triggered with new thresholds
            expect(alertCallback).toHaveBeenCalledTimes(2);
            
            // Verify FPS alert with new threshold
            expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'fps',
                severity: 'warning',
                value: 35,
                threshold: 40
            }));

            // Verify frame time alert with new threshold
            expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'frameTime',
                severity: 'warning',
                value: 30,
                threshold: 25
            }));
        });

        it('should not trigger alerts when metrics are within thresholds', () => {
            // Mock metrics within thresholds
            const mockMetrics = {
                fps: 60,
                frameTime: 16.67,
                memoryUsage: 10 * 1024 * 1024,
                cpuUsage: 50,
                longTasks: 0,
                errors: [],
                lastUpdate: Date.now()
            };

            // Update metrics
            Object.assign(PerformanceUtils['metrics'], mockMetrics);

            // Trigger alert check
            PerformanceUtils['checkAlertThresholds']();

            // Verify no alerts were triggered
            expect(alertCallback).not.toHaveBeenCalled();
        });
    });
}); 