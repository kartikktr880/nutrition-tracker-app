import { PerformanceMonitor } from '../performance';
import { 
  PerformanceMetric, 
  RealTimeAnalyzer, 
  MLModel,
  PerformanceIssue 
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

describe('PerformanceMonitor Advanced Features', () => {
  let monitor: PerformanceMonitor;
  const defaultConfig = {
    thresholds: {
      fps: { warning: 30, critical: 15 },
      memory: { warning: 0.8, critical: 0.9 },
      cpu: { warning: 80, critical: 90 }
    },
    collectionInterval: 1000,
    historySize: 100,
    analysisWindow: 5000,
    predictionWindow: 10000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = PerformanceMonitor.getInstance();
    (monitor as any).config = defaultConfig;
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('Real-time Analysis', () => {
    const createTestAnalyzer = (name: string, metric: string): RealTimeAnalyzer => ({
      name,
      metric,
      analyze: jest.fn().mockImplementation((metrics) => ({
        issues: [],
        recommendations: []
      })),
      config: {
        interval: 1000,
        windowSize: 5000,
        thresholds: { warning: 30, critical: 15 }
      },
      severity: 'warning'
    });

    it('should register and manage real-time analyzers', () => {
      const analyzer = createTestAnalyzer('test-analyzer', 'fps');
      
      monitor.addRealTimeAnalyzer(analyzer);
      expect((monitor as any).realTimeAnalyzers.has('test-analyzer')).toBe(true);
      
      monitor.removeRealTimeAnalyzer('test-analyzer');
      expect((monitor as any).realTimeAnalyzers.has('test-analyzer')).toBe(false);
    });

    it('should run analysis on collected metrics', async () => {
      const analyzer = createTestAnalyzer('fps-analyzer', 'fps');
      const analyzeSpy = jest.spyOn(analyzer, 'analyze');
      
      monitor.addRealTimeAnalyzer(analyzer);
      
      // Add some test metrics
      const metrics: PerformanceMetric[] = Array.from({ length: 5 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        value: 30 - i,
        category: 'system',
        subcategory: 'fps'
      }));
      
      for (const metric of metrics) {
        (monitor as any).addMetric('fps', metric);
      }
      
      await (monitor as any).runRealTimeAnalysis();
      expect(analyzeSpy).toHaveBeenCalledWith(expect.arrayContaining(metrics));
    });

    it('should detect and report performance issues', async () => {
      const analyzer = createTestAnalyzer('fps-analyzer', 'fps');
      analyzer.analyze = jest.fn().mockImplementation(() => ({
        issues: [{
          type: 'fps',
          severity: 'warning',
          value: 25,
          timestamp: new Date().toISOString(),
          details: 'FPS dropping below warning threshold'
        }],
        recommendations: ['Consider reducing animation complexity']
      }));
      
      monitor.addRealTimeAnalyzer(analyzer);
      
      const result = await (monitor as any).runRealTimeAnalysis();
      expect(result.issues).toHaveLength(1);
      expect(result.recommendations).toHaveLength(1);
    });
  });

  describe('ML Model Integration', () => {
    const createTestModel = (name: string, metric: string): MLModel => ({
      name,
      metric,
      predict: jest.fn().mockResolvedValue({
        prediction: 30,
        confidence: 0.95,
        timestamp: new Date().toISOString()
      }),
      config: {
        features: ['fps', 'memory.heap'],
        target: 'fps',
        windowSize: 1000,
        confidenceThreshold: 0.8
      },
      severity: 'warning'
    });

    it('should register and manage ML models', () => {
      const model = createTestModel('fps-predictor', 'fps');
      
      monitor.addMLModel(model);
      expect((monitor as any).mlModels.has('fps-predictor')).toBe(true);
      
      monitor.removeMLModel('fps-predictor');
      expect((monitor as any).mlModels.has('fps-predictor')).toBe(false);
    });

    it('should update models with new metrics', async () => {
      const model = createTestModel('fps-predictor', 'fps');
      const predictSpy = jest.spyOn(model, 'predict');
      
      monitor.addMLModel(model);
      
      // Add feature metrics
      const metrics: PerformanceMetric[] = Array.from({ length: 5 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        value: 30 - i,
        category: 'system',
        subcategory: 'fps'
      }));
      
      for (const metric of metrics) {
        (monitor as any).addMetric('fps', metric);
      }
      
      await (monitor as any).updateMLModels();
      expect(predictSpy).toHaveBeenCalledWith(expect.arrayContaining(metrics));
    });

    it('should handle model prediction errors gracefully', async () => {
      const model = createTestModel('error-model', 'fps');
      model.predict = jest.fn().mockRejectedValue(new Error('Prediction failed'));
      
      monitor.addMLModel(model);
      
      const result = await (monitor as any).updateMLModels();
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          model: 'error-model',
          error: expect.any(Error)
        })
      );
    });
  });

  describe('Advanced Metric Analysis', () => {
    it('should detect performance trends', async () => {
      // Simulate degrading performance
      const timestamps = Array.from({ length: 10 }, (_, i) => 
        new Date(Date.now() + i * 1000).toISOString()
      );
      
      const fpsValues = Array.from({ length: 10 }, (_, i) => 60 - (i * 5));
      for (let i = 0; i < timestamps.length; i++) {
        const metric: PerformanceMetric = {
          timestamp: timestamps[i],
          value: fpsValues[i],
          category: 'system',
          subcategory: 'fps'
        };
        (monitor as any).addMetric('fps', metric);
      }
      
      const trend = await (monitor as any).analyzePerformanceTrend('fps');
      expect(trend).toMatchObject({
        direction: 'decreasing',
        rate: expect.any(Number),
        severity: 'warning'
      });
    });

    it('should generate performance recommendations', async () => {
      // Simulate high memory usage pattern
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() + i * 1000).toISOString()
      );
      
      const memoryValues = [70, 75, 80, 85, 90].map(v => v * 1024 * 1024);
      for (let i = 0; i < timestamps.length; i++) {
        (performance as any).memory.usedJSHeapSize = memoryValues[i];
        await (monitor as any).collectSystemMetrics(timestamps[i]);
      }
      
      const recommendations = await (monitor as any).generateRecommendations();
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'memory',
          severity: 'warning',
          action: expect.any(String)
        })
      );
    });
  });
}); 