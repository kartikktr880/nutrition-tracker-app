import { PerformanceDashboard } from '../performance-dashboard';
import { PerformanceUtils } from '../performance-utils';
import { PerformanceVisualizer } from '../performance-visualizer';
import { PerformanceAlerts } from '../performance-alerts';
import { PerformanceHistory } from '../performance-history';
import { PerformanceAnalytics } from '../performance-analytics';

jest.mock('../performance-utils');
jest.mock('../performance-visualizer');
jest.mock('../performance-alerts');
jest.mock('../performance-history');
jest.mock('../performance-analytics');

describe('PerformanceDashboard', () => {
    const mockConfig = {
        containerId: 'test-container',
        updateInterval: 1000,
        maxHistoryPoints: 1000,
        thresholds: {
            fps: 30,
            memory: 100 * 1024 * 1024,
            cpu: 80
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset singleton instance
        (PerformanceDashboard as any).instance = null;
    });

    it('should initialize with default config', () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        expect(dashboard).toBeInstanceOf(PerformanceDashboard);
    });

    it('should return same instance on multiple initializations', () => {
        const dashboard1 = PerformanceDashboard.initialize(mockConfig);
        const dashboard2 = PerformanceDashboard.initialize(mockConfig);
        expect(dashboard1).toBe(dashboard2);
    });

    it('should throw error when getting instance before initialization', () => {
        expect(() => PerformanceDashboard.getInstance()).toThrow('PerformanceDashboard must be initialized first');
    });

    it('should start all components on start()', async () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        await dashboard.start();

        expect(PerformanceUtils.initialize).toHaveBeenCalled();
        expect(PerformanceVisualizer.initialize).toHaveBeenCalledWith(mockConfig.containerId);
        expect(PerformanceAlerts.initialize).toHaveBeenCalledWith(mockConfig.thresholds);
        expect(PerformanceHistory.initialize).toHaveBeenCalled();
        expect(PerformanceAlerts.startMonitoring).toHaveBeenCalled();
    });

    it('should stop all components on stop()', () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        dashboard.stop();

        expect(PerformanceAlerts.stopMonitoring).toHaveBeenCalled();
        expect(PerformanceVisualizer.destroy).toHaveBeenCalled();
        expect(PerformanceHistory.destroy).toHaveBeenCalled();
    });

    it('should update metrics periodically', async () => {
        jest.useFakeTimers();
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        await dashboard.start();

        const mockMetrics = { fps: 60, frameTime: 16.67, memoryUsage: 50 * 1024 * 1024, cpuUsage: 50 };
        (PerformanceUtils.getCurrentMetrics as jest.Mock).mockReturnValue(mockMetrics);

        jest.advanceTimersByTime(mockConfig.updateInterval);

        expect(PerformanceUtils.getCurrentMetrics).toHaveBeenCalled();
        expect(PerformanceHistory.addRecord).toHaveBeenCalled();
        expect(PerformanceAlerts.checkMetrics).toHaveBeenCalledWith(mockMetrics);
        expect(PerformanceVisualizer.update).toHaveBeenCalledWith(mockMetrics);

        jest.useRealTimers();
    });

    it('should handle errors during update', async () => {
        jest.useFakeTimers();
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        await dashboard.start();

        (PerformanceUtils.getCurrentMetrics as jest.Mock).mockImplementation(() => {
            throw new Error('Test error');
        });

        jest.advanceTimersByTime(mockConfig.updateInterval);

        expect(consoleSpy).toHaveBeenCalledWith('Error updating PerformanceDashboard:', expect.any(Error));
        expect(PerformanceHistory.addRecord).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
        jest.useRealTimers();
    });

    it('should get performance report', () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        const timeRange = { start: Date.now() - 3600000, end: Date.now() };
        dashboard.getPerformanceReport(timeRange);

        expect(PerformanceAnalytics.generateReport).toHaveBeenCalledWith(timeRange);
    });

    it('should get current metrics', () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        dashboard.getCurrentMetrics();

        expect(PerformanceUtils.getCurrentMetrics).toHaveBeenCalled();
    });

    it('should get historical data', () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        const timeRange = { start: Date.now() - 3600000, end: Date.now() };
        dashboard.getHistoricalData(timeRange);

        expect(PerformanceHistory.getRecords).toHaveBeenCalledWith(timeRange);
    });

    it('should get average metrics', () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        const timeRange = { start: Date.now() - 3600000, end: Date.now() };
        dashboard.getAverageMetrics(timeRange);

        expect(PerformanceHistory.getAverageMetrics).toHaveBeenCalledWith(timeRange);
    });

    it('should get performance trends', () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        const timeRange = { start: Date.now() - 3600000, end: Date.now() };
        dashboard.getPerformanceTrends(timeRange);

        expect(PerformanceHistory.getPerformanceTrends).toHaveBeenCalledWith(timeRange);
    });

    it('should set thresholds', () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        const newThresholds = { fps: 45, memory: 150 * 1024 * 1024, cpu: 90 };
        dashboard.setThresholds(newThresholds);

        expect(PerformanceAlerts.setThresholds).toHaveBeenCalledWith(newThresholds);
    });

    it('should add and remove alert callbacks', () => {
        const dashboard = PerformanceDashboard.initialize(mockConfig);
        const callback = jest.fn();
        
        dashboard.addAlertCallback(callback);
        expect(PerformanceAlerts.addCallback).toHaveBeenCalledWith(callback);

        dashboard.removeAlertCallback(callback);
        expect(PerformanceAlerts.removeCallback).toHaveBeenCalledWith(callback);
    });
}); 