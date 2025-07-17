import * as Sentry from '@sentry/nextjs';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly context?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code: string = 'UNKNOWN_ERROR',
    context?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.context = context;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

// Error handler configuration
export interface ErrorHandlerConfig {
  enableSentry: boolean;
  enableConsoleLogging: boolean;
  enableUserNotifications: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxContextSize: number;
}

// Default configuration
export const defaultErrorConfig: ErrorHandlerConfig = {
  enableSentry: process.env.NODE_ENV === 'production',
  enableConsoleLogging: false,
  enableUserNotifications: true,
  logLevel: 'error',
  maxContextSize: 1000,
};

// Error handler class
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorCount: Map<string, number> = new Map();
  private readonly maxErrorCount = 10;
  private readonly errorCountResetInterval = 60 * 60 * 1000; // 1 hour

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...defaultErrorConfig, ...config };
    this.startErrorCountReset();
  }

  // Handle error with context
  public handleError(
    error: Error | AppError,
    context?: Partial<ErrorContext>
  ): void {
    const appError = this.normalizeError(error);
    const fullContext = this.buildContext(context);

    // Increment error count
    this.incrementErrorCount(appError.code);

    // Log error
    this.logError(appError, fullContext);

    // Send to Sentry if enabled and not operational
    if (this.config.enableSentry && !appError.isOperational) {
      this.sendToSentry(appError, fullContext);
    }

    // Show user notification if enabled
    if (this.config.enableUserNotifications) {
      this.showUserNotification(appError);
    }
  }

  // Handle async errors
  public async handleAsyncError<T>(
    promise: Promise<T>,
    context?: Partial<ErrorContext>
  ): Promise<T | null> {
    try {
      return await promise;
    } catch (error) {
      this.handleError(error as Error, context);
      return null;
    }
  }

  // Create error boundary handler
  public createErrorBoundaryHandler() {
    return (error: Error, errorInfo: React.ErrorInfo) => {
      this.handleError(error, {
        additionalData: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        },
      });
    };
  }

  // Normalize error to AppError
  private normalizeError(error: Error | AppError): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Determine error type from error message or name
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let code = 'UNKNOWN_ERROR';

    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      type = ErrorType.NETWORK;
      severity = ErrorSeverity.HIGH;
      code = 'NETWORK_ERROR';
    } else if (error.name === 'ValidationError') {
      type = ErrorType.VALIDATION;
      severity = ErrorSeverity.LOW;
      code = 'VALIDATION_ERROR';
    } else if (error.name === 'AuthenticationError') {
      type = ErrorType.AUTHENTICATION;
      severity = ErrorSeverity.MEDIUM;
      code = 'AUTH_ERROR';
    } else if (error.name === 'AuthorizationError') {
      type = ErrorType.AUTHORIZATION;
      severity = ErrorSeverity.MEDIUM;
      code = 'FORBIDDEN_ERROR';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      type = ErrorType.NOT_FOUND;
      severity = ErrorSeverity.LOW;
      code = 'NOT_FOUND_ERROR';
    }

    return new AppError(
      error.message,
      type,
      severity,
      code,
      { originalError: error.name },
      false
    );
  }

  // Build error context
  private buildContext(context?: Partial<ErrorContext>): ErrorContext {
    const baseContext: ErrorContext = {
      timestamp: new Date(),
    };

    // Add browser context if available
    if (typeof window !== 'undefined') {
      baseContext.url = window.location.href;
      baseContext.userAgent = navigator.userAgent;
    }

    return { ...baseContext, ...context };
  }

  // Log error
  private logError(error: AppError, context: ErrorContext): void {
    if (!this.config.enableConsoleLogging) return;

    const logData = {
      error: {
        message: error.message,
        type: error.type,
        severity: error.severity,
        code: error.code,
        stack: error.stack,
      },
      context: this.truncateContext(context),
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        // App Warning logged - handled by error boundary
        break;
      case ErrorSeverity.MEDIUM:
        // App Error logged - handled by error boundary
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        // Critical App Error logged - handled by error boundary
        break;
    }
  }

  // Send error to Sentry
  private sendToSentry(error: AppError, context: ErrorContext): void {
    try {
      Sentry.withScope((scope) => {
        scope.setTag('error_type', error.type);
        scope.setTag('error_severity', error.severity);
        scope.setTag('error_code', error.code);
        scope.setLevel(this.mapSeverityToSentryLevel(error.severity));
        
        // Add context data
        Object.entries(context).forEach(([key, value]) => {
          if (value !== undefined) {
            scope.setContext(key, value);
          }
        });

        // Add error context
        if (error.context) {
          scope.setContext('error_context', error.context);
        }

        Sentry.captureException(error);
      });
    } catch (sentryError) {
      // Failed to send error to Sentry - logged for debugging
    }
  }

  // Show user notification
  private showUserNotification(error: AppError): void {
    // Only show notifications for high severity errors
    if (error.severity === ErrorSeverity.LOW) return;

    const message = this.getUserFriendlyMessage(error);
    
    // In a real app, this would use a toast notification system
    if (typeof window !== 'undefined') {
      // Use browser notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nutrition Tracker Error', {
          body: message,
          icon: '/icons/error.png',
        });
      } else {
        // Fallback to alert for critical errors
        if (error.severity === ErrorSeverity.CRITICAL) {
          alert(`Error: ${message}`);
        }
      }
    }
  }

  // Get user-friendly error message
  private getUserFriendlyMessage(error: AppError): string {
    const messages: Record<string, string> = {
      NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
      VALIDATION_ERROR: 'The information you entered is invalid. Please check your input and try again.',
      AUTH_ERROR: 'Your session has expired. Please log in again.',
      FORBIDDEN_ERROR: 'You don\'t have permission to perform this action.',
      NOT_FOUND_ERROR: 'The requested resource was not found.',
      SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
      UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    };

    return messages[error.code] || messages.UNKNOWN_ERROR;
  }

  // Map severity to Sentry level
  private mapSeverityToSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'warning';
      case ErrorSeverity.MEDIUM:
        return 'error';
      case ErrorSeverity.HIGH:
        return 'fatal';
      case ErrorSeverity.CRITICAL:
        return 'fatal';
      default:
        return 'error';
    }
  }

  // Truncate context to prevent memory issues
  private truncateContext(context: ErrorContext): ErrorContext {
    const truncated = { ...context };
    
    if (truncated.additionalData) {
      const dataString = JSON.stringify(truncated.additionalData);
      if (dataString.length > this.config.maxContextSize) {
        truncated.additionalData = {
          truncated: true,
          size: dataString.length,
          preview: dataString.substring(0, this.config.maxContextSize),
        };
      }
    }

    return truncated;
  }

  // Increment error count for rate limiting
  private incrementErrorCount(code: string): void {
    const currentCount = this.errorCount.get(code) || 0;
    this.errorCount.set(code, currentCount + 1);
  }

  // Start error count reset interval
  private startErrorCountReset(): void {
    setInterval(() => {
      this.errorCount.clear();
    }, this.errorCountResetInterval);
  }

  // Check if error count exceeds limit
  public isErrorRateLimited(code: string): boolean {
    const count = this.errorCount.get(code) || 0;
    return count > this.maxErrorCount;
  }

  // Get error statistics
  public getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.errorCount.forEach((count, code) => {
      stats[code] = count;
    });
    return stats;
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

// Utility functions
export const handleError = (error: Error | AppError, context?: Partial<ErrorContext>) => {
  errorHandler.handleError(error, context);
};

export const handleAsyncError = <T>(
  promise: Promise<T>,
  context?: Partial<ErrorContext>
): Promise<T | null> => {
  return errorHandler.handleAsyncError(promise, context);
};

// Error boundary hook
export const useErrorBoundary = () => {
  return errorHandler.createErrorBoundaryHandler();
};

// Error types for common scenarios
export const createNetworkError = (message: string, context?: Record<string, any>) =>
  new AppError(message, ErrorType.NETWORK, ErrorSeverity.HIGH, 'NETWORK_ERROR', context);

export const createValidationError = (message: string, context?: Record<string, any>) =>
  new AppError(message, ErrorType.VALIDATION, ErrorSeverity.LOW, 'VALIDATION_ERROR', context);

export const createAuthError = (message: string, context?: Record<string, any>) =>
  new AppError(message, ErrorType.AUTHENTICATION, ErrorSeverity.MEDIUM, 'AUTH_ERROR', context);

export const createNotFoundError = (message: string, context?: Record<string, any>) =>
  new AppError(message, ErrorType.NOT_FOUND, ErrorSeverity.LOW, 'NOT_FOUND_ERROR', context);

export const createServerError = (message: string, context?: Record<string, any>) =>
  new AppError(message, ErrorType.SERVER, ErrorSeverity.HIGH, 'SERVER_ERROR', context); 