export class PerformanceUtils {
    private static marks: Map<string, number> = new Map();
    private static measures: Map<string, number> = new Map();
    private static observers: Set<Function> = new Set();
    private static performanceMode: boolean = false;
    private static metrics: {
        longTasks: number;
        errors: Error[];
        memoryUsage: number;
        fps: number;
        frameTime: number;
        cpuUsage: number;
        lastUpdate: number;
    } = {
        longTasks: 0,
        errors: [],
        memoryUsage: 0,
        fps: 60,
        frameTime: 16.67,
        cpuUsage: 0,
        lastUpdate: Date.now()
    };

    private static readonly PERFORMANCE_THRESHOLDS = {
        fps: { warning: 30, critical: 20 },
        frameTime: { warning: 33.33, critical: 50 },
        memoryUsage: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 },
        cpuUsage: { warning: 70, critical: 90 }
    };

    private static readonly AUTO_PERFORMANCE_MODE = {
        enabled: true,
        checkInterval: 5000,
        lastCheck: 0
    };

    private static dashboard: HTMLElement | null = null;
    private static readonly DASHBOARD_UPDATE_INTERVAL = 1000; // 1 second

    private static readonly HISTORY_MAX_ENTRIES = 100;
    private static performanceHistory: Array<{
        timestamp: number;
        metrics: typeof this.metrics;
        issues: Array<{
            type: string;
            severity: 'warning' | 'critical';
            value: number;
        }>;
    }> = [];

    private static readonly ANALYTICS_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    private static readonly TREND_WINDOWS = {
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000,
        WEEK: 7 * 24 * 60 * 60 * 1000
    };

    private static readonly ALERT_THRESHOLDS = {
        fps: { warning: 30, critical: 20 },
        frameTime: { warning: 33.33, critical: 50 },
        memoryUsage: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 },
        cpuUsage: { warning: 70, critical: 90 }
    };

    private static alertCallbacks: Set<(alert: {
        type: string;
        severity: 'warning' | 'critical';
        value: number;
        threshold: number;
        timestamp: number;
    }) => void> = new Set();

    static debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
        let timeoutId: number | null = null;
        return (...args: Parameters<T>) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = window.setTimeout(() => {
                fn(...args);
                timeoutId = null;
            }, delay);
        };
    }

    static throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void {
        let inThrottle: boolean = false;
        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                fn(...args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        };
    }

    static requestAnimationFrame(callback: FrameRequestCallback): number {
        return window.requestAnimationFrame(callback);
    }

    static cancelAnimationFrame(id: number): void {
        window.cancelAnimationFrame(id);
    }

    static addObserver(observer: Function): void {
        this.observers.add(observer);
    }

    static removeObserver(observer: Function): void {
        this.observers.delete(observer);
    }

    static notifyObservers(data: any): void {
        this.observers.forEach(observer => observer(data));
    }

    static measureExecutionTime(fn: Function): number {
        const start = performance.now();
        fn();
        const end = performance.now();
        return end - start;
    }

    static getMetrics(): typeof this.metrics {
        return { ...this.metrics };
    }

    static setPerformanceMode(enabled: boolean): void {
        this.performanceMode = enabled;
    }

    static isPerformanceMode(): boolean {
        return this.performanceMode;
    }

    static trackLongTask(fn: Function): void {
        const start = performance.now();
        fn();
        const duration = performance.now() - start;
        if (duration > 50) { // Consider tasks longer than 50ms as long tasks
            this.metrics.longTasks++;
        }
    }

    static trackError(error: Error): void {
        this.metrics.errors.push(error);
    }

    static getAverageMeasure(name: string): number {
        const measures = Array.from(this.measures.entries())
            .filter(([key]) => key.startsWith(name))
            .map(([, value]) => value);

        if (measures.length === 0) {
            throw new Error('No measures found');
        }

        return measures.reduce((sum, value) => sum + value, 0) / measures.length;
    }

    static mark(name: string): void {
        this.marks.set(name, performance.now());
    }

    static measure(name: string, startMark: string, endMark: string): void {
        const start = this.marks.get(startMark);
        const end = this.marks.get(endMark);

        if (start === undefined || end === undefined) {
            throw new Error('Start or end mark not found');
        }

        this.measures.set(name, end - start);
    }

    static getMeasure(name: string): number | undefined {
        return this.measures.get(name);
    }

    static clearMarks(): void {
        this.marks.clear();
    }

    static clearMeasures(): void {
        this.measures.clear();
    }

    static async measureAsync<T>(
        name: string,
        operation: () => Promise<T>
    ): Promise<T> {
        this.mark(`${name}-start`);
        try {
            const result = await operation();
            this.mark(`${name}-end`);
            this.measure(name, `${name}-start`, `${name}-end`);
            return result;
        } catch (error) {
            this.mark(`${name}-end`);
            this.measure(name, `${name}-start`, `${name}-end`);
            throw error;
        }
    }

    static measureSync<T>(name: string, operation: () => T): T {
        this.mark(`${name}-start`);
        try {
            const result = operation();
            this.mark(`${name}-end`);
            this.measure(name, `${name}-start`, `${name}-end`);
            return result;
        } catch (error) {
            this.mark(`${name}-end`);
            this.measure(name, `${name}-start`, `${name}-end`);
            throw error;
        }
    }

    static getMinMeasure(name: string): number {
        const measures = Array.from(this.measures.entries())
            .filter(([key]) => key.startsWith(name))
            .map(([, value]) => value);

        if (measures.length === 0) {
            throw new Error('No measures found');
        }

        return Math.min(...measures);
    }

    static getMaxMeasure(name: string): number {
        const measures = Array.from(this.measures.entries())
            .filter(([key]) => key.startsWith(name))
            .map(([, value]) => value);

        if (measures.length === 0) {
            throw new Error('No measures found');
        }

        return Math.max(...measures);
    }

    static getMemoryUsage(): {
        totalJSHeapSize: number;
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
    } {
        if (!performance.memory) {
            throw new Error('Memory API not available');
        }

        return {
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
    }

    static getNavigationTiming(): PerformanceNavigationTiming {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (!navigation) {
            throw new Error('Navigation timing not available');
        }
        return navigation;
    }

    static getResourceTiming(): PerformanceResourceTiming[] {
        return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    }

    static startPerformanceMonitoring(): void {
        if (typeof window !== 'undefined') {
            this.monitorFPS();
            this.monitorMemory();
            this.monitorCPU();
            this.checkPerformanceMode();
        }
    }

    private static monitorFPS(): void {
        let frameCount = 0;
        let lastTime = performance.now();

        const updateFPS = () => {
            const currentTime = performance.now();
            frameCount++;

            if (currentTime - lastTime >= 1000) {
                this.metrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.metrics.frameTime = 1000 / this.metrics.fps;
                frameCount = 0;
                lastTime = currentTime;

                this.checkPerformanceThresholds();
                this.checkAlertThresholds();
            }

            requestAnimationFrame(updateFPS);
        };

        requestAnimationFrame(updateFPS);
    }

    private static monitorMemory(): void {
        if (performance.memory) {
            setInterval(() => {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
                this.checkPerformanceThresholds();
            }, 5000);
        }
    }

    private static monitorCPU(): void {
        if (performance.now) {
            let lastCpuCheck = performance.now();
            let lastCpuUsage = 0;

            setInterval(() => {
                const currentTime = performance.now();
                const timeDiff = currentTime - lastCpuCheck;
                const cpuUsage = (timeDiff - (1000 / 60)) / timeDiff * 100;
                
                this.metrics.cpuUsage = Math.min(100, Math.max(0, cpuUsage));
                lastCpuCheck = currentTime;
                lastCpuUsage = cpuUsage;

                this.checkPerformanceThresholds();
            }, 1000);
        }
    }

    private static checkPerformanceThresholds(): void {
        const issues = [];

        if (this.metrics.fps < this.PERFORMANCE_THRESHOLDS.fps.critical) {
            issues.push({ type: 'fps', severity: 'critical', value: this.metrics.fps });
        } else if (this.metrics.fps < this.PERFORMANCE_THRESHOLDS.fps.warning) {
            issues.push({ type: 'fps', severity: 'warning', value: this.metrics.fps });
        }

        if (this.metrics.frameTime > this.PERFORMANCE_THRESHOLDS.frameTime.critical) {
            issues.push({ type: 'frameTime', severity: 'critical', value: this.metrics.frameTime });
        } else if (this.metrics.frameTime > this.PERFORMANCE_THRESHOLDS.frameTime.warning) {
            issues.push({ type: 'frameTime', severity: 'warning', value: this.metrics.frameTime });
        }

        if (this.metrics.memoryUsage > this.PERFORMANCE_THRESHOLDS.memoryUsage.critical) {
            issues.push({ type: 'memory', severity: 'critical', value: this.metrics.memoryUsage });
        } else if (this.metrics.memoryUsage > this.PERFORMANCE_THRESHOLDS.memoryUsage.warning) {
            issues.push({ type: 'memory', severity: 'warning', value: this.metrics.memoryUsage });
        }

        if (this.metrics.cpuUsage > this.PERFORMANCE_THRESHOLDS.cpuUsage.critical) {
            issues.push({ type: 'cpu', severity: 'critical', value: this.metrics.cpuUsage });
        } else if (this.metrics.cpuUsage > this.PERFORMANCE_THRESHOLDS.cpuUsage.warning) {
            issues.push({ type: 'cpu', severity: 'warning', value: this.metrics.cpuUsage });
        }

        if (issues.length > 0) {
            this.addToHistory(issues);
            this.notifyObservers({
                type: 'performanceIssues',
                issues,
                metrics: this.metrics
            });
        }
    }

    private static checkPerformanceMode(): void {
        if (!this.AUTO_PERFORMANCE_MODE.enabled) return;

        const now = Date.now();
        if (now - this.AUTO_PERFORMANCE_MODE.lastCheck < this.AUTO_PERFORMANCE_MODE.checkInterval) return;

        this.AUTO_PERFORMANCE_MODE.lastCheck = now;

        const shouldEnablePerformanceMode = 
            this.metrics.fps < this.PERFORMANCE_THRESHOLDS.fps.warning ||
            this.metrics.memoryUsage > this.PERFORMANCE_THRESHOLDS.memoryUsage.warning ||
            this.metrics.cpuUsage > this.PERFORMANCE_THRESHOLDS.cpuUsage.warning;

        if (shouldEnablePerformanceMode && !this.performanceMode) {
            this.setPerformanceMode(true);
            this.notifyObservers({
                type: 'performanceModeChanged',
                enabled: true,
                reason: 'automatic'
            });
        } else if (!shouldEnablePerformanceMode && this.performanceMode) {
            this.setPerformanceMode(false);
            this.notifyObservers({
                type: 'performanceModeChanged',
                enabled: false,
                reason: 'automatic'
            });
        }
    }

    static getDetailedMetrics(): typeof this.metrics {
        return { ...this.metrics };
    }

    static setPerformanceThresholds(thresholds: Partial<typeof this.PERFORMANCE_THRESHOLDS>): void {
        this.PERFORMANCE_THRESHOLDS = {
            ...this.PERFORMANCE_THRESHOLDS,
            ...thresholds
        };
    }

    static setAutoPerformanceMode(enabled: boolean): void {
        this.AUTO_PERFORMANCE_MODE.enabled = enabled;
    }

    static togglePerformanceDashboard(): void {
        if (process.env.NODE_ENV !== 'development') return;

        if (this.dashboard) {
            this.dashboard.remove();
            this.dashboard = null;
            return;
        }

        this.createPerformanceDashboard();
    }

    private static createPerformanceDashboard(): void {
        this.dashboard = document.createElement('div');
        this.dashboard.className = 'performance-dashboard';
        this.dashboard.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            min-width: 200px;
        `;

        document.body.appendChild(this.dashboard);
        this.updateDashboard();

        // Update dashboard periodically
        setInterval(() => this.updateDashboard(), this.DASHBOARD_UPDATE_INTERVAL);
    }

    private static updateDashboard(): void {
        if (!this.dashboard) return;

        const metrics = this.getDetailedMetrics();
        const memoryUsage = this.getMemoryUsage();
        
        this.dashboard.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">Performance Dashboard</div>
            <div>FPS: ${metrics.fps.toFixed(1)}</div>
            <div>Frame Time: ${metrics.frameTime.toFixed(2)}ms</div>
            <div>Memory: ${(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
            <div>CPU: ${metrics.cpuUsage.toFixed(1)}%</div>
            <div>Long Tasks: ${metrics.longTasks}</div>
            <div>Performance Mode: ${this.performanceMode ? 'ON' : 'OFF'}</div>
        `;
    }

    static getPerformanceHistory(): typeof this.performanceHistory {
        return [...this.performanceHistory];
    }

    static clearPerformanceHistory(): void {
        this.performanceHistory = [];
    }

    private static addToHistory(issues: Array<{ type: string; severity: 'warning' | 'critical'; value: number }>): void {
        this.performanceHistory.push({
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            issues: [...issues]
        });

        // Keep history size limited
        if (this.performanceHistory.length > this.HISTORY_MAX_ENTRIES) {
            this.performanceHistory.shift();
        }
    }

    static getPerformanceAnalytics(): {
        averageFPS: number;
        averageFrameTime: number;
        averageMemoryUsage: number;
        averageCPUUsage: number;
        criticalIssuesCount: number;
        warningIssuesCount: number;
        performanceModeDuration: number;
        issueDistribution: Record<string, number>;
        timeInPerformanceMode: number;
    } {
        const now = Date.now();
        const recentHistory = this.performanceHistory.filter(
            entry => now - entry.timestamp <= this.ANALYTICS_WINDOW
        );

        if (recentHistory.length === 0) {
            return {
                averageFPS: 0,
                averageFrameTime: 0,
                averageMemoryUsage: 0,
                averageCPUUsage: 0,
                criticalIssuesCount: 0,
                warningIssuesCount: 0,
                performanceModeDuration: 0,
                issueDistribution: {},
                timeInPerformanceMode: 0
            };
        }

        const metrics = {
            fps: [] as number[],
            frameTime: [] as number[],
            memoryUsage: [] as number[],
            cpuUsage: [] as number[],
            criticalIssues: 0,
            warningIssues: 0,
            issueTypes: {} as Record<string, number>,
            performanceModeEntries: [] as { timestamp: number; enabled: boolean }[]
        };

        recentHistory.forEach(entry => {
            metrics.fps.push(entry.metrics.fps);
            metrics.frameTime.push(entry.metrics.frameTime);
            metrics.memoryUsage.push(entry.metrics.memoryUsage);
            metrics.cpuUsage.push(entry.metrics.cpuUsage);

            entry.issues.forEach(issue => {
                if (issue.severity === 'critical') {
                    metrics.criticalIssues++;
                } else {
                    metrics.warningIssues++;
                }
                metrics.issueTypes[issue.type] = (metrics.issueTypes[issue.type] || 0) + 1;
            });
        });

        return {
            averageFPS: this.calculateAverage(metrics.fps),
            averageFrameTime: this.calculateAverage(metrics.frameTime),
            averageMemoryUsage: this.calculateAverage(metrics.memoryUsage),
            averageCPUUsage: this.calculateAverage(metrics.cpuUsage),
            criticalIssuesCount: metrics.criticalIssues,
            warningIssuesCount: metrics.warningIssues,
            performanceModeDuration: this.calculatePerformanceModeDuration(recentHistory),
            issueDistribution: metrics.issueTypes,
            timeInPerformanceMode: this.calculateTimeInPerformanceMode(recentHistory)
        };
    }

    private static calculateAverage(numbers: number[]): number {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    private static calculatePerformanceModeDuration(history: typeof this.performanceHistory): number {
        if (history.length < 2) return 0;

        let duration = 0;
        for (let i = 1; i < history.length; i++) {
            const timeDiff = history[i].timestamp - history[i - 1].timestamp;
            if (history[i].metrics.fps < this.PERFORMANCE_THRESHOLDS.fps.warning) {
                duration += timeDiff;
            }
        }
        return duration;
    }

    private static calculateTimeInPerformanceMode(history: typeof this.performanceHistory): number {
        if (history.length < 2) return 0;

        let duration = 0;
        for (let i = 1; i < history.length; i++) {
            const timeDiff = history[i].timestamp - history[i - 1].timestamp;
            if (history[i].metrics.fps < this.PERFORMANCE_THRESHOLDS.fps.warning ||
                history[i].metrics.memoryUsage > this.PERFORMANCE_THRESHOLDS.memoryUsage.warning ||
                history[i].metrics.cpuUsage > this.PERFORMANCE_THRESHOLDS.cpuUsage.warning) {
                duration += timeDiff;
            }
        }
        return duration;
    }

    static getPerformanceTrends(): {
        fps: { trend: 'improving' | 'degrading' | 'stable'; change: number };
        memory: { trend: 'improving' | 'degrading' | 'stable'; change: number };
        cpu: { trend: 'improving' | 'degrading' | 'stable'; change: number };
        issues: { trend: 'improving' | 'degrading' | 'stable'; change: number };
    } {
        const now = Date.now();
        const recentHistory = this.performanceHistory.filter(
            entry => now - entry.timestamp <= this.TREND_WINDOWS.DAY
        );

        if (recentHistory.length < 2) {
            return {
                fps: { trend: 'stable', change: 0 },
                memory: { trend: 'stable', change: 0 },
                cpu: { trend: 'stable', change: 0 },
                issues: { trend: 'stable', change: 0 }
            };
        }

        const calculateTrend = (values: number[]): { trend: 'improving' | 'degrading' | 'stable'; change: number } => {
            if (values.length < 2) return { trend: 'stable', change: 0 };

            const firstHalf = values.slice(0, Math.floor(values.length / 2));
            const secondHalf = values.slice(Math.floor(values.length / 2));

            const firstAvg = this.calculateAverage(firstHalf);
            const secondAvg = this.calculateAverage(secondHalf);
            const change = ((secondAvg - firstAvg) / firstAvg) * 100;

            if (Math.abs(change) < 5) return { trend: 'stable', change };
            return { trend: change > 0 ? 'improving' : 'degrading', change };
        };

        const fpsValues = recentHistory.map(entry => entry.metrics.fps);
        const memoryValues = recentHistory.map(entry => entry.metrics.memoryUsage);
        const cpuValues = recentHistory.map(entry => entry.metrics.cpuUsage);
        const issueCounts = recentHistory.map(entry => entry.issues.length);

        return {
            fps: calculateTrend(fpsValues),
            memory: calculateTrend(memoryValues),
            cpu: calculateTrend(cpuValues),
            issues: calculateTrend(issueCounts)
        };
    }

    static setAlertThresholds(thresholds: Partial<typeof this.ALERT_THRESHOLDS>): void {
        this.ALERT_THRESHOLDS = {
            ...this.ALERT_THRESHOLDS,
            ...thresholds
        };
    }

    static addAlertCallback(callback: (alert: {
        type: string;
        severity: 'warning' | 'critical';
        value: number;
        threshold: number;
        timestamp: number;
    }) => void): void {
        this.alertCallbacks.add(callback);
    }

    static removeAlertCallback(callback: (alert: {
        type: string;
        severity: 'warning' | 'critical';
        value: number;
        threshold: number;
        timestamp: number;
    }) => void): void {
        this.alertCallbacks.delete(callback);
    }

    private static checkAlertThresholds(): void {
        const now = Date.now();
        const alerts = [];

        if (this.metrics.fps < this.ALERT_THRESHOLDS.fps.critical) {
            alerts.push({
                type: 'fps',
                severity: 'critical',
                value: this.metrics.fps,
                threshold: this.ALERT_THRESHOLDS.fps.critical,
                timestamp: now
            });
        } else if (this.metrics.fps < this.ALERT_THRESHOLDS.fps.warning) {
            alerts.push({
                type: 'fps',
                severity: 'warning',
                value: this.metrics.fps,
                threshold: this.ALERT_THRESHOLDS.fps.warning,
                timestamp: now
            });
        }

        if (this.metrics.frameTime > this.ALERT_THRESHOLDS.frameTime.critical) {
            alerts.push({
                type: 'frameTime',
                severity: 'critical',
                value: this.metrics.frameTime,
                threshold: this.ALERT_THRESHOLDS.frameTime.critical,
                timestamp: now
            });
        } else if (this.metrics.frameTime > this.ALERT_THRESHOLDS.frameTime.warning) {
            alerts.push({
                type: 'frameTime',
                severity: 'warning',
                value: this.metrics.frameTime,
                threshold: this.ALERT_THRESHOLDS.frameTime.warning,
                timestamp: now
            });
        }

        if (this.metrics.memoryUsage > this.ALERT_THRESHOLDS.memoryUsage.critical) {
            alerts.push({
                type: 'memory',
                severity: 'critical',
                value: this.metrics.memoryUsage,
                threshold: this.ALERT_THRESHOLDS.memoryUsage.critical,
                timestamp: now
            });
        } else if (this.metrics.memoryUsage > this.ALERT_THRESHOLDS.memoryUsage.warning) {
            alerts.push({
                type: 'memory',
                severity: 'warning',
                value: this.metrics.memoryUsage,
                threshold: this.ALERT_THRESHOLDS.memoryUsage.warning,
                timestamp: now
            });
        }

        if (this.metrics.cpuUsage > this.ALERT_THRESHOLDS.cpuUsage.critical) {
            alerts.push({
                type: 'cpu',
                severity: 'critical',
                value: this.metrics.cpuUsage,
                threshold: this.ALERT_THRESHOLDS.cpuUsage.critical,
                timestamp: now
            });
        } else if (this.metrics.cpuUsage > this.ALERT_THRESHOLDS.cpuUsage.warning) {
            alerts.push({
                type: 'cpu',
                severity: 'warning',
                value: this.metrics.cpuUsage,
                threshold: this.ALERT_THRESHOLDS.cpuUsage.warning,
                timestamp: now
            });
        }

        if (alerts.length > 0) {
            alerts.forEach(alert => {
                this.alertCallbacks.forEach(callback => callback(alert));
            });
        }
    }
} 