import { PerformanceVisualizer } from '../performance-visualizer';
import { PerformanceUtils } from '../performance-utils';

describe.skip('PerformanceVisualizer', () => {
    let container: HTMLElement;

    beforeEach(() => {
        // Create a container for the charts
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);

        // Mock Chart.js
        global.Chart = jest.fn().mockImplementation(() => ({
            update: jest.fn(),
            destroy: jest.fn()
        }));

        // Mock PerformanceUtils methods
        jest.spyOn(PerformanceUtils, 'getPerformanceHistory').mockReturnValue([
            {
                timestamp: new Date().toISOString(),
                metrics: {
                    fps: 60,
                    frameTime: 16.67,
                    memoryUsage: 1024 * 1024 * 100, // 100MB
                    cpuUsage: 25
                },
                issues: [
                    { severity: 'warning', message: 'Test warning' },
                    { severity: 'critical', message: 'Test critical' }
                ]
            }
        ]);

        jest.spyOn(PerformanceUtils, 'getPerformanceAnalytics').mockReturnValue({
            fps: { average: 60, min: 55, max: 65 },
            memory: { average: 100, min: 90, max: 110 },
            cpu: { average: 25, min: 20, max: 30 },
            issues: { total: 2, warnings: 1, critical: 1 }
        });

        jest.spyOn(PerformanceUtils, 'getPerformanceTrends').mockReturnValue({
            fps: { change: 5, trend: 'improving' },
            memory: { change: -2, trend: 'improving' },
            cpu: { change: 3, trend: 'degrading' },
            issues: { change: -1, trend: 'improving' }
        });
    });

    afterEach(() => {
        PerformanceVisualizer.destroy();
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    it('should initialize charts when container exists', () => {
        PerformanceVisualizer.initialize('test-container');
        expect(global.Chart).toHaveBeenCalledTimes(3);
    });

    it('should not initialize charts when container does not exist', () => {
        PerformanceVisualizer.initialize('non-existent-container');
        expect(global.Chart).not.toHaveBeenCalled();
    });

    it('should update charts with performance data', () => {
        PerformanceVisualizer.initialize('test-container');
        
        // Fast-forward time to trigger update
        jest.advanceTimersByTime(1000);

        expect(PerformanceUtils.getPerformanceHistory).toHaveBeenCalled();
        expect(PerformanceUtils.getPerformanceAnalytics).toHaveBeenCalled();
        expect(PerformanceUtils.getPerformanceTrends).toHaveBeenCalled();
    });

    it('should destroy charts and clean up resources', () => {
        const mockChart = { destroy: jest.fn() };
        (global.Chart as jest.Mock).mockReturnValue(mockChart);

        PerformanceVisualizer.initialize('test-container');
        PerformanceVisualizer.destroy();

        expect(mockChart.destroy).toHaveBeenCalledTimes(3);
    });

    it('should handle empty performance history', () => {
        jest.spyOn(PerformanceUtils, 'getPerformanceHistory').mockReturnValue([]);
        
        PerformanceVisualizer.initialize('test-container');
        jest.advanceTimersByTime(1000);

        // Should not throw errors with empty data
        expect(global.Chart).toHaveBeenCalledTimes(3);
    });

    it('should handle missing performance data', () => {
        jest.spyOn(PerformanceUtils, 'getPerformanceHistory').mockReturnValue([
            {
                timestamp: new Date().toISOString(),
                metrics: {},
                issues: []
            }
        ]);

        PerformanceVisualizer.initialize('test-container');
        jest.advanceTimersByTime(1000);

        // Should handle missing data gracefully
        expect(global.Chart).toHaveBeenCalledTimes(3);
    });
}); 