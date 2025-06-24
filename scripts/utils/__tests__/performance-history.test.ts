import { PerformanceHistory } from '../performance-history';
import { PerformanceUtils } from '../performance-utils';

describe('PerformanceHistory', () => {
    let mockMetrics: any;

    beforeEach(() => {
        // Mock metrics
        mockMetrics = {
            fps: 60,
            frameTime: 16.67,
            memoryUsage: 1024 * 1024 * 50, // 50MB
            cpuUsage: 50,
            warnings: 2,
            critical: 1
        };

        // Mock PerformanceUtils
        jest.spyOn(PerformanceUtils, 'getCurrentMetrics').mockReturnValue(mockMetrics);

        // Reset history
        PerformanceHistory.destroy();
        PerformanceHistory.initialize();
    });

    afterEach(() => {
        jest.clearAllMocks();
        PerformanceHistory.destroy();
    });

    it('should initialize and add records', () => {
        PerformanceHistory.addRecord();
        const records = PerformanceHistory['records'];
        expect(records).toHaveLength(1);
        expect(records[0].fps).toBe(60);
        expect(records[0].memoryUsage).toBe(1024 * 1024 * 50);
    });

    it('should get records within time range', () => {
        const now = Date.now();
        PerformanceHistory.addRecord();
        
        const records = PerformanceHistory.getRecords({
            start: now - 1000,
            end: now + 1000
        });
        
        expect(records).toHaveLength(1);
    });

    it('should get average metrics', () => {
        const now = Date.now();
        
        // Add multiple records with different values
        mockMetrics.fps = 60;
        mockMetrics.memoryUsage = 1024 * 1024 * 50;
        PerformanceHistory.addRecord();
        
        mockMetrics.fps = 30;
        mockMetrics.memoryUsage = 1024 * 1024 * 100;
        PerformanceHistory.addRecord();

        const averages = PerformanceHistory.getAverageMetrics({
            start: now - 1000,
            end: now + 1000
        });

        expect(averages.fps).toBe(45); // (60 + 30) / 2
        expect(averages.memoryUsage).toBe(1024 * 1024 * 75); // (50 + 100) / 2
    });

    it('should detect performance trends', () => {
        const now = Date.now();
        
        // Add records showing improvement
        mockMetrics.fps = 30;
        mockMetrics.memoryUsage = 1024 * 1024 * 100;
        mockMetrics.cpuUsage = 80;
        PerformanceHistory.addRecord();
        
        mockMetrics.fps = 60;
        mockMetrics.memoryUsage = 1024 * 1024 * 50;
        mockMetrics.cpuUsage = 40;
        PerformanceHistory.addRecord();

        const trends = PerformanceHistory.getPerformanceTrends({
            start: now - 1000,
            end: now + 1000
        });

        expect(trends.fps.trend).toBe('improving');
        expect(trends.memory.trend).toBe('decreasing');
        expect(trends.cpu.trend).toBe('decreasing');
    });

    it('should handle empty records gracefully', () => {
        const now = Date.now();
        
        const records = PerformanceHistory.getRecords({
            start: now - 1000,
            end: now + 1000
        });
        
        expect(records).toHaveLength(0);
        
        const averages = PerformanceHistory.getAverageMetrics({
            start: now - 1000,
            end: now + 1000
        });
        
        expect(averages).toEqual({});
        
        const trends = PerformanceHistory.getPerformanceTrends({
            start: now - 1000,
            end: now + 1000
        });
        
        expect(trends.fps.trend).toBe('stable');
        expect(trends.memory.trend).toBe('stable');
        expect(trends.cpu.trend).toBe('stable');
    });

    it('should clean up old records', () => {
        // Add more records than MAX_RECORDS
        for (let i = 0; i < 1100; i++) {
            PerformanceHistory.addRecord();
        }

        expect(PerformanceHistory['records'].length).toBeLessThanOrEqual(1000);
    });

    it('should clean up resources on destroy', () => {
        PerformanceHistory.addRecord();
        PerformanceHistory.destroy();
        
        expect(PerformanceHistory['records']).toHaveLength(0);
        expect(PerformanceHistory['cleanupTimer']).toBeNull();
    });
}); 