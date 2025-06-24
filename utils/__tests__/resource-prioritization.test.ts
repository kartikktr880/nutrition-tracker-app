import { PerformanceMonitor } from '../performance';
import { 
  ResourcePriority,
  PriorityMetrics,
  LoadBalanceMetrics,
  ResourceAllocation
} from '../performance-types';

describe('Resource Prioritization and Load Balancing', () => {
  let monitor: PerformanceMonitor;
  const defaultConfig = {
    thresholds: {
      priority: {
        highPriorityQueue: { warning: 10, critical: 20 },
        mediumPriorityQueue: { warning: 20, critical: 40 },
        lowPriorityQueue: { warning: 30, critical: 60 },
        prioritySwitchTime: { warning: 100, critical: 200 },
        priorityViolations: { warning: 5, critical: 10 }
      },
      load: {
        concurrentRequests: { warning: 50, critical: 100 },
        requestQueue: { warning: 20, critical: 50 },
        processingTime: { warning: 1000, critical: 2000 },
        waitTime: { warning: 500, critical: 1000 },
        throughput: { warning: 100, critical: 50 }
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

  describe('Resource Priority Management', () => {
    const createPriorityRequest = (
      component: string,
      priority: ResourcePriority,
      resourceType: string,
      size: number
    ) => ({
      component,
      priority,
      resourceType,
      size,
      timestamp: new Date().toISOString(),
      estimatedDuration: 100,
      dependencies: []
    });

    it('should properly prioritize high-priority resources', async () => {
      const component = 'PriorityComponent';
      const requests = [
        createPriorityRequest(component, 'high', 'cpu', 1024),
        createPriorityRequest(component, 'medium', 'memory', 2048),
        createPriorityRequest(component, 'low', 'network', 4096)
      ];

      for (const request of requests) {
        await (monitor as any).trackResourceRequest(request);
      }

      const metrics = await (monitor as any).getPriorityMetrics(component);
      expect(metrics).toMatchObject({
        component,
        highPriorityQueue: expect.arrayContaining([
          expect.objectContaining({
            priority: 'high',
            resourceType: 'cpu',
            size: 1024
          })
        ]),
        processingOrder: ['high', 'medium', 'low']
      });
    });

    it('should detect priority violations', async () => {
      const component = 'ViolationComponent';
      const requests = Array.from({ length: 15 }, (_, i) => 
        createPriorityRequest(component, 'high', 'cpu', 1024 * (i + 1))
      );

      for (const request of requests) {
        await (monitor as any).trackResourceRequest(request);
      }

      const issues = await (monitor as any).checkPriorityViolations(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'priority.violation',
          severity: 'warning',
          component,
          details: expect.stringContaining('high priority queue length')
        })
      );
    });

    it('should handle priority switching', async () => {
      const component = 'SwitchComponent';
      const request = createPriorityRequest(component, 'medium', 'cpu', 1024);
      
      await (monitor as any).trackResourceRequest(request);
      await (monitor as any).updateResourcePriority(component, request.resourceType, 'high');

      const metrics = await (monitor as any).getPriorityMetrics(component);
      expect(metrics).toMatchObject({
        component,
        highPriorityQueue: expect.arrayContaining([
          expect.objectContaining({
            priority: 'high',
            resourceType: 'cpu',
            size: 1024
          })
        ])
      });
    });
  });

  describe('Load Balancing', () => {
    const createLoadSnapshot = (component: string, metrics: Partial<LoadBalanceMetrics>) => ({
      component,
      timestamp: new Date().toISOString(),
      load: {
        activeRequests: metrics.activeRequests || 30,
        queueLength: metrics.queueLength || 10,
        processingTime: metrics.processingTime || 500,
        waitTime: metrics.waitTime || 200,
        throughput: metrics.throughput || 150,
        metrics: {
          queueDistribution: metrics.queueDistribution || {
            high: { length: 5, avgWaitTime: 100 },
            medium: { length: 10, avgWaitTime: 300 },
            low: { length: 15, avgWaitTime: 500 }
          },
          resourceUtilization: metrics.resourceUtilization || {
            cpu: 60,
            memory: 70,
            network: 50
          }
        }
      }
    });

    it('should balance load across resources', async () => {
      const component = 'BalanceComponent';
      const snapshot = createLoadSnapshot(component, {
        activeRequests: 60,
        queueLength: 25,
        resourceUtilization: {
          cpu: 75,
          memory: 80,
          network: 65
        }
      });

      await (monitor as any).trackLoadBalance(snapshot);

      const metrics = await (monitor as any).getLoadBalanceMetrics(component);
      expect(metrics).toMatchObject({
        component,
        loadDistribution: expect.objectContaining({
          cpu: expect.any(Number),
          memory: expect.any(Number),
          network: expect.any(Number)
        }),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            type: 'load.balance',
            action: expect.any(String)
          })
        ])
      });
    });

    it('should detect load imbalance', async () => {
      const component = 'ImbalanceComponent';
      const snapshot = createLoadSnapshot(component, {
        resourceUtilization: {
          cpu: 90,
          memory: 40,
          network: 30
        }
      });

      await (monitor as any).trackLoadBalance(snapshot);

      const issues = await (monitor as any).checkLoadBalance(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'load.imbalance',
          severity: 'warning',
          component,
          details: expect.stringContaining('resource imbalance')
        })
      );
    });

    it('should optimize resource allocation', async () => {
      const component = 'OptimizeComponent';
      const snapshots = Array.from({ length: 5 }, (_, i) => 
        createLoadSnapshot(component, {
          activeRequests: 30 + i * 10,
          resourceUtilization: {
            cpu: 60 + i * 5,
            memory: 70 + i * 5,
            network: 50 + i * 5
          }
        })
      );

      for (const snapshot of snapshots) {
        await (monitor as any).trackLoadBalance(snapshot);
      }

      const optimization = await (monitor as any).optimizeResourceAllocation(component);
      expect(optimization).toMatchObject({
        component,
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            type: 'resource.optimization',
            action: expect.any(String),
            impact: expect.any(Number)
          })
        ])
      });
    });
  });

  describe('Priority-Load Integration', () => {
    it('should integrate priority and load metrics', async () => {
      const component = 'IntegratedComponent';
      const priorityRequest = createPriorityRequest(component, 'high', 'cpu', 1024);
      const loadSnapshot = createLoadSnapshot(component, {
        activeRequests: 60,
        resourceUtilization: {
          cpu: 75,
          memory: 70,
          network: 60
        }
      });

      await (monitor as any).trackResourceRequest(priorityRequest);
      await (monitor as any).trackLoadBalance(loadSnapshot);

      const integration = await (monitor as any).analyzePriorityLoadIntegration(component);
      expect(integration).toMatchObject({
        component,
        priorityImpact: expect.any(Number),
        loadImpact: expect.any(Number),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            type: 'integration.optimization',
            action: expect.any(String)
          })
        ])
      });
    });

    it('should detect priority-load conflicts', async () => {
      const component = 'ConflictComponent';
      const requests = Array.from({ length: 10 }, (_, i) => 
        createPriorityRequest(component, 'high', 'cpu', 1024 * (i + 1))
      );
      const loadSnapshot = createLoadSnapshot(component, {
        resourceUtilization: {
          cpu: 90,
          memory: 85,
          network: 80
        }
      });

      for (const request of requests) {
        await (monitor as any).trackResourceRequest(request);
      }
      await (monitor as any).trackLoadBalance(loadSnapshot);

      const conflicts = await (monitor as any).detectPriorityLoadConflicts(component);
      expect(conflicts).toContainEqual(
        expect.objectContaining({
          type: 'priority.load.conflict',
          severity: 'warning',
          component,
          details: expect.stringContaining('resource conflict')
        })
      );
    });
  });
}); 