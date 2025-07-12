import React, { Component, ErrorInfo, ReactNode, useState, useCallback } from 'react';

import { syncManager } from '@/utils/sync';

import { logError } from '../utils/logger';
import { auditLogger } from './audit-logger';
import { componentLifecycleManager } from './componentLifecycleManager';
import { recordError } from './monitoring';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void, retryCount: number) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  errorComponent?: React.ComponentType<{
    error: Error;
    resetError: () => void;
    retryCount: number;
    errorInfo?: ErrorInfo;
  }>;
  retryCount?: number;
  retryDelay?: number;
  recoveryStrategies?: Array<{
    name: string;
    condition: (error: Error) => boolean;
    action: (error: Error, resetError: () => void) => Promise<void>;
  }>;
  syncQueueCheck?: boolean;
  errorReporting?: {
    enabled: boolean;
    service?: 'sentry' | 'logrocket' | 'custom';
    customReporter?: (error: Error, errorInfo: ErrorInfo) => void;
  };
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryAttempt: number;
  recoveryAttempt: number;
  lastRecoveryStrategy: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private readonly componentId: string;
  private retryTimeout: NodeJS.Timeout | null = null;
  private recoveryTimeout: NodeJS.Timeout | null = null;

  static defaultProps = {
    retryCount: 3,
    retryDelay: 1000,
    syncQueueCheck: true,
    errorReporting: {
      enabled: true,
      service: 'sentry'
    }
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.componentId = `error-boundary-${Math.random().toString(36).substr(2, 9)}`;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryAttempt: 0,
      recoveryAttempt: 0,
      lastRecoveryStrategy: null
    };
  }

  componentDidMount() {
    componentLifecycleManager.registerComponent(this.componentId, {
      onMount: () => {
        logError(`ErrorBoundary ${this.componentId} mounted`);
      },
      onUnmount: () => {
        logError(`ErrorBoundary ${this.componentId} unmounted`);
      }
    });
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
    componentLifecycleManager.unregisterComponent(this.componentId);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      retryAttempt: 0,
      recoveryAttempt: 0,
      lastRecoveryStrategy: null
    };
  }

  private async attemptRecovery(error: Error): Promise<boolean> {
    const { recoveryStrategies } = this.props;
    if (!recoveryStrategies || this.state.recoveryAttempt >= recoveryStrategies.length) {
      return false;
    }

    const strategy = recoveryStrategies[this.state.recoveryAttempt];
    if (strategy.condition(error)) {
      try {
        await strategy.action(error, this.resetError);
        this.setState({ lastRecoveryStrategy: strategy.name });
        return true;
      } catch (recoveryError) {
        logError(`Recovery strategy ${strategy.name} failed:`, recoveryError);
        this.setState(prevState => ({
          recoveryAttempt: prevState.recoveryAttempt + 1
        }));
        return this.attemptRecovery(error);
      }
    }

    this.setState(prevState => ({
      recoveryAttempt: prevState.recoveryAttempt + 1
    }));
    return this.attemptRecovery(error);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    const { errorReporting } = this.props;
    if (!errorReporting?.enabled) return;

    // Log to monitoring system
    recordError('Error boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      retryAttempt: this.state.retryAttempt,
      recoveryAttempt: this.state.recoveryAttempt,
      lastRecoveryStrategy: this.state.lastRecoveryStrategy
    });

    // Log to audit logger
    auditLogger.log({
      category: 'error',
      severity: 'error',
      message: 'Error boundary caught error',
      context: {
        error: error.message,
        componentStack: errorInfo.componentStack,
        retryAttempt: this.state.retryAttempt,
        recoveryAttempt: this.state.recoveryAttempt,
        lastRecoveryStrategy: this.state.lastRecoveryStrategy
      }
    });

    // Report to error reporting service
    if (errorReporting.service === 'sentry') {
      // Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    } else if (errorReporting.service === 'logrocket') {
      // LogRocket.captureException(error);
    } else if (errorReporting.customReporter) {
      errorReporting.customReporter(error, errorInfo);
    }
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Report the error
    await this.reportError(error, errorInfo);

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Check sync queue if enabled
    if (this.props.syncQueueCheck) {
      const queueStatus = syncManager.getQueueStatus();
      if (queueStatus.failed > 0) {
        logError('Failed sync operations detected:', queueStatus);
      }
    }

    // Attempt recovery if strategies are provided
    const recovered = await this.attemptRecovery(error);
    if (recovered) {
      return;
    }

    // If recovery failed, attempt retry if configured
    if (this.props.retryCount && this.state.retryAttempt < this.props.retryCount) {
      this.retryTimeout = setTimeout(() => {
        this.setState(prevState => ({
          retryAttempt: prevState.retryAttempt + 1,
          hasError: false,
          error: null,
          errorInfo: null
        }));
      }, this.props.retryDelay);
    }
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryAttempt: 0,
      recoveryAttempt: 0,
      lastRecoveryStrategy: null
    });
    this.props.onReset?.();
  };

  private clearSyncQueue = () => {
    syncManager.clearQueue();
    this.resetError();
  };

  private renderFallback() {
    const { error, errorInfo, retryAttempt } = this.state;
    if (!error) return null;

    if (this.props.errorComponent) {
      const ErrorComponent = this.props.errorComponent;
      return (
        <ErrorComponent
          error={error}
          resetError={this.resetError}
          retryCount={retryAttempt}
          errorInfo={errorInfo || undefined}
        />
      );
    }

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(error, this.resetError, retryAttempt);
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Default fallback UI
    return (
      <div className="error-boundary-fallback p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <h2 className="text-lg font-semibold text-destructive mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-destructive/80 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="space-x-4">
          <button
            onClick={this.resetError}
            className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-md transition-colors"
          >
            Try again
          </button>
          {this.props.syncQueueCheck && (
            <button
              onClick={this.clearSyncQueue}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              Clear Sync Queue
            </button>
          )}
        </div>
        {process.env.NODE_ENV === 'development' && errorInfo && (
          <details className="mt-4">
            <summary className="text-sm text-gray-600 cursor-pointer">
              Error Details
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {errorInfo.componentStack}
            </pre>
          </details>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

// Higher-order component for functional components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Custom hook for error boundary context
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  const showBoundary = useCallback((error: Error, errorInfo?: ErrorInfo) => {
    setError(error);
    if (errorInfo) {
      setErrorInfo(errorInfo);
    }
  }, []);

  const resetBoundary = useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  if (error) {
    throw error;
  }

  return { showBoundary, resetBoundary, errorInfo };
}

// Export a default error component that can be used as a fallback
export const DefaultErrorComponent: React.FC<{
  error: Error;
  resetError: () => void;
  retryCount: number;
  errorInfo?: ErrorInfo;
}> = ({ error, resetError, retryCount, errorInfo }) => (
  <div className="error-component p-4 rounded-lg bg-destructive/10 border border-destructive/20">
    <h2 className="text-lg font-semibold text-destructive mb-2">
      Error Occurred
    </h2>
    <p className="text-sm text-destructive/80 mb-2">
      {error.message || 'An unexpected error occurred'}
    </p>
    {retryCount > 0 && (
      <p className="text-sm text-gray-600 mb-4">
        Retry attempt {retryCount} of 3
      </p>
    )}
    <button
      onClick={resetError}
      className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-md transition-colors"
    >
      Try again
    </button>
    {process.env.NODE_ENV === 'development' && errorInfo && (
      <details className="mt-4">
        <summary className="text-sm text-gray-600 cursor-pointer">
          Error Details
        </summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
          {errorInfo.componentStack}
        </pre>
      </details>
    )}
  </div>
);

export default ErrorBoundary; 