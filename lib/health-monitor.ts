import { recordError } from '@/lib/monitoring';

interface HealthMetrics {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  };
  performance: {
    loadTime: number;
    responseTime: number;
    errorRate: number;
  };
  resources: {
    cpu: number;
    connections: number;
    activeUsers: number;
  };
  status: 'healthy' | 'degraded' | 'critical';
}

interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  critical: boolean;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class HealthMonitor {
  private static instance: HealthMonitor;
  private metrics: HealthMetrics[] = [];
  private checks: HealthCheck[] = [];
  private isInitialized = false;
  private readonly maxMetricsAge: number = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxMetricsCount: number = 1440; // 1 metric per minute for 24 hours

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register default health checks
      this.registerHealthCheck({
        name: 'memory_usage',
        check: async () => {
          const memory = await this.getMemoryUsage();
          return memory.used < memory.limit * 0.9; // 90% threshold
        },
        critical: true
      });

      this.registerHealthCheck({
        name: 'error_rate',
        check: async () => {
          const metrics = this.getLatestMetrics();
          return metrics?.performance.errorRate !== undefined && metrics.performance.errorRate < 0.05; // 5% threshold
        },
        critical: true
      });

      // Start monitoring interval
      setInterval(() => this.collectMetrics(), 60 * 1000); // Every minute
      setInterval(() => this.cleanupMetrics(), 60 * 60 * 1000); // Every hour

      this.isInitialized = true;
    } catch (error) {
      recordError('health_monitor_initialization', error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }

  private async getMemoryUsage(): Promise<{ used: number; total: number; limit: number }> {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory as PerformanceMemory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  private async collectMetrics(): Promise<void> {
    try {
      const memory = await this.getMemoryUsage();
      const metrics: HealthMetrics = {
        timestamp: Date.now(),
        memory,
        performance: {
          loadTime: performance.now(),
          responseTime: this.calculateAverageResponseTime(),
          errorRate: this.calculateErrorRate()
        },
        resources: {
          cpu: this.estimateCPUUsage(),
          connections: this.getActiveConnections(),
          activeUsers: this.getActiveUsers()
        },
        status: 'healthy'
      };

      // Update status based on health checks
      const healthStatus = await this.runHealthChecks();
      metrics.status = healthStatus;

      this.metrics.push(metrics);
      this.cleanupMetrics();
    } catch (error) {
      recordError('metrics_collection', error instanceof Error ? error.name : 'Unknown');
    }
  }

  private cleanupMetrics(): void {
    const now = Date.now();
    this.metrics = this.metrics
      .filter(m => now - m.timestamp < this.maxMetricsAge)
      .slice(-this.maxMetricsCount);
  }

  registerHealthCheck(check: HealthCheck): void {
    this.checks.push(check);
  }

  private async runHealthChecks(): Promise<'healthy' | 'degraded' | 'critical'> {
    const results = await Promise.all(
      this.checks.map(async check => {
        try {
          const passed = await check.check();
          return { passed, critical: check.critical };
        } catch (error) {
          recordError(`health_check_${check.name}`, error instanceof Error ? error.name : 'Unknown');
          return { passed: false, critical: check.critical };
        }
      })
    );

    const criticalFailures = results.filter(r => r.critical && !r.passed).length;
    const nonCriticalFailures = results.filter(r => !r.critical && !r.passed).length;

    if (criticalFailures > 0) return 'critical';
    if (nonCriticalFailures > 0) return 'degraded';
    return 'healthy';
  }

  private calculateAverageResponseTime(): number {
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) return 0;
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.performance.responseTime, 0);
    return sum / recentMetrics.length;
  }

  private calculateErrorRate(): number {
    const recentMetrics = this.metrics.slice(-60); // Last hour
    if (recentMetrics.length === 0) return 0;

    const errors = recentMetrics.filter(m => m.status === 'critical').length;
    return errors / recentMetrics.length;
  }

  private estimateCPUUsage(): number {
    // This is a simplified estimation
    return Math.random() * 100;
  }

  private getActiveConnections(): number {
    // This would be implemented based on your connection tracking system
    return 0;
  }

  private getActiveUsers(): number {
    // This would be implemented based on your user tracking system
    return 0;
  }

  getLatestMetrics(): HealthMetrics | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  getMetricsHistory(duration = 3600000): HealthMetrics[] {
    const now = Date.now();
    return this.metrics.filter(m => now - m.timestamp <= duration);
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    checks: { name: string; status: 'pass' | 'fail' }[];
    metrics: HealthMetrics;
  }> {
    const status = await this.runHealthChecks();
    const checks = await Promise.all(
      this.checks.map(async check => ({
        name: check.name,
        status: (await check.check()) ? 'pass' as const : 'fail' as const
      }))
    );
    const metrics = this.getLatestMetrics() || {
      timestamp: Date.now(),
      memory: { used: 0, total: 0, limit: 0 },
      performance: { loadTime: 0, responseTime: 0, errorRate: 0 },
      resources: { cpu: 0, connections: 0, activeUsers: 0 },
      status: 'healthy'
    };

    return { status, checks, metrics };
  }
}

export const healthMonitor = HealthMonitor.getInstance();
export default healthMonitor; 