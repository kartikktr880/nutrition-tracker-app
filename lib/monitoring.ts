import { logError, logWarn as _logWarn, logInfo as _logInfo, logDebug as _logDebug } from '@/utils/logger';

import { auditLogger } from './audit-logger';

interface ErrorDetails {
  error: Error | string;
  context?: Record<string, unknown>;
  severity?: 'FATAL' | 'ERROR' | 'WARNING';
}

interface ErrorWithCode extends Error {
  code?: string;
}

interface LatencyDetails {
  operation: string;
  duration: number;
  context?: Record<string, unknown>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private errorLogs: ErrorDetails[] = [];
  private latencyLogs: LatencyDetails[] = [];
  private readonly MAX_LOG_SIZE = 1000;
  private readonly CLEANUP_INTERVAL = 3600000; // 1 hour

  private constructor() {
    this.startPeriodicCleanup();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupLogs();
    }, this.CLEANUP_INTERVAL);
  }

  private cleanupLogs() {
    if (this.errorLogs.length > this.MAX_LOG_SIZE) {
      this.errorLogs = this.errorLogs.slice(-this.MAX_LOG_SIZE);
    }
    if (this.latencyLogs.length > this.MAX_LOG_SIZE) {
      this.latencyLogs = this.latencyLogs.slice(-this.MAX_LOG_SIZE);
    }
  }

  public recordError(message: string, error: Error | string, context?: Record<string, unknown>) {
    const errorDetails: ErrorDetails = {
      error: error instanceof Error ? error : new Error(error),
      context,
      severity: 'ERROR'
    };

    this.errorLogs.push(errorDetails);

    // Log to audit logger
    auditLogger.log({
      category: 'error',
      severity: 'error',
      message,
      context: {
        error: error instanceof Error ? error.message : error,
        ...(context as object)
      }
    });

    // In production, you would also send this to your error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement production error tracking service integration
      logError('Production error:', errorDetails);
    }
  }

  public recordOperationLatency(operation: string, duration: number, context?: Record<string, unknown>) {
    const latencyDetails: LatencyDetails = {
      operation,
      duration,
      context
    };

    this.latencyLogs.push(latencyDetails);

    // Log slow operations
    if (duration > 1000) { // 1 second
      auditLogger.log({
        category: 'performance',
        severity: 'warning',
        message: `Slow operation detected: ${operation}`,
        context: {
          duration,
          ...context
        }
      });
    }
  }

  public getErrorLogs(): ErrorDetails[] {
    return [...this.errorLogs];
  }

  public getLatencyLogs(): LatencyDetails[] {
    return [...this.latencyLogs];
  }

  public getAverageLatency(operation: string): number {
    const operationLogs = this.latencyLogs.filter(log => log.operation === operation);
    if (operationLogs.length === 0) return 0;

    const totalDuration = operationLogs.reduce((sum, log) => sum + log.duration, 0);
    return totalDuration / operationLogs.length;
  }

  public getErrorCount(errorCode?: string): number {
    if (!errorCode) return this.errorLogs.length;
    return this.errorLogs.filter(log => {
      if (log.error instanceof Error && 'code' in log.error) {
        return (log.error as ErrorWithCode).code === errorCode;
      }
      return false;
    }).length;
  }
}

export const monitoringService = MonitoringService.getInstance();

// Convenience functions
export const recordError = (message: string, error: Error | string, context?: Record<string, unknown>) => {
  monitoringService.recordError(message, error, context);
};

export const recordOperationLatency = (operation: string, duration: number, context?: Record<string, unknown>) => {
  monitoringService.recordOperationLatency(operation, duration, context);
}; 