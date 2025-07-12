/**
 * Performance Dashboard
 * Enhanced monitoring system for application performance
 */

import { LoggingUtils } from './utils/logging-utils';

interface PerformanceMetric {
    current: number;
    min: number;
    max: number;
    average: number;
    history: number[];
    trend: 'improving' | 'stable' | 'degrading';
}

interface PerformanceData {
    fps: PerformanceMetric;
    memory: PerformanceMetric;
    loadTime: PerformanceMetric;
    apiResponse: PerformanceMetric;
    renderTime: PerformanceMetric;
    scriptTime: PerformanceMetric;
    domSize: PerformanceMetric;
    eventListeners: PerformanceMetric;
    networkRequests: PerformanceMetric;
    paintTime: PerformanceMetric;
    layoutShifts: PerformanceMetric;
    longTasks: PerformanceMetric;
}

export class PerformanceDashboard {
    private static instance: PerformanceDashboard;
    private metrics!: PerformanceData;
    private observers: Array<(type: string, data: any) => void> = [];
    private monitoringInterval: number | null = null;
    private readonly historySize = 60; // Store 60 seconds of history
    private readonly thresholds = {
        fps: { warning: 30, critical: 20 },
        memory: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 }, // 50MB, 100MB
        loadTime: { warning: 2000, critical: 3000 }, // 2s, 3s
        apiResponse: { warning: 1000, critical: 2000 }, // 1s, 2s
        renderTime: { warning: 16, critical: 33 }, // 16ms, 33ms
        scriptTime: { warning: 50, critical: 100 }, // 50ms, 100ms
        domSize: { warning: 1000, critical: 2000 }, // 1000 nodes
        eventListeners: { warning: 100, critical: 200 }, // 100 listeners
        networkRequests: { warning: 50, critical: 100 }, // 50 requests
        paintTime: { warning: 16, critical: 33 }, // 16ms, 33ms
        layoutShifts: { warning: 0.1, critical: 0.25 }, // 0.1, 0.25
        longTasks: { warning: 5, critical: 10 } // 5, 10 tasks
    };

    private constructor() {
        this.initializeMetrics();
    }

    static getInstance(): PerformanceDashboard {
        if (!PerformanceDashboard.instance) {
            PerformanceDashboard.instance = new PerformanceDashboard();
        }
        return PerformanceDashboard.instance;
    }

    private initializeMetrics(): void {
        this.metrics = {
            fps: this.createMetric(),
            memory: this.createMetric(),
            loadTime: this.createMetric(),
            apiResponse: this.createMetric(),
            renderTime: this.createMetric(),
            scriptTime: this.createMetric(),
            domSize: this.createMetric(),
            eventListeners: this.createMetric(),
            networkRequests: this.createMetric(),
            paintTime: this.createMetric(),
            layoutShifts: this.createMetric(),
            longTasks: this.createMetric()
        };
    }

    private createMetric(): PerformanceMetric {
        return {
            current: 0,
            min: Infinity,
            max: -Infinity,
            average: 0,
            history: [],
            trend: 'stable'
        };
    }

    async initialize(): Promise<void> {
        try {
            // Start monitoring
            this.startMonitoring();

            // Initialize performance observers
            this.initializePerformanceObservers();

            // Initialize layout shift observer
            this.initializeLayoutShiftObserver();

            // Log initialization
            LoggingUtils.log('info', 'Performance monitoring initialized');
        } catch (error) {
            LoggingUtils.log('error', `Failed to initialize performance monitoring: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    private startMonitoring(): void {
        if (this.monitoringInterval) {
            return;
        }

        let lastTime = performance.now();
        let frames = 0;
        let networkRequestCount = 0;
        let longTaskCount = 0;

        this.monitoringInterval = window.setInterval(() => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;

            // Calculate FPS
            frames++;
            if (deltaTime >= 1000) {
                const fps = Math.round((frames * 1000) / deltaTime);
                this.updateMetric('fps', fps);
                frames = 0;
                lastTime = currentTime;
            }

            // Update other metrics
            this.updateMemoryUsage();
            this.updateRenderMetrics();
            this.updateDOMMetrics();
            this.updateNetworkMetrics();
            this.updatePaintMetrics();

            // Reset counters
            networkRequestCount = 0;
            longTaskCount = 0;

            // Check thresholds and notify observers
            this.checkThresholds();
        }, 1000);
    }

    private updateMemoryUsage(): void {
        if (performance.memory) {
            this.updateMetric('memory', performance.memory.usedJSHeapSize);
        }
    }

    private updateRenderMetrics(): void {
        // Get render timing metrics
        const timing = performance.getEntriesByType('measure');
        timing.forEach(measure => {
            if (measure.name === 'render') {
                this.updateMetric('renderTime', measure.duration);
            } else if (measure.name === 'script') {
                this.updateMetric('scriptTime', measure.duration);
            }
        });
    }

    private updateDOMMetrics(): void {
        // Update DOM size
        this.updateMetric('domSize', document.getElementsByTagName('*').length);

        // Update event listener count (approximate)
        const listenerCount = this.countEventListeners();
        this.updateMetric('eventListeners', listenerCount);
    }

    private updateNetworkMetrics(): void {
        const resources = performance.getEntriesByType('resource');
        const requestCount = resources.length;
        this.updateMetric('networkRequests', requestCount);

        // Update API response times
        resources.forEach(resource => {
            if ('initiatorType' in resource &&
                (resource.initiatorType === 'xmlhttprequest' || resource.initiatorType === 'fetch')) {
                this.updateMetric('apiResponse', resource.duration);
            }
        });
    }

    private updatePaintMetrics(): void {
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
            this.updateMetric('paintTime', entry.startTime);
        });
    }

    private initializeLayoutShiftObserver(): void {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if ('value' in entry && typeof (entry as any).value === 'number') {
                        this.updateMetric('layoutShifts', (entry as any).value);
                    }
                });
            });
            observer.observe({ entryTypes: ['layout-shift'] });
        }
    }

    private countEventListeners(): number {
        let count = 0;
        const elements = document.getElementsByTagName('*');
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i] as HTMLElement;
            if (element.onclick) count++;
            if (element.onmouseover) count++;
            if (element.onmouseout) count++;
            if (element.onkeydown) count++;
            if (element.onkeyup) count++;
        }
        return count;
    }

    private updateMetric(name: keyof PerformanceData, value: number): void {
        const metric = this.metrics[name];
        metric.current = value;
        metric.min = Math.min(metric.min, value);
        metric.max = Math.max(metric.max, value);
        
        // Update history
        metric.history.push(value);
        if (metric.history.length > this.historySize) {
            metric.history.shift();
        }

        // Update average
        metric.average = metric.history.reduce((a, b) => a + b, 0) / metric.history.length;

        // Update trend
        metric.trend = this.calculateTrend(metric.history);
    }

    private calculateTrend(history: number[]): 'improving' | 'stable' | 'degrading' {
        if (history.length < 2) return 'stable';

        const recentValues = history.slice(-5);
        const differences = recentValues.slice(1).map((val, idx) => val - recentValues[idx]);
        const averageDiff = differences.reduce((a, b) => a + b, 0) / differences.length;

        if (averageDiff > 0.1) return 'improving';
        if (averageDiff < -0.1) return 'degrading';
        return 'stable';
    }

    private checkThresholds(): void {
        Object.entries(this.metrics).forEach(([name, metric]) => {
            const threshold = this.thresholds[name as keyof PerformanceData];
            if (metric.current <= threshold.critical) {
                this.notifyObservers('critical', { metric: name, value: metric.current });
            } else if (metric.current <= threshold.warning) {
                this.notifyObservers('warning', { metric: name, value: metric.current });
            }
        });
    }

    private initializePerformanceObservers(): void {
        // Observe long tasks
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.duration > 50) { // Tasks longer than 50ms
                        this.updateMetric('longTasks', entry.duration);
                        this.notifyObservers('longTask', { duration: entry.duration });
                    }
                });
            });
            observer.observe({ entryTypes: ['longtask'] });
        }

        // Observe resource timing
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if ('initiatorType' in entry &&
                        (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch')) {
                        this.updateMetric('apiResponse', entry.duration);
                    }
                });
            });
            observer.observe({ entryTypes: ['resource'] });
        }
    }

    addObserver(observer: (type: string, data: any) => void): void {
        this.observers.push(observer);
    }

    removeObserver(observer: (type: string, data: any) => void): void {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    private notifyObservers(type: string, data: any): void {
        this.observers.forEach(observer => observer(type, data));
    }

    getMetrics(): PerformanceData {
        return { ...this.metrics };
    }

    getRecommendations(): string[] {
        const recommendations: string[] = [];

        // Check FPS
        if (this.metrics.fps.current < this.thresholds.fps.warning) {
            recommendations.push('Consider reducing animation complexity or implementing performance mode');
        }

        // Check memory usage
        if (this.metrics.memory.current > this.thresholds.memory.warning) {
            recommendations.push('High memory usage detected. Consider implementing memory cleanup');
        }

        // Check DOM size
        if (this.metrics.domSize.current > this.thresholds.domSize.warning) {
            recommendations.push('Large DOM tree detected. Consider implementing virtual scrolling');
        }

        // Check event listeners
        if (this.metrics.eventListeners.current > this.thresholds.eventListeners.warning) {
            recommendations.push('High number of event listeners detected. Consider implementing event delegation');
        }

        // Check layout shifts
        if (this.metrics.layoutShifts.current > this.thresholds.layoutShifts.warning) {
            recommendations.push('High layout shift detected. Consider implementing proper image dimensions and avoiding dynamic content insertion');
        }

        // Check long tasks
        if (this.metrics.longTasks.current > this.thresholds.longTasks.warning) {
            recommendations.push('Long tasks detected. Consider breaking down heavy operations into smaller chunks');
        }

        // Check paint time
        if (this.metrics.paintTime.current > this.thresholds.paintTime.warning) {
            recommendations.push('High paint time detected. Consider optimizing CSS and reducing repaints');
        }

        return recommendations;
    }

    cleanup(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.observers = [];
    }
}

export const performanceDashboard = PerformanceDashboard.getInstance(); 