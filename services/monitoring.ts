import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { analytics } from './analytics';

interface MetricValue {
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface MetricConfig {
  name: string;
  type: 'gauge' | 'counter' | 'histogram';
  unit?: string;
  description?: string;
  alertThresholds?: {
    warning?: number;
    critical?: number;
  };
  aggregation?: {
    window: number; // in milliseconds
    type: 'avg' | 'sum' | 'min' | 'max' | 'p90' | 'p95' | 'p99';
  };
}

interface Alert {
  id: string;
  metricName: string;
  level: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface MonitoringOptions {
  aggregationInterval?: number; // in milliseconds
  retentionPeriod?: number; // in milliseconds
  alertCallback?: (alert: Alert) => void;
}

const DEFAULT_OPTIONS: Required<MonitoringOptions> = {
  aggregationInterval: 60000, // 1 minute
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  alertCallback: (alert) => {
    logWarn(`[${alert.level.toUpperCase()}] ${alert.message}`);
  }
};

export interface MonitoringData {
  userId: string;
  metrics: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
  trends: {
    weekly: Record<string, number>;
    monthly: Record<string, number>;
  };
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
  progress: {
    caloriesProgress: number;
    proteinProgress: number;
    carbsProgress: number;
    fatProgress: number;
    waterProgress: number;
  };
}

export const getMonitoringData = async (userId: string): Promise<MonitoringData> => {
  // Mock implementation - replace with actual API call
  return {
    userId,
    metrics: {
      calories: 1850,
      protein: 120,
      carbs: 200,
      fat: 65,
      water: 6
    },
    trends: {
      weekly: {
        calories: 1850,
        protein: 120,
        carbs: 200,
        fat: 65
      },
      monthly: {
        calories: 1800,
        protein: 115,
        carbs: 195,
        fat: 60
      }
    },
    goals: {
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 70,
      water: 8
    },
    progress: {
      caloriesProgress: 92.5,
      proteinProgress: 80,
      carbsProgress: 80,
      fatProgress: 92.9,
      waterProgress: 75
    }
  };
};

class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, MetricConfig> = new Map();
  private values: Map<string, MetricValue[]> = new Map();
  private aggregations: Map<string, MetricValue[]> = new Map();
  private alerts: Alert[] = [];
  private options: Required<MonitoringOptions>;
  private aggregationInterval: NodeJS.Timeout | null = null;

  constructor(options: MonitoringOptions = {}) {
    this.options = {
      aggregationInterval: options.aggregationInterval || 60000,
      retentionPeriod: options.retentionPeriod || 24 * 60 * 60 * 1000,
      alertCallback: options.alertCallback || (() => { /* intentionally empty */ })
    };
    this.startAggregation();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  registerMetric(config: MetricConfig): void {
    this.metrics.set(config.name, config);
    this.values.set(config.name, []);
    this.aggregations.set(config.name, []);

    analytics.trackEvent({
      category: 'Monitoring',
      action: 'register_metric',
      label: config.name,
      metadata: {
        type: config.type,
        unit: config.unit,
        hasAlerts: !!config.alertThresholds
      }
    });
  }

  track(metricName: string, value: number, tags?: Record<string, string>): void {
    const config = this.metrics.get(metricName);
    if (!config) {
      logWarn(`Unregistered metric: ${metricName}`);
      return;
    }

    const metricValue: MetricValue = {
      value,
      timestamp: Date.now(),
      tags
    };

    // Store the value
    const values = this.values.get(metricName) || [];
    values.push(metricValue);

    // Clean up old values
    const cutoff = Date.now() - this.options.retentionPeriod;
    while (values.length > 0 && values[0].timestamp < cutoff) {
      values.shift();
    }

    // Check alert thresholds
    this.checkAlerts(config, metricValue);

    // Track in analytics
    analytics.trackPerformance({
      name: metricName,
      value,
      unit: config.unit as 'count' | 'ms' | 'bytes' | undefined,
      tags
    });
  }

  private checkAlerts(config: MetricConfig, value: MetricValue): void {
    if (!config.alertThresholds) return;

    const { warning, critical } = config.alertThresholds;

    if (critical !== undefined && value.value >= critical) {
      this.createAlert({
        metricName: config.name,
        level: 'critical',
        message: `Metric ${config.name} exceeded critical threshold: ${value.value} ${config.unit || ''}`,
        value: value.value,
        threshold: critical,
        tags: value.tags
      });
    } else if (warning !== undefined && value.value >= warning) {
      this.createAlert({
        metricName: config.name,
        level: 'warning',
        message: `Metric ${config.name} exceeded warning threshold: ${value.value} ${config.unit || ''}`,
        value: value.value,
        threshold: warning,
        tags: value.tags
      });
    }
  }

  private createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): void {
    const fullAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now()
    };

    this.alerts.push(fullAlert);
    this.options.alertCallback(fullAlert);

    analytics.trackEvent({
      category: 'Monitoring',
      action: 'alert_triggered',
      label: alert.metricName,
      metadata: {
        level: alert.level,
        value: alert.value,
        threshold: alert.threshold
      }
    });
  }

  private startAggregation(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }

    this.aggregationInterval = setInterval(() => {
      this.aggregate();
    }, this.options.aggregationInterval);
  }

  private aggregate(): void {
    const now = Date.now();

    for (const [metricName, config] of this.metrics.entries()) {
      if (!config.aggregation) continue;

      const values = this.values.get(metricName) || [];
      const windowStart = now - config.aggregation.window;
      const windowValues = values.filter(v => v.timestamp >= windowStart);

      if (windowValues.length === 0) continue;

      let aggregatedValue: number;
      const rawValues = windowValues.map(v => v.value);

      switch (config.aggregation.type) {
        case 'avg': {
          aggregatedValue = rawValues.reduce((a, b) => a + b, 0) / rawValues.length;
          break;
        }
        case 'sum': {
          aggregatedValue = rawValues.reduce((a, b) => a + b, 0);
          break;
        }
        case 'min': {
          aggregatedValue = Math.min(...rawValues);
          break;
        }
        case 'max': {
          aggregatedValue = Math.max(...rawValues);
          break;
        }
        case 'p90':
        case 'p95':
        case 'p99': {
          const percentile = parseInt(config.aggregation.type.substring(1)) / 100;
          const sorted = [...rawValues].sort((a, b) => a - b);
          const index = Math.ceil(sorted.length * percentile) - 1;
          aggregatedValue = sorted[index];
          break;
        }
        default:
          continue;
      }

      const aggregations = this.aggregations.get(metricName) || [];
      aggregations.push({
        value: aggregatedValue,
        timestamp: now
      });

      // Clean up old aggregations
      const cutoff = now - this.options.retentionPeriod;
      while (aggregations.length > 0 && aggregations[0].timestamp < cutoff) {
        aggregations.shift();
      }
    }
  }

  getMetricValues(metricName: string, start?: number, end?: number): MetricValue[] {
    const values = this.values.get(metricName) || [];
    if (!start && !end) return values;

    return values.filter(v => {
      if (start && v.timestamp < start) return false;
      if (end && v.timestamp > end) return false;
      return true;
    });
  }

  getAggregatedValues(metricName: string, start?: number, end?: number): MetricValue[] {
    const values = this.aggregations.get(metricName) || [];
    if (!start && !end) return values;

    return values.filter(v => {
      if (start && v.timestamp < start) return false;
      if (end && v.timestamp > end) return false;
      return true;
    });
  }

  getAlerts(start?: number, end?: number): Alert[] {
    if (!start && !end) return this.alerts;

    return this.alerts.filter(a => {
      if (start && a.timestamp < start) return false;
      if (end && a.timestamp > end) return false;
      return true;
    });
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  destroy(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
  }

  recordError(message: string, error: Error | string, context?: Record<string, any>): void {
    const errorValue = typeof error === 'string' ? error : error.message;
    this.track('error', 1, {
      message,
      error: errorValue,
      ...context
    });
  }

  recordOperationLatency(operation: string, duration: number, context?: Record<string, any>): void {
    this.track('operation_latency', duration, {
      operation,
      ...context
    });
  }

  handleApiRequest(req: any, res: any): Promise<void> {
    // Implementation for handling API requests
    return Promise.resolve();
  }
}

export const monitoringService = MonitoringService.getInstance();

// Export the class for direct use
export { MonitoringService };

// Convenience functions
export const recordError = (message: string, error: Error | string, context?: Record<string, any>) => {
  monitoringService.recordError(message, error, context);
};

export const recordOperationLatency = (operation: string, duration: number, context?: Record<string, any>) => {
  monitoringService.recordOperationLatency(operation, duration, context);
};

export const monitoring = MonitoringService.getInstance(); 