import { PerformanceMonitor } from '../performance';
import { PerformanceMetric, PerformanceIssue } from '../performance-types';

// Mock performance API
const mockPerformance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  },
  now: jest.fn(() => 1000),
  getEntriesByType: jest.fn(() => []),
  clearMeasures: jest.fn()
};

// Mock global performance object
global.performance = mockPerformance as any;

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Get fresh instance
    monitor = PerformanceMonitor.getInstance();
  });

  afterEach(() => {
    // Stop monitoring after each test
    monitor.stopMonitoring();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple getInstance calls', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Metric Collection', () => {
    it('should collect memory metrics when available', async () => {
      const timestamp = new Date().toISOString();
      await (monitor as any).collectSystemMetrics(timestamp);

      // Verify memory metrics were collected
      const metrics = (monitor as any).metrics.get('memory.heap');
      expect(metrics).toBeDefined();
      expect(metrics[0]).toMatchObject({
        timestamp,
        value: 50 * 1024 * 1024,
        category: 'system',
        subcategory: 'memory'
      });
    });

    it('should handle missing memory metrics gracefully', async () => {
      // Temporarily remove memory property
      const originalMemory = performance.memory;
      delete (performance as any).memory;

      const timestamp = new Date().toISOString();
      await (monitor as any).collectSystemMetrics(timestamp);

      // Verify no memory metrics were collected
      const metrics = (monitor as any).metrics.get('memory.heap');
      expect(metrics).toBeUndefined();

      // Restore memory property
      (performance as any).memory = originalMemory;
    });

    it('should collect CPU metrics', async () => {
      const timestamp = new Date().toISOString();
      await (monitor as any).collectSystemMetrics(timestamp);

      // Verify CPU metrics were collected
      const metrics = (monitor as any).metrics.get('cpu.usage');
      expect(metrics).toBeDefined();
      expect(metrics[0]).toMatchObject({
        timestamp,
        category: 'system',
        subcategory: 'cpu'
      });
      expect(typeof metrics[0].value).toBe('number');
    });
  });

  describe('Performance Issue Detection', () => {
    it('should detect FPS issues', () => {
      const metrics = {
        fps: 15, // Below critical threshold
        frameTime: 16.67,
        memoryUsage: 0,
        cpuUsage: 0
      };

      const issues = (monitor as any).detectPerformanceIssues(metrics);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'fps',
        severity: 'critical',
        value: 15
      });
    });

    it('should detect memory issues', () => {
      const metrics = {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 150 * 1024 * 1024, // Above critical threshold
        cpuUsage: 0
      };

      const issues = (monitor as any).detectPerformanceIssues(metrics);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'memory',
        severity: 'critical',
        value: 150 * 1024 * 1024
      });
    });

    it('should detect CPU issues', () => {
      const metrics = {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 0,
        cpuUsage: 95 // Above critical threshold
      };

      const issues = (monitor as any).detectPerformanceIssues(metrics);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'cpu',
        severity: 'critical',
        value: 95
      });
    });
  });

  describe('Real-time Analysis', () => {
    it('should add and remove real-time analyzers', () => {
      const analyzer = {
        name: 'test-analyzer',
        metric: 'test-metric',
        analyze: jest.fn(),
        config: {
          interval: 1000,
          windowSize: 5000,
          thresholds: { warning: 30 }
        }
      };

      monitor.addRealTimeAnalyzer(analyzer as any);
      expect((monitor as any).realTimeAnalyzers.has('test-analyzer')).toBe(true);

      monitor.removeRealTimeAnalyzer('test-analyzer');
      expect((monitor as any).realTimeAnalyzers.has('test-analyzer')).toBe(false);
    });

    it('should run real-time analysis on collected metrics', async () => {
      const analyzeMock = jest.fn();
      const analyzer = {
        name: 'test-analyzer',
        metric: 'test-metric',
        analyze: analyzeMock,
        config: {
          interval: 1000,
          windowSize: 5000,
          thresholds: { warning: 30 }
        }
      };

      monitor.addRealTimeAnalyzer(analyzer as any);

      // Add some test metrics
      const metric: PerformanceMetric = {
        timestamp: new Date().toISOString(),
        value: 25,
        category: 'test',
        subcategory: 'test'
      };
      (monitor as any).addMetric('test-metric', metric);

      // Run analysis
      await (monitor as any).runRealTimeAnalysis();

      expect(analyzeMock).toHaveBeenCalled();
    });
  });

  describe('ML Model Integration', () => {
    it('should add and remove ML models', () => {
      const model = {
        name: 'test-model',
        metric: 'test-metric',
        predict: jest.fn(),
        config: {
          features: ['feature1'],
          target: 'target',
          windowSize: 1000,
          confidenceThreshold: 0.8
        }
      };

      monitor.addMLModel(model as any);
      expect((monitor as any).mlModels.has('test-model')).toBe(true);

      monitor.removeMLModel('test-model');
      expect((monitor as any).mlModels.has('test-model')).toBe(false);
    });

    it('should update ML models with new metrics', async () => {
      const predictMock = jest.fn().mockResolvedValue(42);
      const model = {
        name: 'test-model',
        metric: 'test-metric',
        predict: predictMock,
        config: {
          features: ['feature1'],
          target: 'target',
          windowSize: 1000,
          confidenceThreshold: 0.8
        }
      };

      monitor.addMLModel(model as any);

      // Add some test metrics
      const metric: PerformanceMetric = {
        timestamp: new Date().toISOString(),
        value: 25,
        category: 'test',
        subcategory: 'test'
      };
      (monitor as any).addMetric('test-metric', metric);
      (monitor as any).addMetric('feature1', metric);

      // Update models
      await (monitor as any).updateMLModels();

      expect(predictMock).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during metric collection', async () => {
      const logErrorMock = jest.spyOn(monitor as any, 'logError');
      mockPerformance.getEntriesByType.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await (monitor as any).collectExistingMetrics(new Date().toISOString());

      expect(logErrorMock).toHaveBeenCalledWith(
        'existing_metrics_collection_failed',
        expect.any(Error)
      );
    });

    it('should handle errors during real-time analysis', async () => {
      const logErrorMock = jest.spyOn(monitor as any, 'logError');
      const analyzer = {
        name: 'error-analyzer',
        metric: 'test-metric',
        analyze: jest.fn().mockRejectedValue(new Error('Test error')),
        config: {
          interval: 1000,
          windowSize: 5000,
          thresholds: { warning: 30 }
        }
      };

      monitor.addRealTimeAnalyzer(analyzer as any);
      await (monitor as any).runRealTimeAnalysis();

      expect(logErrorMock).toHaveBeenCalledWith(
        'realtime_analysis_failed',
        expect.any(Error)
      );
    });
  });

  describe('Monitoring Control', () => {
    it('should start and stop monitoring', () => {
      const startSpy = jest.spyOn(global, 'setInterval');
      const stopSpy = jest.spyOn(global, 'clearInterval');

      monitor.startMonitoring();
      expect(startSpy).toHaveBeenCalled();

      monitor.stopMonitoring();
      expect(stopSpy).toHaveBeenCalled();
    });
  });
});

describe('Component Performance Tracking', () => {
  it('should track component render metrics', async () => {
    const componentId = 'test-component';
    const renderTime = 50;
    
    // Mock performance mark/measure
    const mockMeasure = {
      name: `render-${componentId}`,
      duration: renderTime,
      startTime: 1000,
      entryType: 'measure'
    };
    mockPerformance.getEntriesByType.mockReturnValueOnce([mockMeasure]);

    const metrics = await (monitor as any).getComponentRenderMetrics(componentId);
    expect(metrics).toMatchObject({
      renderTime,
      componentId,
      timestamp: expect.any(String)
    });
  });

  it('should track component memory usage', async () => {
    const componentId = 'test-component';
    const memoryUsage = 1024 * 1024; // 1MB
    
    // Mock memory measurement
    const mockMeasure = {
      name: `memory-${componentId}`,
      duration: memoryUsage,
      startTime: 1000,
      entryType: 'measure'
    };
    mockPerformance.getEntriesByType.mockReturnValueOnce([mockMeasure]);

    const metrics = await (monitor as any).getComponentMemoryMetrics(componentId);
    expect(metrics).toMatchObject({
      memoryUsage,
      componentId,
      timestamp: expect.any(String)
    });
  });
});

describe('Network Request Tracking', () => {
  it('should track network request metrics', async () => {
    const mockResourceTiming = {
      name: 'https://api.example.com/data',
      duration: 100,
      transferSize: 1024,
      initiatorType: 'xmlhttprequest',
      startTime: 1000,
      responseEnd: 1100,
      entryType: 'resource'
    };
    mockPerformance.getEntriesByType.mockReturnValueOnce([mockResourceTiming]);

    const metrics = await (monitor as any).aggregateNetworkMetrics([]);
    expect(metrics).toMatchObject({
      totalRequests: 1,
      totalBytes: 1024,
      averageLatency: 100
    });
  });

  it('should track failed requests', async () => {
    const mockFailedRequest = {
      name: 'https://api.example.com/error',
      duration: 5000, // Long duration indicating failure
      transferSize: 0,
      initiatorType: 'fetch',
      startTime: 1000,
      responseEnd: 6000,
      entryType: 'resource'
    };
    mockPerformance.getEntriesByType.mockReturnValueOnce([mockFailedRequest]);

    const metrics = await (monitor as any).aggregateNetworkMetrics([]);
    expect(metrics).toMatchObject({
      totalRequests: 1,
      failedRequests: 1,
      totalBytes: 0
    });
  });
});

describe('Memory Leak Detection', () => {
  it('should detect increasing memory usage', async () => {
    const timestamps = Array.from({ length: 5 }, (_, i) => 
      new Date(Date.now() + i * 1000).toISOString()
    );
    
    // Simulate increasing memory usage
    const memoryValues = [50, 60, 70, 85, 95].map(value => value * 1024 * 1024);
    
    for (let i = 0; i < timestamps.length; i++) {
      (performance as any).memory.usedJSHeapSize = memoryValues[i];
      await (monitor as any).collectSystemMetrics(timestamps[i]);
    }

    const metrics = (monitor as any).metrics.get('memory.heap');
    const trend = (monitor as any).analyzeMemoryTrend(metrics);
    
    expect(trend).toMatchObject({
      isLeak: true,
      growthRate: expect.any(Number),
      severity: 'warning'
    });
  });

  it('should handle stable memory usage', async () => {
    const timestamps = Array.from({ length: 5 }, (_, i) => 
      new Date(Date.now() + i * 1000).toISOString()
    );
    
    // Simulate stable memory usage
    const memoryValue = 50 * 1024 * 1024;
    
    for (let i = 0; i < timestamps.length; i++) {
      (performance as any).memory.usedJSHeapSize = memoryValue;
      await (monitor as any).collectSystemMetrics(timestamps[i]);
    }

    const metrics = (monitor as any).metrics.get('memory.heap');
    const trend = (monitor as any).analyzeMemoryTrend(metrics);
    
    expect(trend).toMatchObject({
      isLeak: false,
      growthRate: 0,
      severity: 'normal'
    });
  });
});

describe('Performance Optimization Scenarios', () => {
  it('should detect and report optimization opportunities', async () => {
    // Mock slow component render
    const mockSlowRender = {
      name: 'render-slow-component',
      duration: 1000, // 1 second render time
      startTime: 1000,
      entryType: 'measure'
    };
    mockPerformance.getEntriesByType.mockReturnValueOnce([mockSlowRender]);

    const opportunities = await (monitor as any).detectOptimizationOpportunities();
    expect(opportunities).toContainEqual(
      expect.objectContaining({
        type: 'slow-render',
        componentId: 'slow-component',
        severity: 'warning',
        recommendation: expect.any(String)
      })
    );
  });

  it('should track and report resource loading optimizations', async () => {
    const mockSlowResource = {
      name: 'https://example.com/large-image.jpg',
      duration: 5000,
      transferSize: 5 * 1024 * 1024, // 5MB
      initiatorType: 'img',
      startTime: 1000,
      responseEnd: 6000,
      entryType: 'resource'
    };
    mockPerformance.getEntriesByType.mockReturnValueOnce([mockSlowResource]);

    const opportunities = await (monitor as any).detectOptimizationOpportunities();
    expect(opportunities).toContainEqual(
      expect.objectContaining({
        type: 'large-resource',
        resourceUrl: 'https://example.com/large-image.jpg',
        severity: 'warning',
        recommendation: expect.any(String)
      })
    );
  });
});

describe('Recovery Mechanisms', () => {
  it('should implement automatic recovery for memory issues', async () => {
    // Simulate critical memory usage
    (performance as any).memory.usedJSHeapSize = 180 * 1024 * 1024; // 90% of heap limit
    const timestamp = new Date().toISOString();
    
    await (monitor as any).collectSystemMetrics(timestamp);
    const recovery = await (monitor as any).attemptRecovery('memory');
    
    expect(recovery).toMatchObject({
      success: true,
      action: 'memory-cleanup',
      metrics: expect.any(Object)
    });
  });

  it('should handle recovery from high CPU usage', async () => {
    // Simulate high CPU usage
    const mockHighCPU = {
      timestamp: new Date().toISOString(),
      value: 95,
      category: 'system',
      subcategory: 'cpu'
    };
    (monitor as any).addMetric('cpu.usage', mockHighCPU);
    
    const recovery = await (monitor as any).attemptRecovery('cpu');
    
    expect(recovery).toMatchObject({
      success: true,
      action: 'throttle-operations',
      metrics: expect.any(Object)
    });
  });

  it('should track recovery attempts and success rate', async () => {
    // Simulate multiple recovery attempts
    const issues = ['memory', 'cpu', 'network'];
    for (const issue of issues) {
      await (monitor as any).attemptRecovery(issue);
    }

    const recoveryStats = (monitor as any).getRecoveryStats();
    expect(recoveryStats).toMatchObject({
      totalAttempts: 3,
      successRate: expect.any(Number),
      lastRecovery: expect.any(Object)
    });
  });
}); 