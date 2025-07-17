import * as Sentry from '@sentry/nextjs';
import { errorHandler } from '@/lib/error-handling';

// Performance metric types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'navigation' | 'resource' | 'paint' | 'layout' | 'interaction' | 'custom';
  metadata?: Record<string, unknown>;
}

export interface PerformanceLongTaskTiming extends PerformanceEntry {
  attribution: any[];
}

export interface PerformanceLayoutShift extends PerformanceEntry {
  value: number;
  sources: any[];
  hadRecentInput: boolean;
}

export interface PerformanceThreshold {
  name: string;
  threshold: number;
  severity: 'warning' | 'error' | 'critical';
  category: string;
}

export interface PerformanceReport {
  timestamp: number;
  sessionId: string;
  userId?: string;
  url: string;
  userAgent: string;
  metrics: PerformanceMetric[];
  violations: PerformanceThreshold[];
  summary: {
    totalMetrics: number;
    violations: number;
    averageScore: number;
  };
  [key: string]: unknown; // Add index signature for Context compatibility
}

// Performance monitoring configuration
export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of sessions to monitor
  thresholds: PerformanceThreshold[];
  maxMetricsPerSession: number;
  reportInterval: number; // milliseconds
  enableRealUserMonitoring: boolean;
  enableResourceTiming: boolean;
  enableLongTasks: boolean;
  enableLayoutShifts: boolean;
  enableFirstInputDelay: boolean;
}

// Default configuration
const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: true,
  sampleRate: 0.1, // 10% of sessions
  maxMetricsPerSession: 1000,
  reportInterval: 60000, // 1 minute
  enableRealUserMonitoring: true,
  enableResourceTiming: true,
  enableLongTasks: true,
  enableLayoutShifts: true,
  enableFirstInputDelay: true,
  thresholds: [
    { name: 'FCP', threshold: 2000, severity: 'warning', category: 'navigation' },
    { name: 'LCP', threshold: 2500, severity: 'error', category: 'navigation' },
    { name: 'FID', threshold: 100, severity: 'warning', category: 'interaction' },
    { name: 'CLS', threshold: 0.1, severity: 'error', category: 'layout' },
    { name: 'TTFB', threshold: 600, severity: 'warning', category: 'navigation' },
    { name: 'TBT', threshold: 300, severity: 'error', category: 'interaction' },
  ],
};

// Performance monitoring class
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetric[] = [];
  private sessionId: string;
  private userId?: string;
  private reportTimer?: NodeJS.Timeout;
  private observers: Map<string, PerformanceObserver> = new Map();
  private isInitialized = false;

  // Public getter for isInitialized
  public get initialized(): boolean {
    return this.isInitialized;
  }

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = crypto.randomUUID();
    
    // Check if monitoring should be enabled for this session
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.isInitialized = true;
    this.setupObservers();
    this.startReporting();
    this.captureInitialMetrics();
  }

  private setupObservers(): void {
    // Navigation timing
    if (this.config.enableRealUserMonitoring) {
      this.observeNavigationTiming();
    }

    // Resource timing
    if (this.config.enableResourceTiming) {
      this.observeResourceTiming();
    }

    // Long tasks
    if (this.config.enableLongTasks) {
      this.observeLongTasks();
    }

    // Layout shifts
    if (this.config.enableLayoutShifts) {
      this.observeLayoutShifts();
    }

    // First input delay
    if (this.config.enableFirstInputDelay) {
      this.observeFirstInputDelay();
    }
  }

  private observeNavigationTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.addMetric('TTFB', navEntry.responseStart - navEntry.requestStart, 'ms', 'navigation');
            this.addMetric('DOMContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart, 'ms', 'navigation');
            this.addMetric('LoadComplete', navEntry.loadEventEnd - navEntry.loadEventStart, 'ms', 'navigation');
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', observer);
    } catch (error) {
      // Failed to observe navigation timing - handled by error boundary
    }
  }

  private observeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.addMetric(
              `Resource_${resourceEntry.name}`,
              resourceEntry.duration,
              'ms',
              'resource',
              {
                name: resourceEntry.name,
                type: resourceEntry.initiatorType,
                size: resourceEntry.transferSize,
              }
            );
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (error) {
      // Failed to observe resource timing - handled by error boundary
    }
  }

  private observeLongTasks(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'longtask') {
            const longTaskEntry = entry as PerformanceLongTaskTiming;
            this.addMetric(
              'LongTask',
              longTaskEntry.duration,
              'ms',
              'interaction',
              {
                startTime: longTaskEntry.startTime,
                attribution: longTaskEntry.attribution,
              }
            );
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (error) {
      // Failed to observe long tasks - handled by error boundary
    }
  }

  private observeLayoutShifts(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'layout-shift') {
            const layoutShiftEntry = entry as PerformanceLayoutShift;
            this.addMetric(
              'LayoutShift',
              layoutShiftEntry.value,
              'score',
              'layout',
              {
                sources: layoutShiftEntry.sources,
                hadRecentInput: layoutShiftEntry.hadRecentInput,
              }
            );
          }
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', observer);
    } catch (error) {
      // Failed to observe layout shifts - handled by error boundary
    }
  }

  private observeFirstInputDelay(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'first-input') {
            const firstInputEntry = entry as PerformanceEventTiming;
            this.addMetric(
              'FID',
              firstInputEntry.processingStart - firstInputEntry.startTime,
              'ms',
              'interaction',
              {
                target: (firstInputEntry.target as Element)?.tagName,
              },
            );
          }
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('first-input', observer);
    } catch (error) {
      // Failed to observe first input delay - handled by error boundary
    }
  }

  private captureInitialMetrics(): void {
    // Capture paint timing
    if ('performance' in window) {
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        this.addMetric(
          entry.name === 'first-paint' ? 'FP' : 'FCP',
          entry.startTime,
          'ms',
          'paint'
        );
      });

      // Capture largest contentful paint
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              this.addMetric('LCP', lastEntry.startTime, 'ms', 'navigation');
            }
          });

          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          this.observers.set('lcp', observer);
        } catch (error) {
          // Failed to observe LCP - handled by error boundary
        }
      }
    }
  }

  // Add custom metric
  public addMetric(
    name: string,
    value: number,
    unit: string,
    category: PerformanceMetric['category'],
    metadata?: Record<string, unknown>
  ): void {
    if (!this.isInitialized) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      category,
      metadata,
    };

    this.metrics.push(metric);

    // Check thresholds
    this.checkThresholds(metric);

    // Limit metrics per session
    if (this.metrics.length > this.config.maxMetricsPerSession) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsPerSession);
    }
  }

  // Check performance thresholds
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.config.thresholds.find(t => t.name === metric.name);
    if (!threshold) return;

    if (metric.value > threshold.threshold) {
      this.reportViolation(threshold, metric);
    }
  }

  // Report threshold violation
  private reportViolation(threshold: PerformanceThreshold, metric: PerformanceMetric): void {
    const violation = {
      threshold,
      metric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      // Performance threshold violated - logged for debugging
    }

    // Send to Sentry
    Sentry.captureMessage(`Performance threshold violated: ${threshold.name}`, {
      level: threshold.severity === 'critical' ? 'fatal' : 'warning',
      tags: {
        performance_threshold: threshold.name,
        severity: threshold.severity,
      },
      contexts: {
        performance: violation,
      },
    });

    // Send to error handler
    errorHandler.handleError(
      new Error(`Performance threshold violated: ${threshold.name} (${metric.value}${metric.unit} > ${threshold.threshold}${metric.unit})`),
      {
        additionalData: violation,
      }
    );
  }

  // Start periodic reporting
  private startReporting(): void {
    this.reportTimer = setInterval(() => {
      this.generateReport();
    }, this.config.reportInterval);
  }

  // Generate performance report
  private generateReport(): void {
    if (this.metrics.length === 0) return;

    const report: PerformanceReport = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: [...this.metrics],
      violations: this.getViolations(),
      summary: this.calculateSummary(),
    };

    this.sendReport(report);
    this.metrics = []; // Clear metrics after reporting
  }

  // Get threshold violations
  private getViolations(): PerformanceThreshold[] {
    const violations: PerformanceThreshold[] = [];
    const metricGroups = this.groupMetricsByName();

    this.config.thresholds.forEach(threshold => {
      const metrics = metricGroups[threshold.name] || [];
      const maxValue = Math.max(...metrics.map(m => m.value));
      
      if (maxValue > threshold.threshold) {
        violations.push(threshold);
      }
    });

    return violations;
  }

  // Group metrics by name
  private groupMetricsByName(): Record<string, PerformanceMetric[]> {
    return this.metrics.reduce((groups, metric) => {
      if (!groups[metric.name]) {
        groups[metric.name] = [];
      }
      groups[metric.name].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetric[]>);
  }

  // Calculate summary
  private calculateSummary() {
    const metricGroups = this.groupMetricsByName();
    const scores: number[] = [];

    // Calculate scores based on thresholds
    this.config.thresholds.forEach(threshold => {
      const metrics = metricGroups[threshold.name] || [];
      if (metrics.length > 0) {
        const avgValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
        const score = Math.max(0, 100 - (avgValue / threshold.threshold) * 100);
        scores.push(score);
      }
    });

    return {
      totalMetrics: this.metrics.length,
      violations: this.getViolations().length,
      averageScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 100,
    };
  }

  // Send report to monitoring service
  private async sendReport(report: PerformanceReport): Promise<void> {
    try {
      // In a real app, this would send to your monitoring service
      if (process.env.NODE_ENV === 'development') {
        // Performance Report - logged for debugging
      }

      // Send to Sentry
      Sentry.captureMessage('Performance Report', {
        level: 'info',
        tags: {
          performance_report: 'true',
          session_id: report.sessionId,
        },
        contexts: {
          performance: report as Record<string, unknown>,
        },
      });

      // Send to API endpoint
      await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      // Failed to send performance report - handled by error boundary
    }
  }

  // Set user ID for tracking
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  // Get current metrics
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Get metrics by category
  public getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  // Get latest metric by name
  public getLatestMetric(name: string): PerformanceMetric | null {
    const metrics = this.metrics.filter(m => m.name === name);
    return metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  // Cleanup
  public destroy(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }

    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();

    this.metrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
import { useEffect, useRef } from 'react';

export function usePerformanceMonitoring(enabled: boolean = true) {
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !performanceMonitor.initialized) return;

    startTimeRef.current = performance.now();

    return () => {
      const duration = performance.now() - startTimeRef.current;
      performanceMonitor.addMetric(
        'ComponentRender',
        duration,
        'ms',
        'custom',
        {
          component: 'Unknown',
          lifecycle: 'unmount',
        }
      );
    };
  }, [enabled]);

  const measureRender = (componentName: string) => {
    if (!enabled || !performanceMonitor.initialized) return;

    const duration = performance.now() - startTimeRef.current;
    performanceMonitor.addMetric(
      'ComponentRender',
      duration,
      'ms',
      'custom',
      {
        component: componentName,
        lifecycle: 'render',
      }
    );
  };

  const measureInteraction = (name: string, duration: number) => {
    if (!enabled || !performanceMonitor.initialized) return;

    performanceMonitor.addMetric(
      'UserInteraction',
      duration,
      'ms',
      'interaction',
      {
        interaction: name,
      }
    );
  };

  return {
    measureRender,
    measureInteraction,
  };
}

// Performance measurement decorator
export function measurePerformance(name: string) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      const startTime = performance.now();
      const result = originalMethod.apply(this, args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - startTime;
          performanceMonitor.addMetric(
            'MethodExecution',
            duration,
            'ms',
            'custom',
            {
              method: `${target.constructor.name}.${propertyKey}`,
              name,
            }
          );
        });
      } else {
        const duration = performance.now() - startTime;
        performanceMonitor.addMetric(
          'MethodExecution',
          duration,
          'ms',
          'custom',
          {
            method: `${target.constructor.name}.${propertyKey}`,
            name,
          }
        );
        return result;
      }
    };

    return descriptor;
  };
}

// Export utilities
export { performanceMonitor as monitor }; 