import { ValidationResult } from './stateValidation';
import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';

interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  validationTypeDistribution: Record<string, number>;
  errorDistribution: Record<string, number>;
  warningDistribution: Record<string, number>;
  cacheHitRate: number;
  middlewarePerformance: {
    averageTime: number;
    slowestMiddleware: string;
    fastestMiddleware: string;
  };
  validationPatterns: {
    mostCommonErrors: Array<{ error: string; count: number }>;
    mostCommonWarnings: Array<{ warning: string; count: number }>;
    validationHotspots: Array<{ key: string; count: number }>;
  };
  performanceTrends: {
    validationTimeTrend: Array<{ timestamp: Date; time: number }>;
    errorRateTrend: Array<{ timestamp: Date; rate: number }>;
    cacheHitRateTrend: Array<{ timestamp: Date; rate: number }>;
  };
}

interface ValidationDebugInfo {
  validationChain: Array<{
    type: string;
    startTime: number;
    endTime: number;
    duration: number;
    success: boolean;
    details?: any;
  }>;
  stateSnapshot: {
    before: any;
    after: any;
    changes: Array<{ path: string; before: any; after: any }>;
  };
  performanceBreakdown: {
    middleware: number;
    schema: number;
    rules: number;
    crossField: number;
    custom: number;
    total: number;
  };
  validationContext: {
    key: string;
    timestamp: Date;
    config: any;
    environment: {
      browser: string;
      device: string;
      network: string;
    };
  };
}

class ValidationAnalytics {
  private static instance: ValidationAnalytics;
  private metrics: Map<string, ValidationMetrics> = new Map();
  private debugInfo: Map<string, ValidationDebugInfo[]> = new Map();
  private readonly MAX_DEBUG_ENTRIES = 100;
  private readonly METRICS_RETENTION_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly TREND_DATA_POINTS = 24; // 24 hours of hourly data

  private constructor() {
    this.startMetricsCleanup();
  }

  public static getInstance(): ValidationAnalytics {
    if (!ValidationAnalytics.instance) {
      ValidationAnalytics.instance = new ValidationAnalytics();
    }
    return ValidationAnalytics.instance;
  }

  private startMetricsCleanup() {
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private cleanupOldMetrics() {
    const now = Date.now();
    for (const [key, metrics] of this.metrics) {
      // Remove metrics older than retention period
      if (metrics.performanceTrends.validationTimeTrend.length > 0) {
        const oldestTimestamp = metrics.performanceTrends.validationTimeTrend[0].timestamp;
        if (now - oldestTimestamp.getTime() > this.METRICS_RETENTION_PERIOD) {
          this.metrics.delete(key);
        }
      }
    }

    // Cleanup debug info
    for (const [key, entries] of this.debugInfo) {
      if (entries.length > this.MAX_DEBUG_ENTRIES) {
        this.debugInfo.set(key, entries.slice(-this.MAX_DEBUG_ENTRIES));
      }
    }
  }

  public recordValidation(key: string, result: ValidationResult, debugInfo?: ValidationDebugInfo): void {
    try {
      const metrics = this.metrics.get(key) ?? this.initializeMetrics();
      
      // Update basic metrics
      metrics.totalValidations++;
      if (result.isValid) {
        metrics.successfulValidations++;
      } else {
        metrics.failedValidations++;
      }

      // Update validation type distribution
      metrics.validationTypeDistribution[result.metadata.validationType] = 
        (metrics.validationTypeDistribution[result.metadata.validationType] ?? 0) + 1;

      // Update error and warning distributions
      result.errors.forEach(error => {
        metrics.errorDistribution[error] = (metrics.errorDistribution[error] ?? 0) + 1;
      });
      result.warnings.forEach(warning => {
        metrics.warningDistribution[warning] = (metrics.warningDistribution[warning] ?? 0) + 1;
      });

      // Update performance metrics
      const validationTime = result.metadata.validationTime;
      metrics.averageValidationTime = 
        (metrics.averageValidationTime * (metrics.totalValidations - 1) + validationTime) / metrics.totalValidations;

      // Update cache hit rate
      const cacheHits = metrics.totalValidations * metrics.cacheHitRate;
      metrics.cacheHitRate = 
        (cacheHits + (result.metadata.performanceMetrics.cacheHit ? 1 : 0)) / metrics.totalValidations;

      // Update middleware performance
      const middlewareTime = result.metadata.performanceMetrics.middlewareTime;
      metrics.middlewarePerformance.averageTime = 
        (metrics.middlewarePerformance.averageTime * (metrics.totalValidations - 1) + middlewareTime) / metrics.totalValidations;

      // Update trends
      this.updateTrends(metrics, result);

      // Store metrics
      this.metrics.set(key, metrics);

      // Store debug info if provided
      if (debugInfo) {
        const entries = this.debugInfo.get(key) ?? [];
        entries.push(debugInfo);
        if (entries.length > this.MAX_DEBUG_ENTRIES) {
          entries.shift(); // Remove oldest entry
        }
        this.debugInfo.set(key, entries);
      }

      // Log analytics
      this.logAnalytics(key, metrics, result);

    } catch (error) {
      recordError('Failed to record validation analytics', error instanceof Error ? error.message : String(error), { key });
    }
  }

  private initializeMetrics(): ValidationMetrics {
    return {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      averageValidationTime: 0,
      validationTypeDistribution: {},
      errorDistribution: {},
      warningDistribution: {},
      cacheHitRate: 0,
      middlewarePerformance: {
        averageTime: 0,
        slowestMiddleware: '',
        fastestMiddleware: ''
      },
      validationPatterns: {
        mostCommonErrors: [],
        mostCommonWarnings: [],
        validationHotspots: []
      },
      performanceTrends: {
        validationTimeTrend: [],
        errorRateTrend: [],
        cacheHitRateTrend: []
      }
    };
  }

  private updateTrends(metrics: ValidationMetrics, result: ValidationResult): void {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Update validation time trend
    metrics.performanceTrends.validationTimeTrend.push({
      timestamp: now,
      time: result.metadata.validationTime
    });
    metrics.performanceTrends.validationTimeTrend = metrics.performanceTrends.validationTimeTrend
      .filter(point => point.timestamp > hourAgo)
      .slice(-this.TREND_DATA_POINTS);

    // Update error rate trend
    const errorRate = result.errors.length > 0 ? 1 : 0;
    metrics.performanceTrends.errorRateTrend.push({
      timestamp: now,
      rate: errorRate
    });
    metrics.performanceTrends.errorRateTrend = metrics.performanceTrends.errorRateTrend
      .filter(point => point.timestamp > hourAgo)
      .slice(-this.TREND_DATA_POINTS);

    // Update cache hit rate trend
    metrics.performanceTrends.cacheHitRateTrend.push({
      timestamp: now,
      rate: result.metadata.performanceMetrics.cacheHit ? 1 : 0
    });
    metrics.performanceTrends.cacheHitRateTrend = metrics.performanceTrends.cacheHitRateTrend
      .filter(point => point.timestamp > hourAgo)
      .slice(-this.TREND_DATA_POINTS);
  }

  private logAnalytics(key: string, metrics: ValidationMetrics, result: ValidationResult): void {
    auditLogger.log({
      category: 'validation_analytics',
      severity: 'info',
      message: 'Validation analytics updated',
      context: {
        key,
        metrics: {
          totalValidations: metrics.totalValidations,
          successRate: metrics.successfulValidations / metrics.totalValidations,
          averageValidationTime: metrics.averageValidationTime,
          cacheHitRate: metrics.cacheHitRate,
          errorCount: result.errors.length,
          warningCount: result.warnings.length
        }
      }
    });

    recordOperationLatency('validation_analytics', result.metadata.validationTime, {
      key,
      successRate: metrics.successfulValidations / metrics.totalValidations,
      cacheHitRate: metrics.cacheHitRate
    });
  }

  public getMetrics(key: string): ValidationMetrics | undefined {
    return this.metrics.get(key);
  }

  public getDebugInfo(key: string): ValidationDebugInfo[] | undefined {
    return this.debugInfo.get(key);
  }

  public getValidationInsights(key: string): {
    recommendations: string[];
    warnings: string[];
    performanceIssues: string[];
  } {
    const metrics = this.metrics.get(key);
    if (!metrics) return { recommendations: [], warnings: [], performanceIssues: [] };

    const insights = {
      recommendations: [] as string[],
      warnings: [] as string[],
      performanceIssues: [] as string[]
    };

    // Analyze validation patterns
    const errorRate = metrics.failedValidations / metrics.totalValidations;
    if (errorRate > 0.1) { // More than 10% error rate
      insights.warnings.push(`High validation error rate: ${(errorRate * 100).toFixed(1)}%`);
    }

    // Analyze performance
    if (metrics.averageValidationTime > 100) { // More than 100ms
      insights.performanceIssues.push(`Slow validation time: ${metrics.averageValidationTime.toFixed(1)}ms average`);
    }

    // Analyze cache effectiveness
    if (metrics.cacheHitRate < 0.5) { // Less than 50% cache hit rate
      insights.recommendations.push('Consider increasing cache TTL or adjusting cache strategy');
    }

    // Analyze error patterns
    const mostCommonError = Object.entries(metrics.errorDistribution)
      .sort(([, a], [, b]) => b - a)[0];
    if (mostCommonError) {
      insights.recommendations.push(`Most common error: "${mostCommonError[0]}" (${mostCommonError[1]} occurrences)`);
    }

    // Analyze validation types
    const validationTypes = Object.entries(metrics.validationTypeDistribution)
      .sort(([, a], [, b]) => b - a);
    if (validationTypes.length > 1) {
      insights.recommendations.push(
        `Validation type distribution: ${validationTypes
          .map(([type, count]) => `${type}: ${((count / metrics.totalValidations) * 100).toFixed(1)}%`)
          .join(', ')}`
      );
    }

    return insights;
  }

  public async cleanup(): Promise<void> {
    this.cleanupOldMetrics();
  }
}

export const validationAnalytics = ValidationAnalytics.getInstance(); 