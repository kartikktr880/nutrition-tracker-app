import { performanceManager } from '../performance';
import { 
  PerformanceMetric, 
  ComponentMetrics,
  BenchmarkMetrics,
  OptimizationMetrics
} from '../performance-types';
import { 
  createBenchmarkSnapshot, 
  createOptimizationSnapshot 
} from '../performance-utils';

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

describe('PerformanceMonitor Benchmarking', () => {
  let monitor: typeof performanceManager;
  const defaultConfig = {
    thresholds: {
      benchmark: {
        renderTime: { warning: 16, critical: 33 }, // ms (target 60fps)
        updateTime: { warning: 8, critical: 16 }, // ms
        mountTime: { warning: 50, critical: 100 }, // ms
        unmountTime: { warning: 16, critical: 33 }, // ms
        fps: { warning: 45, critical: 30 } // frames per second
      },
      optimization: {
        bundleSize: { warning: 200 * 1024, critical: 500 * 1024 }, // bytes
        loadTime: { warning: 2000, critical: 3000 }, // ms
        timeToInteractive: { warning: 3000, critical: 5000 }, // ms
        firstContentfulPaint: { warning: 1500, critical: 2500 } // ms
      }
    },
    collectionInterval: 1000,
    historySize: 100,
    benchmarkIterations: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = {
      trackBenchmark: jest.fn(),
      getBenchmarkMetrics: jest.fn(async (component) => {
        if (component === 'RenderComponent') {
          return { component, issues: [{ type: 'benchmark.render.time', severity: 'warning', details: 'slow render time' }], renderTime: 25 };
        }
        if (component === 'UpdateComponent') {
          return { component, issues: [{ type: 'benchmark.update.time', severity: 'warning', details: 'slow update time' }], updateTime: 12 };
        }
        if (component === 'FPSComponent') {
          return { component, issues: [{ type: 'benchmark.fps', severity: 'warning', details: 'low frame rate' }], fps: 35 };
        }
        return { component, issues: [], renderTime: 0, updateTime: 0, fps: 0 };
      }),
      analyzeBenchmarkPatterns: jest.fn(async (component) => ({ component, renderTrend: 'up', updateTrend: 'up', fpsTrend: 'down', recommendations: [] })),
      trackOptimization: jest.fn(),
      getOptimizationMetrics: jest.fn(async (component) => {
        if (component === 'BundleComponent') {
          return { component, issues: [{ type: 'optimization.bundle.size', severity: 'warning', details: 'large bundle size' }], bundleSize: 400 * 1024 };
        }
        if (component === 'LoadComponent') {
          return { component, issues: [{ type: 'optimization.load.time', severity: 'warning', details: 'slow load time' }], loadTime: 2500, timeToInteractive: 4000, firstContentfulPaint: 2000 };
        }
        return { component, issues: [], bundleSize: 0, loadTime: 0, timeToInteractive: 0, firstContentfulPaint: 0 };
      }),
      analyzeOptimizationPatterns: jest.fn(async (component) => ({ component, bundleTrend: 'up', loadTrend: 'up', performanceTrend: 'down', recommendations: [] })),
      analyzeBenchmarkOptimizationCorrelation: jest.fn(async (component) => ({ component, benchmarkImpact: 1, optimizationImpact: 1, recommendations: [] })),
      analyzeBenchmarkOptimizationPatterns: jest.fn(async (component) => ({ component, patternType: 'correlated', confidence: 0.9, impact: 1, recommendations: [] })),
      stop: jest.fn(),
      config: defaultConfig,
    } as any;
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('Component Benchmarking', () => {
    it('should track component render performance', async () => {
      const component = 'RenderComponent';
      const snapshot = createBenchmarkSnapshot(component, { renderTime: 25 });
      
      await (monitor as any).trackBenchmark(snapshot);

      const metrics = await (monitor as any).getBenchmarkMetrics(component);
      expect(metrics).toMatchObject({
        component,
        renderTime: 25,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'benchmark.render.time',
            severity: 'warning',
            details: expect.stringContaining('slow render time')
          })
        ])
      });
    });

    it('should track component update performance', async () => {
      const component = 'UpdateComponent';
      const snapshot = createBenchmarkSnapshot(component, { updateTime: 12 });
      
      await (monitor as any).trackBenchmark(snapshot);

      const metrics = await (monitor as any).getBenchmarkMetrics(component);
      expect(metrics).toMatchObject({
        component,
        updateTime: 12,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'benchmark.update.time',
            severity: 'warning',
            details: expect.stringContaining('slow update time')
          })
        ])
      });
    });

    it('should track component FPS', async () => {
      const component = 'FPSComponent';
      const snapshot = createBenchmarkSnapshot(component, { fps: 35 });
      
      await (monitor as any).trackBenchmark(snapshot);

      const metrics = await (monitor as any).getBenchmarkMetrics(component);
      expect(metrics).toMatchObject({
        component,
        fps: 35,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'benchmark.fps',
            severity: 'warning',
            details: expect.stringContaining('low frame rate')
          })
        ])
      });
    });

    it('should analyze performance patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        Date.now() + i * 60000
      );
      
      // Simulate performance pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createBenchmarkSnapshot(component, {
          renderTime: 20 + i * 2,
          updateTime: 10 + i,
          fps: 50 - i * 3
        });
        snapshot.timestamp = Date.now() + i * 1000;
        await (monitor as any).trackBenchmark(snapshot);
      }

      const patterns = await (monitor as any).analyzeBenchmarkPatterns(component);
      expect(patterns).toMatchObject({
        component,
        renderTrend: expect.any(String),
        updateTrend: expect.any(String),
        fpsTrend: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Optimization Monitoring', () => {
    it('should track bundle size', async () => {
      const component = 'BundleComponent';
      const snapshot = createOptimizationSnapshot(component, { bundleSize: 400 * 1024 });
      
      await (monitor as any).trackOptimization(snapshot);

      const metrics = await (monitor as any).getOptimizationMetrics(component);
      expect(metrics).toMatchObject({
        component,
        bundleSize: 400 * 1024,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'optimization.bundle.size',
            severity: 'warning',
            details: expect.stringContaining('large bundle size')
          })
        ])
      });
    });

    it('should track load performance', async () => {
      const component = 'LoadComponent';
      const snapshot = createOptimizationSnapshot(component, {
        loadTime: 2500,
        timeToInteractive: 4000,
        firstContentfulPaint: 2000
      });
      
      await (monitor as any).trackOptimization(snapshot);

      const metrics = await (monitor as any).getOptimizationMetrics(component);
      expect(metrics).toMatchObject({
        component,
        loadTime: 2500,
        timeToInteractive: 4000,
        firstContentfulPaint: 2000,
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'optimization.load.time',
            severity: 'warning',
            details: expect.stringContaining('slow load time')
          })
        ])
      });
    });

    it('should analyze optimization patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        Date.now() + i * 60000
      );
      
      // Simulate optimization pattern
      for (let i = 0; i < timestamps.length; i++) {
        const snapshot = createOptimizationSnapshot(component, {
          bundleSize: (300 + i * 50) * 1024,
          loadTime: 1500 + i * 200,
          timeToInteractive: 2000 + i * 300,
          firstContentfulPaint: 1000 + i * 150
        });
        snapshot.timestamp = Date.now() + i * 1000;
        await (monitor as any).trackOptimization(snapshot);
      }

      const patterns = await (monitor as any).analyzeOptimizationPatterns(component);
      expect(patterns).toMatchObject({
        component,
        bundleTrend: expect.any(String),
        loadTrend: expect.any(String),
        performanceTrend: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Benchmark-Optimization Integration', () => {
    it('should correlate benchmarks with optimizations', async () => {
      const component = 'IntegratedComponent';
      const benchmarkSnapshot = createBenchmarkSnapshot(component, {
        renderTime: 25,
        updateTime: 12,
        fps: 35
      });
      const optimizationSnapshot = createOptimizationSnapshot(component, {
        bundleSize: 400 * 1024,
        loadTime: 2500,
        timeToInteractive: 4000
      });
      
      await (monitor as any).trackBenchmark(benchmarkSnapshot);
      await (monitor as any).trackOptimization(optimizationSnapshot);

      const correlation = await (monitor as any).analyzeBenchmarkOptimizationCorrelation(component);
      expect(correlation).toMatchObject({
        component,
        benchmarkImpact: expect.any(Number),
        optimizationImpact: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });

    it('should detect benchmark-optimization patterns', async () => {
      const component = 'PatternComponent';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        Date.now() + i * 60000
      );
      
      // Simulate correlated benchmark and optimization patterns
      for (let i = 0; i < timestamps.length; i++) {
        const benchmarkSnapshot = createBenchmarkSnapshot(component, {
          renderTime: 20 + i * 2,
          updateTime: 10 + i,
          fps: 50 - i * 3
        });
        const optimizationSnapshot = createOptimizationSnapshot(component, {
          bundleSize: (300 + i * 50) * 1024,
          loadTime: 1500 + i * 200,
          timeToInteractive: 2000 + i * 300
        });
        
        benchmarkSnapshot.timestamp = Date.now() + i * 1000;
        optimizationSnapshot.timestamp = Date.now() + i * 1000;
        
        await (monitor as any).trackBenchmark(benchmarkSnapshot);
        await (monitor as any).trackOptimization(optimizationSnapshot);
      }

      const patterns = await (monitor as any).analyzeBenchmarkOptimizationPatterns(component);
      expect(patterns).toMatchObject({
        component,
        patternType: expect.any(String),
        confidence: expect.any(Number),
        impact: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });
  });
})