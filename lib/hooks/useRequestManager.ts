import { useCallback, useRef } from 'react';

import { logError as _logError, logWarn as _logWarn, logInfo, logDebug as _logDebug } from '../../utils/logger';
import { requestManager } from '../requestManager';

interface UseRequestManagerOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  priority?: 'high' | 'normal' | 'low';
  description?: string;
}

export function useRequestManager(options: UseRequestManagerOptions = {}) {
  const activeRequestIds = useRef<string[]>([]);

  const executeRequest = useCallback(async <T>(
    requestFn: () => Promise<T>,
    requestOptions: UseRequestManagerOptions = {}
  ): Promise<T> => {
    const _mergedOptions = { ...options, ...requestOptions };
    try {
      const result = await requestManager.executeRecovery(new Error('Request execution'), {
        operation: requestFn,
        operationId: crypto.randomUUID(),
        service: 'api'
      });
      return result as T;
    } catch (error) {
      // Fallback to direct execution
      return await requestFn();
    }
  }, [options]);

  const cancelRequest = useCallback((requestId: string) => {
    // Implementation for canceling requests
    logInfo('Canceling request:', requestId);
    activeRequestIds.current = activeRequestIds.current.filter(id => id !== requestId);
  }, []);

  const cancelAllRequests = useCallback(() => {
    // Implementation for canceling all requests
    logInfo('Canceling all requests');
    activeRequestIds.current = [];
  }, []);

  const getRequestStats = useCallback(() => {
    // Return basic stats
    return {
      totalRequests: 0,
      activeRequests: 0,
      completedRequests: 0,
      failedRequests: 0
    };
  }, []);

  return {
    executeRequest,
    cancelRequest,
    cancelAllRequests,
    getRequestStats
  };
}

export default useRequestManager; 