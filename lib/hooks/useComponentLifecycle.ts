import { useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { auditLogger } from '@/lib/audit-logger';
import { componentLifecycleManager } from '@/lib/componentLifecycleManager';
import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { memoryManager } from '@/services/memoryManager';
import { requestManager } from '@/services/requestManager';

import { logError, logInfo } from '../../utils/logger';

interface CleanupHook {
  cleanup: () => Promise<void>;
  type: 'subscription' | 'timer' | 'event' | 'request' | 'other';
  description: string;
}

interface UseComponentLifecycleOptions {
  onError?: (error: Error) => void;
  onMemoryWarning?: (usage: number, limit: number) => void;
  memoryThreshold?: number;
  onCleanup?: () => void | Promise<void>;
  cacheKey?: string;
  cacheTTL?: number;
  rateLimitKey?: string;
  rateLimit?: number;
  rateLimitWindow?: number;
  requestTimeout?: number;
  requestRetryCount?: number;
  requestRetryDelay?: number;
  requestPriority?: number;
  performanceWarningThreshold?: {
    fps?: number;
    memoryUsage?: number;
    renderTime?: number;
  };
  onPerformanceWarning?: (metrics: {
    fps: number;
    memoryUsage: number;
    renderTime: number;
    scriptTime: number;
    styleTime: number;
    layoutTime: number;
    paintTime: number;
  }) => void;
}

export function useComponentLifecycle(options: UseComponentLifecycleOptions = {}) {
  const {
    onMemoryWarning,
    onCleanup,
    cacheKey,
    cacheTTL,
    rateLimitKey,
    rateLimit,
    rateLimitWindow,
    requestTimeout,
    requestRetryCount,
    requestRetryDelay,
    requestPriority,
    performanceWarningThreshold = {
      fps: 30,
      memoryUsage: 0.8,
      renderTime: 16.67 // 60fps target
    },
    onPerformanceWarning
  } = options;

  const componentId = useRef<string>(`component-${Math.random().toString(36).substr(2, 9)}`);
  const hooks = useRef<Map<string, CleanupHook>>(new Map());
  const abortControllers = useRef<Set<AbortController>>(new Set());
  const cleanupRef = useRef<(() => void | Promise<void>) | null>(null);

  useEffect(() => {
    const registerComponent = async () => {
      try {
        // Register component with lifecycle manager
        await componentLifecycleManager.registerComponent(componentId.current, {
          onMount: () => {
            logInfo(`Component ${componentId.current} mounted`);
          },
          onUnmount: () => {
            logInfo(`Component ${componentId.current} unmounted`);
          }
        });

        // Set up rate limiting if configured
        if (rateLimitKey && rateLimit && rateLimitWindow) {
          await memoryManager.setRateLimiter(rateLimitKey, rateLimit, rateLimitWindow);
        }

        // Set up cache TTL if configured
        if (cacheKey && cacheTTL) {
          await memoryManager.setCacheTTL(cacheKey, cacheTTL);
        }

        // Set up memory warning callback
        if (onMemoryWarning) {
          componentLifecycleManager.setMemoryWarningCallback(
            componentId.current,
            (_usage, _limit) => {
              onMemoryWarning(_usage, _limit);
              auditLogger.log({
                category: 'memory',
                severity: 'warning',
                message: 'Component memory warning callback triggered',
                context: {
                  componentId: componentId.current,
                  usage: _usage,
                  limit: _limit
                }
              });
            }
          );
        }

        // Set up performance warning callback
        if (onPerformanceWarning) {
          componentLifecycleManager.setPerformanceWarningCallback(
            componentId.current,
            (_usage: number, _limit: number) => {
              const metrics = componentLifecycleManager.getComponentPerformanceMetrics(componentId.current);
              if (metrics) {
                const {
                  fps,
                  memoryUsage,
                  renderTime
                } = metrics;

                // Check if any metrics exceed thresholds
                if (
                  fps < (performanceWarningThreshold.fps ?? 30) ||
                  memoryUsage > (performanceWarningThreshold.memoryUsage ?? 0.8) ||
                  renderTime > (performanceWarningThreshold.renderTime ?? 16.67)
                ) {
                  onPerformanceWarning({
                    fps,
                    memoryUsage,
                    renderTime,
                    scriptTime: 0,
                    styleTime: 0,
                    layoutTime: 0,
                    paintTime: 0
                  });
                }
              }
            }
          );
        }

        // Set up cleanup callback
        if (onCleanup) {
          cleanupRef.current = onCleanup;
          componentLifecycleManager.setCleanupCallback(componentId.current, onCleanup);
        }

        // Record component registration
        recordOperationLatency('component_registration', 0, {
          componentId: componentId.current,
          hasCache: !!cacheKey,
          hasRateLimit: !!rateLimitKey
        });

        auditLogger.log({
          category: 'component',
          severity: 'info',
          message: 'Component registered',
          context: {
            componentId: componentId.current,
            hasCache: !!cacheKey,
            hasRateLimit: !!rateLimitKey
          }
        });
      } catch (error) {
        recordError('Component registration failed', error instanceof Error ? error.message : String(error));
        throw error;
      }
    };

    registerComponent();

    return () => {
      if (cleanupRef.current) {
        const result = cleanupRef.current();
        if (result instanceof Promise) {
          result.catch((error: unknown) => {
            logError('Cleanup failed:', error instanceof Error ? error.message : String(error));
          });
        }
      }
    };
  }, [
    componentId,
    onCleanup,
    cacheKey,
    cacheTTL,
    rateLimitKey,
    rateLimit,
    rateLimitWindow,
    onMemoryWarning,
    onPerformanceWarning,
    performanceWarningThreshold
  ]);

  const addCleanupHook = useCallback((
    hookId: string,
    cleanup: () => Promise<void>,
    type: CleanupHook['type'],
    description: string
  ) => {
    hooks.current.set(hookId, { cleanup, type, description });
    componentLifecycleManager.addCleanupHook(
      componentId.current,
      hookId,
      cleanup,
      type,
      description
    );
  }, []);

  const removeCleanupHook = useCallback(async (hookId: string) => {
    hooks.current.delete(hookId);
    await componentLifecycleManager.removeCleanupHook(componentId.current, hookId);
  }, []);

  const addSubscription = useCallback((subscription: { unsubscribe: () => void }, type: string) => {
    componentLifecycleManager.addSubscription(componentId.current, subscription, type);
  }, []);

  const addTimer = useCallback((timerId: NodeJS.Timeout, type: string) => {
    componentLifecycleManager.addTimer(componentId.current, timerId, type);
  }, []);

  const addEventListener = useCallback((
    element: EventTarget,
    type: string,
    handler: EventListener
  ) => {
    componentLifecycleManager.addEventListener(componentId.current, element, type, handler);
  }, []);

  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    abortControllers.current.add(controller);
    componentLifecycleManager.addRequest(componentId.current, controller, 'fetch');
    return controller;
  }, []);

  const cleanup = useCallback(async () => {
    // Abort all pending requests
    for (const controller of abortControllers.current) {
      controller.abort();
    }
    abortControllers.current.clear();

    // Cleanup all hooks
    await componentLifecycleManager.cleanupComponent(componentId.current);
  }, []);

  const handleError = useCallback((error: Error) => {
    componentLifecycleManager.recordError(componentId.current, error);
    options.onError?.(error);
  }, [options]);

  const updateMemoryUsage = useCallback((usage: number) => {
    componentLifecycleManager.updateMemoryUsage(componentId.current, usage);
    if (options.memoryThreshold && usage > options.memoryThreshold) {
      options.onMemoryWarning?.(usage, options.memoryThreshold);
    }
  }, [options]);

  // Cache management functions
  const setCache = useCallback(async <T>(data: T, size: number) => {
    if (!cacheKey) return;

    try {
      await componentLifecycleManager.registerComponentCache(
        componentId.current,
        cacheKey,
        data,
        size
      );
    } catch (error) {
      recordError('Cache set failed', error instanceof Error ? error.message : String(error));
    }
  }, [cacheKey]);

  const getCache = useCallback(<T>(): T | undefined => {
    if (!cacheKey) return undefined;

    try {
      const result = componentLifecycleManager.getComponentCache<T>(componentId.current, cacheKey);
      return result || undefined;
    } catch (error) {
      recordError('Cache get failed', error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }, [cacheKey]);

  // Rate limiting function
  const checkRateLimit = useCallback((): boolean => {
    if (!rateLimitKey) return true;

    try {
      return memoryManager.checkRateLimit(rateLimitKey);
    } catch (error) {
      recordError('Rate limit check failed', error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [rateLimitKey]);

  const executeRequest = useCallback(async <T>(
    requestFn: (signal: AbortSignal) => Promise<T>,
    requestConfig: {
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
      priority?: number;
      cacheKey?: string;
      cacheTTL?: number;
    } = {}
  ): Promise<T> => {
    const requestId = `${componentId.current}_${uuidv4()}`;
    
    try {
      return await requestManager.executeRequest<T>(requestId, requestFn, {
        timeout: requestConfig.timeout ?? requestTimeout,
        retryCount: requestConfig.retryCount ?? requestRetryCount,
        retryDelay: requestConfig.retryDelay ?? requestRetryDelay,
        priority: requestConfig.priority ?? requestPriority,
        cacheKey: requestConfig.cacheKey ?? cacheKey,
        cacheTTL: requestConfig.cacheTTL ?? cacheTTL
      });
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [
    componentId,
    requestTimeout,
    requestRetryCount,
    requestRetryDelay,
    requestPriority,
    cacheKey,
    cacheTTL,
    handleError
  ]);

  const cancelRequest = useCallback((requestId: string) => {
    requestManager.cancelRequest(requestId);
  }, []);

  const cancelAllRequests = useCallback(() => {
    requestManager.cancelAllRequests();
  }, []);

  const getPerformanceMetrics = useCallback(() => {
    return componentLifecycleManager.getComponentPerformanceMetrics(componentId.current);
  }, []);

  return {
    componentId: componentId.current,
    addCleanupHook,
    removeCleanupHook,
    addSubscription,
    addTimer,
    addEventListener,
    createAbortController,
    cleanup,
    handleError,
    updateMemoryUsage,
    setCache,
    getCache,
    checkRateLimit,
    executeRequest,
    cancelRequest,
    cancelAllRequests,
    getPerformanceMetrics
  };
} 