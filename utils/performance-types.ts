export interface ComponentMetrics { timestamp?: number; }
export interface MemoryMetrics { timestamp?: number; }
export interface BenchmarkMetrics { timestamp?: number; }
export interface OptimizationMetrics { timestamp?: number; }
export interface EventMetrics { timestamp?: number; }
export interface SubscriptionMetrics { timestamp?: number; }
export interface ResourceMetrics {
  cpu?: number;
  memory?: number;
  network?: number;
  disk?: number;
  timestamp?: number;
  heapSize?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  gpuUsage?: number;
}
export interface LoadMetrics {
  timestamp?: number;
  concurrentRequests?: number;
  processingTime?: number;
  metrics?: any;
}
export interface PerformanceMetric {
  value?: number;
  timestamp?: number;
  priority?: string;
  type?: string;
}
export interface PerformanceIssue { timestamp?: number; }
export interface AuditLogEntry { timestamp?: number; }
export interface RecoveryManager {}
export interface RecoveryStrategy {
  actions?: string[];
  type?: string;
  retryCount?: number;
  timeout?: number;
  failFast?: boolean;
  priority?: number;
}
export interface PerformanceMetrics {
  latency?: number;
  errorRate?: number;
  throughput?: number;
  resourceUsage?: number;
  timestamp?: number;
  metrics?: {
    fps?: number;
    frameTime?: number;
    memory?: number;
    cpu?: number;
  };
}
export interface PerformanceThresholds {
  latency?: number;
  errorRate?: number;
  resourceUsage?: number;
  fps?: number;
  frameTime?: number;
  memory?: number;
  cpu?: number;
  throughput?: number;
  resourceUtilization?: {
    cpu?: number;
    threshold?: number;
  };
}
export interface RecoveryMetrics {
  timestamp: number;
  strategy: string;
  success: boolean;
  duration: number;
  impact?: {
    resource: Partial<ResourceMetrics>;
    performance: Partial<PerformanceMetrics>;
  };
  resource?: Partial<ResourceMetrics>;
  performance?: Partial<PerformanceMetrics>;
  actions?: Array<{
    type: string;
    success: boolean;
    duration: number;
  }>;
}
export interface ActionResult {
  type: string;
  success: boolean;
  duration: number;
  resource?: Partial<ResourceMetrics>;
  performance?: Partial<PerformanceMetrics>;
}
export interface RecoveryContext {
  operation?: Function;
  operationId?: string;
  service?: string;
  result?: any;
  timestamp?: number;
  resourceUsage?: ResourceMetrics;
  performanceMetrics?: PerformanceMetrics;
}
export type PerformanceEvent = any;
export type PerformanceAlert = any;
export type PerformanceOptimization = any;
export type PerformanceConfig = any;
export type PerformanceSnapshot = any;
export type PerformanceReport = any;
export type PerformanceMonitor = any;
export type PerformanceOptimizer = any;