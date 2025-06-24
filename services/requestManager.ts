import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';
import { memoryManager } from '@/services/memoryManager';

interface RequestConfig {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  priority?: number;
  cacheKey?: string;
  cacheTTL?: number;
}

interface RequestState {
  controller: AbortController;
  startTime: Date;
  retryCount: number;
  priority: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  error?: Error;
}

class RequestManager {
  private static instance: RequestManager;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_RETRY_COUNT = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_CONCURRENT_REQUESTS = 10;
  private readonly REQUEST_CLEANUP_INTERVAL = 300000; // 5 minutes

  private requests: Map<string, RequestState> = new Map();
  private requestQueue: string[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupInterval();
  }

  public static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  private startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleRequests();
    }, this.REQUEST_CLEANUP_INTERVAL);
  }

  private async cleanupStaleRequests() {
    const now = new Date();
    const staleRequests: string[] = [];

    for (const [requestId, state] of this.requests) {
      if (state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled') {
        if (now.getTime() - state.startTime.getTime() > this.REQUEST_CLEANUP_INTERVAL) {
          staleRequests.push(requestId);
        }
      }
    }

    for (const requestId of staleRequests) {
      this.requests.delete(requestId);
    }

    if (staleRequests.length > 0) {
      auditLogger.log({
        category: 'request',
        severity: 'info',
        message: 'Cleaned up stale requests',
        context: {
          count: staleRequests.length,
          requestIds: staleRequests
        }
      });
    }
  }

  public async executeRequest<T>(
    requestId: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retryCount = this.DEFAULT_RETRY_COUNT,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      priority = 0,
      cacheKey,
      cacheTTL
    } = config;

    // Check cache if configured
    if (cacheKey) {
      const cachedData = await memoryManager.getCacheEntry<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Create abort controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Initialize request state
    const state: RequestState = {
      controller,
      startTime: new Date(),
      retryCount: 0,
      priority,
      status: 'pending'
    };

    this.requests.set(requestId, state);
    this.requestQueue.push(requestId);
    this.sortRequestQueue();

    try {
      // Wait for slot if needed
      await this.waitForSlot();

      let lastError: Error | undefined;
      while (state.retryCount <= retryCount) {
        try {
          const result = await requestFn(controller.signal);
          
          // Cache result if configured
          if (cacheKey) {
            await memoryManager.setCacheEntry(cacheKey, result, JSON.stringify(result).length);
          }

          state.status = 'completed';
          this.removeFromQueue(requestId);

          recordOperationLatency('request_execution', Date.now() - state.startTime.getTime(), {
            requestId,
            status: 'success',
            retryCount: state.retryCount
          });

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (error instanceof DOMException && error.name === 'AbortError') {
            state.status = 'cancelled';
            throw new Error('Request cancelled');
          }

          if (state.retryCount < retryCount) {
            state.retryCount++;
            await new Promise(resolve => setTimeout(resolve, retryDelay * state.retryCount));
            continue;
          }

          state.status = 'failed';
          state.error = lastError;
          break;
        }
      }

      throw lastError;
    } finally {
      clearTimeout(timeoutId);
      this.removeFromQueue(requestId);
    }
  }

  private async waitForSlot(): Promise<void> {
    while (this.getActiveRequestCount() >= this.MAX_CONCURRENT_REQUESTS) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private getActiveRequestCount(): number {
    return Array.from(this.requests.values()).filter(
      state => state.status === 'pending'
    ).length;
  }

  private sortRequestQueue() {
    this.requestQueue.sort((a, b) => {
      const stateA = this.requests.get(a);
      const stateB = this.requests.get(b);
      if (!stateA || !stateB) return 0;
      return stateB.priority - stateA.priority;
    });
  }

  private removeFromQueue(requestId: string) {
    const index = this.requestQueue.indexOf(requestId);
    if (index > -1) {
      this.requestQueue.splice(index, 1);
    }
  }

  public cancelRequest(requestId: string) {
    const state = this.requests.get(requestId);
    if (state && state.status === 'pending') {
      state.controller.abort();
      state.status = 'cancelled';
      this.removeFromQueue(requestId);

      auditLogger.log({
        category: 'request',
        severity: 'info',
        message: 'Request cancelled',
        context: { requestId }
      });
    }
  }

  public cancelAllRequests() {
    for (const [requestId, state] of this.requests) {
      if (state.status === 'pending') {
        this.cancelRequest(requestId);
      }
    }

    auditLogger.log({
      category: 'request',
      severity: 'info',
      message: 'All requests cancelled',
      context: {
        cancelledCount: this.getActiveRequestCount()
      }
    });
  }

  public getRequestState(requestId: string): RequestState | undefined {
    return this.requests.get(requestId);
  }

  public async cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.cancelAllRequests();
    this.requests.clear();
    this.requestQueue = [];
  }
}

export const requestManager = RequestManager.getInstance(); 