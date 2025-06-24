// Core metric types
export interface PerformanceMetric {
  timestamp: string;
  value: number;
  category: string;
  subcategory: string;
  component?: string;
  type?: string;
  severity?: 'warning' | 'critical';
  metadata?: Record<string, any>;
}

export interface PerformanceThreshold {
  warning: number;
  critical: number;
}

// Threshold configuration types
export interface PriorityThresholds {
  highPriorityQueue: PerformanceThreshold;
  mediumPriorityQueue: PerformanceThreshold;
  lowPriorityQueue: PerformanceThreshold;
}

export interface LoadThresholds {
  concurrentRequests: PerformanceThreshold;
  processingTime: PerformanceThreshold;
  resourceUtilization: PerformanceThreshold;
}

export interface PerformanceThresholds {
  fps: PerformanceThreshold;
  frameTime: PerformanceThreshold;
  memoryUsage: PerformanceThreshold;
  cpuUsage: PerformanceThreshold;
  priority: PriorityThresholds;
  load: LoadThresholds;
}

// Configuration types
export interface PerformanceMonitorConfig {
  maxMetricsPerCategory: number;
  collectionInterval: number;
  performanceThresholds: PerformanceThresholds;
  historyMaxEntries: number;
  analyticsWindow: number;
  thresholds: PerformanceThresholds;
  optimizations: Map<string, PerformanceOptimization>;
}

// Optimization types
export interface PerformanceOptimization {
  name: string;
  condition: (metrics: Map<string, PerformanceMetric[]>) => boolean;
  action: () => Promise<void>;
  priority: number;
}

// Real-time analysis types
export interface RealTimeAnalyzer {
  name: string;
  metric: string;
  analyze: (metrics: Map<string, PerformanceMetric[]>) => Promise<void>;
  config: RealTimeAnalysisConfig;
  window?: number;
  threshold?: number;
  action?: (value: number) => Promise<void>;
  severity?: 'warning' | 'critical';
}

export interface RealTimeAnalysisConfig {
  interval: number;
  windowSize: number;
  thresholds: Record<string, number>;
  window?: number;
}

// ML model types
export interface MLModel {
  name: string;
  metric: string;
  predict: (metrics: Map<string, PerformanceMetric[]>) => Promise<number>;
  config: MLPredictionConfig;
  features?: string[];
  predictionWindow?: number;
  trainingInterval?: number;
  severity?: 'warning' | 'critical';
}

export interface MLPredictionConfig {
  features: string[];
  target: string;
  windowSize: number;
  confidenceThreshold: number;
}

// Performance monitoring types
export type PerformanceIssueType =
  | 'high_memory_usage'
  | 'high_cpu_usage'
  | 'low_fps'
  | 'high_frame_time'
  | 'network_latency'
  | 'resource_exhaustion'
  | 'component_error'
  | 'render_blocking'
  | 'memory_leak'
  | 'cpu_throttling'
  | 'network_error'
  | 'fps_pattern_detected'
  | 'frameTime_pattern_detected'
  | 'memoryUsage_pattern_detected'
  | 'cpuUsage_pattern_detected'
  | 'network_pattern_detected'
  | 'fps_predicted'
  | 'frameTime_predicted'
  | 'memoryUsage_predicted'
  | 'cpuUsage_predicted'
  | 'network_predicted'
  | 'fps'
  | 'memory'
  | 'cpu'
  | 'correlation.fps_cpu'
  | 'correlation.memory_frametime';

export interface PerformanceIssue {
  type: PerformanceIssueType;
  severity: 'warning' | 'critical';
  value: number;
  timestamp: string;
  details: string;
  component?: string;
  status?: 'pending' | 'resolved' | 'escalated' | 'unresolved';
  resolvedAt?: string;
  lastAttempt?: string;
}

export interface HealthMetrics {
  recoverySuccessRate: number;
  averageRecoveryTime: number;
  criticalIssuesCount: number;
  warningIssuesCount: number;
  resourceUtilization: ResourceUsage;
}

export interface PerformanceHistoryEntry {
  timestamp: number;
  metrics: {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    cpuUsage: number;
    [key: string]: number;
  };
  issues: PerformanceIssue[];
  health?: HealthMetrics;
}

export interface RecoveryHistoryEntry {
  issue: PerformanceIssue;
  strategy: RecoveryStrategy;
  startTime: number;
  endTime?: number;
  status: 'success' | 'failed' | 'in_progress';
  actions: Array<{
    type: string;
    status: 'success' | 'failed';
    timestamp: number;
    duration: number;
  }>;
  metrics: {
    before: ResourceUsage;
    after?: ResourceUsage;
  };
}

// Component metrics types
export interface ComponentMetrics {
  renderTime: number;
  mountTime: number;
  updateTime: number;
  renderCount: number;
}

// Network metrics types
export interface NetworkMetrics {
  totalRequests: number;
  failedRequests: number;
  totalBytes: number;
  averageLatency: number;
  slowRequests: number;
}

// Audit logging types
export interface AuditLogEntry {
  userId: string;
  action: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status: string;
  details: Record<string, any>;
}

// Recovery management types
export interface RecoveryManager {
  handleCriticalIssue: (issueType: string) => Promise<void>;
  getStrategy: (issueType: string) => RecoveryStrategy | undefined;
  strategies?: Record<string, RecoveryStrategy>;
}

// Extend the Performance interface to include memory property
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  interface PerformanceEntry {
    processingEnd?: number;
    target?: Element;
  }
}

export type ResourcePriority = 'high' | 'medium' | 'low';

export interface ResourceRequest {
  component: string;
  priority: ResourcePriority;
  resourceType: string;
  size: number;
  timestamp: string;
  estimatedDuration: number;
  dependencies: string[];
}

export interface PriorityMetrics {
  component: string;
  highPriorityQueue: ResourceRequest[];
  mediumPriorityQueue: ResourceRequest[];
  lowPriorityQueue: ResourceRequest[];
  processingOrder: ResourcePriority[];
  priorityViolations: PriorityViolation[];
  lastUpdated: string;
}

export interface PriorityViolation {
  type: 'priority.violation';
  severity: 'warning' | 'critical';
  component: string;
  details: string;
  timestamp: string;
}

export interface LoadBalanceMetrics {
  component: string;
  activeRequests: number;
  queueLength: number;
  processingTime: number;
  waitTime: number;
  throughput: number;
  loadDistribution?: ResourceUtilization;
  recommendations?: ResourceOptimization[];
  metrics: {
    queueDistribution: {
      high: QueueMetrics;
      medium: QueueMetrics;
      low: QueueMetrics;
    };
    resourceUtilization: ResourceUtilization;
  };
}

export interface QueueMetrics {
  length: number;
  avgWaitTime: number;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  network: number;
}

export interface LoadBalanceIssue {
  type: 'load.imbalance' | 'load.overload' | 'load.underutilization';
  severity: 'warning' | 'critical';
  component: string;
  details: string;
  timestamp: string;
}

export interface ResourceOptimization {
  type: 'resource.optimization';
  action: string;
  impact: number;
  component: string;
  timestamp: string;
}

export interface PriorityLoadIntegration {
  component: string;
  priorityImpact: number;
  loadImpact: number;
  recommendations: IntegrationRecommendation[];
  timestamp: string;
}

export interface IntegrationRecommendation {
  type: 'integration.optimization';
  action: string;
  impact: number;
  priority: ResourcePriority;
}

export interface PriorityLoadConflict {
  type: 'priority.load.conflict';
  severity: 'warning' | 'critical';
  component: string;
  details: string;
  timestamp: string;
  resourceType: string;
  priority: ResourcePriority;
}

// Update ResourceMetrics to use the consolidated types
export interface ResourceMetrics {
  component: string;
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  diskUsage: number;
  networkUsage: number;
  metrics: {
    cpuDetails: {
      userTime: number;
      systemTime: number;
      idleTime: number;
      loadAverage: number[];
    };
    memoryDetails: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      arrayBuffers: number;
    };
    gpuDetails: {
      renderTime: number;
      compositeTime: number;
      drawCalls: number;
      triangles: number;
    };
  };
  issues: PerformanceIssue[]; // Update to use PerformanceIssue type
  lastUpdated: string;
}

// Update MemoryMetrics to use PerformanceIssue
export interface MemoryMetrics {
  component: string;
  currentHeapSize: number;
  peakHeapSize: number;
  lastUpdated: string;
  issues: PerformanceIssue[]; // Update to use PerformanceIssue type
}

// Update LoadMetrics to use PerformanceIssue
export interface LoadMetrics {
  component: string;
  concurrentRequests: number;
  requestQueue: number;
  processingTime: number;
  waitTime: number;
  throughput: number;
  metrics: {
    queueMetrics: {
      highPriority: QueueMetrics;
      mediumPriority: QueueMetrics;
      lowPriority: QueueMetrics;
    };
    processingMetrics: {
      activeWorkers: number;
      idleWorkers: number;
      avgProcessingTime: number;
      maxProcessingTime: number;
    };
  };
  issues: PerformanceIssue[]; // Update to use PerformanceIssue type
  lastUpdated: string;
}

// Add ResourceUsage interface
export interface ResourceUsage {
  cpu: number;
  memory: number;
  network: number;
  timestamp: string;
}

// Add RecoveryStrategy interface
export enum PriorityLevel {
  CRITICAL = 1,    // Highest priority, immediate action required
  HIGH = 2,        // High priority, action required soon
  MEDIUM = 3,      // Medium priority, action required when possible
  LOW = 4,         // Low priority, action can be deferred
  MINIMAL = 5      // Minimal priority, action can be delayed
}

export interface RecoveryStrategy {
  type: string;
  actions: Array<'log' | 'notify' | 'optimize' | 'restart'>;
  retryCount: number;
  timeout: number;
  failFast: boolean;
  priority: PriorityLevel;  // Updated to use PriorityLevel enum
  escalationThreshold?: number;
}

// Add RecoveryAction interface
export interface RecoveryAction {
  type: 'log' | 'notify' | 'optimize' | 'restart';
  handler: (issue: PerformanceIssue) => Promise<void>;
} 