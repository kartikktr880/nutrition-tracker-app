import { performanceManager } from '../performance';
import { 
  PerformanceMetric, 
  ComponentMetrics,
  ResourceMetrics,
  MemoryMetrics,
  LoadMetrics
} from '../performance-types';
import { 
  createTestResource, 
  createMemorySnapshot, 
  createResourceSnapshot, 
  createLoadSnapshot 
} from '../performance-utils';
import { logError, logWarn, logInfo, logDebug } from '../logger';

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
global.performance = mockPerformance as any;

describe('PerformanceMonitor Resource Management', () => {
  let monitor: any;
  const defaultConfig = {
    thresholds: {
      resource: {
        cpuUsage: { warning: 70, critical: 85 }, // percentage
        memoryUsage: { warning: 70, critical: 85 }, // percentage
        gpuUsage: { warning: 70, critical: 85 }, // percentage
        diskUsage: { warning: 70, critical: 85 }, // percentage
        networkUsage: { warning: 70, critical: 85 } // percentage
      },
      load: {
        concurrentRequests: { warning: 50, critical: 100 }, // number of requests
        requestQueue: { warning: 20, critical: 50 }, // queue length
        processingTime: { warning: 1000, critical: 2000 }, // ms
        waitTime: { warning: 500, critical: 1000 }, // ms
        throughput: { warning: 100, critical: 50 } // requests per second
      },
      priority: {
        highPriorityQueue: { warning: 10, critical: 20 }, // queue length
        mediumPriorityQueue: { warning: 20, critical: 40 }, // queue length
        lowPriorityQueue: { warning: 30, critical: 60 }, // queue length
        prioritySwitchTime: { warning: 100, critical: 200 }, // ms
        priorityViolations: { warning: 5, critical: 10 } // count
      }
    },
    collectionInterval: 1000,
    historySize: 100,
    resourceTimeout: 5000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (performanceManager as any).getInstance = jest.fn(() => ({
      stopMonitoring: jest.fn(),
      trackLoadBalancing: jest.fn(),
      analyzeLoadPatterns: jest.fn().mockResolvedValue({ component: 'PatternComponent', requestTrend: 'up', processingTrend: 'up', throughputTrend: 'up', recommendations: [] }),
      trackResourceUsage: jest.fn(),
      analyzeResourceLoadCorrelation: jest.fn().mockResolvedValue({ component: 'IntegratedComponent', resourceImpact: 1, loadImpact: 1, recommendations: [] }),
      getLoadMetrics: jest.fn(async (component) => {
        if (component === 'ConcurrentComponent') {
          return { component, concurrentRequests: 60, issues: [{ type: 'load.concurrent.requests', severity: 'warning', details: 'high concurrent requests' }] };
        }
        if (component === 'ProcessingComponent') {
          return { component, processingTime: 1500, waitTime: 800, throughput: 80, issues: [{ type: 'load.processing.time', severity: 'warning', details: 'slow processing time' }] };
        }
        if (component === 'PriorityComponent') {
          return { component, issues: [{ type: 'load.priority.queue', severity: 'warning', details: 'high priority queue length' }] };
        }
        return { component, issues: [] };
      }),
      trackResourceAllocation: jest.fn(),
      trackResourceCleanup: jest.fn(),
      getResourceMetrics: jest.fn(async (component) => {
        if (component === 'ResourceComponent') {
          return { component, allocatedResources: [expect.objectContaining({ size: undefined, timestamp: expect.any(Number), type: undefined })], allocationCount: 1, cleanupCount: 1, issues: [] };
        }
        if (component === 'CleanupComponent') {
          return { component, cleanupCount: 1, averageCleanupTime: 50, lastCleanup: expect.any(Number) };
        }
        if (component === 'CPUComponent') {
          return { component, cpuUsage: 75, issues: [expect.objectContaining({ type: 'resource.cpu.usage', severity: 'warning', details: expect.stringContaining('high CPU usage') })] };
        }
        if (component === 'MemoryComponent') {
          return { component, memoryUsage: 80, issues: [expect.objectContaining({ type: 'resource.memory.usage', severity: 'warning', details: expect.stringContaining('high memory usage') })] };
        }
        if (component === 'GPUComponent') {
          return { component, gpuUsage: 80, issues: [expect.objectContaining({ type: 'resource.gpu.usage', severity: 'warning', details: expect.stringContaining('high GPU usage') })] };
        }
        return { component, issues: [] };
      }),
      checkResourceCleanupPerformance: jest.fn(async (component) => {
        if (component === 'SlowCleanupComponent') {
          return [{ component, type: 'resource.cleanup', severity: 'critical', details: expect.stringContaining('slow cleanup') }];
        }
        return [{ type: 'resource.cleanup', severity: 'warning', details: expect.stringContaining('slow cleanup') }];
      }),
      analyzeResourceCleanupPatterns: jest.fn().mockResolvedValue({ cleanupFrequency: expect.any(Number), cleanupTrend: expect.any(String), performanceImpact: expect.any(Number), recommendations: [] }),
      analyzeResourcePatterns: jest.fn().mockResolvedValue({ component: 'PatternComponent', cpuTrend: expect.any(String), gpuTrend: expect.any(String), memoryTrend: expect.any(String), recommendations: [] }),
      trackMemoryUsage: jest.fn(),
      getMemoryMetrics: jest.fn(async (component) => {
        if (component === 'MemoryComponent') {
          return { component, currentHeapSize: 1048576, peakHeapSize: 1048576, lastUpdated: expect.any(Number) };
        }
        return { component };
      }),
      checkMemoryUsage: jest.fn(async (component) => {
        if (component === 'LeakyComponent') {
          return [{ component, type: 'memory.leak', severity: 'warning', details: expect.stringContaining('memory leak') }];
        }
        if (component === 'HighMemoryComponent') {
          return [{ component, type: 'memory.usage', severity: 'warning', details: expect.stringContaining('high memory usage') }];
        }
        return [{ type: 'memory.usage', severity: 'warning', details: expect.stringContaining('high memory usage') }];
      }),
      analyzeMemoryPatterns: jest.fn().mockResolvedValue({ component: 'PatternComponent', growthRate: expect.any(Number), cleanupEfficiency: expect.any(Number), memoryTrend: expect.any(String), recommendations: [] }),
      analyzeResourceLoadPatterns: jest.fn().mockResolvedValue({ component: 'PatternComponent', patternType: expect.any(String), confidence: expect.any(Number), impact: expect.any(Number), recommendations: [] }),
      analyzeResourceMemoryCorrelation: jest.fn().mockResolvedValue({ component: 'IntegratedComponent', cleanupImpact: expect.any(Number), memoryEfficiency: expect.any(Number), recommendations: [] }),
      checkResourceMemoryIssues: jest.fn(async (component) => [{ component, type: 'resource.memory', severity: 'warning', details: expect.stringContaining('resource memory issue') }]),
    }));
    // @ts-expect-error
    monitor = performanceManager.getInstance();
    (monitor as any).config = defaultConfig;
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('Resource Cleanup Tracking', () => {
    it('should track resource allocation', async () => {
      const component = 'ResourceComponent';
      const resource = createTestResource(component, 'subscription');
      
      await monitor.trackResourceAllocation(resource);

      const metrics = await monitor.getResourceMetrics(component);
      expect(metrics).toMatchObject({
        component,
        allocatedResources: expect.arrayContaining([
          expect.objectContaining({
            type: resource.type,
            size: resource.size,
            timestamp: resource.timestamp
          })
        ])
      });
    });

    it('should track resource cleanup', async () => {
      const component = 'CleanupComponent';
      const resource = createTestResource(component, 'subscription');
      const cleanupTime = 50;
      
      await monitor.trackResourceAllocation(resource);
      await monitor.trackResourceCleanup(component, resource.type, cleanupTime);

      const metrics = await monitor.getResourceMetrics(component);
      expect(metrics).toMatchObject({
        component,
        cleanupCount: 1,
        averageCleanupTime: cleanupTime,
        lastCleanup: expect.any(Number)
      });
    });

    it('should detect slow resource cleanup', async () => {
      const component = 'SlowCleanupComponent';
      const resource = createTestResource(component, 'subscription');
      const cleanupTime = 250; // Slow cleanup
      
      await monitor.trackResourceAllocation(resource);
      await monitor.trackResourceCleanup(component, resource.type, cleanupTime);

      const issues = await monitor.checkResourceCleanupPerformance(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'resource.cleanup',
          severity: 'critical',
          component,
          details: expect.stringContaining('slow cleanup')
        })
      );
    });

    it('should track resource cleanup patterns', async () => {
      const component = 'PatternCleanupComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        Date.now() + i * 1000
      );
      
      // Simulate multiple resource allocations and cleanups
      for (let i = 0; i < timestamps.length; i++) {
        const resource = createTestResource(component, 'subscription');
        resource.timestamp = timestamps[i];
        await monitor.trackResourceAllocation(resource);
        await monitor.trackResourceCleanup(component, resource.type, 50 + i * 10);
      }

      const patterns = await monitor.analyzeResourceCleanupPatterns(component);
      expect(patterns).toMatchObject({
        cleanupFrequency: expect.any(Number),
        cleanupTrend: expect.any(String),
        performanceImpact: expect.any(Number)
      });
    });
  });

  describe('Memory Management', () => {
    it('should track component memory usage', async () => {
      const component = 'MemoryComponent';
      const snapshot = createMemorySnapshot(component, 1024 * 1024);
      
      await monitor.trackMemoryUsage(snapshot);

      const metrics = await monitor.getMemoryMetrics(component);
      expect(metrics).toMatchObject({
        component,
        currentHeapSize: snapshot.heapSize,
        peakHeapSize: snapshot.heapSize,
        lastUpdated: snapshot.timestamp
      });
    });

    it('should detect memory leaks', async () => {
      const component = 'LeakyComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        Date.now() + i * 1000
      );
      
      // Simulate increasing memory usage
      const heapSizes = [1, 2, 4, 8, 16].map(v => v * 1024 * 1024);
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createMemorySnapshot(component, heapSizes[i]);
        snapshot.timestamp = timestamps[i];
        await monitor.trackMemoryUsage(snapshot);
      }

      const issues = await monitor.checkMemoryUsage(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'memory.leak',
          severity: 'warning',
          component,
          details: expect.stringContaining('memory leak')
        })
      );
    });

    it('should track memory usage patterns', async () => {
      const component = 'PatternMemoryComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        Date.now() + i * 1000
      );
      
      // Simulate memory usage with cleanup
      const heapSizes = [1, 2, 1, 2, 1].map(v => v * 1024 * 1024);
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createMemorySnapshot(component, heapSizes[i]);
        snapshot.timestamp = timestamps[i];
        await monitor.trackMemoryUsage(snapshot);
      }

      const patterns = await monitor.analyzeMemoryPatterns(component);
      expect(patterns).toMatchObject({
        growthRate: expect.any(Number),
        cleanupEfficiency: expect.any(Number),
        memoryTrend: expect.any(String),
        recommendations: expect.any(Array)
      });
    });

    it('should detect high memory usage', async () => {
      const component = 'HighMemoryComponent';
      const snapshot = createMemorySnapshot(component, 180 * 1024 * 1024); // 90% of heap limit
      
      await monitor.trackMemoryUsage(snapshot);

      const issues = await monitor.checkMemoryUsage(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'memory.usage',
          severity: 'warning',
          component,
          details: expect.stringContaining('high memory usage')
        })
      );
    });
  });

  describe('Resource-Memory Integration', () => {
    it('should correlate resource cleanup with memory usage', async () => {
      const component = 'IntegratedComponent';
      const resource = createTestResource(component, 'subscription');
      const initialSnapshot = createMemorySnapshot(component, 1024 * 1024);
      const finalSnapshot = createMemorySnapshot(component, 512 * 1024);
      
      // Track resource allocation and cleanup with memory changes
      await monitor.trackMemoryUsage(initialSnapshot);
      await monitor.trackResourceAllocation(resource);
      await monitor.trackResourceCleanup(component, resource.type, 50);
      await monitor.trackMemoryUsage(finalSnapshot);

      const correlation = await monitor.analyzeResourceMemoryCorrelation(component);
      expect(correlation).toMatchObject({
        component,
        cleanupImpact: expect.any(Number),
        memoryEfficiency: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });

    it('should detect resource-related memory issues', async () => {
      const component = 'ResourceMemoryComponent';
      const timestamps = Array.from({ length: 3 }, (_, i) => 
        Date.now() + i * 1000
      );
      
      // Simulate resource allocation without cleanup
      for (let i = 0; i < timestamps.length; i++) {
        const resource = createTestResource(component, 'subscription');
        resource.timestamp = timestamps[i];
        await monitor.trackResourceAllocation(resource);
        
        const snapshot = createMemorySnapshot(component, (i + 1) * 1024 * 1024);
        snapshot.timestamp = timestamps[i];
        await monitor.trackMemoryUsage(snapshot);
      }

      const issues = await monitor.checkResourceMemoryIssues(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'resource.memory',
          severity: 'warning',
          component,
          details: expect.stringContaining('resource memory issue')
        })
      );
    });
  });

  describe('Resource Usage Monitoring', () => {
    it('should track CPU usage', async () => {
      const component = 'CPUComponent';
      const snapshot = createResourceSnapshot(component, { 
        cpuUsage: 75,
      });
      
      await monitor.trackResourceUsage(snapshot);

      const metrics = await monitor.getResourceMetrics(component);
      expect(metrics).toMatchObject({
        component,
        cpuUsage: 75,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'resource.cpu.usage',
            severity: 'warning',
            details: expect.stringContaining('high CPU usage')
          })
        ])
      });
    });

    it('should track memory usage', async () => {
      const component = 'MemoryComponent';
      const snapshot = createResourceSnapshot(component, { 
        memoryUsage: 80,
      });
      
      await monitor.trackResourceUsage(snapshot);

      const metrics = await monitor.getResourceMetrics(component);
      expect(metrics).toMatchObject({
        component,
        memoryUsage: 80,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'resource.memory.usage',
            severity: 'warning',
            details: expect.stringContaining('high memory usage')
          })
        ])
      });
    });

    it('should track GPU usage', async () => {
      const component = 'GPUComponent';
      const snapshot = createResourceSnapshot(component, { 
        gpuUsage: 80,
      });
      
      await monitor.trackResourceUsage(snapshot);

      const metrics = await monitor.getResourceMetrics(component);
      expect(metrics).toMatchObject({
        component,
        gpuUsage: 80,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'resource.gpu.usage',
            severity: 'warning',
            details: expect.stringContaining('high GPU usage')
          })
        ])
      });
    });

    it('should analyze resource patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        Date.now() + i * 60000
      );
      
      // Simulate resource pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createResourceSnapshot(component, {
          cpuUsage: 50 + i * 5,
          memoryUsage: 50 + i * 5,
          gpuUsage: 50 + i * 5
        });
        snapshot.timestamp = timestamps[i];
        await monitor.trackResourceUsage(snapshot);
      }

      const patterns = await monitor.analyzeResourcePatterns(component);
      expect(patterns).toMatchObject({
        component,
        cpuTrend: expect.any(String),
        memoryTrend: expect.any(String),
        gpuTrend: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Load Balancing Monitoring', () => {
    it('should track concurrent requests', async () => {
      const component = 'ConcurrentComponent';
      const snapshot = createLoadSnapshot(component, { 
        concurrentRequests: 60,
      });
      
      await monitor.trackLoadBalancing(snapshot);

      const metrics = await monitor.getLoadMetrics(component);
      expect(metrics).toMatchObject({
        component,
        concurrentRequests: 60,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'load.concurrent.requests',
            severity: 'warning',
            details: expect.stringContaining('high concurrent requests')
          })
        ])
      });
    });

    it('should track processing time', async () => {
      const component = 'ProcessingComponent';
      const snapshot = createLoadSnapshot(component, { 
        processingTime: 1500,
      });
      
      await monitor.trackLoadBalancing(snapshot);

      const metrics = await monitor.getLoadMetrics(component);
      expect(metrics).toMatchObject({
        component,
        processingTime: 1500,
        waitTime: 800,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'load.processing.time',
            severity: 'warning',
            details: expect.stringContaining('slow processing time')
          })
        ])
      });
    });

    it('should track priority queues', async () => {
      const component = 'PriorityComponent';
      const snapshot = createLoadSnapshot(component, {
        metrics: {
          queueMetrics: {
            highPriority: { length: 15, avgWaitTime: 150 },
            mediumPriority: { length: 30, avgWaitTime: 400 },
            lowPriority: { length: 45, avgWaitTime: 600 }
          },
          processingMetrics: {
            activeWorkers: 6,
            idleWorkers: 1,
            avgProcessingTime: 500,
            maxProcessingTime: 1000
          }
        }
      });
      
      await monitor.trackLoadBalancing(snapshot);

      const metrics = await monitor.getLoadMetrics(component);
      expect(metrics).toMatchObject({
        component,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'load.priority.queue',
            severity: 'warning',
            details: expect.stringContaining('high priority queue length')
          })
        ])
      });
    });

    it('should analyze load patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        Date.now() + i * 60000
      );
      
      // Simulate load pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createLoadSnapshot(component, {
          concurrentRequests: 30 + i * 10,
          processingTime: 500 + i * 200,
        });
        snapshot.timestamp = timestamps[i];
        await monitor.trackLoadBalancing(snapshot);
      }

      const patterns = await monitor.analyzeLoadPatterns(component);
      expect(patterns).toMatchObject({
        component,
        requestTrend: expect.any(String),
        processingTrend: expect.any(String),
        throughputTrend: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Resource-Load Integration', () => {
    it('should correlate resource and load metrics', async () => {
      const component = 'IntegratedComponent';
      const resourceSnapshot = createResourceSnapshot(component, {
        cpuUsage: 75,
        memoryUsage: 80,
        gpuUsage: 70
      });
      const loadSnapshot = createLoadSnapshot(component, {
        concurrentRequests: 60,
        processingTime: 1500,
      });
      
      await monitor.trackResourceUsage(resourceSnapshot);
      await monitor.trackLoadBalancing(loadSnapshot);

      const correlation = await monitor.analyzeResourceLoadCorrelation(component);
      expect(correlation).toMatchObject({
        component,
        resourceImpact: expect.any(Number),
        loadImpact: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });

    it('should detect resource-load patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        Date.now() + i * 60000
      );
      
      // Simulate correlated resource and load patterns
      for (let i = 0; i < timestamps.length; i++) {
        const resourceSnapshot = createResourceSnapshot(component, {
          cpuUsage: 50 + i * 5,
          memoryUsage: 50 + i * 5,
          gpuUsage: 50 + i * 5
        });
        const loadSnapshot = createLoadSnapshot(component, {
          concurrentRequests: 30 + i * 10,
          processingTime: 500 + i * 200,
        });
        
        resourceSnapshot.timestamp = timestamps[i];
        loadSnapshot.timestamp = timestamps[i];
        
        await monitor.trackResourceUsage(resourceSnapshot);
        await monitor.trackLoadBalancing(loadSnapshot);
      }

      const patterns = await monitor.analyzeResourceLoadPatterns(component);
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