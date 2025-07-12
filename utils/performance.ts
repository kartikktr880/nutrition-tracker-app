// Performance monitoring implementation

import { logError, logWarn, logInfo } from './logger';
import {
  PerformanceMetric,
  PerformanceEvent,
  PerformanceAlert,
  PerformanceOptimization,
  PerformanceThresholds,
  PerformanceConfig,
  PerformanceSnapshot,
  PerformanceReport,
  PerformanceMonitor,
  PerformanceOptimizer
} from './performance-types';

class PerformanceManager implements PerformanceMonitor, PerformanceOptimizer {
  private static instance: PerformanceManager;
  private isRunning = false;
  private metrics = new Map<string, PerformanceMetric[]>();
  private events: PerformanceEvent[] = [];
  private alerts: PerformanceAlert[] = [];
  private optimizations = new Map<string, PerformanceOptimization>();
  private readonly config: PerformanceConfig;

  private constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: true,
      sampleInterval: 5000,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      thresholds: this.getDefaultThresholds(),
      alerting: {
        enabled: true,
        channels: ['console', 'log']
      },
      optimizations: {
        enabled: true,
        autoApply: false
      },
      ...config
    };
  }

  public static getInstance(config?: Partial<PerformanceConfig>): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager(config);
    }
    return PerformanceManager.instance;
  }

  private getDefaultThresholds(): PerformanceThresholds {
    return {
      latency: 100,
      throughput: 50,
      errorRate: 0.05,
      resourceUsage: 0.8,
      memory: 1024,
      cpu: 0.8
    };
  }

  public start(): void {
    if (this.isRunning || !this.config.enabled) return;
    this.isRunning = true;
    this.startMetricCollection();
  }

  public stop(): void {
    this.isRunning = false;
  }

  public getMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }

  public getEvents(): PerformanceEvent[] {
    return [...this.events];
  }

  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  public getSnapshot(): PerformanceSnapshot {
    return {
      timestamp: Date.now(),
      metrics: {
        cpu: {
          user: this.getLatestMetricValue('cpu_user', 0),
          system: this.getLatestMetricValue('cpu_system', 0),
          idle: this.getLatestMetricValue('cpu_idle', 0)
        },
        memory: {
          heap: this.getLatestMetricValue('memory_heap', 0),
          nonHeap: this.getLatestMetricValue('memory_non_heap', 0),
          gc: {
            count: this.getLatestMetricValue('gc_count', 0),
            time: this.getLatestMetricValue('gc_time', 0)
          }
        },
        network: {
          bytesIn: this.getLatestMetricValue('network_bytes_in', 0),
          bytesOut: this.getLatestMetricValue('network_bytes_out', 0),
          connections: this.getLatestMetricValue('network_connections', 0)
        }
      },
      events: this.getRecentEvents(),
      alerts: this.getActiveAlerts()
    };
  }

  public async generateReport(startTime: number, endTime: number): Promise<PerformanceReport> {
    const metrics = this.getMetricsInRange(startTime, endTime);
    const events = this.getEventsInRange(startTime, endTime);
    const alerts = this.getAlertsInRange(startTime, endTime);
    const optimizations = Array.from(this.optimizations.values());

    return {
      period: {
        start: startTime,
        end: endTime
      },
      summary: {
        metrics: this.calculateMetricsSummary(metrics),
        events: {
          total: events.length,
          byType: this.countEventsByType(events)
        },
        alerts: {
          total: alerts.length,
          bySeverity: this.countAlertsBySeverity(alerts)
        },
        optimizations: {
          applied: optimizations.length,
          impact: this.calculateOptimizationImpact(optimizations)
        }
      },
      recommendations: this.generateRecommendations(metrics, alerts)
    };
  }

  public async analyze(): Promise<PerformanceOptimization[]> {
    const snapshot = this.getSnapshot();
    const optimizations: PerformanceOptimization[] = [];

    // Memory optimization
    if (snapshot.metrics.memory.heap > this.config.thresholds.memory.heap.warning) {
      optimizations.push({
        type: 'memory',
        name: 'Memory Cleanup',
        currentValue: snapshot.metrics.memory.heap,
        targetValue: this.config.thresholds.memory.heap.warning,
        improvement: snapshot.metrics.memory.heap - this.config.thresholds.memory.heap.warning,
        recommendations: [
          'Run garbage collection',
          'Check for memory leaks',
          'Optimize memory usage'
        ],
        priority: 'high'
      });
    }

    // CPU optimization
    if (snapshot.metrics.cpu.user > this.config.thresholds.cpu.user.warning) {
      optimizations.push({
        type: 'cpu',
        name: 'CPU Optimization',
        currentValue: snapshot.metrics.cpu.user,
        targetValue: this.config.thresholds.cpu.user.warning,
        improvement: snapshot.metrics.cpu.user - this.config.thresholds.cpu.user.warning,
        recommendations: [
          'Optimize CPU-intensive operations',
          'Use caching where possible',
          'Consider scaling horizontally'
        ],
        priority: 'high'
      });
    }

    return optimizations;
  }

  public async applyOptimization(optimization: PerformanceOptimization): Promise<boolean> {
    try {
      switch (optimization.type) {
        case 'memory':
          return await this.applyMemoryOptimization(optimization);
        case 'cpu':
          return await this.applyCPUOptimization(optimization);
        default:
          logWarn(`Unknown optimization type: ${optimization.type}`);
          return false;
      }
    } catch (error) {
      if (error instanceof Error) {
        logError('Failed to apply optimization:', error);
      } else {
        logError('Failed to apply optimization:', new Error(String(error)));
      }
      return false;
    }
  }

  public getAppliedOptimizations(): PerformanceOptimization[] {
    return Array.from(this.optimizations.values());
  }

  public reset(): void {
    this.metrics.clear();
    this.events = [];
    this.alerts = [];
    this.optimizations.clear();
  }

  private async startMetricCollection(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.collectMetrics();
        await this.checkPerformanceIssues();
        await this.runRealTimeAnalysis();
        await this.updateMLModels();
        await new Promise(resolve => setTimeout(resolve, this.config.sampleInterval));
      } catch (error) {
        if (error instanceof Error) {
          logError('Failed to collect metrics:', error);
        } else {
          logError('Failed to collect metrics:', new Error(String(error)));
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retrying
      }
    }
  }

  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();
    await Promise.all([
      this.collectSystemMetrics(timestamp),
      this.collectComponentMetrics(timestamp),
      this.collectUserInteractionMetrics(timestamp)
    ]);
  }

  private getLatestMetricValue(metricName: string, defaultValue: number): number {
    const metrics = this.metrics.get(metricName);
    if (!metrics || metrics.length === 0) return defaultValue;
    return metrics[metrics.length - 1].value ?? defaultValue;
  }

  private getRecentEvents(limit: number = 100): PerformanceEvent[] {
    return this.events.slice(-limit);
  }

  private getActiveAlerts(): PerformanceAlert[] {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return this.alerts.filter(alert => alert.timestamp >= fiveMinutesAgo);
  }

  private getMetricsInRange(startTime: number, endTime: number): Map<string, PerformanceMetric[]> {
    const result = new Map<string, PerformanceMetric[]>();
    this.metrics.forEach((metrics, key) => {
      result.set(
        key,
        metrics.filter(m => m.timestamp && m.timestamp >= startTime && m.timestamp <= endTime)
      );
    });
    return result;
  }

  private getEventsInRange(startTime: number, endTime: number): PerformanceEvent[] {
    return this.events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  private getAlertsInRange(startTime: number, endTime: number): PerformanceAlert[] {
    return this.alerts.filter(a => a.timestamp >= startTime && a.timestamp <= endTime);
  }

  private calculateMetricsSummary(metrics: Map<string, PerformanceMetric[]>): Record<string, {
    min: number;
    max: number;
    avg: number;
    p95: number;
  }> {
    const summary: Record<string, {
      min: number;
      max: number;
      avg: number;
      p95: number;
    }> = {};

    metrics.forEach((metricList, key) => {
      if (metricList.length === 0) return;

      const values = metricList.map(m => m.value ?? 0).sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const p95Index = Math.floor(values.length * 0.95);

      summary[key] = {
        min: values[0] ?? 0,
        max: values[values.length - 1] ?? 0,
        avg: sum / values.length,
        p95: values[p95Index] ?? 0
      };
    });

    return summary;
  }

  private countEventsByType(events: PerformanceEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });
    return counts;
  }

  private countAlertsBySeverity(alerts: PerformanceAlert[]): Record<string, number> {
    const counts: Record<string, number> = {};
    alerts.forEach(alert => {
      counts[alert.severity] = (counts[alert.severity] || 0) + 1;
    });
    return counts;
  }

  private calculateOptimizationImpact(optimizations: PerformanceOptimization[]): number {
    return optimizations.reduce((total, opt) => total + opt.improvement, 0);
  }

  private generateRecommendations(
    metrics: Map<string, PerformanceMetric[]>,
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: Set<string> = new Set();

    // Add recommendations based on metrics
    metrics.forEach((metricList, key) => {
      const latest = metricList[metricList.length - 1];
      if (!latest) return;

      if (latest.priority === 'high') {
        recommendations.add(`Optimize ${key.replace(/_/g, ' ')} (current: ${latest.value ?? 0})`);
      }
    });

    // Add recommendations based on alerts
    alerts.forEach(alert => {
      if (alert.severity === 'critical') {
        recommendations.add(`Address ${alert.type}: ${alert.message}`);
      }
    });

    return Array.from(recommendations);
  }

  private async applyMemoryOptimization(optimization: PerformanceOptimization): Promise<boolean> {
    try {
      // Attempt to trigger garbage collection
      if (global.gc) {
        global.gc();
      }

      // Clear internal caches
      this.cleanupOldMetrics();
      this.cleanupOldEvents();
      this.cleanupOldAlerts();

      this.optimizations.set(optimization.name, optimization);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logError('Failed to apply memory optimization:', error);
      } else {
        logError('Failed to apply memory optimization:', new Error(String(error)));
      }
      return false;
    }
  }

  private async applyCPUOptimization(optimization: PerformanceOptimization): Promise<boolean> {
    try {
      // Implement CPU optimization strategies
      this.optimizations.set(optimization.name, optimization);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logError('Failed to apply CPU optimization:', error);
      } else {
        logError('Failed to apply CPU optimization:', new Error(String(error)));
      }
      return false;
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.metrics.forEach((metrics, key) => {
      this.metrics.set(key, metrics.filter(m => typeof m.timestamp === 'number' && m.timestamp >= cutoff));
    });
  }

  private cleanupOldEvents(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.events = this.events.filter(e => e.timestamp >= cutoff);
  }

  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
  }

  private async collectSystemMetrics(timestamp: number): Promise<void> {
    try {
      // Collect CPU metrics
      const cpuUsage = process.cpuUsage();
      const totalCPU = cpuUsage.user + cpuUsage.system;
      const userCPU = cpuUsage.user / totalCPU;
      const systemCPU = cpuUsage.system / totalCPU;
      const idleCPU = 1 - (userCPU + systemCPU);

      this.addMetric('cpu_user', userCPU, timestamp, 'system', 'medium');
      this.addMetric('cpu_system', systemCPU, timestamp, 'system', 'medium');
      this.addMetric('cpu_idle', idleCPU, timestamp, 'system', 'medium');

      // Collect memory metrics
      const memoryUsage = process.memoryUsage();
      const heapUsed = memoryUsage.heapUsed / memoryUsage.heapTotal;
      const nonHeapUsed = (memoryUsage.external + memoryUsage.arrayBuffers) / memoryUsage.rss;

      this.addMetric('memory_heap', heapUsed, timestamp, 'system', 'high');
      this.addMetric('memory_non_heap', nonHeapUsed, timestamp, 'system', 'medium');

      // Collect network metrics
      const networkStats = await this.getNetworkStats();
      this.addMetric('network_bytes_in', networkStats.bytesIn, timestamp, 'system', 'medium');
      this.addMetric('network_bytes_out', networkStats.bytesOut, timestamp, 'system', 'medium');
      this.addMetric('network_connections', networkStats.connections, timestamp, 'system', 'medium');
    } catch (error) {
      if (error instanceof Error) {
        logError('Failed to collect system metrics:', error);
      } else {
        logError('Failed to collect system metrics:', new Error(String(error)));
      }
    }
  }

  private async collectComponentMetrics(timestamp: number): Promise<void> {
    try {
      // Collect component render times
      const renderMetrics = performance.getEntriesByType('measure')
        .filter(entry => entry.name.startsWith('render_'));

      renderMetrics.forEach(metric => {
        const componentName = metric.name.replace('render_', '');
        this.addMetric(`render_time_${componentName}`, metric.duration, timestamp, 'component', 'high');
      });

      // Clear the performance buffer
      performance.clearMarks();
      performance.clearMeasures();
    } catch (error) {
      if (error instanceof Error) {
        logError('Failed to collect component metrics:', error);
      } else {
        logError('Failed to collect component metrics:', new Error(String(error)));
      }
    }
  }

  private async collectUserInteractionMetrics(timestamp: number): Promise<void> {
    try {
      // Collect interaction metrics
      const interactionMetrics = performance.getEntriesByType('measure')
        .filter(entry => entry.name.startsWith('interaction_'));

      interactionMetrics.forEach(metric => {
        const interactionType = metric.name.replace('interaction_', '');
        this.addMetric(`interaction_time_${interactionType}`, metric.duration, timestamp, 'interaction', 'high');
      });

      // Clear the performance buffer
      performance.clearMarks();
      performance.clearMeasures();
    } catch (error) {
      if (error instanceof Error) {
        logError('Failed to collect user interaction metrics:', error);
      } else {
        logError('Failed to collect user interaction metrics:', new Error(String(error)));
      }
    }
  }

  private async getNetworkStats(): Promise<{ bytesIn: number; bytesOut: number; connections: number }> {
    // This is a placeholder implementation
    // In a real application, you would implement this based on your specific needs
    return {
      bytesIn: 0,
      bytesOut: 0,
      connections: 0
    };
  }

  private addMetric(
    name: string,
    value: number,
    timestamp: number,
    source: string,
    priority: 'high' | 'medium' | 'low'
  ): void {
    const metric: PerformanceMetric = {
      timestamp,
      value,
      type: name,
      priority
    };

    const metrics = this.metrics.get(name) || [];
    metrics.push(metric);
    this.metrics.set(name, metrics);
  }

  private async checkPerformanceIssues(): Promise<void> {
    try {
      const snapshot = this.getSnapshot();

      // Check memory issues
      if (snapshot.metrics.memory.heap > this.config.thresholds.memory.heap.critical) {
        this.addAlert('memory', 'critical', 'Memory usage is critically high');
      } else if (snapshot.metrics.memory.heap > this.config.thresholds.memory.heap.warning) {
        this.addAlert('memory', 'warning', 'Memory usage is high');
      }

      // Check CPU issues
      if (snapshot.metrics.cpu.user > this.config.thresholds.cpu.user.critical) {
        this.addAlert('cpu', 'critical', 'CPU usage is critically high');
      } else if (snapshot.metrics.cpu.user > this.config.thresholds.cpu.user.warning) {
        this.addAlert('cpu', 'warning', 'CPU usage is high');
      }

      // Check network issues
      if (snapshot.metrics.network.connections > this.config.thresholds.network.connections.critical) {
        this.addAlert('network', 'critical', 'Network connections are critically high');
      } else if (snapshot.metrics.network.connections > this.config.thresholds.network.connections.warning) {
        this.addAlert('network', 'warning', 'Network connections are high');
      }
    } catch (error) {
      if (error instanceof Error) {
        logError('Failed to check performance issues:', error);
      } else {
        logError('Failed to check performance issues:', new Error(String(error)));
      }
    }
  }

  private addAlert(type: string, severity: 'warning' | 'critical', message: string): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      details: {},
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    // Log the alert
    if (severity === 'critical') {
      logError(message);
    } else {
      logWarn(message);
    }
  }

  private async runRealTimeAnalysis(): Promise<void> {
    try {
      const optimizations = await this.analyze();

      if (this.config.optimizations.enabled && this.config.optimizations.autoApply) {
        for (const optimization of optimizations) {
          await this.applyOptimization(optimization);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        logError('Failed to run real-time analysis:', error);
      } else {
        logError('Failed to run real-time analysis:', new Error(String(error)));
      }
    }
  }

  private async updateMLModels(): Promise<void> {
    // This is a placeholder for future ML model updates
    // In a real application, you would implement this based on your specific needs
  }
}

export const performanceManager = PerformanceManager.getInstance();