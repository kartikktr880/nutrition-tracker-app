import { PerformanceMonitor } from '../performance';
import { 
  PerformanceMetric, 
  ComponentMetrics,
  LifecycleMetrics,
  ErrorMetrics
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

describe('PerformanceMonitor Lifecycle Management', () => {
  let monitor: PerformanceMonitor;
  const defaultConfig = {
    thresholds: {
      lifecycle: {
        mountTime: { warning: 100, critical: 200 }, // ms
        updateTime: { warning: 50, critical: 100 }, // ms
        unmountTime: { warning: 50, critical: 100 }, // ms
        frequency: { warning: 30, critical: 60 } // updates per minute
      },
      errors: {
        rate: { warning: 0.1, critical: 0.2 }, // errors per minute
        recoveryTime: { warning: 1000, critical: 2000 }, // ms
        impact: { warning: 0.1, critical: 0.2 } // impact score
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

  describe('Lifecycle Event Timing', () => {
    const createLifecycleSnapshot = (component: string, event: string, duration: number) => ({
      component,
      timestamp: new Date().toISOString(),
      lifecycle: {
        event,
        duration,
        state: {
          props: { count: 1 },
          state: { loading: false }
        },
        impact: {
          memory: duration * 1024, // 1KB per ms
          cpu: duration * 0.1 // 0.1% CPU per ms
        }
      }
    });

    it('should track component mount timing', async () => {
      const component = 'MountComponent';
      const snapshot = createLifecycleSnapshot(component, 'mount', 150);
      
      await (monitor as any).trackLifecycleEvent(snapshot);

      const metrics = await (monitor as any).getLifecycleMetrics(component);
      expect(metrics).toMatchObject({
        component,
        mountTime: 150,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'lifecycle.mount.time',
            severity: 'warning',
            details: expect.stringContaining('slow mount time')
          })
        ])
      });
    });

    it('should track component update timing', async () => {
      const component = 'UpdateComponent';
      const snapshot = createLifecycleSnapshot(component, 'update', 75);
      
      await (monitor as any).trackLifecycleEvent(snapshot);

      const metrics = await (monitor as any).getLifecycleMetrics(component);
      expect(metrics).toMatchObject({
        component,
        updateTime: 75,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'lifecycle.update.time',
            severity: 'warning',
            details: expect.stringContaining('slow update time')
          })
        ])
      });
    });

    it('should track component unmount timing', async () => {
      const component = 'UnmountComponent';
      const snapshot = createLifecycleSnapshot(component, 'unmount', 75);
      
      await (monitor as any).trackLifecycleEvent(snapshot);

      const metrics = await (monitor as any).getLifecycleMetrics(component);
      expect(metrics).toMatchObject({
        component,
        unmountTime: 75,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'lifecycle.unmount.time',
            severity: 'warning',
            details: expect.stringContaining('slow unmount time')
          })
        ])
      });
    });

    it('should detect slow lifecycle events', async () => {
      const component = 'SlowComponent';
      const snapshot = createLifecycleSnapshot(component, 'mount', 250);
      
      await (monitor as any).trackLifecycleEvent(snapshot);

      const issues = await (monitor as any).checkLifecycleTiming(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'lifecycle.mount.time',
          severity: 'critical',
          details: expect.stringContaining('critical mount time')
        })
      );
    });

    it('should analyze lifecycle patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate lifecycle pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createLifecycleSnapshot(component, 'update', 40 + i * 10);
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackLifecycleEvent(snapshot);
      }

      const patterns = await (monitor as any).analyzeLifecyclePatterns(component);
      expect(patterns).toMatchObject({
        component,
        mountTrend: expect.any(String),
        updateTrend: expect.any(String),
        unmountTrend: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Error Boundary Monitoring', () => {
    const createErrorSnapshot = (component: string, error: Error, recoveryTime?: number) => ({
      component,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        recoveryTime: recoveryTime || 0,
        impact: {
          users: Math.floor(Math.random() * 100),
          components: Math.floor(Math.random() * 10),
          performance: Math.random()
        }
      }
    });

    it('should track error boundary catches', async () => {
      const component = 'ErrorComponent';
      const error = new Error('Test error');
      const snapshot = createErrorSnapshot(component, error);
      
      await (monitor as any).trackErrorBoundaryCatch(snapshot);

      const metrics = await (monitor as any).getErrorMetrics(component);
      expect(metrics).toMatchObject({
        component,
        errorCount: 1,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'error.boundary.catch',
            severity: 'warning',
            details: expect.stringContaining('error caught')
          })
        ])
      });
    });

    it('should track error recovery', async () => {
      const component = 'RecoveryComponent';
      const error = new Error('Test error');
      const snapshot = createErrorSnapshot(component, error, 1500);
      
      await (monitor as any).trackErrorBoundaryCatch(snapshot);
      await (monitor as any).trackErrorRecovery(component, 1500);

      const metrics = await (monitor as any).getErrorMetrics(component);
      expect(metrics).toMatchObject({
        component,
        recoveryCount: 1,
        averageRecoveryTime: 1500,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'error.recovery.time',
            severity: 'warning',
            details: expect.stringContaining('slow recovery time')
          })
        ])
      });
    });

    it('should detect high error rates', async () => {
      const component = 'HighErrorComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 10000).toISOString()
      );
      
      // Simulate high error rate
      for (let i = 0; i < timestamps.length; i++) {
        const error = new Error(`Test error ${i}`);
        const snapshot = createErrorSnapshot(component, error);
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackErrorBoundaryCatch(snapshot);
      }

      const issues = await (monitor as any).checkErrorRate(component);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: 'error.rate',
          severity: 'critical',
          details: expect.stringContaining('high error rate')
        })
      );
    });

    it('should analyze error patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate error pattern
      for (let i = 0; i < timestamps.length; i++) {
        const error = new Error(`Test error ${i}`);
        const snapshot = createErrorSnapshot(component, error, 1000 + i * 200);
        snapshot.timestamp = timestamps[i];
        await (monitor as any).trackErrorBoundaryCatch(snapshot);
        await (monitor as any).trackErrorRecovery(component, 1000 + i * 200);
      }

      const patterns = await (monitor as any).analyzeErrorPatterns(component);
      expect(patterns).toMatchObject({
        component,
        errorTrend: expect.any(String),
        recoveryTrend: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Lifecycle-Error Integration', () => {
    it('should correlate lifecycle events with errors', async () => {
      const component = 'IntegratedComponent';
      const lifecycleSnapshot = createLifecycleSnapshot(component, 'mount', 150);
      const errorSnapshot = createErrorSnapshot(component, new Error('Test error'), 1500);
      
      await (monitor as any).trackLifecycleEvent(lifecycleSnapshot);
      await (monitor as any).trackErrorBoundaryCatch(errorSnapshot);

      const correlation = await (monitor as any).analyzeLifecycleErrorCorrelation(component);
      expect(correlation).toMatchObject({
        component,
        lifecycleImpact: expect.any(Number),
        errorImpact: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });

    it('should detect lifecycle-error patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 60000).toISOString()
      );
      
      // Simulate correlated lifecycle and error patterns
      for (let i = 0; i < timestamps.length; i++) {
        const lifecycleSnapshot = createLifecycleSnapshot(component, 'update', 40 + i * 10);
        const errorSnapshot = createErrorSnapshot(component, new Error(`Test error ${i}`), 1000 + i * 200);
        
        lifecycleSnapshot.timestamp = timestamps[i];
        errorSnapshot.timestamp = timestamps[i];
        
        await (monitor as any).trackLifecycleEvent(lifecycleSnapshot);
        await (monitor as any).trackErrorBoundaryCatch(errorSnapshot);
        await (monitor as any).trackErrorRecovery(component, 1000 + i * 200);
      }

      const patterns = await (monitor as any).analyzeLifecycleErrorPatterns(component);
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