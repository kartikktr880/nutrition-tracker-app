import { auditLogger } from './audit-logger';
import { notificationService } from './notification-service';

interface AlertThreshold {
  metric: 'memory' | 'responseTime' | 'errorRate';
  threshold: number;
  severity: 'warning' | 'critical';
}

interface Alert {
  id: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
  correlation?: {
    groupId: string;
    relatedAlerts: string[];
    pattern: string;
  };
  trend?: {
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    prediction: number;
  };
}

interface AlertConfig {
  correlationRules?: {
    timeWindow: number;
    metricRelations: {
      source: string;
      target: string;
      threshold: number;
    }[];
  };
  trendAnalysis?: {
    windowSize: number;
    predictionHorizon: number;
    minDataPoints: number;
    severity?: 'warning' | 'critical';
  };
}

type AuditLogCategory = 'system' | 'user' | 'security' | 'performance';

interface AuditLogEntry {
  category: AuditLogCategory;
  action: string;
  severity: string;
  details: Record<string, any>;
}

export class PerformanceAlertService {
  private static instance: PerformanceAlertService;
  private alerts: Alert[] = [];
  private readonly MAX_ALERTS = 1000; // Maximum number of alerts to store
  private readonly ALERT_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly MAX_ALERTS_PER_WINDOW = 100;
  private alertCounts: Map<number, number> = new Map();
  private lastCleanup: number = Date.now();
  private cleanupLock = false;
  private readonly SEVERITY_LEVELS = ['warning', 'critical'] as const;
  private thresholds: AlertThreshold[] = [
    { metric: 'memory', threshold: 0.9, severity: 'warning' }, // 90% memory usage
    { metric: 'memory', threshold: 0.95, severity: 'critical' }, // 95% memory usage
    { metric: 'responseTime', threshold: 1000, severity: 'warning' }, // 1 second
    { metric: 'responseTime', threshold: 2000, severity: 'critical' }, // 2 seconds
    { metric: 'errorRate', threshold: 0.05, severity: 'warning' }, // 5% error rate
    { metric: 'errorRate', threshold: 0.1, severity: 'critical' }, // 10% error rate
  ];
  private correlationGroups: Map<string, Alert[]> = new Map();
  private readonly TREND_DIRECTIONS = {
    INCREASING: 'increasing' as const,
    DECREASING: 'decreasing' as const,
    STABLE: 'stable' as const
  };

  private constructor() {
    this.alertCounts = new Map();
    this.lastCleanup = Date.now();
    this.cleanupLock = false;
  }

  static getInstance(): PerformanceAlertService {
    if (!PerformanceAlertService.instance) {
      PerformanceAlertService.instance = new PerformanceAlertService();
    }
    return PerformanceAlertService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await auditLogger.initialize();
      await notificationService.initialize();
      this.cleanupOldAlerts();
    } catch (error) {
      console.error('Failed to initialize performance alert service:', error);
      throw error;
    }
  }

  private cleanupOldAlerts(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneDayAgo);
  }

  private async cleanupOldAlerts(): Promise<void> {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp > oneDayAgo || !alert.acknowledged
    );
  }

  checkMetrics(metrics: {
    memory: { used: number; total: number };
    performance: { responseTime: number; errorRate: number };
  }): Alert[] {
    const newAlerts: Alert[] = [];

    // Check memory usage
    const memoryUsage = metrics.memory.used / metrics.memory.total;
    const memoryThresholds = this.thresholds.filter(t => t.metric === 'memory');
    for (const threshold of memoryThresholds) {
      if (memoryUsage >= threshold.threshold) {
        newAlerts.push(this.createAlert('memory', memoryUsage, threshold));
      }
    }

    // Check response time
    const responseTimeThresholds = this.thresholds.filter(t => t.metric === 'responseTime');
    for (const threshold of responseTimeThresholds) {
      if (metrics.performance.responseTime >= threshold.threshold) {
        newAlerts.push(this.createAlert('responseTime', metrics.performance.responseTime, threshold));
      }
    }

    // Check error rate
    const errorRateThresholds = this.thresholds.filter(t => t.metric === 'errorRate');
    for (const threshold of errorRateThresholds) {
      if (metrics.performance.errorRate >= threshold.threshold) {
        newAlerts.push(this.createAlert('errorRate', metrics.performance.errorRate, threshold));
      }
    }

    // Add new alerts and log them
    this.alerts.push(...newAlerts);
    this.logAlerts(newAlerts);

    return newAlerts;
  }

  private createAlert(
    metric: string,
    value: number,
    threshold: AlertThreshold
  ): Alert {
    const message = this.generateAlertMessage(metric, value, threshold);
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      metric,
      value,
      threshold: threshold.threshold,
      severity: threshold.severity,
      message,
      acknowledged: false,
    };
  }

  private generateAlertMessage(
    metric: string,
    value: number,
    threshold: AlertThreshold
  ): string {
    const formattedValue = this.formatMetricValue(metric, value);
    const formattedThreshold = this.formatMetricValue(metric, threshold.threshold);
    return `${metric} exceeded ${threshold.severity} threshold: ${formattedValue} (threshold: ${formattedThreshold})`;
  }

  private formatMetricValue(metric: string, value: number): string {
    switch (metric) {
      case 'memory':
        return `${(value * 100).toFixed(1)}%`;
      case 'responseTime':
        return `${value.toFixed(0)}ms`;
      case 'errorRate':
        return `${(value * 100).toFixed(1)}%`;
      default:
        return value.toString();
    }
  }

  private async logAlerts(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      // Log to audit logger
      await auditLogger.log({
        category: 'system',
        action: 'alert',
        severity: alert.severity === 'critical' ? 'critical' : 'warning',
        details: {
          message: alert.message,
          metric: alert.metric,
          value: alert.value,
          threshold: alert.threshold
        }
      });

      // Send notification for critical alerts
      if (alert.severity === 'critical') {
        await notificationService.sendNotification(
          'Critical Performance Alert',
          alert.message,
          'high',
          {
            alertId: alert.id,
            metric: alert.metric,
            value: alert.value,
            threshold: alert.threshold
          }
        );
      }
    }
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  getAlertHistory(): Alert[] {
    this.cleanupIfNeeded(); // Ensure cleanup before returning history
    return [...this.alerts]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.MAX_ALERTS);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  updateThresholds(newThresholds: AlertThreshold[]): void {
    this.thresholds = newThresholds;
  }

  private async handleAlert(config: AlertConfig, value: number): Promise<void> {
    try {
      // Check rate limit with severity consideration
      if (!this.checkRateLimit(config)) {
        throw new Error('Rate limit exceeded for alert creation');
      }

      // Validate configuration and value
      this.validateConfig(config);
      this.validateAlertValue(value);
      this.validateThresholds(config);
      this.validateSeverity(config);

      // Check for duplicate alerts with severity consideration
      if (this.isDuplicateAlert(value, config)) {
        return;
      }

      // Create alert with dynamic metric type based on config
      const metricType = this.determineMetricType(config);
      const alert = this.createAlert(metricType, value, {
        metric: metricType,
        threshold: config.trendAnalysis?.windowSize || 1000,
        severity: this.determineSeverity(value, config)
      });

      // Analyze trends with error handling
      try {
        const trend = await this.analyzeTrend(alert, config);
        if (trend) {
          alert.trend = trend;
        }
      } catch (error) {
        console.error('Error analyzing trend:', error);
        // Continue processing even if trend analysis fails
      }

      // Check for correlations with error handling
      try {
        const correlation = await this.checkCorrelations(alert, config);
        if (correlation) {
          alert.correlation = correlation;
          this.updateCorrelationGroup(correlation.groupId, alert);
        }
      } catch (error) {
        console.error('Error checking correlations:', error);
        // Continue processing even if correlation check fails
      }

      // Log trend and correlation information
      if (alert.trend || alert.correlation) {
        await auditLogger.log({
          category: 'system',
          action: 'analysis',
          severity: 'info',
          details: {
            message: 'Alert analysis completed',
            alertId: alert.id,
            trend: alert.trend,
            correlation: alert.correlation
          }
        });
      }

      // Add to alerts array with cleanup
      this.alerts.push(alert);
      await this.logAlerts([alert]);

      // Cleanup with error handling
      try {
        this.cleanupCorrelationGroups();
      } catch (error) {
        console.error('Error cleaning up correlation groups:', error);
        // Attempt to force cleanup
        this.forceCleanupCorrelationGroups();
      }

      // Cleanup if needed with lock
      await this.cleanupIfNeeded();
    } catch (error) {
      console.error('Error handling alert:', error);
      throw error;
    }
  }

  private validateConfig(config: AlertConfig): void {
    if (config.trendAnalysis) {
      if (config.trendAnalysis.windowSize <= 0) {
        throw new Error('Trend analysis window size must be positive');
      }
      if (config.trendAnalysis.predictionHorizon <= 0) {
        throw new Error('Prediction horizon must be positive');
      }
      if (config.trendAnalysis.minDataPoints < 2) {
        throw new Error('Minimum data points must be at least 2');
      }
    }

    if (config.correlationRules) {
      if (config.correlationRules.timeWindow <= 0) {
        throw new Error('Correlation time window must be positive');
      }
      if (!config.correlationRules.metricRelations?.length) {
        throw new Error('Metric relations must be specified for correlation rules');
      }
    }
  }

  private validateAlertValue(value: number): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Invalid alert value: must be a valid number');
    }
    if (value < 0) {
      throw new Error('Invalid alert value: must be non-negative');
    }
  }

  private validateThresholds(config: AlertConfig): void {
    if (config.trendAnalysis?.windowSize) {
      if (config.trendAnalysis.windowSize > this.MAX_ALERTS) {
        throw new Error('Window size exceeds maximum allowed alerts');
      }
    }
  }

  private validateSeverity(config: AlertConfig): void {
    if (config.trendAnalysis?.severity && 
        !this.SEVERITY_LEVELS.includes(config.trendAnalysis.severity as any)) {
      throw new Error('Invalid severity level');
    }
  }

  private determineMetricType(config: AlertConfig): AlertThreshold['metric'] {
    // Determine metric type based on configuration
    if (config.trendAnalysis?.windowSize) {
      return 'responseTime';
    }
    if (config.correlationRules?.metricRelations?.[0]?.source) {
      return config.correlationRules.metricRelations[0].source as AlertThreshold['metric'];
    }
    return 'responseTime'; // Default fallback
  }

  private async analyzeTrend(alert: Alert, config: AlertConfig): Promise<Alert['trend']> {
    if (!config.trendAnalysis) return undefined;

    try {
      const { windowSize, predictionHorizon, minDataPoints } = config.trendAnalysis;
      const recentAlerts = this.alerts
        .filter(a => a.metric === alert.metric && a.timestamp > Date.now() - windowSize)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (recentAlerts.length < minDataPoints) return undefined;

      const values = recentAlerts.map(a => a.value);
      const timestamps = recentAlerts.map(a => a.timestamp);
      
      // Calculate trend direction and rate
      const direction = this.calculateTrendDirection(values);
      const rate = this.calculateTrendRate(values, timestamps);
      
      // Predict future value
      const prediction = this.predictFutureValue(values, rate, predictionHorizon);

      return {
        direction,
        rate,
        prediction
      };
    } catch (error) {
      console.error('Error analyzing trend:', error);
      return undefined;
    }
  }

  private cleanupCorrelationGroups(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [groupId, alerts] of this.correlationGroups.entries()) {
      const recentAlerts = alerts.filter(alert => alert.timestamp > oneDayAgo);
      if (recentAlerts.length === 0) {
        this.correlationGroups.delete(groupId);
      } else {
        this.correlationGroups.set(groupId, recentAlerts);
      }
    }
  }

  private calculateTrendRate(values: number[], timestamps: number[]): number {
    if (values.length < 2) return 0;

    try {
      const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
      if (timeSpan === 0) return 0;

      const valueSpan = values[values.length - 1] - values[0];
      return valueSpan / timeSpan;
    } catch (error) {
      console.error('Error calculating trend rate:', error);
      return 0;
    }
  }

  private predictFutureValue(values: number[], rate: number, horizon: number): number {
    try {
      const lastValue = values[values.length - 1];
      return lastValue + (rate * horizon);
    } catch (error) {
      console.error('Error predicting future value:', error);
      return values[values.length - 1];
    }
  }

  private calculateTrendDirection(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return this.TREND_DIRECTIONS.STABLE;

    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const percentChange = ((lastValue - firstValue) / firstValue) * 100;

    if (Math.abs(percentChange) < 5) return this.TREND_DIRECTIONS.STABLE;
    return percentChange > 0 ? this.TREND_DIRECTIONS.INCREASING : this.TREND_DIRECTIONS.DECREASING;
  }

  private async checkCorrelations(alert: Alert, config: AlertConfig): Promise<Alert['correlation']> {
    if (!config.correlationRules) return undefined;

    try {
      const { timeWindow, metricRelations } = config.correlationRules;
      const recentAlerts = this.alerts.filter(a => 
        a.timestamp > Date.now() - timeWindow && 
        a.id !== alert.id
      );

      const correlations = metricRelations
        .filter(relation => relation.source === alert.metric)
        .map(relation => {
          const relatedAlerts = recentAlerts.filter(a => 
            a.metric === relation.target &&
            Math.abs(a.value - alert.value) <= relation.threshold
          );

          return {
            target: relation.target,
            alerts: relatedAlerts
          };
        })
        .filter(c => c.alerts.length > 0);

      if (correlations.length === 0) return undefined;

      const groupId = `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const relatedAlerts = correlations.flatMap(c => c.alerts.map(a => a.id));
      const pattern = this.identifyPattern(correlations);

      return {
        groupId,
        relatedAlerts,
        pattern
      };
    } catch (error) {
      console.error('Error checking correlations:', error);
      return undefined;
    }
  }

  private identifyPattern(correlations: { target: string; alerts: Alert[] }[]): string {
    const patterns = correlations.map(c => {
      const values = c.alerts.map(a => a.value);
      const direction = this.calculateTrendDirection(values);
      return `${c.target}:${direction}`;
    });

    return patterns.join(';');
  }

  private updateCorrelationGroup(groupId: string, alert: Alert): void {
    const group = this.correlationGroups.get(groupId) || [];
    group.push(alert);
    this.correlationGroups.set(groupId, group);
  }

  getCorrelatedAlerts(alertId: string): Alert[] {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert?.correlation) return [];

    return this.alerts.filter(a => 
      alert.correlation?.relatedAlerts.includes(a.id)
    );
  }

  getTrendAnalysis(metric: string): Alert['trend'][] {
    return this.alerts
      .filter(a => a.metric === metric && a.trend)
      .map(a => a.trend!)
      .sort((a, b) => b.prediction - a.prediction);
  }

  getCorrelationGroups(): Map<string, Alert[]> {
    return new Map(this.correlationGroups);
  }

  private forceCleanupCorrelationGroups(): void {
    // Force cleanup of correlation groups
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [groupId, alerts] of this.correlationGroups.entries()) {
      try {
        const recentAlerts = alerts.filter(alert => alert.timestamp > oneDayAgo);
        if (recentAlerts.length === 0) {
          this.correlationGroups.delete(groupId);
        } else {
          this.correlationGroups.set(groupId, recentAlerts);
        }
      } catch (error) {
        // If cleanup fails for a group, remove it entirely
        this.correlationGroups.delete(groupId);
      }
    }
  }

  private checkRateLimit(config: AlertConfig): boolean {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;
    
    // Cleanup old counts
    for (const [timestamp, count] of this.alertCounts.entries()) {
      if (timestamp < windowStart) {
        this.alertCounts.delete(timestamp);
      }
    }

    // Count alerts in current window with severity consideration
    const currentCount = Array.from(this.alertCounts.entries())
      .filter(([timestamp]) => timestamp > windowStart)
      .reduce((sum, [_, count]) => sum + count, 0);

    // Adjust limit based on severity
    const maxAlerts = config.trendAnalysis?.severity === 'critical' 
      ? this.MAX_ALERTS_PER_WINDOW * 2 
      : this.MAX_ALERTS_PER_WINDOW;

    if (currentCount >= maxAlerts) {
      return false;
    }

    // Update count
    this.alertCounts.set(now, (this.alertCounts.get(now) || 0) + 1);
    return true;
  }

  private isDuplicateAlert(value: number, config: AlertConfig): boolean {
    const recentAlerts = this.alerts.filter(a => 
      a.timestamp > Date.now() - (config.trendAnalysis?.windowSize || 1000) &&
      Math.abs(a.value - value) < 0.01 // 1% tolerance
    );
    return recentAlerts.length > 0;
  }

  private async cleanupIfNeeded(): Promise<void> {
    if (this.cleanupLock) return;
    
    try {
      this.cleanupLock = true;
      const now = Date.now();
      if (now - this.lastCleanup > this.ALERT_CLEANUP_INTERVAL) {
        await Promise.all([
          this.cleanupOldAlerts(),
          this.cleanupCorrelationGroups()
        ]);
        this.lastCleanup = now;
      }
    } finally {
      this.cleanupLock = false;
    }
  }

  getAlertsBySeverity(severity: 'warning' | 'critical'): Alert[] {
    this.cleanupIfNeeded();
    return this.alerts
      .filter(alert => alert.severity === severity)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private determineSeverity(value: number, config: AlertConfig): 'warning' | 'critical' {
    const threshold = config.trendAnalysis?.windowSize || 1000;
    return value > threshold * 1.5 ? 'critical' : 'warning';
  }
}

export const performanceAlertService = PerformanceAlertService.getInstance(); 