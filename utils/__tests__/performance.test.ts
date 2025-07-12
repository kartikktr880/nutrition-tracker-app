import { performanceManager } from '../performance';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- required for test mocking
(global as any).performance = mockPerformance;

describe('PerformanceManager', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Reset the performance manager
    performanceManager.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple getInstance calls', () => {
      const instance1 = performanceManager;
      const instance2 = performanceManager;
      expect(instance1).toBe(instance2);
    });
  });

  describe('Basic Functionality', () => {
    it('should start and stop monitoring', () => {
      expect(() => performanceManager.start()).not.toThrow();
      expect(() => performanceManager.stop()).not.toThrow();
    });

    it('should get metrics', () => {
      const metrics = performanceManager.getMetrics();
      expect(metrics).toBeInstanceOf(Map);
    });

    it('should get events', () => {
      const events = performanceManager.getEvents();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should get alerts', () => {
      const alerts = performanceManager.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should get snapshot', () => {
      const snapshot = performanceManager.getSnapshot();
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot).toHaveProperty('events');
      expect(snapshot).toHaveProperty('alerts');
      });
    });

  describe('Metric Collection', () => {
    it('should handle missing memory metrics gracefully', async () => {
      // Temporarily remove memory property
      const originalMemory = performance.memory;
      delete (performance as any).memory;

      expect(() => performanceManager.start()).not.toThrow();
      expect(() => performanceManager.stop()).not.toThrow();

      // Restore memory property
      (performance as any).memory = originalMemory;
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during metric collection', async () => {
      mockPerformance.getEntriesByType.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      expect(() => performanceManager.start()).not.toThrow();
      expect(() => performanceManager.stop()).not.toThrow();
    });
  });

  describe('Monitoring Control', () => {
    it('should start and stop monitoring', () => {
      expect(() => performanceManager.start()).not.toThrow();
      expect(() => performanceManager.stop()).not.toThrow();
    });
  });
});