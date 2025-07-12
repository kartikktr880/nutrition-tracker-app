import { PerformanceAlerts, AlertCallback } from '../performance-alerts';
import { PerformanceUtils } from '../performance-utils';

describe('PerformanceAlerts', () => {
    let mockCallback: AlertCallback;
    let mockMetrics: any;

    beforeEach(() => {
        // Mock callback
        mockCallback = jest.fn();

        // Mock metrics
        mockMetrics = {
            fps: 60,
            frameTime: 16.67,
            memoryUsage: 1024 * 1024 * 50, // 50MB
            cpuUsage: 50
        };

        // Mock PerformanceUtils
        jest.spyOn(PerformanceUtils, 'getMetrics').mockReturnValue(mockMetrics);

        // Reset alerts
        PerformanceAlerts.destroy();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with default thresholds', () => {
        PerformanceAlerts.initialize();
        const thresholds = PerformanceAlerts.getThresholds();
        
        expect(thresholds.fps).toBe(30);
        expect(thresholds.frameTime).toBe(33.33);
        expect(thresholds.memory).toBe(100);
        expect(thresholds.cpu).toBe(80);
    });

    it('should initialize with custom thresholds', () => {
        const customThresholds = {
            fps: 45,
            cpu: 90
        };

        PerformanceAlerts.initialize(customThresholds);
        const thresholds = PerformanceAlerts.getThresholds();
        
        expect(thresholds.fps).toBe(45);
        expect(thresholds.cpu).toBe(90);
        expect(thresholds.memory).toBe(100); // Default value
    });

    it('should add and remove callbacks', () => {
        PerformanceAlerts.initialize();
        
        PerformanceAlerts.addCallback(mockCallback);
        expect(PerformanceAlerts['callbacks']).toContain(mockCallback);

        PerformanceAlerts.removeCallback(mockCallback);
        expect(PerformanceAlerts['callbacks']).not.toContain(mockCallback);
    });

    it('should not add duplicate callbacks', () => {
        PerformanceAlerts.initialize();
        
        PerformanceAlerts.addCallback(mockCallback);
        PerformanceAlerts.addCallback(mockCallback);
        
        expect(PerformanceAlerts['callbacks'].length).toBe(1);
    });

    it('should trigger callback when FPS drops below threshold', () => {
        PerformanceAlerts.initialize();
        PerformanceAlerts.addCallback(mockCallback);

        // Mock low FPS
        mockMetrics.fps = 25;
        PerformanceAlerts['checkMetrics']();

        expect(mockCallback).toHaveBeenCalledWith('fps', 25, 30);
    });

    it('should trigger callback when frame time exceeds threshold', () => {
        PerformanceAlerts.initialize();
        PerformanceAlerts.addCallback(mockCallback);

        // Mock high frame time
        mockMetrics.frameTime = 40;
        PerformanceAlerts['checkMetrics']();

        expect(mockCallback).toHaveBeenCalledWith('frameTime', 40, 33.33);
    });

    it('should trigger callback when memory exceeds threshold', () => {
        PerformanceAlerts.initialize();
        PerformanceAlerts.addCallback(mockCallback);

        // Mock high memory usage (150MB)
        mockMetrics.memoryUsage = 1024 * 1024 * 150;
        PerformanceAlerts['checkMetrics']();

        expect(mockCallback).toHaveBeenCalledWith('memory', 150, 100);
    });

    it('should trigger callback when CPU exceeds threshold', () => {
        PerformanceAlerts.initialize();
        PerformanceAlerts.addCallback(mockCallback);

        // Mock high CPU usage
        mockMetrics.cpuUsage = 85;
        PerformanceAlerts['checkMetrics']();

        expect(mockCallback).toHaveBeenCalledWith('cpu', 85, 80);
    });

    it('should handle errors in callbacks gracefully', () => {
        const errorCallback: AlertCallback = () => {
            throw new Error('Test error');
        };

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        PerformanceAlerts.initialize();
        PerformanceAlerts.addCallback(errorCallback);

        // Mock low FPS to trigger callback
        mockMetrics.fps = 25;
        PerformanceAlerts['checkMetrics']();

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should reset to default thresholds', () => {
        // Set custom thresholds
        PerformanceAlerts.initialize({ fps: 45, cpu: 90 });
        
        // Reset to defaults
        PerformanceAlerts.resetThresholds();
        const thresholds = PerformanceAlerts.getThresholds();
        
        expect(thresholds.fps).toBe(30);
        expect(thresholds.cpu).toBe(80);
    });

    it('should clean up resources on destroy', () => {
        PerformanceAlerts.initialize();
        PerformanceAlerts.addCallback(mockCallback);
        
        PerformanceAlerts.destroy();
        
        expect(PerformanceAlerts['callbacks']).toHaveLength(0);
        expect(PerformanceAlerts['isMonitoring']).toBe(false);
    });
}); 