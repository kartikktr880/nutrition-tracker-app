import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Enhanced Performance Monitor
 * Tracks and analyzes application performance metrics with advanced capabilities
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.thresholds = {
            responseTime: 1000, // 1 second
            memoryUsage: 0.8,   // 80% of available memory
            cpuUsage: 0.7,      // 70% of CPU
            frameRate: 30,      // 30 FPS minimum
            layoutShifts: 0.1,  // Cumulative Layout Shift threshold
            firstInputDelay: 100, // 100ms maximum
            largestContentfulPaint: 2500, // 2.5 seconds
            timeToInteractive: 3500, // 3.5 seconds
            totalBlockingTime: 300, // 300ms
            domSize: 1500,      // Maximum DOM nodes
            eventListeners: 100, // Maximum event listeners
            networkRequests: 50,  // Maximum concurrent requests
            // Exercise-specific thresholds
            exerciseTrackingLatency: 100, // 100ms maximum for exercise tracking
            formAnalysisTime: 200, // 200ms maximum for form analysis
            dataSyncTime: 500, // 500ms maximum for data synchronization
            realTimeProcessingDelay: 50 // 50ms maximum for real-time processing
        };
        this.observers = new Map();
        this.trends = new Map();
        this.optimizationRules = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectAttempts = 0;
        this.wsUrl = 'ws://your-websocket-url';
        this.setupPerformanceObservers();
        this.initializeOptimizationRules();
        this.initializeExerciseMetrics();
    }

    initializeOptimizationRules() {
        this.optimizationRules.set('memory', {
            condition: (metrics) => metrics.memoryUsage > this.thresholds.memoryUsage,
            action: () => this.triggerMemoryOptimization()
        });
        this.optimizationRules.set('cpu', {
            condition: (metrics) => metrics.cpuUsage > this.thresholds.cpuUsage,
            action: () => this.triggerCPUOptimization()
        });
        this.optimizationRules.set('fps', {
            condition: (metrics) => metrics.frameRate < this.thresholds.frameRate,
            action: () => this.triggerRenderingOptimization()
        });
    }

    setupPerformanceObservers() {
        if ('PerformanceObserver' in window) {
            // Long Tasks Observer
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.trackMetric('longTasks', {
                        duration: entry.duration,
                        startTime: entry.startTime,
                        name: entry.name
                    });
                }
            });
            longTaskObserver.observe({ entryTypes: ['longtask'] });
            this.observers.set('longTask', longTaskObserver);

            // Layout Shifts Observer
            const layoutShiftObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        this.trackMetric('layoutShifts', {
                            value: entry.value,
                            sources: entry.sources
                        });
                    }
                }
            });
            layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.set('layoutShift', layoutShiftObserver);

            // First Input Delay Observer
            const firstInputObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.trackMetric('firstInput', {
                        processingStart: entry.processingStart,
                        processingEnd: entry.processingEnd,
                        duration: entry.duration
                    });
                }
            });
            firstInputObserver.observe({ entryTypes: ['first-input'] });
            this.observers.set('firstInput', firstInputObserver);
        }
    }

    trackMetric(name, data) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name).push({
            ...data,
            timestamp: Date.now()
        });

        // Maintain metric history (keep last 100 entries)
        if (this.metrics.get(name).length > 100) {
            this.metrics.get(name).shift();
        }

        // Update trends
        this.updateTrends(name, data);

        // Check thresholds and trigger alerts if needed
        this.checkThresholds(name, data);

        // Check optimization rules
        this.checkOptimizationRules();
    }

    updateTrends(name, data) {
        if (!this.trends.has(name)) {
            this.trends.set(name, {
                direction: 'stable',
                changeRate: 0,
                lastValue: null,
                lastUpdate: Date.now()
            });
        }

        const trend = this.trends.get(name);
        const currentValue = typeof data === 'object' ? data.value || data.duration : data;
        
        if (trend.lastValue !== null) {
            const timeDiff = Date.now() - trend.lastUpdate;
            const valueDiff = currentValue - trend.lastValue;
            trend.changeRate = valueDiff / timeDiff;
            trend.direction = valueDiff > 0 ? 'increasing' : valueDiff < 0 ? 'decreasing' : 'stable';
        }

        trend.lastValue = currentValue;
        trend.lastUpdate = Date.now();
    }

    checkOptimizationRules() {
        const currentMetrics = this.getPerformanceMetrics();
        
        for (const [ruleName, rule] of this.optimizationRules) {
            if (rule.condition(currentMetrics)) {
                rule.action();
            }
        }
    }

    triggerMemoryOptimization() {
        // Implement memory optimization strategies
        if (window.gc) {
            window.gc();
        }
        this.clearUnusedCaches();
    }

    triggerCPUOptimization() {
        // Implement CPU optimization strategies
        this.throttleExpensiveOperations();
        this.prioritizeCriticalTasks();
    }

    triggerRenderingOptimization() {
        // Implement rendering optimization strategies
        this.reduceAnimationComplexity();
        this.optimizeLayoutRecalculations();
    }

    clearUnusedCaches() {
        // Clear image caches
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!this.isElementVisible(img)) {
                img.src = '';
            }
        });
    }

    throttleExpensiveOperations() {
        // Implement throttling for expensive operations
        const throttledFunctions = new Set();
        return {
            throttle: (fn, delay) => {
                if (throttledFunctions.has(fn)) return;
                throttledFunctions.add(fn);
                let lastCall = 0;
                return function(...args) {
                    const now = Date.now();
                    if (now - lastCall >= delay) {
                        lastCall = now;
                        fn.apply(this, args);
                    }
                };
            }
        };
    }

    prioritizeCriticalTasks() {
        // Implement task prioritization
        const criticalTasks = new Set();
        return {
            addCriticalTask: (task) => {
                criticalTasks.add(task);
                this.scheduleTask(task, 'high');
            }
        };
    }

    reduceAnimationComplexity() {
        // Reduce animation complexity
        const animations = document.querySelectorAll('*[style*="animation"]');
        animations.forEach(element => {
            const style = window.getComputedStyle(element);
            if (style.animationDuration) {
                element.style.animationDuration = '0.5s';
            }
        });
    }

    optimizeLayoutRecalculations() {
        // Optimize layout recalculations
        const observer = new ResizeObserver(entries => {
            requestAnimationFrame(() => {
                entries.forEach(entry => {
                    const element = entry.target;
                    if (this.isElementVisible(element)) {
                        element.style.transform = 'translateZ(0)';
                    }
                });
            });
        });

        document.querySelectorAll('*').forEach(element => {
            observer.observe(element);
        });
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    getPerformanceMetrics() {
        const metrics = {};
        for (const [name, data] of this.metrics) {
            metrics[name] = this.aggregateMetrics(name, data);
        }
        return metrics;
    }

    aggregateMetrics(name, data) {
        switch (name) {
            case 'longTasks':
                return {
                    count: data.length,
                    averageDuration: data.reduce((sum, task) => sum + task.duration, 0) / data.length,
                    maxDuration: Math.max(...data.map(task => task.duration))
                };
            case 'layoutShifts':
                return {
                    count: data.length,
                    totalShift: data.reduce((sum, shift) => sum + shift.value, 0),
                    maxShift: Math.max(...data.map(shift => shift.value))
                };
            case 'resourceTiming':
                return {
                    count: data.length,
                    averageDuration: data.reduce((sum, resource) => sum + resource.duration, 0) / data.length,
                    byType: this.groupByType(data)
                };
            default:
                return data;
        }
    }

    groupByType(data) {
        const grouped = {};
        data.forEach(resource => {
            if (!grouped[resource.initiatorType]) {
                grouped[resource.initiatorType] = [];
            }
            grouped[resource.initiatorType].push(resource);
        });
        return grouped;
    }

    getPerformanceStatus() {
        const metrics = this.getPerformanceMetrics();
        const status = {
            status: 'good',
            issues: [],
            trends: this.getTrendAnalysis(),
            recommendations: this.getOptimizationRecommendations()
        };

        // Check all metrics against thresholds
        for (const [metric, value] of Object.entries(metrics)) {
            if (this.thresholds[metric] && value > this.thresholds[metric]) {
                status.issues.push({
                    type: metric,
                    message: `High ${metric} detected: ${value}`,
                    severity: value > this.thresholds[metric] * 1.5 ? 'critical' : 'warning'
                });
            }
        }

        // Update overall status
        if (status.issues.some(issue => issue.severity === 'critical')) {
            status.status = 'critical';
        } else if (status.issues.length > 0) {
            status.status = 'warning';
        }

        return status;
    }

    getTrendAnalysis() {
        const trends = {};
        for (const [name, trend] of this.trends) {
            trends[name] = {
                direction: trend.direction,
                changeRate: trend.changeRate,
                prediction: this.predictNextValue(name)
            };
        }
        return trends;
    }

    predictNextValue(metricName) {
        const data = this.metrics.get(metricName);
        if (!data || data.length < 2) return null;

        const values = data.map(d => typeof d === 'object' ? d.value || d.duration : d);
        const timestamps = data.map(d => d.timestamp);

        // Simple linear regression
        const n = values.length;
        const sumX = timestamps.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = timestamps.reduce((a, b, i) => a + b * values[i], 0);
        const sumXX = timestamps.reduce((a, b) => a + b * b, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const nextTimestamp = Date.now() + 60000; // Predict 1 minute ahead
        return slope * nextTimestamp + intercept;
    }

    getOptimizationRecommendations() {
        const recommendations = [];
        const metrics = this.getPerformanceMetrics();

        if (metrics.memoryUsage > this.thresholds.memoryUsage * 0.8) {
            recommendations.push({
                type: 'memory',
                priority: 'high',
                action: 'Clear unused caches and optimize memory usage'
            });
        }

        if (metrics.cpuUsage > this.thresholds.cpuUsage * 0.8) {
            recommendations.push({
                type: 'cpu',
                priority: 'high',
                action: 'Throttle expensive operations and prioritize critical tasks'
            });
        }

        if (metrics.frameRate < this.thresholds.frameRate * 1.2) {
            recommendations.push({
                type: 'rendering',
                priority: 'medium',
                action: 'Optimize animations and reduce layout recalculations'
            });
        }

        return recommendations;
    }

    cleanup() {
        // Disconnect all observers
        for (const [name, observer] of this.observers) {
            observer.disconnect();
            logInfo(`Disconnected ${name} observer`);
        }
        this.observers.clear();
        
        // Clear metrics history with size limits
        for (const [name, data] of this.metrics) {
            this.metrics.set(name, data.slice(-100)); // Keep only last 100 entries
        }
        
        // Clear trends
        this.trends.clear();
        
        // Clear exercise metrics with size limits
        if (this.exerciseMetrics) {
            for (const key in this.exerciseMetrics) {
                if (Array.isArray(this.exerciseMetrics[key])) {
                    this.exerciseMetrics[key] = this.exerciseMetrics[key].slice(-100);
                }
            }
            this.exerciseMetrics.exerciseSessionMetrics.clear();
            this.exerciseMetrics.formAnalysisMetrics.clear();
        }

        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    initializeExerciseMetrics() {
        // Initialize exercise-specific metrics
        this.exerciseMetrics = {
            formTrackingAccuracy: [],
            realTimeProcessingLatency: [],
            dataSyncPerformance: [],
            exerciseSessionMetrics: new Map(),
            formAnalysisMetrics: new Map(),
            // Add new metrics
            exerciseDuration: [],
            caloriesBurned: [],
            exerciseIntensity: [],
            userEngagement: [],
            errorRates: new Map(),
            performanceThresholds: {
                formTrackingAccuracy: 0.85,
                realTimeProcessingLatency: 100, // ms
                dataSyncPerformance: 500, // ms
                exerciseDuration: 30, // minutes
                caloriesBurned: 300, // kcal
                exerciseIntensity: 0.7, // 0-1 scale
                userEngagement: 0.8, // 0-1 scale
                errorRate: 0.05 // 5%
            }
        };
    }

    trackExerciseMetric(metricName, data) {
        if (!this.exerciseMetrics[metricName]) {
            this.exerciseMetrics[metricName] = [];
        }

        // Validate data
        if (!data || typeof data.value !== 'number' || isNaN(data.value)) {
            logWarn(`Invalid metric data for ${metricName}:`, data);
            return;
        }

        const metricData = {
            value: data.value,
            timestamp: Date.now(),
            exerciseId: data.exerciseId,
            userId: data.userId,
            sessionId: data.sessionId,
            ...data
        };

        this.exerciseMetrics[metricName].push(metricData);

        // Maintain metric history (keep last 100 entries)
        if (this.exerciseMetrics[metricName].length > 100) {
            this.exerciseMetrics[metricName].shift();
        }

        // Check thresholds and trigger alerts if needed
        this.checkExerciseThresholds(metricName, metricData);

        // Update real-time analytics
        this.updateRealTimeAnalytics(metricName, metricData);
    }

    checkExerciseThresholds(metricName, data) {
        const threshold = this.exerciseMetrics.performanceThresholds[metricName];
        if (!threshold) return;

        const isBelowThreshold = data.value < threshold;
        if (isBelowThreshold) {
            this.triggerAlert({
                type: 'performance_threshold',
                metric: metricName,
                value: data.value,
                threshold,
                timestamp: Date.now(),
                exerciseId: data.exerciseId,
                userId: data.userId
            });
        }
    }

    updateRealTimeAnalytics(metricName, data) {
        // Calculate moving averages and trends with fixed window size
        const windowSize = 10;
        const recentMetrics = this.exerciseMetrics[metricName].slice(-windowSize);
        const average = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
        const trend = this.calculateTrend(recentMetrics);

        // Update session metrics if available
        if (data.sessionId) {
            const sessionMetrics = this.exerciseMetrics.exerciseSessionMetrics.get(data.sessionId) || {};
            sessionMetrics[metricName] = {
                current: data.value,
                average,
                trend,
                timestamp: Date.now()
            };
            this.exerciseMetrics.exerciseSessionMetrics.set(data.sessionId, sessionMetrics);
        }

        // Emit real-time updates with error handling
        this.emitMetricUpdate({
            metric: metricName,
            value: data.value,
            average,
            trend,
            timestamp: Date.now()
        });
    }

    calculateTrend(metrics) {
        if (metrics.length < 5) return 'insufficient_data';
        
        const values = metrics.map(m => m.value);
        const timestamps = metrics.map(m => m.timestamp);
        
        // Calculate moving average
        const windowSize = 3;
        const movingAverages = [];
        for (let i = windowSize - 1; i < values.length; i++) {
            const sum = values.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
            movingAverages.push(sum / windowSize);
        }
        
        // Calculate trend using linear regression
        const n = movingAverages.length;
        const xMean = (n - 1) / 2;
        const yMean = movingAverages.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            const x = i - xMean;
            const y = movingAverages[i] - yMean;
            numerator += x * y;
            denominator += x * x;
        }
        
        const slope = denominator === 0 ? 0 : numerator / denominator;
        const threshold = 0.1; // 10% change threshold
        
        if (Math.abs(slope) < threshold) return 'stable';
        return slope > 0 ? 'improving' : 'declining';
    }

    emitMetricUpdate(update) {
        try {
            if (this.onMetricUpdate) {
                this.onMetricUpdate(update);
            }

            // Implement WebSocket connection with error handling
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(update));
            } else if (this.ws && this.ws.readyState === WebSocket.CLOSED) {
                this.reconnectWebSocket();
            }
        } catch (error) {
            logError('Error emitting metric update:', error);
            this.handleWebSocketError(error);
        }
    }

    reconnectWebSocket() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logError('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const backoff = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        setTimeout(() => {
            this.initializeWebSocket();
        }, backoff);
    }

    handleWebSocketError(error) {
        logError('WebSocket error:', error);
        this.triggerAlert({
            type: 'websocket_error',
            error: error.message,
            timestamp: Date.now()
        });
    }

    initializeWebSocket() {
        try {
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                logInfo('WebSocket connected');
                this.reconnectAttempts = 0;
            };

            this.ws.onclose = () => {
                logInfo('WebSocket disconnected');
                this.reconnectWebSocket();
            };

            this.ws.onerror = (error) => {
                this.handleWebSocketError(error);
            };
        } catch (error) {
            this.handleWebSocketError(error);
        }
    }

    triggerAlert(alert) {
        // Implement alert handling (e.g., notifications, logging)
        logWarn('Performance Alert:', alert);
        if (this.onAlert) {
            this.onAlert(alert);
        }
    }

    getExerciseMetrics() {
        return {
            formTracking: this.aggregateMetrics(this.exerciseMetrics.formTrackingAccuracy),
            realTimeProcessing: this.aggregateMetrics(this.exerciseMetrics.realTimeProcessingLatency),
            dataSync: this.aggregateMetrics(this.exerciseMetrics.dataSyncPerformance),
            sessions: this.aggregateSessionMetrics(),
            formAnalysis: this.aggregateFormAnalysisMetrics()
        };
    }

    aggregateSessionMetrics() {
        const metrics = {};
        for (const [sessionId, data] of this.exerciseMetrics.exerciseSessionMetrics) {
            metrics[sessionId] = this.aggregateMetrics(data);
        }
        return metrics;
    }

    aggregateFormAnalysisMetrics() {
        const metrics = {};
        for (const [formId, data] of this.exerciseMetrics.formAnalysisMetrics) {
            metrics[formId] = this.aggregateMetrics(data);
        }
        return metrics;
    }
}

// Export the enhanced PerformanceMonitor
export default PerformanceMonitor; 