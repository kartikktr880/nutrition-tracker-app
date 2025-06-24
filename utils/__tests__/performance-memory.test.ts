import { PerformanceMonitor } from '../performance';
import { 
  PerformanceMetric, 
  ComponentMetrics,
  MemoryMetrics,
  ResourceMetrics
} from '../performance-types';

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

describe('PerformanceMonitor Memory Management', () => {
  let monitor: PerformanceMonitor;
  const defaultConfig = {
    thresholds: {
      memory: {
        usage: { warning: 0.7, critical: 0.8 }, // percentage of heap limit
        growth: { warning: 0.1, critical: 0.2 }, // growth rate per minute
        leak: { warning: 0.05, critical: 0.1 } // leak rate per minute
      },
      resources: {
        count: { warning: 100, critical: 200 }, // resources per component
        size: { warning: 1024 * 1024, critical: 2 * 1024 * 1024 }, // bytes
        cleanup: { warning: 0.2, critical: 0.4 } // cleanup failure rate
      }
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

  describe('Memory Usage Monitoring', () => {
    const createMemorySnapshot = (component: string, usage: number, timestamp?: string) => ({
      component,
      timestamp: timestamp || new Date().toISOString(),
      memory: {
        used: usage * 1024 * 1024, // MB to bytes
        total: 100 * 1024 * 1024,
        limit: 200 * 1024 * 1024,
        growth: {
          rate: 0.05, // 5% per minute
          trend: 'increasing'
        },
        allocation: {
          objects: Math.floor(usage * 1000),
          arrays: Math.floor(usage * 500),
          strings: Math.floor(usage * 2000)
        }
      }
    });

    it('should track component memory usage', async () => {
      const component = 'MemoryComponent';
      const snapshot = createMemorySnapshot(component, 75);
      
      await (monitor as any).trackMemoryUsage(snapshot);

      const metrics = await (monitor as any).getMemoryMetrics(component);
      expect(metrics).toMatchObject({
        component,
        usage: 0.75,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'memory.usage',
            severity: 'warning',
            details: expect.stringContaining('high memory usage')
          })
        ])
      });
    });

    it('should detect memory growth', async () => {
      const component = 'GrowthComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate memory growth
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createMemorySnapshot(component, 60 + i * 5, timestamps[i]);
        await (monitor as any).trackMemoryUsage(snapshot);
      }

      const issues = await (monitor as any).checkMemoryGrowth(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'memory.growth',
          severity: 'warning',
          details: expect.stringContaining('memory growth detected')
        })
      );
    });

    it('should detect memory leaks', async () => {
      const component = 'LeakComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate memory leak
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createMemorySnapshot(component, 65 + i * 8, timestamps[i]);
        snapshot.memory.growth.rate = 0.15; // 15% per minute
        await (monitor as any).trackMemoryUsage(snapshot);
      }

      const issues = await (monitor as any).checkMemoryLeak(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'memory.leak',
          severity: 'critical',
          details: expect.stringContaining('memory leak detected')
        })
      );
    });

    it('should analyze memory patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate memory pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createMemorySnapshot(component, 60 + i * 4, timestamps[i]);
        await (monitor as any).trackMemoryUsage(snapshot);
      }

      const patterns = await (monitor as any).analyzeMemoryPatterns(component);
      expect(patterns).toMatchObject({
        component,
        usageTrend: expect.any(String),
        growthTrend: expect.any(String),
        allocationPattern: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Resource Management', () => {
    const createResourceSnapshot = (component: string, count: number, size: number) => ({
      component,
      timestamp: new Date().toISOString(),
      resources: {
        count,
        size,
        types: {
          images: Math.floor(count * 0.4),
          videos: Math.floor(count * 0.2),
          audio: Math.floor(count * 0.1),
          others: count - Math.floor(count * 0.7)
        },
        cleanup: {
          success: count * 0.9,
          failed: count * 0.1,
          pending: 0
        }
      }
    });

    it('should track resource usage', async () => {
      const component = 'ResourceComponent';
      const snapshot = createResourceSnapshot(component, 150, 1.5 * 1024 * 1024);
      
      await (monitor as any).trackResourceUsage(snapshot);

      const metrics = await (monitor as any).getResourceMetrics(component);
      expect(metrics).toMatchObject({
        component,
        resourceCount: 150,
        resourceSize: 1.5 * 1024 * 1024,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'resource.count',
            severity: 'warning',
            details: expect.stringContaining('high resource count')
          })
        ])
      });
    });

    it('should track resource cleanup', async () => {
      const component = 'CleanupComponent';
      const snapshot = createResourceSnapshot(component, 100, 1024 * 1024);
      
      await (monitor as any).trackResourceUsage(snapshot);
      await (monitor as any).trackResourceCleanup(component, {
        success: 90,
        failed: 10,
        pending: 0
      });

      const metrics = await (monitor as any).getResourceMetrics(component);
      expect(metrics).toMatchObject({
        component,
        cleanupCount: 1,
        cleanupSuccess: 0.9,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'resource.cleanup',
            severity: 'warning',
            details: expect.stringContaining('cleanup failures')
          })
        ])
      });
    });

    it('should detect excessive resource usage', async () => {
      const component = 'ExcessiveComponent';
      const snapshot = createResourceSnapshot(component, 250, 2.5 * 1024 * 1024);
      
      await (monitor as any).trackResourceUsage(snapshot);

      const issues = await (monitor as any).checkResourceUsage(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'resource.usage',
          severity: 'critical',
          details: expect.stringContaining('excessive resource usage')
        })
      );
    });

    it('should analyze resource patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate resource pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createResourceSnapshot(component, 80 + i * 20, (0.8 + i * 0.2) * 1024 * 1024);
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackResourceUsage(snapshot);
        await (monitor as any).trackResourceCleanup(component, {
          success: 90 - i * 5,
          failed: 10 + i * 5,
          pending: 0
        });
      }

      const patterns = await (monitor as any).analyzeResourcePatterns(component);
      expect(patterns).toMatchObject({
        component,
        usageTrend: expect.any(String),
        cleanupTrend: expect.any(String),
        typeDistribution: expect.any(Object),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Memory-Resource Integration', () => {
    it('should correlate memory usage with resources', async () => {
      const component = 'IntegratedComponent';
      const memorySnapshot = createMemorySnapshot(component, 75);
      const resourceSnapshot = createResourceSnapshot(component, 150, 1.5 * 1024 * 1024);
      
      await (monitor as any).trackMemoryUsage(memorySnapshot);
      await (monitor as any).trackResourceUsage(resourceSnapshot);

      const correlation = await (monitor as any).analyzeMemoryResourceCorrelation(component);
      expect(correlation).toMatchObject({
        component,
        memoryImpact: expect.any(Number),
        resourceImpact: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });

    it('should detect memory-resource patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate correlated memory and resource patterns
      for (let i = 0; i < timestamps.length; i++) {
        const memorySnapshot = createMemorySnapshot(component, 60 + i * 4, timestamps[i]);
        const resourceSnapshot = createResourceSnapshot(component, 80 + i * 20, (0.8 + i * 0.2) * 1024 * 1024);
        
        await (monitor as any).trackMemoryUsage(memorySnapshot);
        await (monitor as any).trackResourceUsage(resourceSnapshot);
        await (monitor as any).trackResourceCleanup(component, {
          success: 90 - i * 5,
          failed: 10 + i * 5,
          pending: 0
        });
      }

      const patterns = await (monitor as any).analyzeMemoryResourcePatterns(component);
      expect(patterns).toMatchObject({
        component,
        patternType: expect.any(String),
        confidence: expect.any(Number),
        impact: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });
  });
}); 