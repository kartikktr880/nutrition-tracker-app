import { PerformanceImpact } from '../performance-impact';
import { PerformanceHistory } from '../performance-history';

jest.mock('../performance-history');

describe('PerformanceImpact', () => {
    let impact: PerformanceImpact;

    beforeEach(() => {
        jest.clearAllMocks();
        impact = PerformanceImpact.initialize();
    });

    afterEach(() => {
        impact.destroy();
    });

    it('should initialize as a singleton', () => {
        const instance1 = PerformanceImpact.initialize();
        const instance2 = PerformanceImpact.initialize();
        expect(instance1).toBe(instance2);
    });

    it('should throw error when getting instance before initialization', () => {
        impact.destroy();
        expect(() => PerformanceImpact.getInstance()).toThrow('PerformanceImpact must be initialized first');
    });

    it('should set and calculate baseline metrics', () => {
        const mockMetrics = {
            fps: 30,
            memoryUsage: 100 * 1024 * 1024,
            cpuUsage: 50
        };

        (PerformanceHistory.getLatestMetrics as jest.Mock).mockReturnValue(mockMetrics);

        const optimizationId = 'test-optimization';
        impact.setBaseline(optimizationId);

        const newMetrics = {
            fps: 35,
            memoryUsage: 90 * 1024 * 1024,
            cpuUsage: 45
        };

        (PerformanceHistory.getLatestMetrics as jest.Mock).mockReturnValue(newMetrics);

        const analysis = impact.calculateImpact(optimizationId);

        expect(analysis.before.fps).toBe(30);
        expect(analysis.after.fps).toBe(35);
        expect(analysis.improvement.fps).toBe(5);
        expect(analysis.percentageChange.fps).toBeCloseTo(16.67, 2);
    });

    it('should track impact history', () => {
        const mockMetrics = {
            fps: 30,
            memoryUsage: 100 * 1024 * 1024,
            cpuUsage: 50
        };

        (PerformanceHistory.getLatestMetrics as jest.Mock).mockReturnValue(mockMetrics);

        const optimizationId = 'test-optimization';
        impact.setBaseline(optimizationId);

        const newMetrics = {
            fps: 35,
            memoryUsage: 90 * 1024 * 1024,
            cpuUsage: 45
        };

        (PerformanceHistory.getLatestMetrics as jest.Mock).mockReturnValue(newMetrics);

        impact.calculateImpact(optimizationId);

        const history = impact.getImpactHistory();
        expect(history.size).toBe(1);
        expect(history.get(optimizationId)).toBeDefined();
    });

    it('should generate impact report', () => {
        const mockMetrics = {
            fps: 30,
            memoryUsage: 100 * 1024 * 1024,
            cpuUsage: 50
        };

        (PerformanceHistory.getLatestMetrics as jest.Mock).mockReturnValue(mockMetrics);

        const optimizationId = 'test-optimization';
        impact.setBaseline(optimizationId);

        const newMetrics = {
            fps: 35,
            memoryUsage: 90 * 1024 * 1024,
            cpuUsage: 45
        };

        (PerformanceHistory.getLatestMetrics as jest.Mock).mockReturnValue(newMetrics);

        impact.calculateImpact(optimizationId);

        const report = impact.generateImpactReport({
            start: Date.now() - 3600000,
            end: Date.now()
        });

        expect(report.optimizationCount).toBe(1);
        expect(report.totalImprovements.fps).toBe(5);
        expect(report.averageImprovements.fps).toBe(5);
        expect(report.significantImprovements.length).toBeGreaterThan(0);
    });

    it('should handle missing baseline metrics', () => {
        const optimizationId = 'test-optimization';
        expect(() => impact.calculateImpact(optimizationId)).toThrow('No baseline metrics found');
    });

    it('should handle missing current metrics', () => {
        const mockMetrics = {
            fps: 30,
            memoryUsage: 100 * 1024 * 1024,
            cpuUsage: 50
        };

        (PerformanceHistory.getLatestMetrics as jest.Mock).mockReturnValue(mockMetrics);

        const optimizationId = 'test-optimization';
        impact.setBaseline(optimizationId);

        (PerformanceHistory.getLatestMetrics as jest.Mock).mockReturnValue(null);

        expect(() => impact.calculateImpact(optimizationId)).toThrow('No current metrics available');
    });

    it('should clear data on destroy', () => {
        const mockMetrics = {
            fps: 30,
            memoryUsage: 100 * 1024 * 1024,
            cpuUsage: 50
        };

        (PerformanceHistory.getLatestMetrics as jest.Mock).mockReturnValue(mockMetrics);

        const optimizationId = 'test-optimization';
        impact.setBaseline(optimizationId);
        impact.calculateImpact(optimizationId);

        impact.destroy();

        const history = impact.getImpactHistory();
        expect(history.size).toBe(0);
    });
}); 