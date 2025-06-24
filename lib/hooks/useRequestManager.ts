import { useCallback, useRef } from 'react';
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
    const mergedOptions = { ...options, ...requestOptions };
    const result = await requestManager.executeRequest(requestFn, mergedOptions);
    return result;
  }, [options]);

  const cancelRequest = useCallback((requestId: string) => {
    requestManager.cancelRequest(requestId);
    activeRequestIds.current = activeRequestIds.current.filter(id => id !== requestId);
  }, []);

  const cancelAllRequests = useCallback(() => {
    activeRequestIds.current.forEach(requestId => {
      requestManager.cancelRequest(requestId);
    });
    activeRequestIds.current = [];
  }, []);

  const getRequestStats = useCallback(() => {
    return requestManager.getRequestStats();
  }, []);

  return {
    executeRequest,
    cancelRequest,
    cancelAllRequests,
    getRequestStats
  };
}

export default useRequestManager; 