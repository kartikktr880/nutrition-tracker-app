import { PerformanceAnalytics } from '../performance-analytics';
import { PerformanceHistory } from '../performance-history';

describe('PerformanceAnalytics', () => {
    beforeEach(() => {
        // Reset history
        PerformanceHistory.destroy();
        PerformanceHistory.initialize();
    });

    afterEach(() => {
        PerformanceHistory.destroy();
    });

    it('should generate empty report when no data is available', () => {
        const report = PerformanceAnalytics.generateReport({
            start: Date.now() - 3600000,
            end: Date.now()
        });

        expect(report.summary.averageFps).toBe(0);
        expect(report.summary.averageMemoryUsage).toBe(0);
        expect(report.recommendations).toContain('No performance data available for analysis');
    });

    it('should generate report with performance data', () => {
        // Add some test records
        const now = Date.now();
        const records = [
            {
                timestamp: now - 1000,
                fps: 30,
                frameTime: 33.33,
                memoryUsage: 1024 * 1024 * 50,
                cpuUsage: 50,
                issues: { warnings: 2, critical: 1 }
            },
            {
                timestamp: now,
                fps: 60,
                frameTime: 16.67,
                memoryUsage: 1024 * 1024 * 75,
                cpuUsage: 60,
                issues: { warnings: 1, critical: 0 }
            }
        ];

        // Mock PerformanceHistory methods
        jest.spyOn(PerformanceHistory, 'getRecords').mockReturnValue(records);
        jest.spyOn(PerformanceHistory, 'getAverageMetrics').mockReturnValue({
            fps: 45,
            frameTime: 25,
            memoryUsage: 1024 * 1024 * 62.5,
            cpuUsage: 55,
            issues: { warnings: 1.5, critical: 0.5 }
        });
        jest.spyOn(PerformanceHistory, 'getPerformanceTrends').mockReturnValue({
            fps: { trend: 'improving', change: 30 },
            memory: { trend: 'increasing', change: 1024 * 1024 * 25 },
            cpu: { trend: 'increasing', change: 10 }
        });

        const report = PerformanceAnalytics.generateReport({
            start: now - 1000,
            end: now
        });

        expect(report.summary.averageFps).toBe(45);
        expect(report.summary.averageMemoryUsage).toBe(1024 * 1024 * 62.5);
        expect(report.trends.fps.trend).toBe('improving');
        expect(report.issues.warnings.count).toBe(1);
        expect(report.recommendations).toContain('Recent performance optimizations are showing positive results');
    });

    it('should generate recommendations based on thresholds', () => {
        // Mock data with poor performance
        jest.spyOn(PerformanceHistory, 'getRecords').mockReturnValue([{
            timestamp: Date.now(),
            fps: 25,
            frameTime: 40,
            memoryUsage: 1024 * 1024 * 150,
            cpuUsage: 90,
            issues: { warnings: 5, critical: 2 }
        }]);

        jest.spyOn(PerformanceHistory, 'getAverageMetrics').mockReturnValue({
            fps: 25,
            frameTime: 40,
            memoryUsage: 1024 * 1024 * 150,
            cpuUsage: 90,
            issues: { warnings: 5, critical: 2 }
        });

        jest.spyOn(PerformanceHistory, 'getPerformanceTrends').mockReturnValue({
            fps: { trend: 'degrading', change: -5 },
            memory: { trend: 'increasing', change: 1024 * 1024 * 50 },
            cpu: { trend: 'increasing', change: 10 }
        });

        const report = PerformanceAnalytics.generateReport({
            start: Date.now() - 1000,
            end: Date.now()
        });

        expect(report.recommendations).toContain('Consider optimizing rendering performance to improve FPS');
        expect(report.recommendations).toContain('Review memory usage patterns and implement memory optimization strategies');
        expect(report.recommendations).toContain('Optimize CPU-intensive operations to reduce processor load');
    });

    it('should analyze issue trends correctly', () => {
        const now = Date.now();
        const records = [
            {
                timestamp: now - 2000,
                fps: 60,
                frameTime: 16.67,
                memoryUsage: 1024 * 1024 * 50,
                cpuUsage: 50,
                issues: { warnings: 2, critical: 1 }
            },
            {
                timestamp: now - 1000,
                fps: 60,
                frameTime: 16.67,
                memoryUsage: 1024 * 1024 * 50,
                cpuUsage: 50,
                issues: { warnings: 1, critical: 0 }
            },
            {
                timestamp: now,
                fps: 60,
                frameTime: 16.67,
                memoryUsage: 1024 * 1024 * 50,
                cpuUsage: 50,
                issues: { warnings: 0, critical: 0 }
            }
        ];

        jest.spyOn(PerformanceHistory, 'getRecords').mockReturnValue(records);
        jest.spyOn(PerformanceHistory, 'getAverageMetrics').mockReturnValue({
            fps: 60,
            frameTime: 16.67,
            memoryUsage: 1024 * 1024 * 50,
            cpuUsage: 50,
            issues: { warnings: 1, critical: 0.33 }
        });
        jest.spyOn(PerformanceHistory, 'getPerformanceTrends').mockReturnValue({
            fps: { trend: 'stable', change: 0 },
            memory: { trend: 'stable', change: 0 },
            cpu: { trend: 'stable', change: 0 }
        });

        const report = PerformanceAnalytics.generateReport({
            start: now - 2000,
            end: now
        });

        expect(report.issues.warnings.trend).toBe('decreasing');
        expect(report.issues.critical.trend).toBe('decreasing');
    });
}); 