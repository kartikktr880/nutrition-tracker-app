// TODO: Fix logger import path if needed. If logger is in 'utils/logger.ts', use logError, logWarn, logInfo, logDebug as needed.
import { Component } from 'react';

import { syncManager } from '@/utils/sync';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ExerciseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    // TODO: Fix logger import path if needed. If logger is in 'utils/logger.ts', use:
    // logError('Exercise component error:', error, errorInfo);

    // Check sync queue status
    const queueStatus = syncManager.getQueueStatus();
    if (queueStatus.failed > 0) {
      // TODO: Fix logger import path if needed. If logger is in 'utils/logger.ts', use:
      // logWarn('Failed sync operations detected:', queueStatus);
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleClearQueue = (): void => {
    syncManager.clearQueue();
    this.handleRetry();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="space-x-4">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={this.handleClearQueue}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Clear Sync Queue
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer">
                Error Details
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
} 