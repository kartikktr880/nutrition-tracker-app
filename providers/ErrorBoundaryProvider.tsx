import React, { createContext, useContext, useState, useCallback } from 'react';
import { ErrorBoundary } from '@/lib/errorBoundary';
import { ErrorDisplay } from '../app/auth/ErrorDisplay';
import { recordError } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';

interface ErrorBoundaryContextType {
  showError: (error: Error) => void;
  clearError: () => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | null>(null);

export const useErrorBoundaryContext = () => {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundaryContext must be used within an ErrorBoundaryProvider');
  }
  return context;
};

interface ErrorBoundaryProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  retryCount?: number;
  retryDelay?: number;
}

export const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({
  children,
  fallback,
  onError,
  retryCount = 3,
  retryDelay = 1000
}) => {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    setError(error);
    
    // Log error to monitoring system
    recordError('Global error boundary caught error', error, {
      componentStack: errorInfo.componentStack
    });

    // Log to audit logger
    auditLogger.log({
      category: 'error',
      severity: 'error',
      message: 'Global error boundary caught error',
      context: {
        error: error.message,
        componentStack: errorInfo.componentStack
      }
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo);
  }, [onError]);

  const handleReset = useCallback(() => {
    setError(null);
  }, []);

  const showError = useCallback((error: Error) => {
    setError(error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue = {
    showError,
    clearError
  };

  return (
    <ErrorBoundaryContext.Provider value={contextValue}>
      <ErrorBoundary
        fallback={fallback || <ErrorDisplay error={error!} resetError={handleReset} />}
        onError={handleError}
        onReset={handleReset}
        retryCount={retryCount}
        retryDelay={retryDelay}
      >
        {children}
      </ErrorBoundary>
    </ErrorBoundaryContext.Provider>
  );
};

export default ErrorBoundaryProvider; 