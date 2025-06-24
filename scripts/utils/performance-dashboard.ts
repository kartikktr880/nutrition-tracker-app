import { PerformanceUtils } from './performance-utils';
import { PerformanceVisualizer } from './performance-visualizer';
import { PerformanceAlerts } from './performance-alerts';
import { PerformanceHistory } from './performance-history';
import { PerformanceAnalytics } from './performance-analytics';
import { PerformanceRecommendations } from './performance-recommendations';
import { PerformanceImpact } from './performance-impact';

interface DashboardConfig {
    containerId: string;
    updateInterval?: number;
    maxHistoryPoints?: number;
    thresholds?: {
        fps?: number;
        memory?: number;
        cpu?: number;
    };
}

export class PerformanceDashboard {
    private static instance: PerformanceDashboard | null = null;
    private config: DashboardConfig;
    private updateTimer: number | null = null;
    private isInitialized = false;
    private initializedComponents: Set<string> = new Set();

    private constructor(config: DashboardConfig) {
        if (!config.containerId) {
            throw new Error('containerId is required in DashboardConfig');
        }

        this.config = {
            updateInterval: 1000,
            maxHistoryPoints: 1000,
            thresholds: {
                fps: 30,
                memory: 100 * 1024 * 1024, // 100MB
                cpu: 80
            },
            ...config
        };

        // Validate config values
        if (this.config.updateInterval && this.config.updateInterval < 100) {
            throw new Error('updateInterval must be at least 100ms');
        }
        if (this.config.maxHistoryPoints && this.config.maxHistoryPoints < 10) {
            throw new Error('maxHistoryPoints must be at least 10');
        }
    }

    static initialize(config: DashboardConfig): PerformanceDashboard {
        if (!PerformanceDashboard.instance) {
            PerformanceDashboard.instance = new PerformanceDashboard(config);
        }
        return PerformanceDashboard.instance;
    }

    static getInstance(): PerformanceDashboard {
        if (!PerformanceDashboard.instance) {
            throw new Error('PerformanceDashboard must be initialized first');
        }
        return PerformanceDashboard.instance;
    }

    private async initializeComponent(componentName: string, initFn: () => void | Promise<void>): Promise<void> {
        try {
            await initFn();
            this.initializedComponents.add(componentName);
        } catch (error) {
            console.error(`Failed to initialize ${componentName}:`, error);
            throw error;
        }
    }

    async start(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize all components
            await this.initializeComponent('PerformanceUtils', () => PerformanceUtils.initialize());
            await this.initializeComponent('PerformanceVisualizer', () => PerformanceVisualizer.initialize(this.config.containerId));
            await this.initializeComponent('PerformanceAlerts', () => PerformanceAlerts.initialize(this.config.thresholds));
            await this.initializeComponent('PerformanceHistory', () => PerformanceHistory.initialize());
            await this.initializeComponent('PerformanceRecommendations', () => PerformanceRecommendations.initialize());
            await this.initializeComponent('PerformanceImpact', () => PerformanceImpact.initialize());

            // Start monitoring
            PerformanceAlerts.startMonitoring();
            this.startUpdateTimer();

            this.isInitialized = true;
        } catch (error) {
            // Cleanup any initialized components
            await this.cleanup();
            console.error('Failed to start PerformanceDashboard:', error);
            throw error;
        }
    }

    private async cleanup(): Promise<void> {
        const cleanupTasks = [
            { name: 'PerformanceAlerts', fn: () => PerformanceAlerts.stopMonitoring() },
            { name: 'PerformanceVisualizer', fn: () => PerformanceVisualizer.destroy() },
            { name: 'PerformanceHistory', fn: () => PerformanceHistory.destroy() },
            { name: 'PerformanceRecommendations', fn: () => PerformanceRecommendations.destroy() },
            { name: 'PerformanceImpact', fn: () => PerformanceImpact.destroy() }
        ];

        for (const task of cleanupTasks) {
            if (this.initializedComponents.has(task.name)) {
                try {
                    await task.fn();
                } catch (error) {
                    console.error(`Error cleaning up ${task.name}:`, error);
                }
            }
        }

        if (this.updateTimer) {
            window.clearInterval(this.updateTimer);
            this.updateTimer = null;
        }

        this.initializedComponents.clear();
        this.isInitialized = false;
    }

    async stop(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        await this.cleanup();
    }

    private startUpdateTimer(): void {
        if (this.updateTimer) {
            window.clearInterval(this.updateTimer);
        }

        this.updateTimer = window.setInterval(() => {
            this.update();
        }, this.config.updateInterval);
    }

    private update(): void {
        try {
            // Get current metrics
            const metrics = PerformanceUtils.getCurrentMetrics();
            
            // Validate metrics
            if (!metrics) {
                console.warn('No metrics available for update');
                return;
            }

            // Validate metric values
            if (typeof metrics.fps !== 'number' || metrics.fps < 0) {
                console.warn('Invalid FPS value:', metrics.fps);
                return;
            }
            if (typeof metrics.memoryUsage !== 'number' || metrics.memoryUsage < 0) {
                console.warn('Invalid memory usage value:', metrics.memoryUsage);
                return;
            }
            if (typeof metrics.cpuUsage !== 'number' || metrics.cpuUsage < 0 || metrics.cpuUsage > 100) {
                console.warn('Invalid CPU usage value:', metrics.cpuUsage);
                return;
            }
            
            try {
                // Add to history
                PerformanceHistory.addRecord();
            } catch (error) {
                console.error('Failed to add record to history:', error);
            }

            try {
                // Check alerts
                PerformanceAlerts.checkMetrics(metrics);
            } catch (error) {
                console.error('Failed to check metrics for alerts:', error);
            }

            try {
                // Update visualizer
                PerformanceVisualizer.update(metrics);
            } catch (error) {
                console.error('Failed to update visualizer:', error);
            }
        } catch (error) {
            console.error('Error updating PerformanceDashboard:', error);
        }
    }

    getPerformanceReport(timeRange: { start: number; end: number }) {
        if (!timeRange || typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number') {
            throw new Error('Invalid timeRange parameter');
        }
        if (timeRange.start > timeRange.end) {
            throw new Error('timeRange.start must be less than timeRange.end');
        }
        return PerformanceAnalytics.generateReport(timeRange);
    }

    getCurrentMetrics() {
        return PerformanceUtils.getCurrentMetrics();
    }

    getHistoricalData(timeRange: { start: number; end: number }) {
        if (!timeRange || typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number') {
            throw new Error('Invalid timeRange parameter');
        }
        if (timeRange.start > timeRange.end) {
            throw new Error('timeRange.start must be less than timeRange.end');
        }
        return PerformanceHistory.getRecords(timeRange);
    }

    getAverageMetrics(timeRange: { start: number; end: number }) {
        if (!timeRange || typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number') {
            throw new Error('Invalid timeRange parameter');
        }
        if (timeRange.start > timeRange.end) {
            throw new Error('timeRange.start must be less than timeRange.end');
        }
        return PerformanceHistory.getAverageMetrics(timeRange);
    }

    getPerformanceTrends(timeRange: { start: number; end: number }) {
        if (!timeRange || typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number') {
            throw new Error('Invalid timeRange parameter');
        }
        if (timeRange.start > timeRange.end) {
            throw new Error('timeRange.start must be less than timeRange.end');
        }
        return PerformanceHistory.getPerformanceTrends(timeRange);
    }

    setThresholds(thresholds: { fps?: number; memory?: number; cpu?: number }) {
        if (!thresholds) {
            throw new Error('thresholds parameter is required');
        }
        if (thresholds.fps !== undefined && (typeof thresholds.fps !== 'number' || thresholds.fps < 0)) {
            throw new Error('Invalid FPS threshold');
        }
        if (thresholds.memory !== undefined && (typeof thresholds.memory !== 'number' || thresholds.memory < 0)) {
            throw new Error('Invalid memory threshold');
        }
        if (thresholds.cpu !== undefined && (typeof thresholds.cpu !== 'number' || thresholds.cpu < 0 || thresholds.cpu > 100)) {
            throw new Error('Invalid CPU threshold');
        }
        PerformanceAlerts.setThresholds(thresholds);
    }

    addAlertCallback(callback: (metric: string, value: number, threshold: number) => void) {
        if (typeof callback !== 'function') {
            throw new Error('callback must be a function');
        }
        PerformanceAlerts.addCallback(callback);
    }

    removeAlertCallback(callback: (metric: string, value: number, threshold: number) => void) {
        if (typeof callback !== 'function') {
            throw new Error('callback must be a function');
        }
        PerformanceAlerts.removeCallback(callback);
    }

    getPerformanceRecommendations(timeRange: { start: number; end: number }) {
        if (!timeRange || typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number') {
            throw new Error('Invalid timeRange parameter');
        }
        if (timeRange.start > timeRange.end) {
            throw new Error('timeRange.start must be less than timeRange.end');
        }
        return PerformanceRecommendations.getInstance().generateRecommendations(timeRange);
    }

    markRecommendationAsImplemented(id: string, performanceImprovement: { fps?: number; memory?: number; cpu?: number }) {
        if (!id) {
            throw new Error('id parameter is required');
        }
        if (!performanceImprovement) {
            throw new Error('performanceImprovement parameter is required');
        }
        if (performanceImprovement.fps !== undefined && (typeof performanceImprovement.fps !== 'number' || performanceImprovement.fps < 0)) {
            throw new Error('Invalid FPS improvement value');
        }
        if (performanceImprovement.memory !== undefined && (typeof performanceImprovement.memory !== 'number' || performanceImprovement.memory < 0)) {
            throw new Error('Invalid memory improvement value');
        }
        if (performanceImprovement.cpu !== undefined && (typeof performanceImprovement.cpu !== 'number' || performanceImprovement.cpu < 0 || performanceImprovement.cpu > 100)) {
            throw new Error('Invalid CPU improvement value');
        }
        PerformanceRecommendations.getInstance().markAsImplemented(id, performanceImprovement);
    }

    markRecommendationAsRejected(id: string) {
        PerformanceRecommendations.getInstance().markAsRejected(id);
    }

    setOptimizationBaseline(optimizationId: string): void {
        PerformanceImpact.getInstance().setBaseline(optimizationId);
    }

    calculateOptimizationImpact(optimizationId: string) {
        return PerformanceImpact.getInstance().calculateImpact(optimizationId);
    }

    getOptimizationImpact(optimizationId: string) {
        return PerformanceImpact.getInstance().getOptimizationImpact(optimizationId);
    }

    getImpactReport(timeRange: { start: number; end: number }) {
        return PerformanceImpact.getInstance().generateImpactReport(timeRange);
    }
} 