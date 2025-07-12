import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Unified Performance Management System
 * Combines functionality from:
 * - performance-analytics.js
 * - performance-analytics-visualizer.js
 * - performance-visualizer.js
 * - performance-dashboard.js
 * - performance-monitor.js
 * - performance-optimizer.js
 */

class PerformanceManager {
    constructor() {
        this.metrics = {
            fps: { current: 0, min: Infinity, max: 0, avg: 0 },
            memory: { current: 0, min: Infinity, max: 0, avg: 0 },
            frameTime: { current: 0, min: Infinity, max: 0, avg: 0 },
            activeAnimations: 0,
            queuedAnimations: 0
        };
        
        this.thresholds = {
            fps: { warning: 30, critical: 20 },
            memory: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 },
            frameTime: { warning: 16.67, critical: 33.33 }
        };
        
        this.observers = new Set();
        this.timers = new Set();
        this.isMonitoring = false;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.monitoringInterval = null;
    }

    init() {
        this.setupObservers();
        this.startMonitoring();
    }

    setupObservers() {
        // Performance observer for long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (entry.duration > 50) {
                    this.handleLongTask(entry);
                }
            });
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.add(longTaskObserver);

        // Performance observer for resource timing
        const resourceObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (entry.duration > 1000) {
                    this.handleSlowResource(entry);
                }
            });
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.add(resourceObserver);
    }

    startMonitoring() {
        // Clear any existing timers
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();

        // Set up new monitoring timer
        const monitorTimer = setInterval(() => {
            this.checkPerformance();
        }, this.monitoringInterval);

        this.timers.add(monitorTimer);
    }

    cleanup() {
        // Disconnect all observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();

        // Clear all timers
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();

        // Clear any other resources
        this.metrics = {};
        this.isInitialized = false;
    }

    // Core monitoring methods
    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.lastTime = performance.now();
        this.monitoringInterval = requestAnimationFrame(this.monitor.bind(this));
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        this.isMonitoring = false;
        cancelAnimationFrame(this.monitoringInterval);
    }

    monitor(timestamp) {
        if (!this.isMonitoring) return;

        // Calculate FPS
        const elapsed = timestamp - this.lastTime;
        this.frameCount++;
        
        if (elapsed >= 1000) {
            this.metrics.fps.current = Math.round((this.frameCount * 1000) / elapsed);
            this.updateMetrics('fps');
            this.frameCount = 0;
            this.lastTime = timestamp;
        }

        // Update memory usage if available
        if (performance.memory) {
            this.metrics.memory.current = performance.memory.usedJSHeapSize;
            this.updateMetrics('memory');
        }

        // Calculate frame time
        this.metrics.frameTime.current = elapsed;
        this.updateMetrics('frameTime');

        // Notify observers
        this.notifyObservers();

        // Check thresholds
        this.checkThresholds();

        // Continue monitoring
        this.monitoringInterval = requestAnimationFrame(this.monitor.bind(this));
    }

    // Metrics management
    updateMetrics(type) {
        const metric = this.metrics[type];
        metric.min = Math.min(metric.min, metric.current);
        metric.max = Math.max(metric.max, metric.current);
        metric.avg = (metric.avg * 0.9) + (metric.current * 0.1);
    }

    // Threshold checking
    checkThresholds() {
        const warnings = [];
        
        if (this.metrics.fps.current < this.thresholds.fps.warning) {
            warnings.push(`Low FPS: ${this.metrics.fps.current}`);
        }
        
        if (this.metrics.memory.current > this.thresholds.memory.warning) {
            warnings.push(`High memory usage: ${Math.round(this.metrics.memory.current / 1024 / 1024)}MB`);
        }
        
        if (this.metrics.frameTime.current > this.thresholds.frameTime.warning) {
            warnings.push(`High frame time: ${this.metrics.frameTime.current.toFixed(2)}ms`);
        }

        if (warnings.length > 0) {
            this.handleWarnings(warnings);
        }
    }

    // Warning handling
    handleWarnings(warnings) {
        logWarn('Performance Warnings:', warnings);
        this.notifyObservers('warnings', warnings);
    }

    // Observer pattern implementation
    addObserver(observer) {
        this.observers.add(observer);
    }

    removeObserver(observer) {
        this.observers.delete(observer);
    }

    notifyObservers(type = 'metrics', data = this.metrics) {
        this.observers.forEach(observer => {
            if (typeof observer === 'function') {
                observer(type, data);
            }
        });
    }

    // Performance optimization methods
    optimizeAnimations() {
        // Reduce animation complexity if performance is poor
        if (this.metrics.fps.current < this.thresholds.fps.warning) {
            document.body.classList.add('reduced-animations');
        } else {
            document.body.classList.remove('reduced-animations');
        }
    }

    optimizeMemory() {
        // Trigger garbage collection if memory usage is high
        if (this.metrics.memory.current > this.thresholds.memory.warning) {
            if (window.gc) {
                window.gc();
            }
        }
    }

    // Visualization methods
    getPerformanceData() {
        return {
            metrics: this.metrics,
            thresholds: this.thresholds,
            isMonitoring: this.isMonitoring
        };
    }

    // Animation tracking
    trackAnimation() {
        this.metrics.activeAnimations++;
        this.notifyObservers();
    }

    untrackAnimation() {
        this.metrics.activeAnimations = Math.max(0, this.metrics.activeAnimations - 1);
        this.notifyObservers();
    }

    // Queue management
    trackQueuedAnimation() {
        this.metrics.queuedAnimations++;
        this.notifyObservers();
    }

    untrackQueuedAnimation() {
        this.metrics.queuedAnimations = Math.max(0, this.metrics.queuedAnimations - 1);
        this.notifyObservers();
    }
}

// Export singleton instance
const performanceManager = new PerformanceManager();
export default performanceManager; 