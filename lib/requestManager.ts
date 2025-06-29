import { recordError, recordOperationLatency } from './monitoring';
import { auditLogger } from './audit-logger';

interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  priority?: 'critical' | 'high' | 'normal' | 'low' | 'background';
  description?: string;
  queueGroup?: string;
  batchKey?: string;
  cacheKey?: string;
  cacheTTL?: number;
  persistCache?: boolean;
  deduplicate?: boolean;
  mergeKey?: string;
  resourceWeight?: number;
  maxConcurrent?: number;
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
    halfOpenTimeout: number;
  };
  rateLimit?: {
    maxRequests: number;
    timeWindow: number;
    burstSize?: number;
  };
}

interface Request {
  id: string;
  config: RequestConfig;
  startTime: Date;
  lastAttempt: Date;
  attempts: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled' | 'queued';
  error?: Error;
  queuePosition?: number;
  originalRequestFn?: () => Promise<any>;
  batchId?: string;
  mergeId?: string;
  subscribers: Set<(result: any) => void>;
  resourceUsage: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  metadata?: {
    requestId?: string;
    description?: string;
    priority?: string;
  };
}

interface BatchConfig {
  maxSize: number;
  maxDelay: number;
  batchKey: string;
}

interface QueueStats {
  totalQueued: number;
  queuedByPriority: Record<string, number>;
  queuedByGroup: Record<string, number>;
  averageWaitTime: number;
  resourceUsage: {
    total: number;
    byGroup: Record<string, number>;
  };
}

interface QueueGroup {
  name: string;
  maxConcurrent: number;
  activeRequests: number;
  requests: Request[];
  resourceLimit: number;
  currentResourceUsage: number;
}

interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  averageResponseTime: number;
  healthScore: number;
}

interface HealthMetrics {
  timestamp: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  circuitBreakerStatus: Record<string, CircuitBreakerState>;
  resourceUsage: {
    total: number;
    byGroup: Record<string, number>;
  };
  queueStats: QueueStats;
}

interface RateLimiterState {
  tokens: number;
  lastRefill: number;
  burstTokens: number;
  totalRequests: number;
  rejectedRequests: number;
  averageWaitTime: number;
  currentBurst: number;
}

interface ResourceMetrics {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
}

interface ResourceLimits {
  maxCpu: number;
  maxMemory: number;
  maxNetwork: number;
  maxDisk: number;
}

interface ResourceAllocation {
  requestId: string;
  metrics: ResourceMetrics;
  timestamp: number;
}

interface ResourceVisualizationMetrics {
  timestamp: number;
  metrics: ResourceMetrics;
  limits: ResourceLimits;
  prediction: ResourceMetrics;
  health: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  };
}

interface ResourceOptimizationRecommendation {
  type: 'cpu' | 'memory' | 'network' | 'disk';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  action: string;
  estimatedImprovement: number;
}

interface ResourceAnalytics {
  patterns: {
    peakHours: number[];
    peakDays: number[];
    usagePatterns: Array<{
      type: 'cpu' | 'memory' | 'network' | 'disk';
      pattern: 'spike' | 'gradual' | 'cyclic' | 'stable';
      frequency: number;
      averageDuration: number;
    }>;
  };
  correlations: Array<{
    resource1: 'cpu' | 'memory' | 'network' | 'disk';
    resource2: 'cpu' | 'memory' | 'network' | 'disk';
    correlation: number;
    description: string;
  }>;
  anomalies: Array<{
    type: 'cpu' | 'memory' | 'network' | 'disk';
    timestamp: number;
    value: number;
    expectedValue: number;
    deviation: number;
  }>;
}

interface ResourcePrediction {
  timestamp: number;
  predictedMetrics: ResourceMetrics;
  confidence: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  factors: Array<{
    type: 'cpu' | 'memory' | 'network' | 'disk';
    impact: number;
    description: string;
  }>;
  seasonality?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'none';
    strength: number;
    peakHours: number[];
  };
  anomalies?: Array<{
    timestamp: number;
    value: number;
    expectedValue: number;
    deviation: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface ResourceOptimizationStrategy {
  type: 'cpu' | 'memory' | 'network' | 'disk';
  action: string;
  impact: number;
  priority: 'high' | 'medium' | 'low';
  implementation: string;
  validation: string;
  costBenefit: {
    implementationCost: number;
    expectedBenefit: number;
    roi: number;
    paybackPeriod: number;
  };
  dependencies: string[];
  risks: Array<{
    description: string;
    probability: number;
    impact: number;
    mitigation: string;
  }>;
}

interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'circuit-breaker' | 'rate-limit' | 'resource';
  priority: 'high' | 'medium' | 'low';
  conditions: {
    errorTypes: string[];
    resourceThresholds?: Partial<ResourceMetrics>;
    performanceThresholds?: Partial<PerformanceMetrics['metrics']>;
  };
  actions: Array<{
    type: 'retry' | 'fallback' | 'scale' | 'degrade' | 'notify';
    config: {
      maxAttempts?: number;
      delay?: number;
      backoff?: 'linear' | 'exponential';
      fallbackValue?: any;
      notificationLevel?: 'info' | 'warning' | 'error';
    };
  }>;
  validation: {
    successCriteria: Array<{
      metric: string;
      threshold: number;
      operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    }>;
    timeout: number;
  };
}

interface RecoveryMetrics {
  timestamp: number;
  strategy: string;
  success: boolean;
  duration: number;
  impact: {
    resource: Partial<ResourceMetrics>;
    performance: Partial<PerformanceMetrics['metrics']>;
  };
  actions: Array<{
    type: string;
    success: boolean;
    duration: number;
  }>;
}

class RateLimiter {
  private state: RateLimiterState;
  private readonly maxRequests: number;
  private readonly timeWindow: number;
  private readonly burstSize: number;
  private readonly tokenRefillRate: number;
  private readonly metricsHistory: Array<{
    timestamp: number;
    tokens: number;
    totalRequests: number;
    rejectedRequests: number;
    averageWaitTime: number;
  }> = [];
  private readonly MAX_METRICS_HISTORY = 100;

  constructor(config: RequestConfig['rateLimit']) {
    this.maxRequests = config?.maxRequests || 100;
    this.timeWindow = config?.timeWindow || 60000;
    this.burstSize = config?.burstSize || Math.floor(this.maxRequests * 0.2);
    this.tokenRefillRate = this.maxRequests / this.timeWindow;

    this.state = {
      tokens: this.maxRequests,
      lastRefill: Date.now(),
      burstTokens: this.burstSize,
      totalRequests: 0,
      rejectedRequests: 0,
      averageWaitTime: 0,
      currentBurst: 0
    };
  }

  private refillTokens() {
    const now = Date.now();
    const timePassed = now - this.state.lastRefill;
    const tokensToAdd = timePassed * this.tokenRefillRate;

    this.state.tokens = Math.min(
      this.maxRequests,
      this.state.tokens + tokensToAdd
    );

    // Refill burst tokens
    if (timePassed >= this.timeWindow) {
      this.state.burstTokens = this.burstSize;
      this.state.currentBurst = 0;
    }

    this.state.lastRefill = now;
  }

  private updateMetrics(waitTime: number) {
    this.metricsHistory.push({
      timestamp: Date.now(),
      tokens: this.state.tokens,
      totalRequests: this.state.totalRequests,
      rejectedRequests: this.state.rejectedRequests,
      averageWaitTime: this.state.averageWaitTime
    });

    if (this.metricsHistory.length > this.MAX_METRICS_HISTORY) {
      this.metricsHistory.shift();
    }

    // Update average wait time
    this.state.averageWaitTime = 
      (this.state.averageWaitTime * (this.state.totalRequests - 1) + waitTime) / 
      this.state.totalRequests;
  }

  public async acquireToken(): Promise<boolean> {
    this.refillTokens();
    this.state.totalRequests++;

    if (this.state.tokens > 0) {
      this.state.tokens--;
      this.state.currentBurst++;
      return true;
    }

    if (this.state.burstTokens > 0 && this.state.currentBurst < this.burstSize) {
      this.state.burstTokens--;
      this.state.currentBurst++;
      return true;
    }

    this.state.rejectedRequests++;
    return false;
  }

  public getState(): RateLimiterState {
    return { ...this.state };
  }

  public getMetricsHistory() {
    return [...this.metricsHistory];
  }
}

class PersistentCache {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'request-cache';
  private readonly STORE_NAME = 'cache-entries';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('ttl', 'ttl', { unique: false });
        }
      };
    });
  }

  async set(key: string, entry: CacheEntry<any>): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put({ key, ...entry });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(key: string): Promise<CacheEntry<any> | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cleanup(): Promise<void> {
    if (!this.db) await this.init();
    const now = Date.now();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value;
          if (now - entry.timestamp > entry.ttl) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

class CircuitBreaker {
  private healthCheckInterval: NodeJS.Timeout;
  private healthCheckLock = false;
  private lastHealthCheck = 0;
  private readonly HEALTH_CHECK_COOLDOWN = 5000; // 5 seconds

  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    if (this.healthCheckLock || now - this.lastHealthCheck < this.HEALTH_CHECK_COOLDOWN) {
      return;
    }

    try {
      this.healthCheckLock = true;
      this.lastHealthCheck = now;

      const metrics = await this.getHealthMetrics();
      if (!metrics) {
        throw new Error('Failed to get health metrics');
      }

      const successRate = metrics.successRate;
      const errorRate = metrics.errorRate;
      const latency = metrics.latency;

      if (successRate < this.thresholds.successRate || 
          errorRate > this.thresholds.errorRate || 
          latency > this.thresholds.latency) {
        this.trip();
      } else if (this.state === CircuitState.HALF_OPEN) {
        this.reset();
      }

      // Update health metrics
      this.healthMetrics = {
        ...this.healthMetrics,
        ...metrics,
        lastUpdated: now
      };
    } catch (error) {
      console.error('Health check failed:', error);
      // Don't trip the circuit on health check failure
      // Just log the error and continue
    } finally {
      this.healthCheckLock = false;
    }
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      if (this.state === CircuitState.HALF_OPEN) {
        this.reset();
      }
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.thresholds.failureCount) {
      this.trip();
    }
  }

  private trip(): void {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      this.lastFailureTime = Date.now();
      this.failureCount = 0;
      this.emit('tripped');
    }
  }

  private reset(): void {
    if (this.state !== CircuitState.CLOSED) {
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.lastFailureTime = 0;
      this.emit('reset');
    }
  }
}

class ResourceManager {
  private allocations: Map<string, ResourceAllocation> = new Map();
  private readonly limits: ResourceLimits;
  private readonly metricsHistory: Array<{
    timestamp: number;
    totalUsage: ResourceMetrics;
  }> = [];
  private readonly MAX_METRICS_HISTORY = 100;
  private readonly METRICS_CLEANUP_INTERVAL = 3600000; // 1 hour
  private cleanupInterval: NodeJS.Timeout;
  private readonly adaptiveThreshold = 0.8;

  constructor(limits: ResourceLimits) {
    this.limits = limits;
    this.cleanupInterval = setInterval(() => this.cleanupMetrics(), this.METRICS_CLEANUP_INTERVAL);
  }

  private predictResourceUsage(): ResourceMetrics {
    if (this.metricsHistory.length < this.predictionWindow) {
      return this.getCurrentResourceUsage();
    }

    const recentMetrics = this.metricsHistory.slice(-this.predictionWindow);
    const prediction: ResourceMetrics = {
      cpu: 0,
      memory: 0,
      network: 0,
      disk: 0
    };

    // Calculate weighted moving average with more weight on recent metrics
    recentMetrics.forEach((metric, index) => {
      const weight = (index + 1) / this.predictionWindow;
      prediction.cpu += metric.totalUsage.cpu * weight;
      prediction.memory += metric.totalUsage.memory * weight;
      prediction.network += metric.totalUsage.network * weight;
      prediction.disk += metric.totalUsage.disk * weight;
    });

    return prediction;
  }

  private adjustResourceLimits(): void {
    const currentUsage = this.getCurrentResourceUsage();
    const prediction = this.predictResourceUsage();

    // Ensure limits are positive and within reasonable bounds
    const adjustLimit = (current: number, limit: number, threshold: number): number => {
      const newLimit = Math.max(1, Math.min(100, limit * (current > limit * threshold ? 1.1 : 0.9)));
      return newLimit;
    };

    this.limits.maxCpu = adjustLimit(currentUsage.cpu, this.limits.maxCpu, this.adaptiveThreshold);
    this.limits.maxMemory = adjustLimit(currentUsage.memory, this.limits.maxMemory, this.adaptiveThreshold);
    this.limits.maxNetwork = adjustLimit(currentUsage.network, this.limits.maxNetwork, this.adaptiveThreshold);
    this.limits.maxDisk = adjustLimit(currentUsage.disk, this.limits.maxDisk, this.adaptiveThreshold);
  }

  public canAllocateResources(request: Request): boolean {
    const currentUsage = this.getCurrentResourceUsage();
    const prediction = this.predictResourceUsage();
    const requestMetrics = this.calculateRequestMetrics(request);

    // Validate resource metrics
    const isValidMetric = (metric: number): boolean => 
      !isNaN(metric) && isFinite(metric) && metric >= 0;

    if (!isValidMetric(requestMetrics.cpu) || !isValidMetric(requestMetrics.memory) ||
        !isValidMetric(requestMetrics.network) || !isValidMetric(requestMetrics.disk)) {
      console.error('Invalid resource metrics for request:', request.id);
      return false;
    }

    return (
      currentUsage.cpu + requestMetrics.cpu <= this.limits.maxCpu &&
      prediction.cpu + requestMetrics.cpu <= this.limits.maxCpu &&
      currentUsage.memory + requestMetrics.memory <= this.limits.maxMemory &&
      prediction.memory + requestMetrics.memory <= this.limits.maxMemory &&
      currentUsage.network + requestMetrics.network <= this.limits.maxNetwork &&
      prediction.network + requestMetrics.network <= this.limits.maxNetwork &&
      currentUsage.disk + requestMetrics.disk <= this.limits.maxDisk &&
      prediction.disk + requestMetrics.disk <= this.limits.maxDisk
    );
  }

  public allocateResources(request: Request): void {
    const metrics = this.calculateRequestMetrics(request);
    this.allocations.set(request.id, {
      requestId: request.id,
      metrics,
      timestamp: Date.now()
    });

    this.updateMetricsHistory();
    this.adjustResourceLimits();
  }

  public releaseResources(requestId: string): void {
    this.allocations.delete(requestId);
    this.updateMetricsHistory();
  }

  private calculateRequestMetrics(request: Request): ResourceMetrics {
    const baseMetrics = {
      cpu: 1,
      memory: 2,
      network: 1,
      disk: 0.5
    };

    // Adjust metrics based on request priority
    const priorityMultiplier = this.getPriorityMultiplier(request.config.priority);
    
    return {
      cpu: baseMetrics.cpu * priorityMultiplier,
      memory: baseMetrics.memory * priorityMultiplier,
      network: baseMetrics.network * priorityMultiplier,
      disk: baseMetrics.disk * priorityMultiplier
    };
  }

  private getPriorityMultiplier(priority?: string): number {
    switch (priority) {
      case 'critical': return 2.0;
      case 'high': return 1.5;
      case 'normal': return 1.0;
      case 'low': return 0.7;
      case 'background': return 0.5;
      default: return 1.0;
    }
  }

  private getCurrentResourceUsage(): ResourceMetrics {
    const usage: ResourceMetrics = {
      cpu: 0,
      memory: 0,
      network: 0,
      disk: 0
    };

    this.allocations.forEach(allocation => {
      usage.cpu += allocation.metrics.cpu;
      usage.memory += allocation.metrics.memory;
      usage.network += allocation.metrics.network;
      usage.disk += allocation.metrics.disk;
    });

    return usage;
  }

  private updateMetricsHistory(): void {
    const currentUsage = this.getCurrentResourceUsage();
    this.metricsHistory.push({
      timestamp: Date.now(),
      totalUsage: currentUsage
    });

    if (this.metricsHistory.length > this.MAX_METRICS_HISTORY) {
      this.metricsHistory.shift();
    }
  }

  public getResourceMetrics(): {
    current: ResourceMetrics;
    history: Array<{ timestamp: number; totalUsage: ResourceMetrics }>;
    prediction: ResourceMetrics;
    limits: ResourceLimits;
  } {
    return {
      current: this.getCurrentResourceUsage(),
      history: [...this.metricsHistory],
      prediction: this.predictResourceUsage(),
      limits: { ...this.limits }
    };
  }

  private cleanupMetrics(): void {
    const now = Date.now();
    const cutoffTime = now - (24 * 3600000); // 24 hours

    // Remove old metrics
    this.metricsHistory = this.metricsHistory.filter(
      metric => metric.timestamp > cutoffTime
    );

    // Ensure we don't exceed max history
    if (this.metricsHistory.length > this.MAX_METRICS_HISTORY) {
      this.metricsHistory.splice(0, this.metricsHistory.length - this.MAX_METRICS_HISTORY);
    }
  }

  public cleanup(): void {
    clearInterval(this.cleanupInterval);
  }
}

interface PerformanceMetrics {
  timestamp: number;
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    resourceUtilization: ResourceMetrics;
    cacheHitRate: number;
    requestQueueLength: number;
    activeConnections: number;
    memoryUsage: {
      heap: number;
      nonHeap: number;
      gc: {
        count: number;
        time: number;
      };
    };
    cpuUsage: {
      user: number;
      system: number;
      idle: number;
    };
    networkUsage: {
      bytesIn: number;
      bytesOut: number;
      connections: number;
    };
  };
  health: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  };
}

interface PerformanceOptimization {
  type: 'response-time' | 'throughput' | 'resource-usage' | 'cache' | 'memory' | 'cpu' | 'network';
  currentValue: number;
  targetValue: number;
  improvement: number;
  priority: 'high' | 'medium' | 'low';
  recommendations: Array<{
    action: string;
    impact: number;
    complexity: 'low' | 'medium' | 'high';
    implementation: string;
    validation: string;
  }>;
}

class ResourceVisualization {
  private readonly PERFORMANCE_MONITORING = {
    metrics: {
      responseTime: { threshold: 1000, weight: 0.3 },
      throughput: { threshold: 100, weight: 0.2 },
      errorRate: { threshold: 0.05, weight: 0.3 },
      resourceUtilization: { threshold: 0.8, weight: 0.2 }
    }
  };

  private readonly metricsHistory: ResourceVisualizationMetrics[] = [];
  private readonly MAX_HISTORY = 1000;
  private readonly HEALTH_THRESHOLDS = {
    cpu: { warning: 0.7, critical: 0.9 },
    memory: { warning: 0.75, critical: 0.9 },
    network: { warning: 0.8, critical: 0.95 },
    disk: { warning: 0.8, critical: 0.95 }
  };
  private readonly OPTIMIZATION_THRESHOLDS = {
    cpu: { low: 0.5, medium: 0.7, high: 0.9 },
    memory: { low: 0.6, medium: 0.8, high: 0.9 },
    network: { low: 0.7, medium: 0.85, high: 0.95 },
    disk: { low: 0.7, medium: 0.85, high: 0.95 }
  };
  private readonly PREDICTION_WINDOW = 24; // hours
  private readonly CONFIDENCE_THRESHOLD = 0.8;
  private readonly TREND_THRESHOLD = 0.1;
  private readonly SEASONALITY_THRESHOLD = 0.7;
  private readonly ANOMALY_THRESHOLD = 2.5;
  private readonly OPTIMIZATION_WINDOW = 168; // 1 week in hours
  private readonly MIN_CONFIDENCE = 0.8;

  // Add new performance monitoring thresholds
  private readonly PERFORMANCE_THRESHOLDS = {
    responseTime: { warning: 1000, critical: 3000 }, // ms
    throughput: { warning: 50, critical: 100 }, // requests/second
    errorRate: { warning: 0.05, critical: 0.1 }, // percentage
    cacheHitRate: { warning: 0.7, critical: 0.5 }, // percentage
    requestQueueLength: { warning: 50, critical: 100 },
    activeConnections: { warning: 100, critical: 200 },
    memoryUsage: {
      heap: { warning: 0.8, critical: 0.9 }, // percentage
      nonHeap: { warning: 0.8, critical: 0.9 }, // percentage
      gc: {
        count: { warning: 10, critical: 20 }, // per minute
        time: { warning: 1000, critical: 3000 } // ms
      }
    },
    cpuUsage: {
      user: { warning: 0.7, critical: 0.9 }, // percentage
      system: { warning: 0.7, critical: 0.9 }, // percentage
      idle: { warning: 0.3, critical: 0.1 } // percentage
    },
    networkUsage: {
      bytesIn: { warning: 1000000, critical: 5000000 }, // bytes/second
      bytesOut: { warning: 1000000, critical: 5000000 }, // bytes/second
      connections: { warning: 100, critical: 200 }
    }
  };

  private readonly PERFORMANCE_WINDOW = 3600; // 1 hour in seconds
  private readonly PERFORMANCE_SAMPLE_RATE = 60; // 1 minute
  private performanceMetrics: PerformanceMetrics[] = [];

  private readonly PREDICTION_MODELS = {
    linear: 'linear',
    exponential: 'exponential',
    seasonal: 'seasonal',
    hybrid: 'hybrid'
  };

  private readonly OPTIMIZATION_STRATEGIES = {
    cpu: {
      high: {
        action: 'Implement advanced CPU optimization with workload distribution',
        impact: 0.35,
        priority: 'high',
        implementation: 'Add workload distribution with dynamic thread pooling and task prioritization',
        validation: 'Monitor CPU utilization, thread efficiency, and task completion rates',
        costBenefit: {
          implementationCost: 0.25,
          expectedBenefit: 0.35,
          roi: 1.4,
          paybackPeriod: 0.71
        },
        dependencies: ['thread-pool-manager', 'task-scheduler'],
        risks: [
          {
            description: 'Thread pool overhead',
            probability: 0.2,
            impact: 0.15,
            mitigation: 'Implement adaptive pool sizing based on workload'
          },
          {
            description: 'Task scheduling complexity',
            probability: 0.25,
            impact: 0.2,
            mitigation: 'Use priority-based scheduling with dynamic adjustment'
          }
        ]
      },
      medium: {
        action: 'Optimize CPU usage with intelligent task scheduling',
        impact: 0.25,
        priority: 'medium',
        implementation: 'Implement smart task scheduling with priority-based execution and resource-aware allocation',
        validation: 'Measure CPU efficiency, task throughput, and resource utilization',
        costBenefit: {
          implementationCost: 0.15,
          expectedBenefit: 0.25,
          roi: 1.67,
          paybackPeriod: 0.6
        },
        dependencies: ['task-prioritizer', 'resource-allocator'],
        risks: [
          {
            description: 'Priority inversion',
            probability: 0.15,
            impact: 0.1,
            mitigation: 'Implement priority inheritance protocol'
          },
          {
            description: 'Resource contention',
            probability: 0.2,
            impact: 0.15,
            mitigation: 'Use resource reservation and preemption'
          }
        ]
      }
    },
    memory: {
      high: {
        action: 'Implement advanced memory management with smart allocation',
        impact: 0.4,
        priority: 'high',
        implementation: 'Add intelligent memory allocation with garbage collection optimization and memory pooling',
        validation: 'Monitor memory usage, GC frequency, and allocation patterns',
        costBenefit: {
          implementationCost: 0.3,
          expectedBenefit: 0.4,
          roi: 1.33,
          paybackPeriod: 0.75
        },
        dependencies: ['memory-pool-manager', 'gc-optimizer'],
        risks: [
          {
            description: 'Memory fragmentation',
            probability: 0.2,
            impact: 0.25,
            mitigation: 'Implement defragmentation strategy'
          },
          {
            description: 'GC overhead',
            probability: 0.15,
            impact: 0.2,
            mitigation: 'Use generational GC with adaptive thresholds'
          }
        ]
      },
      medium: {
        action: 'Optimize memory usage with efficient data structures',
        impact: 0.3,
        priority: 'medium',
        implementation: 'Implement memory-efficient data structures with object pooling and reference optimization',
        validation: 'Measure memory footprint, object allocation rates, and reference counts',
        costBenefit: {
          implementationCost: 0.2,
          expectedBenefit: 0.3,
          roi: 1.5,
          paybackPeriod: 0.67
        },
        dependencies: ['object-pool', 'reference-manager'],
        risks: [
          {
            description: 'Object pool complexity',
            probability: 0.2,
            impact: 0.15,
            mitigation: 'Use adaptive pool sizing'
          },
          {
            description: 'Reference management overhead',
            probability: 0.15,
            impact: 0.1,
            mitigation: 'Implement efficient reference tracking'
          }
        ]
      }
    }
  };

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    const weights = this.PERFORMANCE_MONITORING.metrics;
    let score = 0;
    
    // Response Time Score
    const responseTimeScore = Math.max(0, 1 - (metrics.metrics.responseTime / weights.responseTime.threshold));
    score += responseTimeScore * weights.responseTime.weight;
    
    // Throughput Score
    const throughputScore = Math.min(1, metrics.metrics.throughput / weights.throughput.threshold);
    score += throughputScore * weights.throughput.weight;
    
    // Error Rate Score
    const errorRateScore = Math.max(0, 1 - (metrics.metrics.errorRate / weights.errorRate.threshold));
    score += errorRateScore * weights.errorRate.weight;
    
    // Resource Utilization Score
    const resourceScore = Math.max(0, 1 - (metrics.metrics.resourceUtilization.cpu / weights.resourceUtilization.threshold));
    score += resourceScore * weights.resourceUtilization.weight;
    
    return Math.min(1, Math.max(0, score));
  }

  private detectPerformancePatterns(metrics: PerformanceMetrics[]): {
    patterns: Array<{
      type: 'trend' | 'seasonal' | 'cyclic';
      confidence: number;
      description: string;
      impact: number;
      recommendations: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        expectedImprovement: number;
      }>;
    }>;
    anomalies: Array<{
      timestamp: number;
      value: number;
      expectedValue: number;
      deviation: number;
      severity: 'high' | 'medium' | 'low';
      impact: number;
      recommendations: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        expectedImprovement: number;
      }>;
    }>;
  } {
    const patterns: Array<{
      type: 'trend' | 'seasonal' | 'cyclic';
      confidence: number;
      description: string;
      impact: number;
      recommendations: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        expectedImprovement: number;
      }>;
    }> = [];
    const anomalies: Array<{
      timestamp: number;
      value: number;
      expectedValue: number;
      deviation: number;
      severity: 'high' | 'medium' | 'low';
      impact: number;
      recommendations: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        expectedImprovement: number;
      }>;
    }> = [];

    // Enhanced trend analysis with weighted moving average
    const responseTimes = metrics.map(m => m.metrics.responseTime);
    const weightedMA = this.calculateWeightedMovingAverage(responseTimes, 0.3);
    const trendConfidence = this.calculateTrendConfidence(responseTimes, weightedMA);
    
    if (trendConfidence > this.TREND_THRESHOLD) {
      const trendImpact = this.calculateTrendImpact(trendConfidence);
      patterns.push({
        type: 'trend',
        confidence: trendConfidence,
        description: `Detected ${trendConfidence > 0 ? 'increasing' : 'decreasing'} trend in response times`,
        impact: trendImpact,
        recommendations: this.generateTrendRecommendations(
          { confidence: trendConfidence, description: 'Response time trend' },
          trendImpact
        )
      });
    }

    // Enhanced seasonality detection with multiple periods
    const seasonalPeriods = [24, 168, 720]; // 1 day, 1 week, 1 month in hours
    for (const period of seasonalPeriods) {
      const seasonalityScore = this.calculateSeasonalityScore(responseTimes, period);
      if (seasonalityScore > this.SEASONALITY_THRESHOLD) {
        const seasonalityImpact = this.calculateSeasonalityImpact(seasonalityScore);
        patterns.push({
          type: 'seasonal',
          confidence: seasonalityScore,
          description: `Detected seasonal pattern with period of ${period} hours`,
          impact: seasonalityImpact,
          recommendations: this.generateSeasonalityRecommendations(
            { confidence: seasonalityScore, description: `Seasonal pattern (${period}h)` },
            seasonalityImpact
          )
        });
      }
    }

    // Enhanced anomaly detection with adaptive thresholds
    const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const stdDev = Math.sqrt(
      responseTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / responseTimes.length
    );
    const adaptiveThreshold = this.ANOMALY_THRESHOLD * (1 + Math.log10(responseTimes.length));

    metrics.forEach((metric, index) => {
      const deviation = Math.abs(metric.metrics.responseTime - mean) / stdDev;
      if (deviation > adaptiveThreshold) {
        const severity = this.calculateAnomalySeverity(deviation);
        const impact = this.calculateAnomalyImpact(severity, deviation);
        anomalies.push({
          timestamp: metric.timestamp,
          value: metric.metrics.responseTime,
          expectedValue: mean,
          deviation,
          severity,
          impact,
          recommendations: this.generateAnomalyRecommendations(severity, impact)
        });
      }
    });

    return { patterns, anomalies };
  }

  private calculateWeightedMovingAverage(values: number[], weight: number): number[] {
    const result: number[] = [];
    let prev = values[0];
    
    for (const value of values) {
      prev = weight * value + (1 - weight) * prev;
      result.push(prev);
    }
    
    return result;
  }

  private calculateTrendConfidence(values: number[], weightedMA: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = i - xMean;
      const yDiff = weightedMA[i] - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateSeasonalityScore(values: number[], period: number): number {
    const n = values.length;
    if (n < period * 2) return 0;

    const seasonalValues: number[][] = Array.from({ length: period }, () => []);
    
    for (let i = 0; i < n; i++) {
      seasonalValues[i % period].push(values[i]);
    }

    const seasonalMeans = seasonalValues.map(v => 
      v.reduce((a, b) => a + b, 0) / v.length
    );

    const overallMean = seasonalMeans.reduce((a, b) => a + b, 0) / period;
    
    const seasonalVariance = seasonalMeans.reduce((a, b) => 
      a + Math.pow(b - overallMean, 2), 0
    ) / period;

    const totalVariance = values.reduce((a, b) => 
      a + Math.pow(b - overallMean, 2), 0
    ) / n;

    return totalVariance === 0 ? 0 : seasonalVariance / totalVariance;
  }

  private calculateTrendImpact(confidence: number): number {
    return Math.min(confidence * 1.5, 1.0);
  }

  private calculateSeasonalityImpact(confidence: number): number {
    return Math.min(confidence * 1.2, 1.0);
  }

  private calculateAnomalySeverity(deviation: number): 'high' | 'medium' | 'low' {
    if (deviation > 3.0) return 'high';
    if (deviation > 2.0) return 'medium';
    return 'low';
  }

  private calculateAnomalyImpact(severity: 'high' | 'medium' | 'low', deviation: number): number {
    const severityMultiplier = { high: 1.0, medium: 0.7, low: 0.4 };
    return Math.min(deviation * severityMultiplier[severity], 1.0);
  }

  private generateTrendRecommendations(analysis: { confidence: number; description: string }, impact: number): Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImprovement: number;
  }> {
    const recommendations: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      expectedImprovement: number;
    }> = [];

    if (impact > 0.8) {
      recommendations.push({
        action: 'Implement proactive resource scaling',
        priority: 'high',
        expectedImprovement: 0.4
      });
      recommendations.push({
        action: 'Optimize resource allocation strategy',
        priority: 'high',
        expectedImprovement: 0.35
      });
    }

    if (impact > 0.6) {
      recommendations.push({
        action: 'Implement adaptive resource management',
        priority: 'medium',
        expectedImprovement: 0.3
      });
      recommendations.push({
        action: 'Enhance monitoring and alerting',
        priority: 'medium',
        expectedImprovement: 0.25
      });
    }

    if (impact > 0.4) {
      recommendations.push({
        action: 'Review resource usage patterns',
        priority: 'low',
        expectedImprovement: 0.2
      });
      recommendations.push({
        action: 'Implement basic resource optimization',
        priority: 'low',
        expectedImprovement: 0.15
      });
    }

    return recommendations;
  }

  private generateSeasonalityRecommendations(analysis: { confidence: number; description: string }, impact: number): Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImprovement: number;
  }> {
    const recommendations: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      expectedImprovement: number;
    }> = [];

    if (impact > 0.8) {
      recommendations.push({
        action: 'Implement predictive scaling based on seasonal patterns',
        priority: 'high',
        expectedImprovement: 0.35
      });
      recommendations.push({
        action: 'Optimize resource allocation for peak periods',
        priority: 'high',
        expectedImprovement: 0.3
      });
    }

    if (impact > 0.6) {
      recommendations.push({
        action: 'Implement seasonal resource planning',
        priority: 'medium',
        expectedImprovement: 0.25
      });
      recommendations.push({
        action: 'Enhance seasonal pattern monitoring',
        priority: 'medium',
        expectedImprovement: 0.2
      });
    }

    if (impact > 0.4) {
      recommendations.push({
        action: 'Review seasonal resource usage',
        priority: 'low',
        expectedImprovement: 0.15
      });
      recommendations.push({
        action: 'Implement basic seasonal optimization',
        priority: 'low',
        expectedImprovement: 0.1
      });
    }

    return recommendations;
  }

  private generateAnomalyRecommendations(severity: 'high' | 'medium' | 'low', impact: number): Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImprovement: number;
  }> {
    const recommendations: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      expectedImprovement: number;
    }> = [];

    if (severity === 'high') {
      recommendations.push({
        action: 'Implement immediate resource scaling',
        priority: 'high',
        expectedImprovement: 0.5
      });
      recommendations.push({
        action: 'Investigate root cause',
        priority: 'high',
        expectedImprovement: 0.4
      });
      recommendations.push({
        action: 'Implement emergency optimization',
        priority: 'high',
        expectedImprovement: 0.35
      });
    }

    if (severity === 'medium') {
      recommendations.push({
        action: 'Optimize resource allocation',
        priority: 'medium',
        expectedImprovement: 0.3
      });
      recommendations.push({
        action: 'Enhance monitoring and alerting',
        priority: 'medium',
        expectedImprovement: 0.25
      });
      recommendations.push({
        action: 'Implement preventive measures',
        priority: 'medium',
        expectedImprovement: 0.2
      });
    }

    if (severity === 'low') {
      recommendations.push({
        action: 'Review resource usage patterns',
        priority: 'low',
        expectedImprovement: 0.15
      });
      recommendations.push({
        action: 'Implement basic optimization',
        priority: 'low',
        expectedImprovement: 0.1
      });
      recommendations.push({
        action: 'Monitor for pattern changes',
        priority: 'low',
        expectedImprovement: 0.05
      });
    }

    return recommendations;
  }
}

class ErrorRecoveryManager {
  private strategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private metrics: RecoveryMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 100;
  private readonly resourceManager: ResourceManager;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: RateLimiter;
  private readonly performanceThresholds: typeof ResourceVisualization.prototype.PERFORMANCE_THRESHOLDS;
  private readonly recoveryHistory: Map<string, Array<{
    timestamp: number;
    success: boolean;
    duration: number;
    impact: RecoveryMetrics['impact'];
  }>> = new Map();
  private readonly activeRetries: Map<string, {
    attempts: number;
    lastAttempt: number;
    operation: () => Promise<any>;
  }> = new Map();

  constructor(
    resourceManager: ResourceManager,
    circuitBreaker: CircuitBreaker,
    rateLimiter: RateLimiter,
    performanceThresholds: typeof ResourceVisualization.prototype.PERFORMANCE_THRESHOLDS
  ) {
    this.resourceManager = resourceManager;
    this.circuitBreaker = circuitBreaker;
    this.rateLimiter = rateLimiter;
    this.performanceThresholds = performanceThresholds;
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies() {
    // Enhanced retry strategy with adaptive backoff
    this.addRecoveryStrategy('adaptive-retry', {
      type: 'retry',
      priority: 'high',
      conditions: {
        errorTypes: ['NetworkError', 'TimeoutError', 'ServiceUnavailableError'],
        performanceThresholds: {
          responseTime: this.performanceThresholds.responseTime.warning,
          errorRate: this.performanceThresholds.errorRate.warning
        }
      },
      actions: [{
        type: 'retry',
        config: {
          maxAttempts: 3,
          delay: 1000,
          backoff: 'exponential',
          adaptiveDelay: true
        }
      }],
      validation: {
        successCriteria: [
          { metric: 'responseTime', threshold: this.performanceThresholds.responseTime.warning, operator: 'lt' },
          { metric: 'errorRate', threshold: this.performanceThresholds.errorRate.warning, operator: 'lt' }
        ],
        timeout: 30000
      }
    });

    // Resource-aware fallback strategy
    this.addRecoveryStrategy('resource-fallback', {
      type: 'fallback',
      priority: 'medium',
      conditions: {
        errorTypes: ['ResourceExhaustedError', 'MemoryError', 'CPUError'],
        resourceThresholds: {
          memory: this.performanceThresholds.memoryUsage.heap.warning,
          cpu: this.performanceThresholds.cpuUsage.user.warning
        }
      },
      actions: [
        {
          type: 'fallback',
          config: {
            fallbackValue: null,
            degradeGracefully: true
          }
        },
        {
          type: 'scale',
          config: {
            resourceType: 'memory',
            scaleFactor: 0.8
          }
        }
      ],
      validation: {
        successCriteria: [
          { metric: 'memoryUsage', threshold: this.performanceThresholds.memoryUsage.heap.warning, operator: 'lt' },
          { metric: 'cpuUsage', threshold: this.performanceThresholds.cpuUsage.user.warning, operator: 'lt' }
        ],
        timeout: 60000
      }
    });

    // Performance-based circuit breaker strategy
    this.addRecoveryStrategy('performance-circuit-breaker', {
      type: 'circuit-breaker',
      priority: 'high',
      conditions: {
        errorTypes: ['PerformanceError', 'TimeoutError'],
        performanceThresholds: {
          responseTime: this.performanceThresholds.responseTime.critical,
          throughput: this.performanceThresholds.throughput.critical
        }
      },
      actions: [
        {
          type: 'degrade',
          config: {
            serviceLevel: 'basic',
            timeout: 5000
          }
        },
        {
          type: 'notify',
          config: {
            notificationLevel: 'error',
            includeMetrics: true
          }
        }
      ],
      validation: {
        successCriteria: [
          { metric: 'responseTime', threshold: this.performanceThresholds.responseTime.warning, operator: 'lt' },
          { metric: 'throughput', threshold: this.performanceThresholds.throughput.warning, operator: 'gt' }
        ],
        timeout: 30000
      }
    });
  }

  public async executeRecovery(error: Error, context: any): Promise<boolean> {
    const strategy = this.selectRecoveryStrategy(error, context);
    if (!strategy) {
      return false;
    }

    const startTime = Date.now();
    let success = false;
    const actionResults: RecoveryMetrics['actions'] = [];

    try {
      for (const action of strategy.actions) {
        const actionStartTime = Date.now();
        const actionSuccess = await this.executeRecoveryAction(action, context);
        actionResults.push({
          type: action.type,
          success: actionSuccess,
          duration: Date.now() - actionStartTime
        });

        if (!actionSuccess) {
          break;
        }
      }

      const metrics: RecoveryMetrics = {
        timestamp: Date.now(),
        strategy: strategy.type,
        success: actionResults.every(r => r.success),
        duration: Date.now() - startTime,
        impact: {
          resource: this.resourceManager.getResourceMetrics().current,
          performance: {
            responseTime: context.responseTime || 0,
            throughput: context.throughput || 0,
            errorRate: context.errorRate || 0
          }
        },
        actions: actionResults
      };

      success = this.validateRecovery(metrics, strategy);
      this.updateMetrics(metrics);
      this.updateRecoveryHistory(strategy.type, metrics);

      return success;
    } catch (recoveryError) {
      console.error('Recovery execution failed:', recoveryError);
      return false;
    }
  }

  private updateRecoveryHistory(strategyType: string, metrics: RecoveryMetrics) {
    if (!this.recoveryHistory.has(strategyType)) {
      this.recoveryHistory.set(strategyType, []);
    }

    const history = this.recoveryHistory.get(strategyType)!;
    history.push({
      timestamp: metrics.timestamp,
      success: metrics.success,
      duration: metrics.duration,
      impact: metrics.impact
    });

    // Keep only the last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  public getRecoveryHistory(strategyType: string) {
    return this.recoveryHistory.get(strategyType) || [];
  }

  public getRecoveryEffectiveness(strategyType: string): {
    successRate: number;
    averageDuration: number;
    averageImpact: {
      resource: Partial<ResourceMetrics>;
      performance: Partial<PerformanceMetrics['metrics']>;
    };
  } {
    const history = this.getRecoveryHistory(strategyType);
    if (history.length === 0) {
      return {
        successRate: 0,
        averageDuration: 0,
        averageImpact: {
          resource: {},
          performance: {}
        }
      };
    }

    const successCount = history.filter(h => h.success).length;
    const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
    
    // Calculate average impact
    const averageImpact = {
      resource: this.calculateAverageResourceImpact(history),
      performance: this.calculateAveragePerformanceImpact(history)
    };

    return {
      successRate: successCount / history.length,
      averageDuration: totalDuration / history.length,
      averageImpact
    };
  }

  private calculateAverageResourceImpact(history: RecoveryMetrics[]): Partial<ResourceMetrics> {
    const resourceSums: Partial<ResourceMetrics> = {};
    const count = history.length;

    history.forEach(h => {
      Object.entries(h.impact.resource).forEach(([key, value]) => {
        if (!resourceSums[key]) {
          resourceSums[key] = 0;
        }
        resourceSums[key]! += value;
      });
    });

    return Object.fromEntries(
      Object.entries(resourceSums).map(([key, value]) => [key, value! / count])
    );
  }

  private calculateAveragePerformanceImpact(history: RecoveryMetrics[]): Partial<PerformanceMetrics['metrics']> {
    const performanceSums: Partial<PerformanceMetrics['metrics']> = {};
    const count = history.length;

    history.forEach(h => {
      Object.entries(h.impact.performance).forEach(([key, value]) => {
        if (!performanceSums[key]) {
          performanceSums[key] = 0;
        }
        performanceSums[key]! += value;
      });
    });

    return Object.fromEntries(
      Object.entries(performanceSums).map(([key, value]) => [key, value! / count])
    );
  }

  private selectRecoveryStrategy(error: Error, context: any): ErrorRecoveryStrategy | null {
    for (const [_, strategy] of this.strategies) {
      if (this.matchesStrategyConditions(error, context, strategy)) {
        return strategy;
      }
    }
    return null;
  }

  private matchesStrategyConditions(
    error: Error,
    context: any,
    strategy: ErrorRecoveryStrategy
  ): boolean {
    // Check error type
    if (!strategy.conditions.errorTypes.includes(error.name)) {
      return false;
    }

    // Check resource thresholds
    if (strategy.conditions.resourceThresholds) {
      const currentResources = this.resourceManager.getResourceMetrics().current;
      for (const [resource, threshold] of Object.entries(strategy.conditions.resourceThresholds)) {
        if (currentResources[resource as keyof ResourceMetrics] > threshold) {
          return false;
        }
      }
    }

    // Check performance thresholds
    if (strategy.conditions.performanceThresholds) {
      const currentMetrics = this.getCurrentMetrics();
      for (const [metric, threshold] of Object.entries(strategy.conditions.performanceThresholds)) {
        if (currentMetrics[metric as keyof PerformanceMetrics['metrics']] > threshold) {
          return false;
        }
      }
    }

    return true;
  }

  private async executeRecoveryAction(
    action: ErrorRecoveryStrategy['actions'][0],
    context: any
  ): Promise<boolean> {
    switch (action.type) {
      case 'retry':
        return this.executeRetryAction(action.config, context);
      case 'fallback':
        return this.executeFallbackAction(action.config, context);
      case 'scale':
        return this.executeScaleAction(action.config, context);
      case 'degrade':
        return this.executeDegradeAction(action.config, context);
      case 'notify':
        return this.executeNotifyAction(action.config, context);
      default:
        return false;
    }
  }

  private async executeRetryAction(
    config: ErrorRecoveryStrategy['actions'][0]['config'],
    context: any
  ): Promise<boolean> {
    if (!config.maxAttempts || !config.delay) {
      console.warn('Invalid retry configuration');
      return false;
    }

    if (!context?.operation || typeof context.operation !== 'function') {
      console.error('Invalid operation in context');
      return false;
    }

    if (!context.operationId) {
      console.error('Missing operationId in context');
      return false;
    }

    const retryKey = `${context.service}-${context.operationId}`;
    const existingRetry = this.activeRetries.get(retryKey);

    if (existingRetry) {
      if (existingRetry.attempts >= config.maxAttempts) {
        this.activeRetries.delete(retryKey);
        return false;
      }
      if (Date.now() - existingRetry.lastAttempt < config.delay) {
        return false;
      }
    }

    const retryInfo = existingRetry || {
      attempts: 0,
      lastAttempt: 0,
      operation: context.operation
    };

    try {
      const result = await retryInfo.operation();
      this.activeRetries.delete(retryKey);
      return true;
    } catch (error) {
      retryInfo.attempts++;
      retryInfo.lastAttempt = Date.now();
      this.activeRetries.set(retryKey, retryInfo);

      if (retryInfo.attempts >= config.maxAttempts) {
        this.activeRetries.delete(retryKey);
        return false;
      }

      const delay = config.backoff === 'exponential'
        ? config.delay * Math.pow(2, retryInfo.attempts - 1)
        : config.delay;

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.executeRetryAction(config, context);
    }
  }

  private async executeFallbackAction(
    config: ErrorRecoveryStrategy['actions'][0]['config'],
    context: any
  ): Promise<boolean> {
    try {
      if (config.degradeGracefully) {
        // Implement graceful degradation
        await this.degradeService(context.service, config.fallbackValue);
      } else {
        // Use fallback value directly
        context.result = config.fallbackValue;
      }
      return true;
    } catch (error) {
      console.error('Fallback action failed:', error);
      return false;
    }
  }

  private async executeScaleAction(
    config: ErrorRecoveryStrategy['actions'][0]['config'],
    context: any
  ): Promise<boolean> {
    try {
      const resourceManager = this.resourceManager;
      const currentMetrics = resourceManager.getResourceMetrics().current;
      
      // Scale the specified resource
      if (config.resourceType === 'memory') {
        const newLimit = currentMetrics.memory * config.scaleFactor;
        await resourceManager.setResourceLimit('memory', newLimit);
      } else if (config.resourceType === 'cpu') {
        const newLimit = currentMetrics.cpu * config.scaleFactor;
        await resourceManager.setResourceLimit('cpu', newLimit);
      }
      
      return true;
    } catch (error) {
      console.error('Scale action failed:', error);
      return false;
    }
  }

  private async executeDegradeAction(
    config: ErrorRecoveryStrategy['actions'][0]['config'],
    context: any
  ): Promise<boolean> {
    try {
      // Implement service degradation
      await this.degradeService(context.service, config.serviceLevel);
      return true;
    } catch (error) {
      console.error('Degrade action failed:', error);
      return false;
    }
  }

  private async executeNotifyAction(
    config: ErrorRecoveryStrategy['actions'][0]['config'],
    context: any
  ): Promise<boolean> {
    try {
      const notification = {
        level: config.notificationLevel,
        message: `Recovery action executed for ${context.service}`,
        metrics: config.includeMetrics ? this.getCurrentMetrics() : undefined,
        timestamp: Date.now()
      };
      
      await this.sendNotification(notification);
      return true;
    } catch (error) {
      console.error('Notify action failed:', error);
      return false;
    }
  }

  private getCurrentMetrics(): PerformanceMetrics['metrics'] {
    // Implementation to get current performance metrics
    return {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        network: 0,
        disk: 0
      },
      cacheHitRate: 0,
      requestQueueLength: 0,
      activeConnections: 0,
      memoryUsage: {
        heap: 0,
        nonHeap: 0,
        gc: {
          count: 0,
          time: 0
        }
      },
      cpuUsage: {
        user: 0,
        system: 0,
        idle: 0
      },
      networkUsage: {
        bytesIn: 0,
        bytesOut: 0,
        connections: 0
      }
    };
  }

  private async degradeService(service: string, level: string): Promise<void> {
    // Implementation to degrade service
    console.log(`Degrading service ${service} to level ${level}`);
  }

  private async sendNotification(notification: any): Promise<void> {
    // Implementation to send notification
    console.log('Sending notification:', notification);
  }

  private validateRecovery(
    metrics: RecoveryMetrics,
    strategy: ErrorRecoveryStrategy
  ): boolean {
    const currentMetrics = this.resourceManager.getResourceMetrics().current;
    
    for (const criteria of strategy.validation.successCriteria) {
      const value = currentMetrics[criteria.metric as keyof ResourceMetrics];
      if (!this.evaluateCriteria(value, criteria)) {
        return false;
      }
    }
    
    return true;
  }

  private evaluateCriteria(
    value: number,
    criteria: ErrorRecoveryStrategy['validation']['successCriteria'][0]
  ): boolean {
    switch (criteria.operator) {
      case 'gt':
        return value > criteria.threshold;
      case 'lt':
        return value < criteria.threshold;
      case 'eq':
        return value === criteria.threshold;
      case 'gte':
        return value >= criteria.threshold;
      case 'lte':
        return value <= criteria.threshold;
      default:
        return false;
    }
  }

  private updateMetrics(metrics: RecoveryMetrics) {
    this.metrics.push(metrics);
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }
  }

  public getRecoveryMetrics(): RecoveryMetrics[] {
    return [...this.metrics];
  }

  public addRecoveryStrategy(
    name: string,
    strategy: ErrorRecoveryStrategy
  ): void {
    this.strategies.set(name, strategy);
  }

  public removeRecoveryStrategy(name: string): void {
    this.strategies.delete(name);
  }
}

export const requestManager = RequestManager.getInstance(); 