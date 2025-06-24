import {
  PerformanceMetric,
  PerformanceOptimization,
  PerformanceMonitorConfig,
  PerformanceThresholds,
  PerformanceIssue,
  ResourceUsage,
  RecoveryAction,
  RecoveryStrategy,
  ResourceOptimization,
  ResourceUtilization,
  PriorityMetrics,
  LoadBalanceMetrics,
  ResourceRequest,
  ResourcePriority,
  QueueMetrics,
  LoadBalanceIssue,
  PriorityLoadIntegration,
  IntegrationRecommendation,
  PriorityLoadConflict,
  ResourceMetrics,
  MemoryMetrics,
  LoadMetrics,
  PerformanceThreshold,
  ComponentMetrics,
  NetworkMetrics,
  AuditLogEntry,
  RecoveryManager,
  RealTimeAnalyzer,
  RealTimeAnalysisConfig,
  MLModel,
  MLPredictionConfig,
  PerformanceHistoryEntry,
  PriorityViolation,
  PriorityLevel,
  RecoveryHistoryEntry,
  HealthMetrics
} from './performance-types';
import { logAudit } from './audit';

const METRIC_TYPES = {
  fps: 'fps',
  frameTime: 'frameTime',
  memoryUsage: 'memoryUsage',
  cpuUsage: 'cpuUsage',
  network: 'network'
} as const;

type MetricType = typeof METRIC_TYPES[keyof typeof METRIC_TYPES];

const PERFORMANCE_ISSUE_TYPES = {
  fps_pattern_detected: 'fps_pattern_detected',
  frameTime_pattern_detected: 'frameTime_pattern_detected',
  memoryUsage_pattern_detected: 'memoryUsage_pattern_detected',
  cpuUsage_pattern_detected: 'cpuUsage_pattern_detected',
  network_pattern_detected: 'network_pattern_detected'
} as const;

type PerformanceIssueType = keyof typeof PERFORMANCE_ISSUE_TYPES;

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]>;
  private thresholds: Map<string, PerformanceThreshold>;
  private optimizations: Map<string, PerformanceOptimization>;
  private monitoringInterval: NodeJS.Timeout | null;
  private readonly MAX_METRICS_PER_CATEGORY: number;
  private readonly MONITORING_INTERVAL: number;
  private readonly PERFORMANCE_THRESHOLDS: PerformanceThresholds;
  private realTimeAnalyzers: Map<string, RealTimeAnalyzer>;
  private mlModels: Map<string, MLModel>;
  private performanceHistory: PerformanceHistoryEntry[] = [];
  private readonly HISTORY_MAX_ENTRIES: number;
  private readonly ANALYTICS_WINDOW: number;
  private readonly strategies: Record<string, RecoveryStrategy> = {
    'fps': {
      type: 'fps',
      actions: ['log', 'notify', 'optimize'],
      retryCount: 3,
      timeout: 5000,
      failFast: false,
      priority: PriorityLevel.CRITICAL,
      escalationThreshold: 3
    },
    'memory': {
      type: 'memory',
      actions: ['log', 'notify', 'optimize', 'restart'],
      retryCount: 2,
      timeout: 10000,
      failFast: false,
      priority: PriorityLevel.CRITICAL,
      escalationThreshold: 2
    },
    'cpu': {
      type: 'cpu',
      actions: ['log', 'notify', 'optimize', 'restart'],
      retryCount: 2,
      timeout: 15000,
      failFast: false,
      priority: PriorityLevel.CRITICAL,
      escalationThreshold: 1
    },
    'network': {
      type: 'network',
      actions: ['log', 'notify', 'optimize'],
      retryCount: 3,
      timeout: 8000,
      failFast: false,
      priority: PriorityLevel.HIGH,
      escalationThreshold: 3
    },
    'priority.violation': {
      type: 'priority.violation',
      actions: ['log', 'notify', 'optimize'],
      retryCount: 2,
      timeout: 6000,
      failFast: false,
      priority: PriorityLevel.CRITICAL,
      escalationThreshold: 2
    },
    'load.imbalance': {
      type: 'load.imbalance',
      actions: ['log', 'notify', 'optimize'],
      retryCount: 2,
      timeout: 10000,
      failFast: false,
      priority: PriorityLevel.CRITICAL,
      escalationThreshold: 2
    }
  };
  private readonly recoveryManager: RecoveryManager = {
    handleCriticalIssue: async (issueType: string): Promise<void> => {
      const issue = this.currentIssues.find(i => i.type === issueType && i.severity === 'critical');
      if (issue) {
        await this.handleCriticalIssue(issue);
      }
    },
    getStrategy: (issueType: string): RecoveryStrategy | undefined => {
      return this.strategies[issueType];
    },
    strategies: this.strategies
  };
  private config: PerformanceMonitorConfig;
  private priorityQueues: Map<string, PriorityMetrics>;
  private loadMetrics: Map<string, LoadBalanceMetrics>;
  private resourceHistory: Map<string, ResourceRequest[]>;
  private loadHistory: Map<string, LoadBalanceMetrics[]>;
  private recoveryActions: Map<string, RecoveryAction> = new Map();
  private currentIssues: PerformanceIssue[];
  private readonly performanceHistoryBuffer: PerformanceHistoryEntry[] = [];
  private historyBufferIndex: number = 0;
  private readonly historyLock: { locked: boolean } = { locked: false };
  private readonly issuePatterns: Map<string, {
    count: number;
    lastOccurrence: number;
    averageInterval: number;
    severity: 'warning' | 'critical';
  }> = new Map();

  private recoveryQueue: Array<{
    issue: PerformanceIssue;
    strategy: RecoveryStrategy;
    timestamp: number;
    attempts: number;
  }> = [];

  private isProcessingRecovery: boolean = false;
  private readonly MAX_CONCURRENT_RECOVERIES = 2;
  private activeRecoveries: Set<string> = new Set();

  private readonly recoveryHistory: RecoveryHistoryEntry[] = [];
  private readonly MAX_RECOVERY_HISTORY = 1000;
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private healthMetrics: HealthMetrics = {
    recoverySuccessRate: 1,
    averageRecoveryTime: 0,
    criticalIssuesCount: 0,
    warningIssuesCount: 0,
    resourceUtilization: { cpu: 0, memory: 0, network: 0, timestamp: new Date().toISOString() }
  };

  private readonly LOCK_TIMEOUT = 5000; // 5 seconds
  private readonly BASE_RETRY_INTERVAL = 50; // 50ms base interval
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly MAX_BACKOFF_TIME = 1000; // 1 second max backoff

  private readonly LOCK_PRIORITIES = {
    CRITICAL: 0,    // Recovery operations, critical updates
    HIGH: 1,        // Performance history updates
    NORMAL: 2,      // Regular metric updates
    LOW: 3          // Non-critical operations
  } as const;

  private lockQueue: Array<{
    priority: number;
    timestamp: number;
    resolve: (value: boolean) => void;
  }> = [];

  private readonly METRICS_WINDOW = 5 * 60 * 1000; // 5 minutes
  private readonly PATTERN_DETECTION_THRESHOLD = 3; // Number of occurrences to detect pattern
  private readonly METRICS_AGGREGATION_INTERVAL = 60000; // 1 minute

  private metricsAggregator: {
    patterns: Map<MetricType, {
      occurrences: number;
      lastValue: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      severity: 'warning' | 'critical';
      timestamp: number;
    }>;
    aggregations: Map<MetricType, {
      sum: number;
      count: number;
      min: number;
      max: number;
      lastUpdate: number;
    }>;
  } = {
    patterns: new Map(),
    aggregations: new Map()
  };

  private readonly PREDICTION_WINDOW = 5 * 60 * 1000; // 5 minutes
  private readonly PREDICTION_THRESHOLD = 0.85; // 85% confidence threshold
  private readonly MIN_DATA_POINTS = 10; // Minimum data points needed for prediction

  private predictionModels: Map<MetricType, {
    lastPrediction: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    predictedValue: number;
    timestamp: number;
  }> = new Map();

  private readonly CORRELATION_WINDOW = 5 * 60 * 1000; // 5 minutes
  private readonly CORRELATION_THRESHOLD = 0.7; // 70% correlation threshold
  private readonly MIN_CORRELATION_POINTS = 15; // Minimum points for correlation analysis

  private metricCorrelations: Map<string, {
    correlation: number;
    strength: 'strong' | 'moderate' | 'weak';
    trend: 'positive' | 'negative' | 'none';
    lastUpdated: number;
    confidence: number;
  }> = new Map();

  private readonly PATTERN_ANALYSIS_WINDOW = 30 * 60 * 1000; // 30 minutes
  private readonly PATTERN_ANALYSIS_THRESHOLD = 0.8; // 80% confidence threshold
  private readonly MIN_PATTERN_POINTS = 20; // Minimum points for pattern analysis

  private readonly PATTERN_ANALYSIS_CONFIG = {
    window: 30 * 60 * 1000, // 30 minutes
    minPoints: 20,
    confidenceThreshold: 0.8,
    adaptiveThresholdFactor: 1.2
  };

  private patternAnalysis: {
    patterns: Map<MetricType, {
      historicalValues: Array<{ value: number; timestamp: number }>;
      predictedThreshold: number;
      confidence: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      lastAnalysis: number;
      adaptiveThreshold: number;
      recommendations: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        confidence: number;
        timestamp: number;
      }>;
    }>;
    recommendations: Map<MetricType, {
      action: string;
      priority: 'high' | 'medium' | 'low';
      confidence: number;
      timestamp: number;
    }>;
  } = {
    patterns: new Map(),
    recommendations: new Map()
  };

  private readonly ANOMALY_DETECTION_WINDOW = 15 * 60 * 1000; // 15 minutes
  private readonly ANOMALY_THRESHOLD = 2.5; // Standard deviations for anomaly detection
  private readonly MIN_ANOMALY_POINTS = 30; // Minimum points for reliable anomaly detection
  private readonly ANOMALY_CONFIDENCE_THRESHOLD = 0.95; // 95% confidence threshold

  private anomalyDetection: {
    baselines: Map<MetricType, {
      mean: number;
      stdDev: number;
      lastUpdate: number;
      confidence: number;
      seasonality: {
        period: number;
        amplitude: number;
        phase: number;
      } | null;
    }>;
    anomalies: Map<MetricType, Array<{
      value: number;
      timestamp: number;
      severity: 'critical' | 'warning';
      confidence: number;
      type: 'spike' | 'dip' | 'trend' | 'seasonal';
    }>>;
  } = {
    baselines: new Map(),
    anomalies: new Map()
  };

  private constructor(config: PerformanceMonitorConfig) {
    // Validate config
    if (!config.thresholds) {
      throw new Error('PerformanceMonitorConfig must include thresholds');
    }
    if (!config.optimizations) {
      throw new Error('PerformanceMonitorConfig must include optimizations');
    }

    this.metrics = new Map();
    this.thresholds = new Map();
    this.optimizations = new Map();
    this.monitoringInterval = null;
    this.realTimeAnalyzers = new Map();
    this.mlModels = new Map();
    this.performanceHistory = [];
    this.currentIssues = [];
    this.MAX_METRICS_PER_CATEGORY = config.maxMetricsPerCategory || 1000;
    this.MONITORING_INTERVAL = config.collectionInterval || 5000;
    this.PERFORMANCE_THRESHOLDS = config.thresholds;
    this.HISTORY_MAX_ENTRIES = config.historyMaxEntries || 100;
    this.ANALYTICS_WINDOW = config.analyticsWindow || 24 * 60 * 60 * 1000;
    this.priorityQueues = new Map();
    this.loadMetrics = new Map();
    this.resourceHistory = new Map();
    this.loadHistory = new Map();
    this.config = config;

    // Validate all strategies
    Object.values(this.strategies).forEach(strategy => {
      this.validateStrategy(strategy);
    });

    // Initialize in correct order
    this.initializeThresholds();
    this.initializeOptimizations();
    this.initializeRealTimeAnalyzers();
    this.initializeMLModels();
    this.initializeRecoveryActions();
    this.startMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      const defaultThresholds: PerformanceThresholds = {
        fps: { warning: 30, critical: 20 },
        frameTime: { warning: 33.33, critical: 50 },
        memoryUsage: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 },
        cpuUsage: { warning: 70, critical: 90 },
        priority: {
          highPriorityQueue: { warning: 10, critical: 20 },
          mediumPriorityQueue: { warning: 20, critical: 40 },
          lowPriorityQueue: { warning: 30, critical: 60 }
        },
        load: {
          concurrentRequests: { warning: 50, critical: 100 },
          processingTime: { warning: 1000, critical: 2000 },
          resourceUtilization: { warning: 70, critical: 90 }
        }
      };

      const config: PerformanceMonitorConfig = {
        maxMetricsPerCategory: 1000,
        collectionInterval: 5000,
        performanceThresholds: defaultThresholds,
        historyMaxEntries: 100,
        analyticsWindow: 24 * 60 * 60 * 1000,
        thresholds: defaultThresholds,
        optimizations: new Map()
      };
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  private initializeThresholds(): void {
    // Initialize system-wide thresholds
    this.thresholds.set('fps', {
      warning: this.PERFORMANCE_THRESHOLDS.fps.warning,
      critical: this.PERFORMANCE_THRESHOLDS.fps.critical
    });

    this.thresholds.set('memory', {
      warning: this.PERFORMANCE_THRESHOLDS.memoryUsage.warning,
      critical: this.PERFORMANCE_THRESHOLDS.memoryUsage.critical
    });

    this.thresholds.set('cpu', {
      warning: this.PERFORMANCE_THRESHOLDS.cpuUsage.warning,
      critical: this.PERFORMANCE_THRESHOLDS.cpuUsage.critical
    });
  }

  private initializeOptimizations(): void {
    // Add memory optimization
    this.optimizations.set('memory_cleanup', {
      name: 'Memory Cleanup',
      condition: (metrics) => {
        const memoryMetrics = metrics.get('memory.heap') || [];
        if (memoryMetrics.length === 0) return false;
        const latest = memoryMetrics[memoryMetrics.length - 1];
        return latest.value > this.PERFORMANCE_THRESHOLDS.memoryUsage.warning;
      },
      action: async () => {
        try {
          // Implement memory cleanup logic
          if (global.gc) {
            global.gc();
          }
          await this.forceGarbageCollection();
          await this.logAuditEntry('memory_cleanup_executed', { timestamp: new Date().toISOString() });
        } catch (error) {
          console.error('Memory cleanup failed:', error);
          await this.logError('memory_cleanup_failed', error);
        }
      },
      priority: 1
    });

    // Add CPU optimization
    this.optimizations.set('cpu_throttling', {
      name: 'CPU Throttling',
      condition: (metrics) => {
        const cpuMetrics = metrics.get('cpu.usage') || [];
        if (cpuMetrics.length === 0) return false;
        const latest = cpuMetrics[cpuMetrics.length - 1];
        return latest.value > this.PERFORMANCE_THRESHOLDS.cpuUsage.warning;
      },
      action: async () => {
        try {
          // Implement CPU throttling logic
          await this.throttleCPUIntensiveTasks();
          await this.logAuditEntry('cpu_throttling_executed', { timestamp: new Date().toISOString() });
        } catch (error) {
          console.error('CPU throttling failed:', error);
          await this.logError('cpu_throttling_failed', error);
        }
      },
      priority: 2
    });
  }

  private async forceGarbageCollection(): Promise<void> {
    // Implementation would depend on the environment
    if (global.gc) {
      global.gc();
    }
  }

  private async throttleCPUIntensiveTasks(): Promise<void> {
    // Implement CPU throttling logic
    // This could involve reducing animation frame rates, deferring non-critical tasks, etc.
  }

  private initializeRealTimeAnalyzers(): void {
    // Initialize real-time analyzers for critical metrics
    this.addRealTimeAnalyzer({
      name: 'fps',
      metric: 'fps',
      analyze: async (metrics) => {
        const fpsMetrics = metrics.get('fps') || [];
        const avgFps = fpsMetrics.reduce((sum, m) => sum + m.value, 0) / fpsMetrics.length;
        if (avgFps < this.PERFORMANCE_THRESHOLDS.fps.warning) {
          await this.optimizeRendering();
        }
      },
      config: {
        interval: 1000,
        windowSize: 5000,
        thresholds: { warning: this.PERFORMANCE_THRESHOLDS.fps.warning }
      },
      window: 5000,
      threshold: this.PERFORMANCE_THRESHOLDS.fps.warning,
      action: async (value) => {
        if (value < this.PERFORMANCE_THRESHOLDS.fps.warning) {
          await this.optimizeRendering();
        }
      },
      severity: 'warning'
    });

    this.addRealTimeAnalyzer({
      name: 'memory.heap',
      metric: 'memory.heap',
      analyze: async (metrics) => {
        const memoryMetrics = metrics.get('memory.heap') || [];
        const latestMemory = memoryMetrics[memoryMetrics.length - 1]?.value || 0;
        if (latestMemory > this.PERFORMANCE_THRESHOLDS.memoryUsage.warning) {
          await this.optimizeMemory();
        }
      },
      config: {
        interval: 5000,
        windowSize: 10000,
        thresholds: { warning: this.PERFORMANCE_THRESHOLDS.memoryUsage.warning }
      },
      window: 10000,
      threshold: this.PERFORMANCE_THRESHOLDS.memoryUsage.warning,
      action: async (value) => {
        if (value > this.PERFORMANCE_THRESHOLDS.memoryUsage.warning) {
          await this.optimizeMemory();
        }
      },
      severity: 'warning'
    });
  }

  private async optimizeRendering(): Promise<void> {
    // Implement rendering optimization logic
    // This could involve reducing animation complexity, deferring non-critical updates, etc.
  }

  private async optimizeMemory(): Promise<void> {
    // Implement memory optimization logic
    // This could involve clearing caches, reducing buffer sizes, etc.
  }

  private initializeMLModels(): void {
    // Initialize ML models for predictive analytics
    this.addMLModel({
      name: 'memory.heap',
      metric: 'memory.heap',
      predict: async (metrics) => {
        const memoryMetrics = metrics.get('memory.heap') || [];
        const cpuMetrics = metrics.get('cpu.usage') || [];
        const networkMetrics = metrics.get('network.latency') || [];
        
        // Simple prediction based on current metrics
        const latestMemory = memoryMetrics[memoryMetrics.length - 1]?.value || 0;
        const latestCpu = cpuMetrics[cpuMetrics.length - 1]?.value || 0;
        const latestNetwork = networkMetrics[networkMetrics.length - 1]?.value || 0;
        
        // Predict memory usage based on CPU and network metrics
        return latestMemory * (1 + latestCpu / 100) * (1 + latestNetwork / 1000);
      },
      config: {
        features: ['cpu.usage', 'network.latency', 'application.requests'],
        target: 'memory.heap',
        windowSize: 300000,
        confidenceThreshold: 0.8
      },
      features: ['cpu.usage', 'network.latency', 'application.requests'],
      predictionWindow: 300000,
      trainingInterval: 3600000,
      severity: 'warning'
    });

    this.addMLModel({
      name: 'cpu.usage',
      metric: 'cpu.usage',
      predict: async (metrics) => {
        const cpuMetrics = metrics.get('cpu.usage') || [];
        const memoryMetrics = metrics.get('memory.heap') || [];
        const networkMetrics = metrics.get('network.latency') || [];
        
        // Simple prediction based on current metrics
        const latestCpu = cpuMetrics[cpuMetrics.length - 1]?.value || 0;
        const latestMemory = memoryMetrics[memoryMetrics.length - 1]?.value || 0;
        const latestNetwork = networkMetrics[networkMetrics.length - 1]?.value || 0;
        
        // Predict CPU usage based on memory and network metrics
        return Math.min(100, latestCpu * (1 + latestMemory / (100 * 1024 * 1024)) * (1 + latestNetwork / 1000));
      },
      config: {
        features: ['memory.heap', 'network.latency', 'application.requests'],
        target: 'cpu.usage',
        windowSize: 300000,
        confidenceThreshold: 0.8
      },
      features: ['memory.heap', 'network.latency', 'application.requests'],
      predictionWindow: 300000,
      trainingInterval: 3600000,
      severity: 'warning'
    });

    this.mlModels.set('memory_prediction', {
      name: 'memory_prediction',
      metric: METRIC_TYPES.memoryUsage, // Add required metric property
      async predict(metrics: Map<string, PerformanceMetric[]>): Promise<number> {
        const memoryMetrics = metrics.get(METRIC_TYPES.memoryUsage) || [];
        const fpsMetrics = metrics.get(METRIC_TYPES.fps) || [];
        const frameTimeMetrics = metrics.get(METRIC_TYPES.frameTime) || [];
        
        // Get latest values with type safety and validation
        const latestMemory = this.validateMetricValue(
          memoryMetrics[memoryMetrics.length - 1]?.value ?? 0,
          METRIC_TYPES.memoryUsage
        ) ? memoryMetrics[memoryMetrics.length - 1]?.value ?? 0 : 0;
        
        const latestFps = this.validateMetricValue(
          fpsMetrics[fpsMetrics.length - 1]?.value ?? 60,
          METRIC_TYPES.fps
        ) ? fpsMetrics[fpsMetrics.length - 1]?.value ?? 60 : 60;
        
        const latestFrameTime = this.validateMetricValue(
          frameTimeMetrics[frameTimeMetrics.length - 1]?.value ?? 16.67,
          METRIC_TYPES.frameTime
        ) ? frameTimeMetrics[frameTimeMetrics.length - 1]?.value ?? 16.67 : 16.67;
        
        // Calculate prediction with multiple factors and bounds checking
        const fpsImpact = Math.max(-1, Math.min(1, (60 - latestFps) / 60));
        const frameTimeImpact = Math.max(-1, Math.min(1, (latestFrameTime - 16.67) / 16.67));
        let predictedValue = Math.max(0, latestMemory * (1 + (fpsImpact * 0.6 + frameTimeImpact * 0.4)));
        
        // Get pattern analysis if available with error handling
        try {
          const patternAnalysis = this.patternAnalysis.patterns.get(METRIC_TYPES.memoryUsage);
          if (patternAnalysis?.confidence > this.PATTERN_ANALYSIS_CONFIG.confidenceThreshold) {
            const patternAdjustment = patternAnalysis.trend === 'increasing' ? 1.1 : 
                                     patternAnalysis.trend === 'decreasing' ? 0.9 : 1.0;
            predictedValue = Math.max(0, predictedValue * patternAdjustment);
          }
        } catch (error) {
          console.warn('Pattern analysis failed:', error);
          // Continue with prediction without pattern adjustment
        }
        
        // Log prediction details with error handling
        try {
          await this.logAuditEntry('ml_prediction', {
            metric: METRIC_TYPES.memoryUsage,
            predictedValue,
            confidence: Math.min(0.95, 0.7 + (memoryMetrics.length / 100) * 0.2 + (fpsMetrics.length / 100) * 0.1),
            factors: [
              { metric: METRIC_TYPES.fps, impact: fpsImpact },
              { metric: METRIC_TYPES.frameTime, impact: frameTimeImpact }
            ],
            patternAnalysis: this.patternAnalysis.patterns.get(METRIC_TYPES.memoryUsage) ? {
              trend: this.patternAnalysis.patterns.get(METRIC_TYPES.memoryUsage)!.trend,
              confidence: this.patternAnalysis.patterns.get(METRIC_TYPES.memoryUsage)!.confidence
            } : undefined
          });
        } catch (error) {
          console.error('Failed to log prediction:', error);
          // Continue execution even if logging fails
        }
        
        return predictedValue;
      },
      config: {
        features: [METRIC_TYPES.fps, METRIC_TYPES.frameTime, METRIC_TYPES.memoryUsage],
        target: METRIC_TYPES.memoryUsage,
        windowSize: 300000,
        confidenceThreshold: 0.85
      },
      features: [METRIC_TYPES.fps, METRIC_TYPES.frameTime, METRIC_TYPES.memoryUsage],
      predictionWindow: 300000,
      trainingInterval: 900000
    });
  }

  private initializeRecoveryActions(): void {
    this.recoveryActions.set('log', {
      type: 'log',
      handler: async (issue: PerformanceIssue) => {
        await this.logError(issue.type, new Error(issue.details));
      }
    });

    this.recoveryActions.set('notify', {
      type: 'notify',
      handler: async (issue: PerformanceIssue) => {
        await this.notifyTeam(issue);
      }
    });

    this.recoveryActions.set('optimize', {
      type: 'optimize',
      handler: async (issue: PerformanceIssue) => {
        if (issue.component) {
          await this.optimizeResourceAllocation(issue.component);
        }
      }
    });

    this.recoveryActions.set('restart', {
      type: 'restart',
      handler: async (issue: PerformanceIssue) => {
        if (issue.component) {
          await this.restartComponent(issue.component);
        }
      }
    });
  }

  private async notifyTeam(issue: PerformanceIssue): Promise<void> {
    // Implement team notification logic
    console.log(`Notifying team about issue: ${issue.type} - ${issue.details}`);
    // Add actual notification implementation (email, Slack, etc.)
  }

  private async restartComponent(component: string): Promise<void> {
    // Implement component restart logic
    console.log(`Restarting component: ${component}`);
    // Add actual restart implementation
  }

  private async updateIssueHistory(issue: PerformanceIssue): Promise<void> {
    // Update issue history with resolution
    const historyEntry = this.performanceHistory.find(entry => 
      entry.issues.some(i => i.timestamp === issue.timestamp && i.type === issue.type)
    );

    if (historyEntry) {
      const issueIndex = historyEntry.issues.findIndex(i => 
        i.timestamp === issue.timestamp && i.type === issue.type
      );
      if (issueIndex !== -1) {
        historyEntry.issues[issueIndex] = issue;
      }
    }
  }

  private async escalateIssue(issue: PerformanceIssue): Promise<void> {
    // Implement issue escalation logic
    console.log(`Escalating critical issue: ${issue.type} - ${issue.details}`);
    issue.status = 'escalated';
    // Add actual escalation implementation (e.g., notify on-call engineer)
  }

  private async collectMetrics(timestamp: string): Promise<void> {
    try {
      // Add error boundary for each collection method
      await Promise.all([
        this.collectExistingMetrics(timestamp).catch(error => {
          console.error('Failed to collect existing metrics:', error);
          return this.logError('existing_metrics_collection_failed', error);
        }),
        this.collectSystemMetrics(timestamp).catch(error => {
          console.error('Failed to collect system metrics:', error);
          return this.logError('system_metrics_collection_failed', error);
        }),
        this.collectComponentMetrics(timestamp).catch(error => {
          console.error('Failed to collect component metrics:', error);
          return this.logError('component_metrics_collection_failed', error);
        }),
        this.collectUserInteractionMetrics(timestamp).catch(error => {
          console.error('Failed to collect user interaction metrics:', error);
          return this.logError('interaction_metrics_collection_failed', error);
        })
      ]);

      // Update performance history with error handling
      try {
        await this.updatePerformanceHistory(timestamp);
      } catch (error) {
        console.error('Failed to update performance history:', error);
        await this.logError('history_update_failed', error);
      }

      // Check for performance issues with error handling
      try {
        await this.checkPerformanceIssues();
      } catch (error) {
        console.error('Failed to check performance issues:', error);
        await this.logError('performance_check_failed', error);
      }

      // Run real-time analysis with error handling
      try {
        await this.runRealTimeAnalysis();
      } catch (error) {
        console.error('Failed to run real-time analysis:', error);
        await this.logError('realtime_analysis_failed', error);
      }

      // Update ML models with error handling
      try {
        await this.updateMLModels();
      } catch (error) {
        console.error('Failed to update ML models:', error);
        await this.logError('ml_model_update_failed', error);
      }

    } catch (error) {
      console.error('Failed to collect metrics:', error);
      await this.logError('metrics_collection_failed', error);
    }
  }

  private validateMetricValue(value: number, key: string): boolean {
    // Define validation rules for different metric types
    const validationRules: Record<string, (value: number) => boolean> = {
      fps: (v) => v >= 0 && v <= 240, // Reasonable FPS range
      frameTime: (v) => v >= 0 && v <= 1000, // Frame time in ms
      memoryUsage: (v) => v >= 0 && v <= 1024 * 1024 * 1024, // Max 1GB
      cpuUsage: (v) => v >= 0 && v <= 100, // CPU percentage
      network: (v) => v >= 0, // Network usage in bytes
    };

    const rule = validationRules[key];
    return rule ? rule(value) : value >= 0; // Default validation for unknown metrics
  }

  private async updatePerformanceHistory(timestamp: string): Promise<void> {
    const timestampNum = Date.now();
    
    // Initialize metrics with default values for required fields
    const metrics: Record<string, number> = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };

    await this.withLock(async () => {
      try {
        // Rest of the existing updatePerformanceHistory implementation...
        // ... existing code ...

        // Fix pattern detection with proper scoping
        for (const [metric, pattern] of this.metricsAggregator.patterns.entries()) {
          if (pattern.occurrences >= this.PATTERN_DETECTION_THRESHOLD) {
            const currentValue = this.getLatestMetricValue(metric) ?? 0;
            const issueType = `${metric}_pattern_detected` as PerformanceIssueType;
            const issue: PerformanceIssue = {
              type: issueType,
              severity: pattern.severity,
              value: currentValue,
              timestamp: new Date().toISOString(),
              details: `Pattern detected: ${pattern.trend} trend with ${pattern.occurrences} occurrences`,
              status: 'pending'
            };

            await this.handleMetricPattern(metric, pattern, currentValue);
          }
        }

        // Add correlation analysis
        await this.analyzeMetricCorrelations();

        // Add pattern analysis
        await this.analyzePatterns();

        // Check for active recommendations
        for (const [metric, recommendation] of this.patternAnalysis.recommendations.entries()) {
          if (recommendation.priority === 'high' && 
              Date.now() - recommendation.timestamp < this.PATTERN_ANALYSIS_WINDOW) {
            const currentValue = this.getLatestMetricValue(metric);
            if (currentValue !== null) {
              const threshold = this.getMetricThreshold(metric);
              if (threshold && currentValue > threshold.warning) {
                await this.handleMetricPattern(metric, {
                  occurrences: 1,
                  trend: 'increasing',
                  severity: 'warning',
                  timestamp: Date.now()
                }, currentValue);
              }
            }
          }
        }

        // Add anomaly detection
        await this.detectAnomalies();

        // ... rest of existing code ...

      } catch (error) {
        await this.logError('history_update_failed', {
          error: error instanceof Error ? error.message : String(error),
          timestamp: timestampNum,
          metrics: Object.keys(metrics).length,
          priority: this.LOCK_PRIORITIES.HIGH
        });
        throw error;
      }
    }, this.LOCK_PRIORITIES.HIGH); // Use HIGH priority for history updates
  }

  private async handleMetricPattern(
    metric: MetricType,
    pattern: {
      occurrences: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      severity: 'warning' | 'critical';
      timestamp: number;
    },
    currentValue: number
  ): Promise<void> {
    const issueType = `${metric}_pattern_detected` as PerformanceIssueType;
    const issue: PerformanceIssue = {
      type: issueType,
      severity: pattern.severity,
      value: currentValue,
      timestamp: new Date().toISOString(),
      details: `Pattern detected: ${pattern.trend} trend with ${pattern.occurrences} occurrences`,
      status: 'pending'
    };

    await this.logAuditEntry('pattern_detected', {
      metric,
      pattern,
      currentValue,
      issue
    });

    if (pattern.severity === 'critical') {
      await this.handleCriticalIssue(issue);
    } else {
      await this.handleWarningIssue(issue);
    }
  }

  private async updateHealthMetrics(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.HEALTH_CHECK_INTERVAL;

    // Filter recent recovery history
    const recentRecoveries = this.recoveryHistory.filter(
      recovery => recovery.startTime >= windowStart
    );

    // Calculate recovery success rate
    const completedRecoveries = recentRecoveries.filter(
      recovery => recovery.status !== 'in_progress'
    );
    const successfulRecoveries = completedRecoveries.filter(
      recovery => recovery.status === 'success'
    );
    this.healthMetrics.recoverySuccessRate = completedRecoveries.length > 0
      ? successfulRecoveries.length / completedRecoveries.length
      : 1;

    // Calculate average recovery time
    const recoveryTimes = completedRecoveries
      .filter(recovery => recovery.endTime !== undefined)
      .map(recovery => recovery.endTime! - recovery.startTime);
    this.healthMetrics.averageRecoveryTime = recoveryTimes.length > 0
      ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
      : 0;

    // Update issue counts
    this.healthMetrics.criticalIssuesCount = this.currentIssues.filter(
      issue => issue.severity === 'critical'
    ).length;
    this.healthMetrics.warningIssuesCount = this.currentIssues.filter(
      issue => issue.severity === 'warning'
    ).length;

    // Update resource utilization
    const currentUsage = await this.getResourceUsage('system');
    if (currentUsage) {
      this.healthMetrics.resourceUtilization = {
        ...currentUsage,
        timestamp: new Date(now).toISOString()
      };
    }

    // Log health metrics update
    await this.logAuditEntry('health_metrics_updated', {
      recoverySuccessRate: this.healthMetrics.recoverySuccessRate,
      averageRecoveryTime: this.healthMetrics.averageRecoveryTime,
      criticalIssuesCount: this.healthMetrics.criticalIssuesCount,
      warningIssuesCount: this.healthMetrics.warningIssuesCount,
      timestamp: now
    });
  }

  private getLatestMetricValue(metric: string): number | null {
    const metrics = this.metrics.get(metric);
    if (!metrics || metrics.length === 0) return null;
    return metrics[metrics.length - 1].value;
  }

  private async checkPattern(type: string, value: number, threshold: number, isCritical: boolean): Promise<'warning' | 'critical'> {
    // Validate metric type
    if (!Object.values(METRIC_TYPES).includes(type as MetricType)) {
      await this.logError('invalid_metric_type', { type, value });
      return isCritical ? 'critical' : 'warning';
    }

    const metricType = type as MetricType;
    
    // Get pattern analysis data with proper type checking
    const patternAnalysis = this.patternAnalysis.patterns.get(metricType);
    let predictedSeverity: 'warning' | 'critical' = isCritical ? 'critical' : 'warning';
    
    if (patternAnalysis && patternAnalysis.confidence >= this.PATTERN_ANALYSIS_CONFIG.confidenceThreshold) {
      // Use pattern analysis to adjust severity
      const predictedValue = this.predictMetricValue(patternAnalysis.historicalValues);
      const adaptiveThreshold = patternAnalysis.adaptiveThreshold;
      
      if (predictedValue > adaptiveThreshold) {
        predictedSeverity = 'critical';
      } else if (predictedValue > threshold) {
        predictedSeverity = 'warning';
      }
      
      await this.logAuditEntry('pattern_prediction', {
        metric: metricType,
        predictedValue,
        currentValue: value,
        threshold: adaptiveThreshold,
        confidence: patternAnalysis.confidence
      });
    }
    
    return predictedSeverity;
  }

  // Add after the MetricType definition
  private static MetricsValidator = class {
    private static readonly VALID_METRIC_TYPES = new Set(Object.values(METRIC_TYPES));
    private static readonly METRIC_RANGES: Record<MetricType, { min: number; max: number }> = {
      [METRIC_TYPES.fps]: { min: 0, max: 240 },
      [METRIC_TYPES.frameTime]: { min: 0, max: 1000 },
      [METRIC_TYPES.memoryUsage]: { min: 0, max: Number.MAX_SAFE_INTEGER },
      [METRIC_TYPES.cpuUsage]: { min: 0, max: 100 },
      [METRIC_TYPES.network]: { min: 0, max: Number.MAX_SAFE_INTEGER }
    };

    static isValidMetricType(type: string): type is MetricType {
      return this.VALID_METRIC_TYPES.has(type as MetricType);
    }

    static validateMetricValue(type: MetricType, value: number): boolean {
      const range = this.METRIC_RANGES[type];
      return value >= range.min && value <= range.max;
    }

    static validateMetric(metric: { type: string; value: number }): metric is { type: MetricType; value: number } {
      return this.isValidMetricType(metric.type) && this.validateMetricValue(metric.type as MetricType, metric.value);
    }

    static getMetricType(type: string): MetricType | null {
      return this.isValidMetricType(type) ? (type as MetricType) : null;
    }

    static formatTimestamp(timestamp: number): string {
      return new Date(timestamp).toISOString();
    }
  };

  // Update the detectPerformanceIssues function
  private detectPerformanceIssues(metrics: {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    cpuUsage: number;
  }): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const now = Date.now();
    const timestamp = PerformanceMonitor.MetricsValidator.formatTimestamp(now);

    const checkPattern = (metricType: MetricType, value: number, threshold: number, isCritical: boolean): 'warning' | 'critical' => {
      const patternAnalysis = this.patternAnalysis.patterns.get(metricType);
      let predictedSeverity: 'warning' | 'critical' = isCritical ? 'critical' : 'warning';
      
      if (patternAnalysis && patternAnalysis.confidence >= this.PATTERN_ANALYSIS_CONFIG.confidenceThreshold) {
        const predictedValue = this.predictMetricValue(patternAnalysis.historicalValues);
        const adaptiveThreshold = patternAnalysis.adaptiveThreshold;
        
        if (predictedValue > adaptiveThreshold) {
          predictedSeverity = 'critical';
        } else if (predictedValue > threshold) {
          predictedSeverity = 'warning';
        }
        
        this.logAuditEntry('pattern_prediction', {
          metric: metricType,
          predictedValue,
          currentValue: value,
          threshold: adaptiveThreshold,
          confidence: patternAnalysis.confidence
        }).catch(console.error);
      }
      
      return predictedSeverity;
    };

    // Validate and check FPS
    if (PerformanceMonitor.MetricsValidator.validateMetricValue(METRIC_TYPES.fps, metrics.fps) &&
        metrics.fps < this.PERFORMANCE_THRESHOLDS.fps.critical) {
      const severity = checkPattern(METRIC_TYPES.fps, metrics.fps, this.PERFORMANCE_THRESHOLDS.fps.warning, true);
      issues.push({
        type: 'fps',
        severity,
        value: metrics.fps,
        timestamp,
        details: `FPS dropped to ${metrics.fps}`
      });
    }

    // Validate and check frame time
    if (PerformanceMonitor.MetricsValidator.validateMetricValue(METRIC_TYPES.frameTime, metrics.frameTime) &&
        metrics.frameTime > this.PERFORMANCE_THRESHOLDS.frameTime.critical) {
      const severity = checkPattern(METRIC_TYPES.frameTime, metrics.frameTime, this.PERFORMANCE_THRESHOLDS.frameTime.warning, true);
      issues.push({
        type: 'frameTime' as PerformanceIssueType,
        severity,
        value: metrics.frameTime,
        timestamp,
        details: `Frame time increased to ${metrics.frameTime}ms`
      });
    }

    // Validate and check memory usage
    if (PerformanceMonitor.MetricsValidator.validateMetricValue(METRIC_TYPES.memoryUsage, metrics.memoryUsage) &&
        metrics.memoryUsage > this.PERFORMANCE_THRESHOLDS.memoryUsage.critical) {
      const severity = checkPattern(METRIC_TYPES.memoryUsage, metrics.memoryUsage, this.PERFORMANCE_THRESHOLDS.memoryUsage.warning, true);
      issues.push({
        type: 'memoryUsage' as PerformanceIssueType,
        severity,
        value: metrics.memoryUsage,
        timestamp,
        details: `Memory usage increased to ${metrics.memoryUsage}MB`
      });
    }

    // Validate and check CPU usage
    if (PerformanceMonitor.MetricsValidator.validateMetricValue(METRIC_TYPES.cpuUsage, metrics.cpuUsage) &&
        metrics.cpuUsage > this.PERFORMANCE_THRESHOLDS.cpuUsage.critical) {
      const severity = checkPattern(METRIC_TYPES.cpuUsage, metrics.cpuUsage, this.PERFORMANCE_THRESHOLDS.cpuUsage.warning, true);
      issues.push({
        type: 'cpuUsage' as PerformanceIssueType,
        severity,
        value: metrics.cpuUsage,
        timestamp,
        details: `CPU usage increased to ${metrics.cpuUsage}%`
      });
    }

    return issues;
  }

  private checkMetricCorrelations(metrics: {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    cpuUsage: number;
  }, issues: PerformanceIssue[]): void {
    // Check for correlation between FPS and CPU
    if (metrics.fps < this.PERFORMANCE_THRESHOLDS.fps.warning && 
        metrics.cpuUsage > this.PERFORMANCE_THRESHOLDS.cpuUsage.warning) {
      issues.push({
        type: 'correlation.fps_cpu',
        severity: 'warning',
        value: metrics.cpuUsage / metrics.fps, // correlation ratio
        timestamp: new Date().toISOString(),
        status: 'pending',
        details: `High CPU usage (${metrics.cpuUsage}%) correlating with low FPS (${metrics.fps})`
      });
    }

    // Check for correlation between Memory and Frame Time
    if (metrics.memoryUsage > this.PERFORMANCE_THRESHOLDS.memoryUsage.warning && 
        metrics.frameTime > this.PERFORMANCE_THRESHOLDS.frameTime.warning) {
      issues.push({
        type: 'correlation.memory_frametime',
        severity: 'warning',
        value: metrics.frameTime / (metrics.memoryUsage / (1024 * 1024)), // normalized ratio
        timestamp: new Date().toISOString(),
        status: 'pending',
        details: `High memory usage (${metrics.memoryUsage} bytes) correlating with high frame time (${metrics.frameTime}ms)`
      });
    }
  }

  private async checkPerformanceIssues(): Promise<void> {
    try {
      const latestHistory = this.performanceHistory[this.performanceHistory.length - 1];
      if (!latestHistory) return;

      // Process issues in order of severity
      for (const issue of latestHistory.issues) {
        if (issue.severity === 'critical') {
          await this.handleCriticalIssue(issue);
        } else if (issue.severity === 'warning') {
          await this.handleWarningIssue(issue);
        }
      }

      // Check for metric correlations
      this.checkMetricCorrelations(latestHistory.metrics, latestHistory.issues);

    } catch (error) {
      console.error('Error checking performance issues:', error);
      await this.logError('check_performance_issues', error);
    }
  }

  private async handleCriticalIssue(issue: PerformanceIssue): Promise<void> {
    await this.withLock(async () => {
      const strategy = this.recoveryManager?.getStrategy?.(issue.type);
      if (!strategy) {
        await this.logError('recovery_strategy_not_found', {
          issueType: issue.type,
          timestamp: Date.now()
        });
        return;
      }

      await this.scheduleRecovery(issue, strategy);
    }, this.LOCK_PRIORITIES.CRITICAL);
  }

  private verifySystemState(): boolean {
    try {
      // Verify metrics integrity
      for (const [key, values] of this.metrics) {
        if (!Array.isArray(values)) return false;
        for (const metric of values) {
          if (typeof metric.value !== 'number' || isNaN(metric.value)) return false;
        }
      }

      // Verify history consistency
      if (this.performanceHistory.length > this.HISTORY_MAX_ENTRIES) return false;
      
      // Verify issues array
      for (const issue of this.currentIssues) {
        if (!issue.type || !issue.severity || !issue.timestamp) return false;
      }

      return true;
    } catch (error) {
      console.error('System state verification failed:', error);
      return false;
    }
  }

  private async handleWarningIssue(issue: PerformanceIssue): Promise<void> {
    await this.withLock(async () => {
      // Implement warning issue handling
      await this.logAuditEntry('warning_performance_issue', {
        type: issue.type,
        value: issue.value,
        timestamp: issue.timestamp
      });

      // Apply optimizations if available
      const optimization = this.optimizations.get(`${issue.type}_optimization`);
      if (optimization) {
        await optimization.action();
      }
    }, this.LOCK_PRIORITIES.HIGH);
  }

  private async collectExistingMetrics(timestamp: string): Promise<void> {
    try {
      // Collect metrics from existing performance entries
      const entries = performance.getEntriesByType('measure');
      for (const entry of entries) {
        const metric: PerformanceMetric = {
          timestamp,
          value: entry.duration,
          category: 'performance',
          subcategory: entry.name,
          metadata: {
            startTime: entry.startTime,
            entryType: entry.entryType
          }
        };
        this.addMetric(entry.name, metric);
      }
      performance.clearMeasures();
    } catch (error) {
      console.error('Failed to collect existing metrics:', error);
      await this.logError('existing_metrics_collection_failed', error);
    }
  }

  private async collectSystemMetrics(timestamp: string): Promise<void> {
    try {
      // Memory metrics
      if (performance.memory) {
        const memoryMetric: PerformanceMetric = {
          timestamp,
          value: performance.memory.usedJSHeapSize,
          category: 'system',
          subcategory: 'memory',
          metadata: {
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          }
        };
        this.addMetric('memory.heap', memoryMetric);
      }

      // CPU metrics (estimated)
      const cpuUsage = await this.estimateCPUUsage();
      const cpuMetric: PerformanceMetric = {
        timestamp,
        value: cpuUsage,
        category: 'system',
        subcategory: 'cpu'
      };
      this.addMetric('cpu.usage', cpuMetric);

      // Network metrics
      const networkEntries = performance.getEntriesByType('resource');
      const networkMetrics = this.aggregateNetworkMetrics(networkEntries);
      for (const [key, value] of Object.entries(networkMetrics)) {
        this.addMetric(`network.${key}`, {
          timestamp,
          value,
          category: 'system',
          subcategory: 'network'
        });
      }
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
      await this.logError('system_metrics_collection_failed', error);
    }
  }

  private async collectComponentMetrics(timestamp: string): Promise<void> {
    try {
      // Component render metrics
      const renderMetrics = this.getComponentRenderMetrics();
      for (const metric of renderMetrics) {
        this.addMetric(`component.${metric.metadata?.component}`, metric);
      }

      // Component memory metrics
      const memoryMetrics = this.getComponentMemoryMetrics();
      for (const metric of memoryMetrics) {
        this.addMetric(`component.memory.${metric.metadata?.component}`, metric);
      }
    } catch (error) {
      console.error('Failed to collect component metrics:', error);
      await this.logError('component_metrics_collection_failed', error);
    }
  }

  private async collectUserInteractionMetrics(timestamp: string): Promise<void> {
    try {
      // Interaction timing metrics
      const interactionEntries = performance.getEntriesByType('first-input');
      for (const entry of interactionEntries) {
        const processingEnd = entry.processingEnd ?? entry.startTime + entry.duration;
        const metric: PerformanceMetric = {
          timestamp,
          value: processingEnd - entry.startTime,
          category: 'interaction',
          subcategory: 'first-input',
          metadata: {
            name: entry.name,
            target: entry.target?.tagName
          }
        };
        this.addMetric('interaction.first-input', metric);
      }

      // Long task metrics
      const longTaskEntries = performance.getEntriesByType('longtask');
      for (const entry of longTaskEntries) {
        const metric: PerformanceMetric = {
          timestamp,
          value: entry.duration,
          category: 'interaction',
          subcategory: 'longtask',
          metadata: {
            name: entry.name,
            startTime: entry.startTime
          }
        };
        this.addMetric('interaction.longtask', metric);
      }
    } catch (error) {
      console.error('Failed to collect user interaction metrics:', error);
      await this.logError('interaction_metrics_collection_failed', error);
    }
  }

  private validateMetric(metric: PerformanceMetric): boolean {
    if (!metric || typeof metric.value !== 'number' || isNaN(metric.value)) {
      console.warn('Invalid metric data:', metric);
      return false;
    }
    if (!metric.timestamp || isNaN(new Date(metric.timestamp).getTime())) {
      console.warn('Invalid metric timestamp:', metric);
      return false;
    }
    return true;
  }

  private cleanupMetrics(): void {
    const currentTime = Date.now();
    const cutoffTime = currentTime - this.ANALYTICS_WINDOW;

    // Cleanup metrics map with atomic updates
    for (const [key, metrics] of this.metrics.entries()) {
        // First ensure we don't exceed max metrics per category
        if (metrics.length > this.MAX_METRICS_PER_CATEGORY) {
            const updatedMetrics = metrics.slice(-this.MAX_METRICS_PER_CATEGORY);
            this.metrics.set(key, updatedMetrics);
            continue; // Skip to next iteration as we've already updated this category
        }

        // Then remove old metrics atomically
        const validMetrics = metrics.filter(m => {
            const metricTime = new Date(m.timestamp).getTime();
            return metricTime > cutoffTime && !isNaN(metricTime);
        });
        
        if (validMetrics.length !== metrics.length) {
            this.metrics.set(key, validMetrics);
        }
    }

    // Cleanup performance history using atomic operations
    const validHistory = this.performanceHistoryBuffer.filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime > cutoffTime && !isNaN(entryTime);
    });
    
    if (validHistory.length !== this.performanceHistoryBuffer.length) {
        // Atomic update of history buffer
        this.performanceHistoryBuffer.length = 0;
        this.performanceHistoryBuffer.push(...validHistory);
        this.historyBufferIndex = this.performanceHistoryBuffer.length % this.HISTORY_MAX_ENTRIES;
        // Update public history array atomically
        this.performanceHistory = [...this.performanceHistoryBuffer];
    }

    // Cleanup current issues atomically
    const validIssues = this.currentIssues.filter(issue => {
        const issueTime = new Date(issue.timestamp).getTime();
        return issueTime > cutoffTime && !isNaN(issueTime);
    });
    
    if (validIssues.length !== this.currentIssues.length) {
        this.currentIssues = validIssues;
    }

    // Force garbage collection if available
    if (global.gc) {
        try {
            global.gc();
        } catch (error) {
            console.warn('Failed to trigger garbage collection:', error);
        }
    }
  }

  private addMetric(key: string, metric: PerformanceMetric): void {
    // Validate metric before adding
    if (!this.validateMetric(metric)) {
        console.warn(`Invalid metric data for ${key}:`, metric);
        return;
    }

    // Get current metrics array atomically
    const currentMetrics = this.metrics.get(key) || [];
    
    // Create new array with updated metrics, ensuring we don't exceed max size
    const updatedMetrics = [...currentMetrics, metric].slice(-this.MAX_METRICS_PER_CATEGORY);
    
    // Update metrics map atomically
    this.metrics.set(key, updatedMetrics);

    // Schedule cleanup after every 10 metrics
    if (this.metrics.size % 10 === 0) {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => this.cleanupMetrics());
        } else {
            setTimeout(() => this.cleanupMetrics(), 0);
        }
    }
  }

  private async estimateCPUUsage(): Promise<number> {
    const start = performance.now();
    return new Promise<number>((resolve) => {
      setTimeout(() => {
        const end = performance.now();
        const lag = end - start - 100; // Expected 100ms delay
        const usage = Math.min(100, Math.max(0, (lag / 100) * 100));
        resolve(usage);
      }, 100);
    });
  }

  private aggregateNetworkMetrics(entries: PerformanceEntryList): NetworkMetrics {
    const networkMetrics: NetworkMetrics = {
      totalRequests: 0,
      failedRequests: 0,
      totalBytes: 0,
      averageLatency: 0,
      slowRequests: 0
    };

    let totalLatency = 0;
    let requestCount = 0;

    entries.forEach(entry => {
      if (entry.entryType === 'resource') {
        const resourceEntry = entry as PerformanceResourceTiming;
        if (resourceEntry.initiatorType === 'xmlhttprequest' || resourceEntry.initiatorType === 'fetch') {
          networkMetrics.totalRequests++;
          networkMetrics.totalBytes += resourceEntry.transferSize || 0;
          
          const latency = resourceEntry.responseEnd - resourceEntry.requestStart;
          totalLatency += latency;
          requestCount++;

          if (latency > 1000) {
            networkMetrics.slowRequests++;
          }

          if (resourceEntry.responseStatus >= 400) {
            networkMetrics.failedRequests++;
          }
        }
      }
    });

    if (requestCount > 0) {
      networkMetrics.averageLatency = totalLatency / requestCount;
    }

    return networkMetrics;
  }

  private getComponentRenderMetrics(): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];
    const entries = performance.getEntriesByType('measure');
    
    entries.forEach(entry => {
      if (entry.name.startsWith('render-')) {
        const componentName = entry.name.replace('render-', '');
        metrics.push({
          timestamp: new Date().toISOString(),
          value: entry.duration,
          category: 'component',
          subcategory: 'render',
          metadata: {
            component: componentName,
            type: 'render-time'
          }
        });
      }
    });

    return metrics;
  }

  private getComponentMemoryMetrics(): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];
    const entries = performance.getEntriesByType('measure');
    
    entries.forEach(entry => {
      if (entry.name.startsWith('memory-')) {
        const componentName = entry.name.replace('memory-', '');
        metrics.push({
          timestamp: new Date().toISOString(),
          value: entry.duration,
          category: 'component',
          subcategory: 'memory',
          metadata: {
            component: componentName,
            type: 'memory-usage'
          }
        });
      }
    });

    return metrics;
  }

  private async logAuditEntry(action: string, details: Record<string, any>): Promise<void> {
    const entry: AuditLogEntry = {
      userId: 'system',
      action,
      timestamp: new Date().toISOString(),
      endpoint: 'performance-monitor',
      method: 'POST',
      status: 'success',
      details
    };
    await logAudit(entry);
  }

  private async logError(action: string, error: any): Promise<void> {
    const entry: AuditLogEntry = {
      userId: 'system',
      action,
      timestamp: new Date().toISOString(),
      endpoint: 'performance-monitor',
      method: 'POST',
      status: 'error',
      details: { error: error.message }
    };
    await logAudit(entry);
  }

  public startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    // Start metrics aggregation
    this.aggregateMetrics();

    // Start regular monitoring
    this.monitoringInterval = setInterval(
      () => this.checkPerformanceIssues(),
      this.MONITORING_INTERVAL
    );
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  public addRealTimeAnalyzer(analyzer: RealTimeAnalyzer): void {
    this.realTimeAnalyzers.set(analyzer.name, analyzer);
  }

  public removeRealTimeAnalyzer(name: string): void {
    this.realTimeAnalyzers.delete(name);
  }

  public addMLModel(model: MLModel): void {
    this.mlModels.set(model.name, model);
  }

  public removeMLModel(name: string): void {
    this.mlModels.delete(name);
  }

  private async runRealTimeAnalysis(): Promise<void> {
    try {
      for (const [name, analyzer] of this.realTimeAnalyzers) {
        const metrics = this.metrics.get(analyzer.metric);
        if (!metrics || metrics.length === 0) continue;

        const window = analyzer.window || analyzer.config.windowSize;
        const relevantMetrics = metrics.slice(-Math.ceil(window / this.MONITORING_INTERVAL));
        
        if (analyzer.action && analyzer.threshold) {
          const latestValue = relevantMetrics[relevantMetrics.length - 1].value;
          if (latestValue > analyzer.threshold) {
            await analyzer.action(latestValue);
          }
        }

        await analyzer.analyze(new Map([[analyzer.metric, relevantMetrics]]));
      }
    } catch (error) {
      console.error('Failed to run real-time analysis:', error);
      await this.logError('realtime_analysis_failed', error);
    }
  }

  private async updateMLModels(): Promise<void> {
    try {
      for (const [name, model] of this.mlModels) {
        const metrics = this.metrics.get(model.metric);
        if (!metrics || metrics.length === 0) continue;

        const window = model.predictionWindow || model.config.windowSize;
        const relevantMetrics = metrics.slice(-Math.ceil(window / this.MONITORING_INTERVAL));

        // Get feature metrics
        const featureMetrics = new Map<string, PerformanceMetric[]>();
        if (model.features) {
          for (const feature of model.features) {
            const featureData = this.metrics.get(feature);
            if (featureData) {
              featureMetrics.set(feature, featureData.slice(-Math.ceil(window / this.MONITORING_INTERVAL)));
            }
          }
        }

        // Update model with new data
        const prediction = await model.predict(featureMetrics);
        
        // Store prediction as a new metric
        this.addMetric(`${model.metric}.prediction`, {
          timestamp: new Date().toISOString(),
          value: prediction,
          category: 'ml',
          subcategory: model.metric,
          metadata: {
            model: name,
            confidence: model.config.confidenceThreshold
          }
        });
      }
    } catch (error) {
      console.error('Failed to update ML models:', error);
      await this.logError('ml_model_update_failed', error);
    }
  }

  public async trackResourceRequest(request: ResourceRequest): Promise<void> {
    const { component, priority } = request;
    let metrics = this.priorityQueues.get(component);

    if (!metrics) {
      metrics = {
        component,
        highPriorityQueue: [],
        mediumPriorityQueue: [],
        lowPriorityQueue: [],
        processingOrder: ['high', 'medium', 'low'],
        priorityViolations: [],
        lastUpdated: new Date().toISOString()
      };
      this.priorityQueues.set(component, metrics);
    }

    // Add to appropriate queue
    switch (priority) {
      case 'high':
        metrics.highPriorityQueue.push(request);
        break;
      case 'medium':
        metrics.mediumPriorityQueue.push(request);
        break;
      case 'low':
        metrics.lowPriorityQueue.push(request);
        break;
    }

    // Update history
    const history = this.resourceHistory.get(component) || [];
    history.push(request);
    if (history.length > this.config.historyMaxEntries) {
      history.shift();
    }
    this.resourceHistory.set(component, history);

    // Check for violations
    await this.checkPriorityViolations(component);
  }

  public async updateResourcePriority(
    component: string,
    resourceType: string,
    newPriority: ResourcePriority
  ): Promise<void> {
    const metrics = this.priorityQueues.get(component);
    if (!metrics) return;

    // Find and remove from current queue
    const queues = [
      metrics.highPriorityQueue,
      metrics.mediumPriorityQueue,
      metrics.lowPriorityQueue
    ];

    for (const queue of queues) {
      const index = queue.findIndex(req => req.resourceType === resourceType);
      if (index !== -1) {
        const request = queue.splice(index, 1)[0];
        request.priority = newPriority;
        await this.trackResourceRequest(request);
        break;
      }
    }
  }

  public async getPriorityMetrics(component: string): Promise<PriorityMetrics | undefined> {
    return this.priorityQueues.get(component);
  }

  private async checkPriorityViolations(component: string): Promise<PriorityViolation[]> {
    const metrics = this.priorityQueues.get(component);
    if (!metrics || !this.config.thresholds?.priority) return [];

    const violations: PriorityViolation[] = [];
    const { priority } = this.config.thresholds;

    try {
      // Check high priority queue with null safety
      if (metrics.highPriorityQueue?.length >= priority.highPriorityQueue.warning) {
        violations.push({
          type: 'priority.violation',
          severity: metrics.highPriorityQueue.length >= priority.highPriorityQueue.critical
            ? 'critical'
            : 'warning',
          component,
          details: `High priority queue length (${metrics.highPriorityQueue.length}) exceeds threshold`,
          timestamp: new Date().toISOString()
        });
      }

      // Check medium priority queue with null safety
      if (metrics.mediumPriorityQueue?.length >= priority.mediumPriorityQueue.warning) {
        violations.push({
          type: 'priority.violation',
          severity: metrics.mediumPriorityQueue.length >= priority.mediumPriorityQueue.critical
            ? 'critical'
            : 'warning',
          component,
          details: `Medium priority queue length (${metrics.mediumPriorityQueue.length}) exceeds threshold`,
          timestamp: new Date().toISOString()
        });
      }

      // Check low priority queue with null safety
      if (metrics.lowPriorityQueue?.length >= priority.lowPriorityQueue.warning) {
        violations.push({
          type: 'priority.violation',
          severity: metrics.lowPriorityQueue.length >= priority.lowPriorityQueue.critical
            ? 'critical'
            : 'warning',
          component,
          details: `Low priority queue length (${metrics.lowPriorityQueue.length}) exceeds threshold`,
          timestamp: new Date().toISOString()
        });
      }

      metrics.priorityViolations = violations;
      return violations;
    } catch (error) {
      console.error('Error checking priority violations:', error);
      await this.logError('priority_violation_check_failed', error);
      return [];
    }
  }

  public async trackLoadBalance(snapshot: LoadBalanceMetrics): Promise<void> {
    const { component } = snapshot;
    this.loadMetrics.set(component, snapshot);

    // Update history
    const history = this.loadHistory.get(component) || [];
    history.push(snapshot);
    if (history.length > this.config.historyMaxEntries) {
      history.shift();
    }
    this.loadHistory.set(component, history);

    // Check for load issues
    await this.checkLoadBalance(component);
  }

  public async getLoadBalanceMetrics(component: string): Promise<LoadBalanceMetrics | undefined> {
    const metrics = this.loadMetrics.get(component);
    if (!metrics) return undefined;

    const loadDistribution = this.calculateLoadDistribution(metrics);
    const recommendations = await this.generateLoadRecommendations(metrics);

    return {
      ...metrics,
      loadDistribution,
      recommendations
    };
  }

  private calculateLoadDistribution(metrics: LoadBalanceMetrics): ResourceUtilization {
    const { resourceUtilization } = metrics.metrics;
    const total = resourceUtilization.cpu + resourceUtilization.memory + resourceUtilization.network;
    
    return {
      cpu: (resourceUtilization.cpu / total) * 100,
      memory: (resourceUtilization.memory / total) * 100,
      network: (resourceUtilization.network / total) * 100
    };
  }

  private async generateLoadRecommendations(metrics: LoadBalanceMetrics): Promise<ResourceOptimization[]> {
    const recommendations: ResourceOptimization[] = [];
    if (!this.config.thresholds) return recommendations;

    const { load } = this.config.thresholds;

    // Check concurrent requests
    if (metrics.activeRequests >= load.concurrentRequests.warning) {
      recommendations.push({
        type: 'resource.optimization',
        action: 'Consider implementing request throttling',
        impact: 0.7,
        component: metrics.component,
        timestamp: new Date().toISOString()
      });
    }

    // Check processing time
    if (metrics.processingTime >= load.processingTime.warning) {
      recommendations.push({
        type: 'resource.optimization',
        action: 'Optimize request processing pipeline',
        impact: 0.8,
        component: metrics.component,
        timestamp: new Date().toISOString()
      });
    }

    return recommendations;
  }

  public async checkLoadBalance(component: string): Promise<LoadBalanceIssue[]> {
    const metrics = this.loadMetrics.get(component);
    if (!metrics || !this.config.thresholds) return [];

    const issues: LoadBalanceIssue[] = [];
    const { load } = this.config.thresholds;
    const { resourceUtilization } = metrics.metrics;

    // Check for resource imbalance
    const avgUtilization = (resourceUtilization.cpu + resourceUtilization.memory + resourceUtilization.network) / 3;
    const maxDeviation = Math.max(
      Math.abs(resourceUtilization.cpu - avgUtilization),
      Math.abs(resourceUtilization.memory - avgUtilization),
      Math.abs(resourceUtilization.network - avgUtilization)
    );

    if (maxDeviation > load.resourceUtilization.warning) {
      issues.push({
        type: 'load.imbalance',
        severity: maxDeviation > load.resourceUtilization.critical ? 'critical' : 'warning',
        component,
        details: `Resource utilization imbalance detected (max deviation: ${maxDeviation.toFixed(1)}%)`,
        timestamp: new Date().toISOString()
      });
    }

    // Check for overload
    if (metrics.activeRequests >= load.concurrentRequests.critical) {
      issues.push({
        type: 'load.overload',
        severity: 'critical',
        component,
        details: `System overload detected (${metrics.activeRequests} active requests)`,
        timestamp: new Date().toISOString()
      });
    }

    return issues;
  }

  public async optimizeResourceAllocation(component: string): Promise<ResourceOptimization[]> {
    try {
      const metrics = this.metrics.get(component);
      if (!metrics) {
        throw new Error(`No metrics found for component: ${component}`);
      }

      const optimization = this.optimizations.get(component);
      if (!optimization) {
        throw new Error(`No optimization strategy found for component: ${component}`);
      }

      const currentUsage = await this.getResourceUsage(component);
      if (!currentUsage) {
        throw new Error(`Failed to get resource usage for component: ${component}`);
      }

      const optimalAllocation = this.calculateOptimalAllocation(currentUsage, optimization);
      if (!optimalAllocation) {
        throw new Error('Failed to calculate optimal allocation');
      }

      const success = await this.applyResourceOptimization(component, optimalAllocation);
      if (!success) {
        throw new Error('Failed to apply resource optimization');
      }

      const newUsage = await this.getResourceUsage(component);
      if (!newUsage) {
        throw new Error('Failed to verify resource optimization');
      }

      await this.logOptimizationResult(component, currentUsage, newUsage);

      return [{
        type: 'resource.optimization',
        action: 'Resource allocation optimized',
        impact: this.calculateOptimizationImpact(currentUsage, newUsage),
        component,
        timestamp: new Date().toISOString()
      }];

    } catch (error) {
      console.error('Failed to optimize resource allocation:', error);
      await this.logError('resource_optimization_failed', error);
      return [];
    }
  }

  private calculateOptimizationImpact(current: ResourceUsage, optimal: ResourceUsage): number {
    const cpuImpact = Math.abs(current.cpu - optimal.cpu) / current.cpu;
    const memoryImpact = Math.abs(current.memory - optimal.memory) / current.memory;
    const networkImpact = Math.abs(current.network - optimal.network) / current.network;
    return (cpuImpact + memoryImpact + networkImpact) / 3;
  }

  private async getResourceUsage(component: string): Promise<ResourceUsage | null> {
    try {
      const metrics = this.metrics.get(component);
      if (!metrics) return null;

      const usage: ResourceUsage = {
        cpu: 0,
        memory: 0,
        network: 0,
        timestamp: new Date().toISOString()
      };

      // Calculate CPU usage with validation
      const cpuMetrics = metrics.filter(m => m.type === 'cpu');
      if (cpuMetrics.length > 0) {
        const cpuSum = cpuMetrics.reduce((sum, m) => sum + (m.value as number), 0);
        usage.cpu = cpuSum / cpuMetrics.length;
      }

      // Calculate memory usage with validation
      const memoryMetrics = metrics.filter(m => m.type === 'memory');
      if (memoryMetrics.length > 0) {
        const memorySum = memoryMetrics.reduce((sum, m) => sum + (m.value as number), 0);
        usage.memory = memorySum / memoryMetrics.length;
      }

      // Calculate network usage with validation
      const networkMetrics = metrics.filter(m => m.type === 'network');
      if (networkMetrics.length > 0) {
        const networkSum = networkMetrics.reduce((sum, m) => sum + (m.value as number), 0);
        usage.network = networkSum / networkMetrics.length;
      }

      return usage;
    } catch (error) {
      console.error('Failed to get resource usage:', error);
      await this.logError('resource_usage_check_failed', error);
      return null;
    }
  }

  private calculateOptimalAllocation(currentUsage: ResourceUsage, optimization: PerformanceOptimization): ResourceUsage {
    // Implement logic to calculate optimal allocation based on current usage and optimization strategy
    // This is a placeholder and should be replaced with actual implementation
    return currentUsage;
  }

  private async applyResourceOptimization(component: string, optimalAllocation: ResourceUsage): Promise<boolean> {
    // Implement logic to apply resource optimization based on optimal allocation
    // This is a placeholder and should be replaced with actual implementation
    return true;
  }

  private async logOptimizationResult(component: string, currentUsage: ResourceUsage, newUsage: ResourceUsage): Promise<void> {
    // Implement logic to log optimization result
    // This is a placeholder and should be replaced with actual implementation
  }

  public async analyzePriorityLoadIntegration(component: string): Promise<PriorityLoadIntegration> {
    const priorityMetrics = await this.getPriorityMetrics(component);
    const loadMetrics = await this.getLoadBalanceMetrics(component);

    if (!priorityMetrics || !loadMetrics) {
      throw new Error(`No metrics available for component: ${component}`);
    }

    const priorityImpact = this.calculatePriorityImpact(priorityMetrics);
    const loadImpact = this.calculateLoadImpact(loadMetrics);
    const recommendations = await this.generateIntegrationRecommendations(
      priorityMetrics,
      loadMetrics
    );

    return {
      component,
      priorityImpact,
      loadImpact,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  private calculatePriorityImpact(metrics: PriorityMetrics): number {
    const totalRequests = 
      metrics.highPriorityQueue.length +
      metrics.mediumPriorityQueue.length +
      metrics.lowPriorityQueue.length;

    if (totalRequests === 0) return 0;

    const highPriorityWeight = 0.6;
    const mediumPriorityWeight = 0.3;
    const lowPriorityWeight = 0.1;

    return (
      (metrics.highPriorityQueue.length * highPriorityWeight +
       metrics.mediumPriorityQueue.length * mediumPriorityWeight +
       metrics.lowPriorityQueue.length * lowPriorityWeight) /
      totalRequests
    );
  }

  private calculateLoadImpact(metrics: LoadBalanceMetrics): number {
    const { resourceUtilization } = metrics.metrics;
    const maxUtilization = Math.max(
      resourceUtilization.cpu,
      resourceUtilization.memory,
      resourceUtilization.network
    );

    return maxUtilization / 100;
  }

  private async generateIntegrationRecommendations(
    priorityMetrics: PriorityMetrics,
    loadMetrics: LoadBalanceMetrics
  ): Promise<IntegrationRecommendation[]> {
    const recommendations: IntegrationRecommendation[] = [];

    // Check for high priority queue overload
    if (priorityMetrics.highPriorityQueue.length > 10) {
      recommendations.push({
        type: 'integration.optimization',
        action: 'Consider redistributing high-priority tasks',
        impact: 0.8,
        priority: 'high'
      });
    }

    // Check for resource utilization imbalance
    const { resourceUtilization } = loadMetrics.metrics;
    const avgUtilization = (resourceUtilization.cpu + resourceUtilization.memory + resourceUtilization.network) / 3;
    if (Math.abs(resourceUtilization.cpu - avgUtilization) > 20) {
      recommendations.push({
        type: 'integration.optimization',
        action: 'Optimize CPU resource allocation',
        impact: 0.7,
        priority: 'medium'
      });
    }

    return recommendations;
  }

  public async detectPriorityLoadConflicts(component: string): Promise<PriorityLoadConflict[]> {
    const priorityMetrics = await this.getPriorityMetrics(component);
    const loadMetrics = await this.getLoadBalanceMetrics(component);

    if (!priorityMetrics || !loadMetrics) return [];

    const conflicts: PriorityLoadConflict[] = [];
    const { resourceUtilization } = loadMetrics.metrics;

    // Check for high priority requests with high resource utilization
    if (priorityMetrics.highPriorityQueue.length > 0 && resourceUtilization.cpu > 80) {
      conflicts.push({
        type: 'priority.load.conflict',
        severity: 'warning',
        component,
        details: 'High priority requests competing for CPU resources',
        timestamp: new Date().toISOString(),
        resourceType: 'cpu',
        priority: 'high'
      });
    }

    // Check for memory pressure with active queues
    if (
      (priorityMetrics.highPriorityQueue.length > 0 || priorityMetrics.mediumPriorityQueue.length > 0) &&
      resourceUtilization.memory > 85
    ) {
      conflicts.push({
        type: 'priority.load.conflict',
        severity: 'critical',
        component,
        details: 'Active queues causing memory pressure',
        timestamp: new Date().toISOString(),
        resourceType: 'memory',
        priority: 'high'
      });
    }

    return conflicts;
  }

  public async optimizeResourceAllocationWithPriority(
    component: string,
    currentLoad: LoadBalanceMetrics
  ): Promise<{
    recommendations: ResourceOptimization[];
    priorityAdjustments: Array<{ resourceType: string; newPriority: ResourcePriority }>;
  }> {
    const priorityMetrics = await this.getPriorityMetrics(component);
    if (!priorityMetrics || !this.config.thresholds) {
      return { recommendations: [], priorityAdjustments: [] };
    }

    const recommendations: ResourceOptimization[] = [];
    const priorityAdjustments: Array<{ resourceType: string; newPriority: ResourcePriority }> = [];
    const { fps, memoryUsage, cpuUsage } = this.config.thresholds;

    // Analyze current load state
    const { resourceUtilization } = currentLoad.metrics;
    const totalLoad = resourceUtilization.cpu + resourceUtilization.memory + resourceUtilization.network;
    const loadPercentage = totalLoad / 300; // Normalize to 0-1 range

    // Check for high-load conditions
    if (loadPercentage > 0.8) {
      // During high load, prioritize critical resources
      for (const request of priorityMetrics.highPriorityQueue) {
        if (this.isResourceCritical(request)) {
          recommendations.push({
            type: 'resource.optimization',
            action: 'Maintain high priority for critical resource',
            impact: 0.9,
            component,
            timestamp: new Date().toISOString()
          });
        } else {
          // Temporarily lower priority of non-critical high-priority resources
          priorityAdjustments.push({
            resourceType: request.resourceType,
            newPriority: 'medium'
          });
        }
      }

      // Optimize medium priority queue
      for (const request of priorityMetrics.mediumPriorityQueue) {
        if (this.isResourceDeferrable(request)) {
          priorityAdjustments.push({
            resourceType: request.resourceType,
            newPriority: 'low'
          });
        }
      }
    }

    // Check for resource-specific optimizations
    if (resourceUtilization.cpu > cpuUsage.warning) {
      recommendations.push({
        type: 'resource.optimization',
        action: 'Implement CPU-intensive task distribution',
        impact: 0.8,
        component,
        timestamp: new Date().toISOString()
      });
    }

    if (resourceUtilization.memory > memoryUsage.warning) {
      recommendations.push({
        type: 'resource.optimization',
        action: 'Implement memory optimization for non-critical resources',
        impact: 0.7,
        component,
        timestamp: new Date().toISOString()
      });
    }

    return { recommendations, priorityAdjustments };
  }

  private isResourceCritical(request: ResourceRequest): boolean {
    // Define critical resource types
    const criticalTypes = ['auth', 'payment', 'security', 'health-check'];
    return criticalTypes.includes(request.resourceType) || 
           request.estimatedDuration < 100; // Quick operations are critical
  }

  private isResourceDeferrable(request: ResourceRequest): boolean {
    // Define deferrable resource types
    const deferrableTypes = ['analytics', 'logging', 'metrics', 'background-sync'];
    return deferrableTypes.includes(request.resourceType) || 
           request.estimatedDuration > 1000; // Long operations can be deferred
  }

  private async scheduleRecovery(issue: PerformanceIssue, strategy: RecoveryStrategy): Promise<void> {
    const queueEntry = {
      issue,
      strategy,
      timestamp: Date.now(),
      attempts: 0
    };

    // Insert into queue based on priority
    const insertIndex = this.recoveryQueue.findIndex(
      entry => entry.strategy.priority > strategy.priority
    );

    if (insertIndex === -1) {
      this.recoveryQueue.push(queueEntry);
    } else {
      this.recoveryQueue.splice(insertIndex, 0, queueEntry);
    }

    // Start processing if not already running
    if (!this.isProcessingRecovery) {
      this.processRecoveryQueue();
    }
  }

  private async processRecoveryQueue(): Promise<void> {
    if (this.isProcessingRecovery || this.recoveryQueue.length === 0) {
      return;
    }

    this.isProcessingRecovery = true;

    try {
      while (this.recoveryQueue.length > 0 && this.activeRecoveries.size < this.MAX_CONCURRENT_RECOVERIES) {
        const entry = this.recoveryQueue[0];
        
        // Skip if too many attempts
        if (entry.attempts >= entry.strategy.retryCount) {
          this.recoveryQueue.shift();
          await this.handleFailedRecovery(entry.issue, entry.strategy);
          continue;
        }

        // Skip if issue is already being handled
        if (this.activeRecoveries.has(entry.issue.type)) {
          this.recoveryQueue.shift();
          this.recoveryQueue.push(entry); // Move to end of queue
          continue;
        }

        // Process the recovery
        this.recoveryQueue.shift();
        this.activeRecoveries.add(entry.issue.type);
        entry.attempts++;

        try {
          await this.handleRecovery(entry.issue);
          await this.logAuditEntry('recovery_success', {
            issueType: entry.issue.type,
            priority: entry.strategy.priority,
            attempts: entry.attempts,
            timestamp: entry.timestamp
          });
        } catch (error) {
          await this.logError('recovery_failed', error);
          if (entry.attempts < entry.strategy.retryCount) {
            // Requeue with exponential backoff
            const backoffTime = Math.min(1000 * Math.pow(2, entry.attempts), 30000);
            setTimeout(() => {
              this.recoveryQueue.push(entry);
              this.processRecoveryQueue();
            }, backoffTime);
          } else {
            await this.handleFailedRecovery(entry.issue, entry.strategy);
          }
        } finally {
          this.activeRecoveries.delete(entry.issue.type);
        }
      }
    } finally {
      this.isProcessingRecovery = false;
      // Check if there are more items to process
      if (this.recoveryQueue.length > 0) {
        this.processRecoveryQueue();
      }
    }
  }

  private async handleFailedRecovery(issue: PerformanceIssue, strategy: RecoveryStrategy): Promise<void> {
    await this.logAuditEntry('recovery_failed', {
      issueType: issue.type,
      priority: strategy.priority,
      maxAttempts: strategy.retryCount,
      timestamp: Date.now()
    });

    if (strategy.priority === PriorityLevel.CRITICAL) {
      await this.escalateIssue(issue);
    }

    // Update issue status
    issue.status = 'unresolved';
    issue.lastAttempt = new Date().toISOString();
  }

  private async handleRecovery(issue: PerformanceIssue): Promise<void> {
    const strategy = this.recoveryManager?.getStrategy?.(issue.type);
    if (!strategy) {
      throw new Error(`No recovery strategy found for issue type: ${issue.type}`);
    }

    const startTime = Date.now();
    const recoveryEntry: RecoveryHistoryEntry = {
      issue,
      strategy,
      startTime,
      status: 'in_progress',
      actions: [],
      metrics: {
        before: await this.getResourceUsage('system') || {
          cpu: 0,
          memory: 0,
          network: 0,
          timestamp: new Date(startTime).toISOString()
        }
      }
    };

    this.recoveryHistory.push(recoveryEntry);
    const recoveryIndex = this.recoveryHistory.length - 1;

    try {
      for (const actionType of strategy.actions) {
        const action = this.recoveryActions.get(actionType);
        if (!action) {
          await this.logError('recovery_action_not_found', {
            actionType,
            issueType: issue.type,
            timestamp: startTime
          });
          continue;
        }

        const actionStartTime = Date.now();
        try {
          await Promise.race([
            action.handler(issue),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Recovery action timeout for ${actionType}`)), 
              strategy.timeout)
            )
          ]);

          recoveryEntry.actions.push({
            type: actionType,
            status: 'success',
            timestamp: Date.now(),
            duration: Date.now() - actionStartTime
          });

        } catch (error) {
          recoveryEntry.actions.push({
            type: actionType,
            status: 'failed',
            timestamp: Date.now(),
            duration: Date.now() - actionStartTime
          });

          if (strategy.failFast) {
            throw error;
          }
        }
      }

      // Update recovery entry on success
      recoveryEntry.status = 'success';
      recoveryEntry.endTime = Date.now();
      recoveryEntry.metrics.after = await this.getResourceUsage('system') || {
        ...recoveryEntry.metrics.before,
        timestamp: new Date(Date.now()).toISOString()
      };

      // Update issue status
      issue.status = 'resolved';
      issue.resolvedAt = new Date(Date.now()).toISOString();
      await this.updateIssueHistory(issue);

    } catch (error) {
      // Update recovery entry on failure
      recoveryEntry.status = 'failed';
      recoveryEntry.endTime = Date.now();
      recoveryEntry.metrics.after = await this.getResourceUsage('system') || {
        ...recoveryEntry.metrics.before,
        timestamp: new Date(Date.now()).toISOString()
      };
      throw error;
    }
  }

  private validateStrategy(strategy: RecoveryStrategy): void {
    if (!Object.values(PriorityLevel).includes(strategy.priority)) {
      throw new Error(`Invalid priority level: ${strategy.priority}`);
    }
    if (strategy.retryCount < 0 || strategy.retryCount > 5) {
      throw new Error(`Invalid retry count: ${strategy.retryCount}`);
    }
    if (strategy.timeout < 1000 || strategy.timeout > 30000) {
      throw new Error(`Invalid timeout: ${strategy.timeout}`);
    }
    if (strategy.escalationThreshold !== undefined && 
        (strategy.escalationThreshold < 1 || strategy.escalationThreshold > 5)) {
      throw new Error(`Invalid escalation threshold: ${strategy.escalationThreshold}`);
    }
  }

  private async acquireLock(priority: number = this.LOCK_PRIORITIES.NORMAL): Promise<boolean> {
    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.MAX_RETRY_ATTEMPTS) {
      if (!this.historyLock.locked) {
        // Check if there are higher priority operations waiting
        const higherPriorityWaiting = this.lockQueue.some(
          item => item.priority < priority && Date.now() - item.timestamp < this.LOCK_TIMEOUT
        );

        if (!higherPriorityWaiting) {
          this.historyLock.locked = true;
          return true;
        }
      }

      // Calculate exponential backoff with jitter
      const backoffTime = Math.min(
        this.BASE_RETRY_INTERVAL * Math.pow(2, attempt) * (0.5 + Math.random()),
        this.MAX_BACKOFF_TIME
      );

      // Add to lock queue if not already there
      if (!this.lockQueue.some(item => item.priority === priority)) {
        await new Promise<boolean>(resolve => {
          this.lockQueue.push({
            priority,
            timestamp: Date.now(),
            resolve
          });
        });
      }

      await new Promise(resolve => setTimeout(resolve, backoffTime));
      attempt++;

      // Check if we've exceeded the total timeout
      if (Date.now() - startTime > this.LOCK_TIMEOUT) {
        this.logError('lock_timeout', {
          priority,
          attempts: attempt,
          duration: Date.now() - startTime
        }).catch(console.error);
        return false;
      }
    }

    return false;
  }

  private async releaseLock(): Promise<void> {
    this.historyLock.locked = false;
    
    // Process waiting operations in priority order
    if (this.lockQueue.length > 0) {
      this.lockQueue.sort((a, b) => a.priority - b.priority);
      const nextOperation = this.lockQueue.shift();
      if (nextOperation) {
        this.historyLock.locked = true;
        nextOperation.resolve(true);
      }
    }
  }

  private async withLock<T>(
    operation: () => Promise<T>,
    priority: number = this.LOCK_PRIORITIES.NORMAL
  ): Promise<T> {
    const lockTimeout = setTimeout(() => {
      if (this.historyLock.locked) {
        this.historyLock.locked = false;
        this.logError('lock_timeout', {
          timestamp: Date.now(),
          operation: 'history_update',
          priority
        }).catch(console.error);
        
        // Clean up any stale queue entries
        const now = Date.now();
        this.lockQueue = this.lockQueue.filter(
          item => now - item.timestamp < this.LOCK_TIMEOUT
        );
      }
    }, this.LOCK_TIMEOUT);

    try {
      const acquired = await this.acquireLock(priority);
      if (!acquired) {
        throw new Error(`Failed to acquire lock after ${this.MAX_RETRY_ATTEMPTS} attempts`);
      }

      return await operation();
    } finally {
      clearTimeout(lockTimeout);
      await this.releaseLock();
    }
  }

  private async aggregateMetrics(): Promise<void> {
    const now = Date.now();
    const cutoffTime = now - this.METRICS_WINDOW;

    // Aggregate metrics within the window
    for (const [key, values] of this.metrics.entries()) {
      if (!Object.values(METRIC_TYPES).includes(key as MetricType)) continue;
      const metricType = key as MetricType;
      const recentValues = values.filter(v => Number(v.timestamp) >= cutoffTime);
      if (recentValues.length === 0) continue;

      const aggregation = this.metricsAggregator.aggregations.get(metricType) || {
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity,
        lastUpdate: now
      };

      // Update aggregation
      for (const value of recentValues) {
        if (typeof value.value === 'number' && !isNaN(value.value)) {
          aggregation.sum += value.value;
          aggregation.count++;
          aggregation.min = Math.min(aggregation.min, value.value);
          aggregation.max = Math.max(aggregation.max, value.value);
        }
      }

      // Calculate average and detect patterns
      const average = aggregation.sum / aggregation.count;
      const pattern = this.metricsAggregator.patterns.get(metricType) || {
        occurrences: 0,
        lastValue: average,
        trend: 'stable' as const,
        severity: 'warning' as const,
        timestamp: now
      };

      // Update pattern detection
      const threshold = this.getMetricThreshold(metricType);
      if (threshold) {
        const isCritical = average >= threshold.critical;
        const isWarning = average >= threshold.warning && !isCritical;
        
        if (isCritical || isWarning) {
          const trend = this.calculateTrend(metricType, average);
          if (trend === pattern.trend) {
            pattern.occurrences++;
            if (pattern.occurrences >= this.PATTERN_DETECTION_THRESHOLD) {
              await this.handleMetricPattern(metricType, pattern, average);
            }
          } else {
            pattern.occurrences = 1;
            pattern.trend = trend;
          }
          pattern.severity = isCritical ? 'critical' : 'warning';
        } else {
          pattern.occurrences = 0;
        }
      }

      pattern.lastValue = average;
      pattern.timestamp = now;
      this.metricsAggregator.patterns.set(metricType, pattern);
      this.metricsAggregator.aggregations.set(metricType, aggregation);

      // Clean up old data
      this.cleanupOldMetrics(metricType, cutoffTime);
    }

    // Schedule next aggregation
    setTimeout(() => this.aggregateMetrics(), this.METRICS_AGGREGATION_INTERVAL);
  }

  private calculateTrend(metric: MetricType, currentValue: number): 'increasing' | 'decreasing' | 'stable' {
    const pattern = this.metricsAggregator.patterns.get(metric);
    if (!pattern) return 'stable';

    const change = currentValue - pattern.lastValue;
    const threshold = this.getMetricThreshold(metric)?.warning || 0;
    const changeThreshold = threshold * 0.1; // 10% of warning threshold

    if (Math.abs(change) < changeThreshold) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  private async analyzeMetricCorrelations(): Promise<void> {
    const now = Date.now();
    const cutoffTime = now - this.CORRELATION_WINDOW;
    
    // Get all metrics within the window
    const metricData = new Map<MetricType, number[]>();
    for (const [metric, entries] of this.metrics.entries()) {
      const recentEntries = entries
        .filter(e => new Date(e.timestamp).getTime() > cutoffTime)
        .map(e => e.value);
      if (recentEntries.length >= this.MIN_CORRELATION_POINTS) {
        metricData.set(metric as MetricType, recentEntries);
      }
    }

    // Analyze correlations between all metric pairs
    const metrics = Array.from(metricData.keys());
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i];
        const metric2 = metrics[j];
        const values1 = metricData.get(metric1)!;
        const values2 = metricData.get(metric2)!;

        const correlation = this.calculateCorrelation(values1, values2);
        const strength = this.getCorrelationStrength(correlation);
        const trend = correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none';
        
        // Calculate confidence based on data points and correlation strength
        const confidence = Math.min(1, (values1.length / this.MIN_CORRELATION_POINTS) * Math.abs(correlation));

        const correlationKey = `${metric1}_${metric2}`;
        this.metricCorrelations.set(correlationKey, {
          correlation,
          strength,
          trend,
          lastUpdated: now,
          confidence
        });

        // If correlation is significant, analyze potential impact
        if (Math.abs(correlation) >= this.CORRELATION_THRESHOLD && confidence >= 0.8) {
          await this.analyzeCorrelationImpact(metric1, metric2, {
            correlation,
            strength,
            trend,
            confidence
          });
        }
      }
    }
  }

  private calculateCorrelation(values1: number[], values2: number[]): number {
    const n = values1.length;
    const mean1 = values1.reduce((a, b) => a + b, 0) / n;
    const mean2 = values2.reduce((a, b) => a + b, 0) / n;

    const covariance = values1.reduce((sum, val1, i) => {
      const val2 = values2[i];
      return sum + (val1 - mean1) * (val2 - mean2);
    }, 0) / n;

    const stdDev1 = Math.sqrt(values1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / n);
    const stdDev2 = Math.sqrt(values2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / n);

    return covariance / (stdDev1 * stdDev2);
  }

  private getCorrelationStrength(correlation: number): 'strong' | 'moderate' | 'weak' {
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.7) return 'strong';
    if (absCorr >= 0.5) return 'moderate';
    return 'weak';
  }

  private async analyzeCorrelationImpact(
    metric1: MetricType,
    metric2: MetricType,
    correlation: {
      correlation: number;
      strength: 'strong' | 'moderate' | 'weak';
      trend: 'positive' | 'negative' | 'none';
      confidence: number;
    }
  ): Promise<void> {
    const threshold1 = this.getMetricThreshold(metric1);
    const threshold2 = this.getMetricThreshold(metric2);
    
    if (!threshold1 || !threshold2) return;

    const latest1 = this.getLatestMetricValue(metric1);
    const latest2 = this.getLatestMetricValue(metric2);
    
    if (latest1 === null || latest2 === null) return;

    // Check if either metric is approaching its threshold
    const approachingThreshold1 = latest1 >= threshold1.warning * 0.8;
    const approachingThreshold2 = latest2 >= threshold2.warning * 0.8;

    if (approachingThreshold1 || approachingThreshold2) {
      const issueType = `correlation.${metric1}_${metric2}` as PerformanceIssueType;
      const issue: PerformanceIssue = {
        type: issueType,
        severity: 'warning',
        value: correlation.correlation,
        timestamp: new Date().toISOString(),
        details: `Strong ${correlation.trend} correlation (${correlation.correlation.toFixed(2)}) detected between ${metric1} and ${metric2} with ${(correlation.confidence * 100).toFixed(1)}% confidence`,
        status: 'pending'
      };

      await this.logAuditEntry('correlation_detected', {
        metric1,
        metric2,
        correlation,
        issue
      });

      // If both metrics are approaching thresholds, escalate to critical
      if (approachingThreshold1 && approachingThreshold2) {
        issue.severity = 'critical';
        await this.handleCriticalIssue(issue);
      } else {
        await this.handleWarningIssue(issue);
      }
    }
  }

  private getMetricThreshold(metric: MetricType): { warning: number; critical: number } | undefined {
    const thresholds: Record<MetricType, { warning: number; critical: number }> = {
      fps: { warning: 30, critical: 20 },
      frameTime: { warning: 33, critical: 50 },
      memoryUsage: { warning: 0.8 * 1024 * 1024 * 1024, critical: 0.9 * 1024 * 1024 * 1024 },
      cpuUsage: { warning: 80, critical: 90 },
      network: { warning: 0.8 * 1024 * 1024, critical: 0.9 * 1024 * 1024 } // 80% and 90% of 1MB
    };
    return thresholds[metric];
  }

  private cleanupOldMetrics(metric: MetricType, cutoffTime: number): void {
    // Clean up old metric values
    const values = this.metrics.get(metric) || [];
    this.metrics.set(
      metric,
      values.filter(v => Number(v.timestamp) >= cutoffTime)
    );

    // Clean up old patterns
    const pattern = this.metricsAggregator.patterns.get(metric);
    if (pattern && pattern.timestamp < cutoffTime) {
      this.metricsAggregator.patterns.delete(metric);
    }

    // Clean up old aggregations
    const aggregation = this.metricsAggregator.aggregations.get(metric);
    if (aggregation && aggregation.lastUpdate < cutoffTime) {
      this.metricsAggregator.aggregations.delete(metric);
    }
  }

  private async analyzePatterns(): Promise<void> {
    const now = Date.now();
    const cutoffTime = now - this.PATTERN_ANALYSIS_WINDOW;

    // Analyze patterns for each metric
    for (const [metric, entries] of this.metrics.entries()) {
      const recentEntries = entries
        .filter(e => new Date(e.timestamp).getTime() > cutoffTime)
        .map(e => ({ value: e.value, timestamp: new Date(e.timestamp).getTime() }));

      if (recentEntries.length < this.MIN_PATTERN_POINTS) continue;

      const currentPattern = this.patternAnalysis.patterns.get(metric as MetricType) || {
        historicalValues: [],
        predictedThreshold: 0,
        confidence: 0,
        trend: 'stable',
        lastAnalysis: 0,
        adaptiveThreshold: 0,
        recommendations: []
      };

      // Update historical values
      currentPattern.historicalValues = [
        ...currentPattern.historicalValues.filter(v => v.timestamp > cutoffTime),
        ...recentEntries
      ].sort((a, b) => a.timestamp - b.timestamp);

      // Calculate trend and confidence
      const { trend, confidence } = this.calculatePatternTrend(currentPattern.historicalValues);
      currentPattern.trend = trend;
      currentPattern.confidence = confidence;

      // Update adaptive threshold
      const threshold = this.getMetricThreshold(metric as MetricType);
      if (threshold) {
        currentPattern.adaptiveThreshold = this.calculateAdaptiveThreshold(
          currentPattern.historicalValues,
          threshold,
          trend
        );
      }

      // Generate predictions and recommendations
      if (confidence >= this.PATTERN_ANALYSIS_THRESHOLD) {
        const prediction = this.predictMetricValue(currentPattern.historicalValues);
        currentPattern.predictedThreshold = prediction;
        
        // Generate recommendations if needed
        await this.generatePatternRecommendations(
          metric as MetricType,
          currentPattern,
          prediction
        );
      }

      currentPattern.lastAnalysis = now;
      this.patternAnalysis.patterns.set(metric as MetricType, currentPattern);
    }
  }

  private calculatePatternTrend(values: Array<{ value: number; timestamp: number }>): {
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
  } {
    if (values.length < 2) return { trend: 'stable', confidence: 0 };

    const x = values.map(v => v.timestamp);
    const y = values.map(v => v.value);
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const rSquared = Math.pow(
      (n * sumXY - sumX * sumY) /
      Math.sqrt((n * sumXX - sumX * sumX) * (n * y.reduce((a, b) => a + b * b, 0) - sumY * sumY)),
      2
    );

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.001) trend = 'stable';
    else trend = slope > 0 ? 'increasing' : 'decreasing';

    return { trend, confidence: rSquared };
  }

  private calculateAdaptiveThreshold(
    values: Array<{ value: number; timestamp: number }>,
    baseThreshold: { warning: number; critical: number },
    trend: 'increasing' | 'decreasing' | 'stable'
  ): number {
    const recentValues = values.slice(-10);
    const avgValue = recentValues.reduce((a, b) => a + b.value, 0) / recentValues.length;
    const stdDev = Math.sqrt(
      recentValues.reduce((a, b) => a + Math.pow(b.value - avgValue, 2), 0) / recentValues.length
    );

    let adjustment = 0;
    switch (trend) {
      case 'increasing':
        adjustment = stdDev * 0.5;
        break;
      case 'decreasing':
        adjustment = -stdDev * 0.5;
        break;
      default:
        adjustment = 0;
    }

    return Math.max(
      baseThreshold.warning * 0.5,
      Math.min(
        baseThreshold.critical * 1.5,
        baseThreshold.warning + adjustment
      )
    );
  }

  private predictMetricValue(values: Array<{ value: number; timestamp: number }>): number {
    if (values.length < 2) return values[0]?.value || 0;

    const x = values.map(v => v.timestamp);
    const y = values.map(v => v.value);
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const lastTimestamp = x[x.length - 1];
    const predictionTime = lastTimestamp + this.PREDICTION_WINDOW;
    
    return slope * predictionTime + intercept;
  }

  private async generatePatternRecommendations(
    metric: MetricType,
    pattern: {
      historicalValues: Array<{ value: number; timestamp: number }>;
      predictedThreshold: number;
      confidence: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      adaptiveThreshold: number;
      recommendations: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        confidence: number;
        timestamp: number;
      }>;
    },
    prediction: number
  ): Promise<void> {
    const threshold = this.getMetricThreshold(metric);
    if (!threshold) return;

    const latestValue = pattern.historicalValues[pattern.historicalValues.length - 1].value;
    const recommendation: {
      action: string;
      priority: 'high' | 'medium' | 'low';
      confidence: number;
      timestamp: number;
    } = {
      action: '',
      priority: 'low',
      confidence: pattern.confidence,
      timestamp: Date.now()
    };

    if (pattern.trend === 'increasing' && prediction > threshold.warning) {
      recommendation.action = `Preventive action recommended: ${metric} is trending upward and predicted to exceed warning threshold`;
      recommendation.priority = prediction > threshold.critical ? 'high' : 'medium';
    } else if (pattern.trend === 'decreasing' && prediction < threshold.warning * 0.5) {
      recommendation.action = `Optimization opportunity: ${metric} is trending downward and may be over-optimized`;
      recommendation.priority = 'medium';
    }

    if (recommendation.action) {
      const metricType = metric as MetricType;
      const pattern = this.patternAnalysis.patterns.get(metricType);
      if (pattern) {
        pattern.recommendations.push(recommendation);
      }
      this.patternAnalysis.recommendations.set(metricType, recommendation);
      await this.logAuditEntry('pattern_recommendation', {
        metric: metricType,
        recommendation,
        prediction,
        currentValue: latestValue,
        threshold: pattern?.adaptiveThreshold
      });
    }
  }

  private findAnomalies(
    entries: Array<{ value: number; timestamp: number }>,
    baseline: {
      mean: number;
      stdDev: number;
      seasonality: { period: number; amplitude: number; phase: number } | null;
    },
    metricType: MetricType // Add metricType parameter
  ): Array<{
    value: number;
    timestamp: number;
    severity: 'critical' | 'warning';
    confidence: number;
    type: 'spike' | 'dip' | 'trend' | 'seasonal';
  }> {
    const anomalies: Array<{
      value: number;
      timestamp: number;
      severity: 'critical' | 'warning';
      confidence: number;
      type: 'spike' | 'dip' | 'trend' | 'seasonal';
    }> = [];

    for (const entry of entries) {
      let expectedValue = baseline.mean;
      let deviation = 0;

      // Adjust for seasonality if detected
      if (baseline.seasonality) {
        const { period, amplitude, phase } = baseline.seasonality;
        const seasonalAdjustment = amplitude * Math.sin(2 * Math.PI * entry.timestamp / period + phase);
        expectedValue += seasonalAdjustment;
      }

      // Calculate deviation from expected value
      deviation = Math.abs(entry.value - expectedValue) / baseline.stdDev;

      if (deviation >= this.ANOMALY_THRESHOLD) {
        const confidence = Math.min(1, deviation / (this.ANOMALY_THRESHOLD * 2));
        const severity = deviation >= this.ANOMALY_THRESHOLD * 2 ? 'critical' : 'warning';
        
        // Determine anomaly type
        let type: 'spike' | 'dip' | 'trend' | 'seasonal';
        if (entry.value > expectedValue) {
          type = 'spike';
        } else {
          type = 'dip';
        }

        // Check for trend anomalies using existing calculateTrend method
        const recentEntries = entries.filter(e => e.timestamp < entry.timestamp)
          .slice(-5);
        if (recentEntries.length >= 3) {
          const trend = this.calculateTrend(metricType, recentEntries[recentEntries.length - 1].value);
          if (trend === 'increasing' || trend === 'decreasing') {
            type = 'trend';
          }
        }

        anomalies.push({
          value: entry.value,
          timestamp: entry.timestamp,
          severity,
          confidence,
          type
        });
      }
    }

    return anomalies;
  }

  private async detectAnomalies(): Promise<void> {
    const now = Date.now();
    const cutoffTime = now - this.ANOMALY_DETECTION_WINDOW;

    for (const [metric, entries] of this.metrics.entries()) {
      const recentEntries = entries
        .filter(e => new Date(e.timestamp).getTime() > cutoffTime)
        .map(e => ({ value: e.value, timestamp: new Date(e.timestamp).getTime() }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (recentEntries.length < this.MIN_ANOMALY_POINTS) continue;

      const metricType = metric as MetricType;
      const baseline = this.anomalyDetection.baselines.get(metricType) || {
        mean: 0,
        stdDev: 0,
        lastUpdate: 0,
        confidence: 0,
        seasonality: null
      };

      // Update baseline statistics
      const { mean, stdDev, confidence } = this.calculateBaselineStatistics(recentEntries);
      baseline.mean = mean;
      baseline.stdDev = stdDev;
      baseline.confidence = confidence;

      // Detect seasonality if enough data points
      if (recentEntries.length >= 60) { // At least 1 hour of data
        baseline.seasonality = this.detectSeasonality(recentEntries);
      }

      baseline.lastUpdate = now;
      this.anomalyDetection.baselines.set(metricType, baseline);

      // Detect anomalies
      const anomalies = this.findAnomalies(recentEntries, baseline, metricType);
      if (anomalies.length > 0) {
        const currentAnomalies = this.anomalyDetection.anomalies.get(metricType) || [];
        this.anomalyDetection.anomalies.set(
          metricType,
          [...currentAnomalies, ...anomalies].filter(a => a.timestamp > cutoffTime)
        );

        // Handle detected anomalies
        for (const anomaly of anomalies) {
          await this.handleAnomaly(metricType, anomaly, baseline);
        }
      }
    }
  }

  private calculateBaselineStatistics(entries: Array<{ value: number; timestamp: number }>): {
    mean: number;
    stdDev: number;
    confidence: number;
  } {
    const values = entries.map(e => e.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Calculate confidence based on sample size and variance
    const confidence = Math.min(1, 1 - (1 / Math.sqrt(values.length)) * (stdDev / mean));

    return { mean, stdDev, confidence };
  }

  private detectSeasonality(entries: Array<{ value: number; timestamp: number }>): {
    period: number;
    amplitude: number;
    phase: number;
  } | null {
    const values = entries.map(e => e.value);
    const timestamps = entries.map(e => e.timestamp);
    const n = values.length;

    // Use FFT to detect periodicity
    const frequencies = this.performFFT(values);
    const dominantFreq = this.findDominantFrequency(frequencies, timestamps[1] - timestamps[0]);

    if (!dominantFreq) return null;

    // Calculate amplitude and phase
    const period = 1 / dominantFreq.frequency;
    const amplitude = dominantFreq.amplitude;
    const phase = this.calculatePhase(values, period);

    return { period, amplitude, phase };
  }

  private performFFT(values: number[]): Array<{ frequency: number; amplitude: number }> {
    // Simple FFT implementation for real-valued signals
    const n = values.length;
    const frequencies: Array<{ frequency: number; amplitude: number }> = [];

    for (let k = 0; k < n / 2; k++) {
      let real = 0;
      let imag = 0;

      for (let t = 0; t < n; t++) {
        const angle = 2 * Math.PI * k * t / n;
        real += values[t] * Math.cos(angle);
        imag -= values[t] * Math.sin(angle);
      }

      const amplitude = Math.sqrt(real * real + imag * imag) / n;
      const frequency = k / n;
      frequencies.push({ frequency, amplitude });
    }

    return frequencies;
  }

  private findDominantFrequency(
    frequencies: Array<{ frequency: number; amplitude: number }>,
    timeStep: number
  ): { frequency: number; amplitude: number } | null {
    if (frequencies.length === 0) return null;

    // Find the frequency with the highest amplitude
    const dominant = frequencies.reduce((max, curr) => 
      curr.amplitude > max.amplitude ? curr : max
    );

    // Convert to actual frequency
    return {
      frequency: dominant.frequency / timeStep,
      amplitude: dominant.amplitude
    };
  }

  private calculatePhase(values: number[], period: number): number {
    const n = values.length;
    let sumCos = 0;
    let sumSin = 0;

    for (let t = 0; t < n; t++) {
      const angle = 2 * Math.PI * t / period;
      sumCos += values[t] * Math.cos(angle);
      sumSin += values[t] * Math.sin(angle);
    }

    return Math.atan2(sumSin, sumCos);
  }

  private async handleAnomaly(
    metric: MetricType,
    anomaly: {
      value: number;
      timestamp: number;
      severity: 'critical' | 'warning';
      confidence: number;
      type: 'spike' | 'dip' | 'trend' | 'seasonal';
    },
    baseline: {
      mean: number;
      stdDev: number;
      confidence: number;
    }
  ): Promise<void> {
    // Log the anomaly
    await this.logAuditEntry('anomaly_detected', {
      metric,
      anomaly,
      baseline,
      timestamp: new Date().toISOString()
    });

    // Create a performance issue if confidence is high enough
    if (anomaly.confidence >= this.ANOMALY_CONFIDENCE_THRESHOLD) {
      const issue: PerformanceIssue = {
        type: `${metric}_anomaly_detected` as PerformanceIssueType,
        severity: anomaly.severity,
        timestamp: new Date(anomaly.timestamp).toISOString(),
        value: anomaly.value,
        details: JSON.stringify({
          value: anomaly.value,
          expectedValue: baseline.mean,
          deviation: (anomaly.value - baseline.mean) / baseline.stdDev,
          confidence: anomaly.confidence,
          anomalyType: anomaly.type
        })
      };

      // Handle based on severity
      if (anomaly.severity === 'critical') {
        await this.handleCriticalIssue(issue);
      } else {
        await this.handleWarningIssue(issue);
      }
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Example usage:
const monitor = PerformanceMonitor.getInstance();

// Add real-time analyzers
monitor.addRealTimeAnalyzer({
  name: 'fps-analyzer',
  metric: 'fps',
  analyze: async (metrics) => {
    const fpsMetrics = metrics.get('fps') || [];
    const avgFps = fpsMetrics.reduce((sum, m) => sum + m.value, 0) / fpsMetrics.length;
    if (avgFps < 30) {
      console.warn('Low FPS detected:', avgFps);
    }
  },
  config: {
    interval: 1000,
    windowSize: 5000,
    thresholds: { warning: 30, critical: 20 }
  },
  window: 5000,
  threshold: 30,
  action: async (value) => {
    console.warn('FPS dropped below threshold:', value);
  }
});

monitor.addRealTimeAnalyzer({
  name: 'memory-analyzer',
  metric: 'memory',
  analyze: async (metrics) => {
    const memoryMetrics = metrics.get('memory') || [];
    const latestMemory = memoryMetrics[memoryMetrics.length - 1]?.value || 0;
    if (latestMemory > 100 * 1024 * 1024) {
      console.warn('High memory usage detected:', latestMemory);
    }
  },
  config: {
    interval: 5000,
    windowSize: 30000,
    thresholds: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 }
  },
  window: 30000,
  threshold: 100 * 1024 * 1024,
  action: async (value) => {
    console.warn('Memory usage exceeded threshold:', value);
  }
});

// Add ML models
monitor.addMLModel({
  name: 'fps-predictor',
  metric: 'fps',
  predict: async (metrics) => {
    const fpsMetrics = metrics.get('fps') || [];
    const cpuMetrics = metrics.get('cpu') || [];
    const memoryMetrics = metrics.get('memory') || [];
    
    // Simple prediction based on current metrics
    const latestFps = fpsMetrics[fpsMetrics.length - 1]?.value || 60;
    const latestCpu = cpuMetrics[cpuMetrics.length - 1]?.value || 0;
    const latestMemory = memoryMetrics[memoryMetrics.length - 1]?.value || 0;
    
    // Predict FPS based on CPU and memory usage
    return Math.max(0, latestFps * (1 - latestCpu / 100) * (1 - latestMemory / (200 * 1024 * 1024)));
  },
  config: {
    features: ['cpu', 'memory'],
    target: 'fps',
    windowSize: 60000,
    confidenceThreshold: 0.8
  },
  features: ['cpu', 'memory'],
  predictionWindow: 60000,
  trainingInterval: 300000
});

monitor.addMLModel({
  name: 'memory-predictor',
  metric: 'memory',
  predict: async (metrics) => {
    const memoryMetrics = metrics.get('memory') || [];
    const fpsMetrics = metrics.get('fps') || [];
    
    // Simple prediction based on current metrics
    const latestMemory = memoryMetrics[memoryMetrics.length - 1]?.value || 0;
    const latestFps = fpsMetrics[fpsMetrics.length - 1]?.value || 60;
    
    // Predict memory usage based on FPS
    return latestMemory * (1 + (60 - latestFps) / 60);
  },
  config: {
    features: ['fps'],
    target: 'memory',
    windowSize: 300000,
    confidenceThreshold: 0.7
  },
  features: ['fps'],
  predictionWindow: 300000,
  trainingInterval: 900000
}); 