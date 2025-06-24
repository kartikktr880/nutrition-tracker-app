import { PerformanceMonitor } from '../performance';
import { 
  PerformanceMetric, 
  ComponentMetrics,
  ResourceMetrics,
  MemoryMetrics,
  LoadMetrics
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

describe('PerformanceMonitor Resource Management', () => {
  let monitor: PerformanceMonitor;
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
    monitor = PerformanceMonitor.getInstance();
    (monitor as any).config = defaultConfig;
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('Resource Cleanup Tracking', () => {
    const createTestResource = (component: string, type: string) => ({
      component,
      type,
      size: 1024,
      timestamp: new Date().toISOString(),
      cleanupTime: 0
    });

    it('should track resource allocation', async () => {
      const component = 'ResourceComponent';
      const resource = createTestResource(component, 'subscription');
      
      await (monitor as any).trackResourceAllocation(resource);

      const metrics = await (monitor as any).getResourceMetrics(component);
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
      
      await (monitor as any).trackResourceAllocation(resource);
      await (monitor as any).trackResourceCleanup(component, resource.type, cleanupTime);

      const metrics = await (monitor as any).getResourceMetrics(component);
      expect(metrics).toMatchObject({
        component,
        cleanupCount: 1,
        averageCleanupTime: cleanupTime,
        lastCleanup: expect.any(String)
      });
    });

    it('should detect slow resource cleanup', async () => {
      const component = 'SlowCleanupComponent';
      const resource = createTestResource(component, 'subscription');
      const cleanupTime = 250; // Slow cleanup
      
      await (monitor as any).trackResourceAllocation(resource);
      await (monitor as any).trackResourceCleanup(component, resource.type, cleanupTime);

      const issues = await (monitor as any).checkResourceCleanupPerformance(component);
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
        new Date(Date.now() + i * 1000).toISOString()
      );
      
      // Simulate multiple resource allocations and cleanups
      for (let i = 0; i < timestamps.length; i++) {
        const resource = createTestResource(component, 'subscription');
        resource.timestamp = timestamps[i];
        await (monitor as any).trackResourceAllocation(resource);
        await (monitor as any).trackResourceCleanup(component, resource.type, 50 + i * 10);
      }

      const patterns = await (monitor as any).analyzeResourceCleanupPatterns(component);
      expect(patterns).toMatchObject({
        cleanupFrequency: expect.any(Number),
        cleanupTrend: expect.any(String),
        performanceImpact: expect.any(Number)
      });
    });
  });

  describe('Memory Management', () => {
    const createMemorySnapshot = (component: string, heapSize: number) => ({
      component,
      heapSize,
      timestamp: new Date().toISOString(),
      externalSize: 0,
      domSize: 0
    });

    it('should track component memory usage', async () => {
      const component = 'MemoryComponent';
      const snapshot = createMemorySnapshot(component, 1024 * 1024);
      
      await (monitor as any).trackMemoryUsage(snapshot);

      const metrics = await (monitor as any).getMemoryMetrics(component);
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
        new Date(Date.now() + i * 1000).toISOString()
      );
      
      // Simulate increasing memory usage
      const heapSizes = [1, 2, 4, 8, 16].map(v => v * 1024 * 1024);
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createMemorySnapshot(component, heapSizes[i]);
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackMemoryUsage(snapshot);
      }

      const issues = await (monitor as any).checkMemoryUsage(component);
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
        new Date(Date.now() + i * 1000).toISOString()
      );
      
      // Simulate memory usage with cleanup
      const heapSizes = [1, 2, 1, 2, 1].map(v => v * 1024 * 1024);
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createMemorySnapshot(component, heapSizes[i]);
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackMemoryUsage(snapshot);
      }

      const patterns = await (monitor as any).analyzeMemoryPatterns(component);
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
      
      await (monitor as any).trackMemoryUsage(snapshot);

      const issues = await (monitor as any).checkMemoryUsage(component);
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
      await (monitor as any).trackMemoryUsage(initialSnapshot);
      await (monitor as any).trackResourceAllocation(resource);
      await (monitor as any).trackResourceCleanup(component, resource.type, 50);
      await (monitor as any).trackMemoryUsage(finalSnapshot);

      const correlation = await (monitor as any).analyzeResourceMemoryCorrelation(component);
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
        new Date(Date.now() + i * 1000).toISOString()
      );
      
      // Simulate resource allocation without cleanup
      for (let i = 0; i < timestamps.length; i++) {
        const resource = createTestResource(component, 'subscription');
        resource.timestamp = timestamps[i];
        await (monitor as any).trackResourceAllocation(resource);
        
        const snapshot = createMemorySnapshot(component, (i + 1) * 1024 * 1024);
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackMemoryUsage(snapshot);
      }

      const issues = await (monitor as any).checkResourceMemoryIssues(component);
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
    const createResourceSnapshot = (component: string, metrics: Partial<ResourceMetrics>) => ({
      component,
      timestamp: new Date().toISOString(),
      resource: {
        cpuUsage: metrics.cpuUsage || 50,
        memoryUsage: metrics.memoryUsage || 50,
        gpuUsage: metrics.gpuUsage || 50,
        diskUsage: metrics.diskUsage || 50,
        networkUsage: metrics.networkUsage || 50,
        metrics: {
          cpuDetails: metrics.cpuDetails || {
            userTime: 40,
            systemTime: 10,
            idleTime: 50,
            loadAverage: [1.5, 1.2, 1.0]
          },
          memoryDetails: metrics.memoryDetails || {
            heapUsed: 40 * 1024 * 1024,
            heapTotal: 80 * 1024 * 1024,
            external: 10 * 1024 * 1024,
            arrayBuffers: 5 * 1024 * 1024
          },
          gpuDetails: metrics.gpuDetails || {
            renderTime: 8,
            compositeTime: 4,
            drawCalls: 100,
            triangles: 10000
          }
        }
      }
    });

    it('should track CPU usage', async () => {
      const component = 'CPUComponent';
      const snapshot = createResourceSnapshot(component, { 
        cpuUsage: 75,
        cpuDetails: {
          userTime: 60,
          systemTime: 15,
          idleTime: 25,
          loadAverage: [2.0, 1.8, 1.5]
        }
      });
      
      await (monitor as any).trackResourceUsage(snapshot);

      const metrics = await (monitor as any).getResourceMetrics(component);
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
        memoryDetails: {
          heapUsed: 70 * 1024 * 1024,
          heapTotal: 80 * 1024 * 1024,
          external: 15 * 1024 * 1024,
          arrayBuffers: 8 * 1024 * 1024
        }
      });
      
      await (monitor as any).trackResourceUsage(snapshot);

      const metrics = await (monitor as any).getResourceMetrics(component);
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
        gpuDetails: {
          renderTime: 12,
          compositeTime: 8,
          drawCalls: 200,
          triangles: 20000
        }
      });
      
      await (monitor as any).trackResourceUsage(snapshot);

      const metrics = await (monitor as any).getResourceMetrics(component);
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
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate resource pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createResourceSnapshot(component, {
          cpuUsage: 50 + i * 5,
          memoryUsage: 50 + i * 5,
          gpuUsage: 50 + i * 5
        });
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackResourceUsage(snapshot);
      }

      const patterns = await (monitor as any).analyzeResourcePatterns(component);
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
    const createLoadSnapshot = (component: string, metrics: Partial<LoadMetrics>) => ({
      component,
      timestamp: new Date().toISOString(),
      load: {
        concurrentRequests: metrics.concurrentRequests || 30,
        requestQueue: metrics.requestQueue || 10,
        processingTime: metrics.processingTime || 500,
        waitTime: metrics.waitTime || 200,
        throughput: metrics.throughput || 150,
        metrics: {
          queueMetrics: metrics.queueMetrics || {
            highPriority: { length: 5, avgWaitTime: 100 },
            mediumPriority: { length: 10, avgWaitTime: 300 },
            lowPriority: { length: 15, avgWaitTime: 500 }
          },
          processingMetrics: metrics.processingMetrics || {
            activeWorkers: 4,
            idleWorkers: 2,
            avgProcessingTime: 400,
            maxProcessingTime: 800
          }
        }
      }
    });

    it('should track concurrent requests', async () => {
      const component = 'ConcurrentComponent';
      const snapshot = createLoadSnapshot(component, { 
        concurrentRequests: 60,
        requestQueue: 25
      });
      
      await (monitor as any).trackLoadBalancing(snapshot);

      const metrics = await (monitor as any).getLoadMetrics(component);
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
        waitTime: 800,
        throughput: 80
      });
      
      await (monitor as any).trackLoadBalancing(snapshot);

      const metrics = await (monitor as any).getLoadMetrics(component);
      expect(metrics).toMatchObject({
        component,
        processingTime: 1500,
        waitTime: 800,
        throughput: 80,
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
      
      await (monitor as any).trackLoadBalancing(snapshot);

      const metrics = await (monitor as any).getLoadMetrics(component);
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
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate load pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createLoadSnapshot(component, {
          concurrentRequests: 30 + i * 10,
          processingTime: 500 + i * 200,
          throughput: 150 - i * 20
        });
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackLoadBalancing(snapshot);
      }

      const patterns = await (monitor as any).analyzeLoadPatterns(component);
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
        throughput: 80
      });
      
      await (monitor as any).trackResourceUsage(resourceSnapshot);
      await (monitor as any).trackLoadBalancing(loadSnapshot);

      const correlation = await (monitor as any).analyzeResourceLoadCorrelation(component);
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
        new Date(Date.now() + i * 60000).toISOString()
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
          throughput: 150 - i * 20
        });
        
        resourceSnapshot.timestamp = timestamps[i];
        loadSnapshot.timestamp = timestamps[i];
        
        await (monitor as any).trackResourceUsage(resourceSnapshot);
        await (monitor as any).trackLoadBalancing(loadSnapshot);
      }

      const patterns = await (monitor as any).analyzeResourceLoadPatterns(component);
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