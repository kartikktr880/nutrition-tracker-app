import { PerformanceMonitor } from '../performance';
import { PerformanceMetric, PerformanceThreshold } from '../performance-types';

// Mock performance API
const mockPerformance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  },
  now: jest.fn(() => 1000),
  getEntriesByType: jest.fn(() => []),
  clearMeasures: jest.fn(),
  mark: jest.fn(),
  measure: jest.fn()
};

// Mock global performance object
global.performance = mockPerformance as any;

describe('PerformanceMonitor Core Functionality', () => {
  let monitor: PerformanceMonitor;
  const defaultConfig = {
    thresholds: {
      fps: { warning: 30, critical: 15 },
      memory: { warning: 0.8, critical: 0.9 },
      cpu: { warning: 80, critical: 90 }
    },
    collectionInterval: 1000,
    historySize: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = PerformanceMonitor.getInstance();
    (monitor as any).config = defaultConfig;
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('Basic Metric Collection', () => {
    it('should initialize with default configuration', () => {
      expect((monitor as any).config).toEqual(defaultConfig);
      expect((monitor as any).metrics).toBeDefined();
      expect((monitor as any).history).toBeDefined();
    });

    it('should collect basic system metrics', async () => {
      const timestamp = new Date().toISOString();
      await (monitor as any).collectSystemMetrics(timestamp);

      const metrics = (monitor as any).metrics;
      expect(metrics.get('memory.heap')).toBeDefined();
      expect(metrics.get('cpu.usage')).toBeDefined();
    });

    it('should maintain metric history within size limits', async () => {
      const historySize = (monitor as any).config.historySize;
      
      // Add more metrics than history size
      for (let i = 0; i < historySize + 10; i++) {
        const timestamp = new Date(Date.now() + i * 1000).toISOString();
        await (monitor as any).collectSystemMetrics(timestamp);
      }

      const metrics = (monitor as any).metrics.get('memory.heap');
      expect(metrics.length).toBeLessThanOrEqual(historySize);
    });
  });

  describe('Threshold Monitoring', () => {
    it('should detect when metrics exceed warning thresholds', async () => {
      // Simulate high memory usage
      (performance as any).memory.usedJSHeapSize = 85 * 1024 * 1024; // 85% of total
      const timestamp = new Date().toISOString();
      
      await (monitor as any).collectSystemMetrics(timestamp);
      const issues = await (monitor as any).checkThresholds();
      
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'memory',
          severity: 'warning',
          value: expect.any(Number)
        })
      );
    });

    it('should detect when metrics exceed critical thresholds', async () => {
      // Simulate critical memory usage
      (performance as any).memory.usedJSHeapSize = 190 * 1024 * 1024; // 95% of limit
      const timestamp = new Date().toISOString();
      
      await (monitor as any).collectSystemMetrics(timestamp);
      const issues = await (monitor as any).checkThresholds();
      
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'memory',
          severity: 'critical',
          value: expect.any(Number)
        })
      );
    });
  });

  describe('Metric Aggregation', () => {
    it('should calculate correct averages for metrics', async () => {
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 1000).toISOString()
      );
      
      // Add varying memory usage values
      const memoryValues = [50, 60, 70, 80, 90].map(v => v * 1024 * 1024);
      for (let i = 0; i < timestamps.length; i++) {
        (performance as any).memory.usedJSHeapSize = memoryValues[i];
        await (monitor as any).collectSystemMetrics(timestamps[i]);
      }

      const stats = await (monitor as any).getMetricStats('memory.heap');
      expect(stats).toMatchObject({
        average: expect.any(Number),
        min: 50 * 1024 * 1024,
        max: 90 * 1024 * 1024,
        count: 5
      });
    });

    it('should handle empty metric sets', async () => {
      const stats = await (monitor as any).getMetricStats('nonexistent.metric');
      expect(stats).toMatchObject({
        average: 0,
        min: 0,
        max: 0,
        count: 0
      });
    });
  });

  describe('Monitoring Control', () => {
    it('should start and stop monitoring correctly', () => {
      const startSpy = jest.spyOn(global, 'setInterval');
      const stopSpy = jest.spyOn(global, 'clearInterval');

      monitor.startMonitoring();
      expect(startSpy).toHaveBeenCalledWith(
        expect.any(Function),
        defaultConfig.collectionInterval
      );

      monitor.stopMonitoring();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should not start multiple monitoring intervals', () => {
      const startSpy = jest.spyOn(global, 'setInterval');
      
      monitor.startMonitoring();
      monitor.startMonitoring();
      
      expect(startSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during metric collection', async () => {
      const logErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPerformance.getEntriesByType.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await (monitor as any).collectSystemMetrics(new Date().toISOString());
      
      expect(logErrorSpy).toHaveBeenCalled();
      expect((monitor as any).metrics.size).toBe(0);
      
      logErrorSpy.mockRestore();
    });

    it('should continue monitoring after non-critical errors', async () => {
      const logErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPerformance.getEntriesByType
        .mockImplementationOnce(() => { throw new Error('Test error'); })
        .mockImplementationOnce(() => []);

      await (monitor as any).collectSystemMetrics(new Date().toISOString());
      await (monitor as any).collectSystemMetrics(new Date().toISOString());
      
      expect(logErrorSpy).toHaveBeenCalledTimes(1);
      expect((monitor as any).isMonitoring).toBe(true);
      
      logErrorSpy.mockRestore();
    });
  });
}); 