import { PerformanceMonitor } from '../performance';
import { 
  PerformanceMetric, 
  ComponentMetrics,
  NetworkMetrics,
  CacheMetrics
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

describe('PerformanceMonitor Network Performance', () => {
  let monitor: PerformanceMonitor;
  const defaultConfig = {
    thresholds: {
      network: {
        requestTime: { warning: 1000, critical: 2000 }, // ms
        responseSize: { warning: 500 * 1024, critical: 1024 * 1024 }, // bytes
        errorRate: { warning: 0.05, critical: 0.1 }, // percentage
        retryCount: { warning: 2, critical: 3 }, // number of retries
        bandwidth: { warning: 1000 * 1024, critical: 500 * 1024 } // bytes per second
      },
      cache: {
        hitRate: { warning: 0.7, critical: 0.5 }, // percentage
        missRate: { warning: 0.3, critical: 0.5 }, // percentage
        size: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 }, // bytes
        evictionRate: { warning: 0.2, critical: 0.4 }, // percentage
        staleRate: { warning: 0.1, critical: 0.2 } // percentage
      }
    },
    collectionInterval: 1000,
    historySize: 100,
    networkTimeout: 5000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = PerformanceMonitor.getInstance();
    (monitor as any).config = defaultConfig;
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('Network Performance Monitoring', () => {
    const createNetworkSnapshot = (component: string, metrics: Partial<NetworkMetrics>) => ({
      component,
      timestamp: new Date().toISOString(),
      network: {
        requestTime: metrics.requestTime || 500,
        responseSize: metrics.responseSize || 200 * 1024,
        errorRate: metrics.errorRate || 0.02,
        retryCount: metrics.retryCount || 0,
        bandwidth: metrics.bandwidth || 2000 * 1024,
        requests: {
          total: metrics.totalRequests || 100,
          success: metrics.successRequests || 98,
          failed: metrics.failedRequests || 2,
          pending: metrics.pendingRequests || 0
        },
        endpoints: metrics.endpoints || {
          '/api/data': { count: 50, avgTime: 400, errorRate: 0.01 },
          '/api/status': { count: 30, avgTime: 200, errorRate: 0.02 },
          '/api/update': { count: 20, avgTime: 600, errorRate: 0.03 }
        }
      }
    });

    it('should track request performance', async () => {
      const component = 'RequestComponent';
      const snapshot = createNetworkSnapshot(component, { requestTime: 1500 });
      
      await (monitor as any).trackNetworkPerformance(snapshot);

      const metrics = await (monitor as any).getNetworkMetrics(component);
      expect(metrics).toMatchObject({
        component,
        requestTime: 1500,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'network.request.time',
            severity: 'warning',
            details: expect.stringContaining('slow request time')
          })
        ])
      });
    });

    it('should track error rates', async () => {
      const component = 'ErrorComponent';
      const snapshot = createNetworkSnapshot(component, { 
        errorRate: 0.08,
        requests: {
          total: 100,
          success: 92,
          failed: 8,
          pending: 0
        }
      });
      
      await (monitor as any).trackNetworkPerformance(snapshot);

      const metrics = await (monitor as any).getNetworkMetrics(component);
      expect(metrics).toMatchObject({
        component,
        errorRate: 0.08,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'network.error.rate',
            severity: 'warning',
            details: expect.stringContaining('high error rate')
          })
        ])
      });
    });

    it('should track bandwidth usage', async () => {
      const component = 'BandwidthComponent';
      const snapshot = createNetworkSnapshot(component, { 
        bandwidth: 400 * 1024,
        responseSize: 800 * 1024
      });
      
      await (monitor as any).trackNetworkPerformance(snapshot);

      const metrics = await (monitor as any).getNetworkMetrics(component);
      expect(metrics).toMatchObject({
        component,
        bandwidth: 400 * 1024,
        responseSize: 800 * 1024,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'network.bandwidth',
            severity: 'critical',
            details: expect.stringContaining('low bandwidth')
          })
        ])
      });
    });

    it('should analyze network patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate network pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createNetworkSnapshot(component, {
          requestTime: 500 + i * 200,
          errorRate: 0.02 + i * 0.01,
          bandwidth: 2000 * 1024 - i * 300 * 1024
        });
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackNetworkPerformance(snapshot);
      }

      const patterns = await (monitor as any).analyzeNetworkPatterns(component);
      expect(patterns).toMatchObject({
        component,
        requestTrend: expect.any(String),
        errorTrend: expect.any(String),
        bandwidthTrend: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Cache Performance Monitoring', () => {
    const createCacheSnapshot = (component: string, metrics: Partial<CacheMetrics>) => ({
      component,
      timestamp: new Date().toISOString(),
      cache: {
        hitRate: metrics.hitRate || 0.85,
        missRate: metrics.missRate || 0.15,
        size: metrics.size || 30 * 1024 * 1024,
        evictionRate: metrics.evictionRate || 0.1,
        staleRate: metrics.staleRate || 0.05,
        metrics: {
          memoryUsage: metrics.memoryUsage || 25 * 1024 * 1024,
          diskUsage: metrics.diskUsage || 5 * 1024 * 1024,
          items: metrics.items || 1000,
          maxAge: metrics.maxAge || 3600,
          lastCleanup: metrics.lastCleanup || new Date().toISOString()
        }
      }
    });

    it('should track cache hit rates', async () => {
      const component = 'CacheComponent';
      const snapshot = createCacheSnapshot(component, { hitRate: 0.6 });
      
      await (monitor as any).trackCachePerformance(snapshot);

      const metrics = await (monitor as any).getCacheMetrics(component);
      expect(metrics).toMatchObject({
        component,
        hitRate: 0.6,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'cache.hit.rate',
            severity: 'warning',
            details: expect.stringContaining('low cache hit rate')
          })
        ])
      });
    });

    it('should track cache size', async () => {
      const component = 'SizeComponent';
      const snapshot = createCacheSnapshot(component, { 
        size: 80 * 1024 * 1024,
        metrics: {
          memoryUsage: 70 * 1024 * 1024,
          diskUsage: 10 * 1024 * 1024,
          items: 2000,
          maxAge: 3600,
          lastCleanup: new Date().toISOString()
        }
      });
      
      await (monitor as any).trackCachePerformance(snapshot);

      const metrics = await (monitor as any).getCacheMetrics(component);
      expect(metrics).toMatchObject({
        component,
        size: 80 * 1024 * 1024,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'cache.size',
            severity: 'warning',
            details: expect.stringContaining('large cache size')
          })
        ])
      });
    });

    it('should track cache eviction', async () => {
      const component = 'EvictionComponent';
      const snapshot = createCacheSnapshot(component, { 
        evictionRate: 0.35,
        staleRate: 0.15
      });
      
      await (monitor as any).trackCachePerformance(snapshot);

      const metrics = await (monitor as any).getCacheMetrics(component);
      expect(metrics).toMatchObject({
        component,
        evictionRate: 0.35,
        staleRate: 0.15,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'cache.eviction.rate',
            severity: 'warning',
            details: expect.stringContaining('high eviction rate')
          })
        ])
      });
    });

    it('should analyze cache patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate cache pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createCacheSnapshot(component, {
          hitRate: 0.85 - i * 0.05,
          size: (30 + i * 10) * 1024 * 1024,
          evictionRate: 0.1 + i * 0.05
        });
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackCachePerformance(snapshot);
      }

      const patterns = await (monitor as any).analyzeCachePatterns(component);
      expect(patterns).toMatchObject({
        component,
        hitRateTrend: expect.any(String),
        sizeTrend: expect.any(String),
        evictionTrend: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Network-Cache Integration', () => {
    it('should correlate network and cache performance', async () => {
      const component = 'IntegratedComponent';
      const networkSnapshot = createNetworkSnapshot(component, {
        requestTime: 1500,
        errorRate: 0.08,
        bandwidth: 400 * 1024
      });
      const cacheSnapshot = createCacheSnapshot(component, {
        hitRate: 0.6,
        size: 80 * 1024 * 1024,
        evictionRate: 0.35
      });
      
      await (monitor as any).trackNetworkPerformance(networkSnapshot);
      await (monitor as any).trackCachePerformance(cacheSnapshot);

      const correlation = await (monitor as any).analyzeNetworkCacheCorrelation(component);
      expect(correlation).toMatchObject({
        component,
        networkImpact: expect.any(Number),
        cacheImpact: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });

    it('should detect network-cache patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate correlated network and cache patterns
      for (let i = 0; i < timestamps.length; i++) {
        const networkSnapshot = createNetworkSnapshot(component, {
          requestTime: 500 + i * 200,
          errorRate: 0.02 + i * 0.01,
          bandwidth: 2000 * 1024 - i * 300 * 1024
        });
        const cacheSnapshot = createCacheSnapshot(component, {
          hitRate: 0.85 - i * 0.05,
          size: (30 + i * 10) * 1024 * 1024,
          evictionRate: 0.1 + i * 0.05
        });
        
        networkSnapshot.timestamp = timestamps[i];
        cacheSnapshot.timestamp = timestamps[i];
        
        await (monitor as any).trackNetworkPerformance(networkSnapshot);
        await (monitor as any).trackCachePerformance(cacheSnapshot);
      }

      const patterns = await (monitor as any).analyzeNetworkCachePatterns(component);
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