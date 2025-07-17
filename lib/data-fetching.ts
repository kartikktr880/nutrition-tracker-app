import { cache } from '@/lib/cache';
import { errorHandler, createNetworkError, createServerError, AppError } from '@/lib/error-handling';

// Request configuration
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  cache?: 'default' | 'no-cache' | 'reload' | 'force-cache' | 'only-if-cached';
  cacheTime?: number; // milliseconds
  retries?: number;
  retryDelay?: number;
  timeout?: number; // milliseconds
  signal?: AbortSignal;
}

// Response wrapper
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
}

// Cache entry
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Request queue for deduplication
const requestQueue = new Map<string, Promise<any>>();

// Default configuration
const DEFAULT_CONFIG: RequestConfig = {
  method: 'GET',
  cache: 'default',
  cacheTime: 5 * 60 * 1000, // 5 minutes
  retries: 3,
  retryDelay: 1000,
  timeout: 10000, // 10 seconds
};

// Generate cache key
function generateCacheKey(url: string, config: RequestConfig): string {
  const method = config.method || 'GET';
  const body = config.body ? JSON.stringify(config.body) : '';
  return `${method}:${url}:${body}`;
}

// Generate request key for deduplication
function generateRequestKey(url: string, config: RequestConfig): string {
  return generateCacheKey(url, config);
}

// Create timeout promise
function createTimeoutPromise(timeout: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);
  });
}

// Retry with exponential backoff
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  retries: number,
  retryDelay: number
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === retries) {
        break;
      }

      // Don't retry on client errors (4xx)
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }

  if (lastError) {
    throw lastError;
  }
  // This line is theoretically unreachable if retries >= 0, but TypeScript needs it.
  throw new Error('Request failed after all retries');
}

// Enhanced fetch function
export async function enhancedFetch<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const requestKey = generateRequestKey(url, finalConfig);
  const cacheKey = generateCacheKey(url, finalConfig);

  // Check for duplicate requests
  if (requestQueue.has(requestKey)) {
    const existingRequest = requestQueue.get(requestKey);
    if (existingRequest) {
      return existingRequest;
    }
  }

  // Check cache for GET requests
  if (finalConfig.method === 'GET' && finalConfig.cache !== 'no-cache') {
    const cached = await cache.short.get<CacheEntry<T>>(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        data: cached.data,
        status: 200,
        statusText: 'OK (Cached)',
        headers: new Headers(),
        ok: true,
      };
    }
  }

  // Create request promise
  const requestPromise = (async () => {
    try {
      // Prepare request
      const requestInit: RequestInit = {
        method: finalConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...finalConfig.headers,
        },
        signal: finalConfig.signal,
      };

      if (finalConfig.body) {
        requestInit.body = JSON.stringify(finalConfig.body);
      }

      // Create fetch promise with timeout
      const fetchPromise = fetch(url, requestInit);
      const timeoutPromise = createTimeoutPromise(finalConfig.timeout || 30000);

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      // Handle response
      if (!response.ok) {
        throw new Response(response.statusText, {
          status: response.status,
          statusText: response.statusText,
        });
      }

      const data = await response.json();

      // Cache successful GET responses
      if (finalConfig.method === 'GET' && finalConfig.cache !== 'no-cache') {
        const cacheEntry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + (finalConfig.cacheTime || 300000),
        };
        await cache.short.set(cacheKey, cacheEntry, String(finalConfig.cacheTime));
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok,
      };
    } catch (error) {
      // Handle different error types
      if (error instanceof Response) {
        throw error; // Let retryRequest handle this
      } else if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw createNetworkError('Request timeout', { url, config: finalConfig });
        } else if (error.name === 'AbortError') {
          // Don't treat aborts as errors to be retried
          throw createNetworkError('Request aborted', { url, config: finalConfig });
        } else {
          throw createNetworkError(error.message, { url, config: finalConfig, originalError: error });
        }
      } else {
        throw createServerError('Unknown error occurred', { url, config: finalConfig, error });
      }
    }
  })();

  // Add to request queue
  requestQueue.set(requestKey, requestPromise);

  try {
    const result = await retryRequest(
      () => requestPromise,
      finalConfig.retries ?? 3,
      finalConfig.retryDelay ?? 1000
    );
    return result;
  } finally {
    // Remove from queue
    requestQueue.delete(requestKey);
  }
}

// API client class
export class ApiClient {
  private baseURL: string;
  private defaultConfig: RequestConfig;

  constructor(baseURL: string, defaultConfig: RequestConfig = {}) {
    this.baseURL = baseURL;
    this.defaultConfig = { ...DEFAULT_CONFIG, ...defaultConfig };
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const finalConfig = { ...this.defaultConfig, ...config };
    
    return enhancedFetch<T>(url, finalConfig);
  }

  // GET request
  async get<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data });
  }

  // PUT request
  async put<T>(endpoint: string, data?: unknown, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: unknown, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body: data });
  }

  // DELETE request
  async delete<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  clearCache(endpoint: string, method: RequestConfig['method'] = 'GET'): void {
    const cacheKey = generateCacheKey(`${this.baseURL}${endpoint}`, { method });
    cache.short.delete(cacheKey);
  }

  clearAllCache(): void {
    // This is tricky as we don't have a "delete all by prefix" in the simple cache.
    // This would require a more complex cache implementation.
    // For now, this will be a no-op.
    console.warn("`clearAllCache` is not implemented for the current cache provider.");
  }
}

// Create default API client
export const apiClient = new ApiClient('/api');

// React hooks for data fetching
import { useState, useEffect, useCallback, useRef } from 'react';

// Hook state
interface UseQueryState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  refetch: () => Promise<void>;
}

// Hook options
interface UseQueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchInterval?: number;
  cacheTime?: number;
  staleTime?: number;
  retries?: number;
  onError?: (error: AppError) => void;
}

// Use query hook
export function useQuery<T>(
  key: string,
  queryFn: (signal: AbortSignal) => Promise<T>,
  options: UseQueryOptions = {}
): UseQueryState<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = true,
    refetchOnMount = true,
    refetchInterval,
    cacheTime = 5 * 60 * 1000,
    staleTime = 0,
    retries = 3,
  } = options;

  const [state, setState] = useState<UseQueryState<T>>({
    data: null,
    loading: enabled,
    error: null,
    refetch: async () => {},
  });
  
  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const isStale = useCallback(async () => {
    const cached = await cache.long.get<CacheEntry<T>>(key);
    if (!cached) return true;
    const staleTimeMs = optionsRef.current.staleTime ?? 0;
    return Date.now() > cached.timestamp + staleTimeMs;
  }, [key]);

  const fetchData = useCallback(async (force = false, signal?: AbortSignal) => {
    if (!enabled) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }
    
    const isStaleNow = await isStale();
    if (force || isStaleNow) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      const cached = await cache.long.get<CacheEntry<T>>(key);
      if (cached && !isStaleNow && !force) {
        setState(prev => ({ ...prev, data: cached.data, loading: false }));
        return;
      }
      
      const data = await retryRequest(
        () => queryFnRef.current(signal!),
        retries,
        1000
      );

      if (signal?.aborted) return;
      
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + cacheTime,
      };
      await cache.long.set(key, cacheEntry, String(cacheTime));

      setState(prev => ({...prev, data, loading: false }));
    } catch (error) {
      if (signal?.aborted) return;

      const appError = error as AppError;
      errorHandler.handleError(appError, {
        additionalData: { hook: 'useQuery', queryKey: key },
      });
      optionsRef.current.onError?.(appError);

      setState(prev => ({ ...prev, error: appError, loading: false }));
    }
  }, [key, enabled, cacheTime, retries, isStale]);

  const refetch = useCallback(async () => {
    const controller = new AbortController();
    await fetchData(true, controller.signal);
  }, [fetchData]);

  useEffect(() => {
    setState(prev => ({ ...prev, refetch }));
  }, [refetch]);

  useEffect(() => {
    if (enabled && refetchOnMount) {
      const controller = new AbortController();
      fetchData(false, controller.signal);
      return () => {
        controller.abort();
      };
    }
    return () => {};
  }, [enabled, refetchOnMount, key, fetchData]);

  useEffect(() => {
    if (enabled && refetchOnWindowFocus) {
      const onFocus = async () => {
        if (await isStale()) {
          const controller = new AbortController();
          await fetchData(false, controller.signal);
        }
      };
      window.addEventListener('focus', onFocus);
      return () => {
        window.removeEventListener('focus', onFocus);
      };
    }
    return () => {};
  }, [enabled, refetchOnWindowFocus, isStale, fetchData]);

  useEffect(() => {
    if (enabled && refetchInterval) {
      const intervalId = setInterval(async () => {
        if (await isStale()) {
          const controller = new AbortController();
          await fetchData(false, controller.signal);
        }
      }, refetchInterval);
      return () => {
        clearInterval(intervalId);
      };
    }
    return () => {};
  }, [enabled, refetchInterval, isStale, fetchData]);

  return state;
}


// Mutation hook state
interface UseMutationState<TData, TVariables> {
  data: TData | null;
  loading: boolean;
  error: AppError | null;
  mutate: (variables: TVariables) => Promise<TData | null>;
  reset: () => void;
}

// Use mutation hook
export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: AppError, variables: TVariables) => void;
    onSettled?: (data: TData | null, error: AppError | null, variables: TVariables) => void;
  } = {}
): UseMutationState<TData, TVariables> {
  const [state, setState] = useState<UseMutationState<TData, TVariables>>({
    data: null,
    loading: false,
    error: null,
    mutate: async () => null,
    reset: () => {},
  });

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await mutationFn(variables);
      
      setState(prev => ({
        ...prev,
        data,
        loading: false,
      }));

      options.onSuccess?.(data, variables);
      options.onSettled?.(data, null, variables);

      return data;
    } catch (error) {
      const appError = error as AppError;
      errorHandler.handleError(appError, {
        additionalData: { hook: 'useMutation', mutationFnName: mutationFn.name, variables },
      });

      setState(prev => ({
        ...prev,
        error: appError,
        loading: false,
      }));

      options.onError?.(appError, variables);
      options.onSettled?.(null, appError, variables);

      return null;
    }
  }, [mutationFn, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      mutate,
      reset,
    });
  }, [mutate]);

  // Update state with current functions
  useEffect(() => {
    setState(prev => ({ ...prev, mutate, reset }));
  }, [mutate, reset]);

  return state;
}

// Prefetch function
export async function prefetch<T>(key: string, queryFn: () => Promise<T>): Promise<void> {
  try {
    const data = await queryFn();
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + 300000 // Default 5 mins
    };
    await cache.long.set(key, cacheEntry);
  } catch (error) {
    console.error(`[Prefetch] Failed to fetch data for key "${key}":`, error);
  }
}

export function invalidateCache(pattern?: string): void {
  // This is difficult with the current simple key-value cache.
  // A true pattern-based invalidation requires iterating keys, which can be slow.
  // For now, we'll warn. For a real app, a more advanced cache (e.g., Redis) would be better.
  if (pattern) {
    console.warn(`Pattern-based cache invalidation for "${pattern}" is not fully supported and may be inefficient.`);
    // A simple implementation might look like this, but it's not efficient:
    // cache.long.keys().then(keys => keys.filter(k => k.includes(pattern)).forEach(k => cache.long.delete(k)))
    // cache.short.keys().then(keys => keys.filter(k => k.includes(pattern)).forEach(k => cache.short.delete(k)))
  } else {
    // We can clear all if no pattern
    // This is still not ideal, but it's what's possible.
    // In a real scenario, you'd likely want to clear specific cache namespaces.
    console.warn("`invalidateCache` without a pattern is a no-op to prevent accidental full cache clears.");
  }
}


// Export utilities
export { cache as queryCache };
export { requestQueue as activeRequests }; 