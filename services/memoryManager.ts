import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';
import { componentLifecycleManager } from '@/lib/componentLifecycleManager';

interface MemoryMetrics {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: Date;
}

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  size: number;
  lastAccessed: Date;
  accessCount: number;
}

interface RateLimiter {
  key: string;
  count: number;
  resetTime: Date;
  limit: number;
  window: number;
}

class MemoryManager {
  private static instance: MemoryManager;
  private readonly MEMORY_CHECK_INTERVAL = 60000; // 1 minute
  private readonly CACHE_CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly RATE_LIMITER_CLEANUP_INTERVAL = 3600000; // 1 hour
  private readonly DEFAULT_MEMORY_THRESHOLD = 0.8; // 80% of heap limit
  private readonly DEFAULT_CACHE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
  private readonly DEFAULT_CACHE_ENTRY_TTL = 3600000; // 1 hour

  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;
  private rateLimiterCleanupInterval: NodeJS.Timeout | null = null;
  private memoryMetrics: MemoryMetrics[] = [];
  private cache: Map<string, CacheEntry<any>> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private memoryThreshold: number;
  private cacheSizeLimit: number;
  private cacheEntryTTL: number;
  private isProfiling = false;
  private heapSnapshots: any[] = [];

  private constructor() {
    this.memoryThreshold = this.DEFAULT_MEMORY_THRESHOLD;
    this.cacheSizeLimit = this.DEFAULT_CACHE_SIZE_LIMIT;
    this.cacheEntryTTL = this.DEFAULT_CACHE_ENTRY_TTL;
    this.startMemoryMonitoring();
    this.startCacheCleanup();
    this.startRateLimiterCleanup();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private startMemoryMonitoring() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.MEMORY_CHECK_INTERVAL);
  }

  private startCacheCleanup() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }

    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  private startRateLimiterCleanup() {
    if (this.rateLimiterCleanupInterval) {
      clearInterval(this.rateLimiterCleanupInterval);
    }

    this.rateLimiterCleanupInterval = setInterval(() => {
      this.cleanupRateLimiters();
    }, this.RATE_LIMITER_CLEANUP_INTERVAL);
  }

  private async checkMemoryUsage() {
    try {
      const metrics = await this.collectMemoryMetrics();
      this.memoryMetrics.push(metrics);

      // Keep only last hour of metrics
      const oneHourAgo = new Date(Date.now() - 3600000);
      this.memoryMetrics = this.memoryMetrics.filter(m => m.timestamp > oneHourAgo);

      // Check if memory usage exceeds threshold
      const usageRatio = metrics.usedJSHeapSize / metrics.jsHeapSizeLimit;
      if (usageRatio > this.memoryThreshold) {
        this.handleHighMemoryUsage(metrics);
      }

      // Check for memory leaks
      this.detectMemoryLeaks();

      recordOperationLatency('memory_check', Date.now() - metrics.timestamp.getTime(), {
        usageRatio,
        totalHeap: metrics.totalJSHeapSize,
        usedHeap: metrics.usedJSHeapSize
      });
    } catch (error) {
      recordError('Memory check failed', error instanceof Error ? error.message : String(error));
    }
  }

  private async collectMemoryMetrics(): Promise<MemoryMetrics> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const metrics: MemoryMetrics = {
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: new Date()
      };
      return metrics;
    }

    // Fallback for browsers that don't support performance.memory
    return {
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      timestamp: new Date()
    };
  }

  public getMemoryMetrics(): MemoryMetrics[] {
    return [...this.memoryMetrics];
  }

  private handleHighMemoryUsage(metrics: MemoryMetrics) {
    const usageRatio = metrics.usedJSHeapSize / metrics.jsHeapSizeLimit;
    
    recordError('High memory usage detected', JSON.stringify({
      usageRatio,
      totalHeap: metrics.totalJSHeapSize,
      usedHeap: metrics.usedJSHeapSize,
      limit: metrics.jsHeapSizeLimit
    }));

    auditLogger.log({
      category: 'memory',
      severity: 'warning',
      message: 'High memory usage detected',
      context: {
        usageRatio,
        totalHeap: metrics.totalJSHeapSize,
        usedHeap: metrics.usedJSHeapSize,
        limit: metrics.jsHeapSizeLimit
      }
    });

    // Trigger aggressive cleanup
    this.cleanupCache(true);
    this.cleanupRateLimiters(true);
    this.forceGarbageCollection();
  }

  private detectMemoryLeaks() {
    if (this.memoryMetrics.length < 2) return;

    const recentMetrics = this.memoryMetrics.slice(-10);
    const growthRate = this.calculateMemoryGrowthRate(recentMetrics);

    if (growthRate > 0.1) { // 10% growth rate threshold
      recordError('Potential memory leak detected', JSON.stringify({
        growthRate,
        metrics: recentMetrics
      }));

      this.startMemoryProfiling();
    }
  }

  private calculateMemoryGrowthRate(metrics: MemoryMetrics[]): number {
    if (metrics.length < 2) return 0;

    const firstMetric = metrics[0];
    const lastMetric = metrics[metrics.length - 1];
    const timeDiff = lastMetric.timestamp.getTime() - firstMetric.timestamp.getTime();
    const memoryDiff = lastMetric.usedJSHeapSize - firstMetric.usedJSHeapSize;

    return memoryDiff / timeDiff;
  }

  private startMemoryProfiling() {
    if (this.isProfiling) return;

    this.isProfiling = true;
    this.heapSnapshots = [];

    // Take heap snapshots every minute for 5 minutes
    let snapshotCount = 0;
    const profilingInterval = setInterval(() => {
      if (snapshotCount >= 5) {
        clearInterval(profilingInterval);
        this.analyzeMemoryProfile();
        this.isProfiling = false;
        return;
      }

      this.takeHeapSnapshot();
      snapshotCount++;
    }, 60000);
  }

  private takeHeapSnapshot() {
    if (window.performance && (window.performance as any).memory) {
      this.heapSnapshots.push({
        timestamp: new Date(),
        metrics: (window.performance as any).memory
      });
    }
  }

  private analyzeMemoryProfile() {
    if (this.heapSnapshots.length < 2) return;

    const analysis = this.heapSnapshots.map((snapshot, index) => {
      if (index === 0) return null;
      const prevSnapshot = this.heapSnapshots[index - 1];
      return {
        timestamp: snapshot.timestamp,
        growth: snapshot.metrics.usedJSHeapSize - prevSnapshot.metrics.usedJSHeapSize,
        growthRate: (snapshot.metrics.usedJSHeapSize - prevSnapshot.metrics.usedJSHeapSize) /
          (snapshot.timestamp.getTime() - prevSnapshot.timestamp.getTime())
      };
    }).filter(Boolean);

    recordError('Memory profile analysis', JSON.stringify({ analysis }));
  }

  private cleanupCache(aggressive = false) {
    const now = new Date();
    let totalSize = 0;
    const entriesToDelete: string[] = [];

    // Calculate total size and find entries to delete
    for (const [key, entry] of this.cache) {
      totalSize += entry.size;

      const isExpired = now.getTime() - entry.timestamp.getTime() > this.cacheEntryTTL;
      const isStale = now.getTime() - entry.lastAccessed.getTime() > (aggressive ? this.cacheEntryTTL / 2 : this.cacheEntryTTL);

      if (isExpired || isStale || (aggressive && entry.accessCount < 2)) {
        entriesToDelete.push(key);
      }
    }

    // Delete entries if cache is too large or in aggressive mode
    if (totalSize > this.cacheSizeLimit || aggressive) {
      entriesToDelete.forEach(key => this.cache.delete(key));
    }

    if (entriesToDelete.length > 0) {
      auditLogger.log({
        category: 'memory',
        severity: 'info',
        message: 'Cache cleanup performed',
        context: {
          entriesDeleted: entriesToDelete.length,
          aggressive,
          totalSize,
          remainingSize: totalSize - entriesToDelete.reduce((sum, key) => sum + (this.cache.get(key)?.size || 0), 0)
        }
      });
    }
  }

  private cleanupRateLimiters(aggressive = false) {
    const now = new Date();
    const limitersToDelete: string[] = [];

    for (const [key, limiter] of this.rateLimiters) {
      const isExpired = now.getTime() - limiter.resetTime.getTime() > limiter.window;
      if (isExpired || (aggressive && limiter.count === 0)) {
        limitersToDelete.push(key);
      }
    }

    limitersToDelete.forEach(key => this.rateLimiters.delete(key));

    if (limitersToDelete.length > 0) {
      auditLogger.log({
        category: 'memory',
        severity: 'info',
        message: 'Rate limiter cleanup performed',
        context: {
          limitersDeleted: limitersToDelete.length,
          aggressive
        }
      });
    }
  }

  public forceGarbageCollection() {
    if (window.gc) {
      try {
        window.gc();
      } catch (error) {
        recordError('Garbage collection failed', error instanceof Error ? error.message : String(error));
      }
    }
  }

  public setMemoryThreshold(threshold: number) {
    if (threshold > 0 && threshold <= 1) {
      this.memoryThreshold = threshold;
    }
  }

  public setCacheSizeLimit(limit: number) {
    if (limit > 0) {
      this.cacheSizeLimit = limit;
    }
  }

  public setCacheEntryTTL(ttl: number) {
    if (ttl > 0) {
      this.cacheEntryTTL = ttl;
    }
  }

  public async setCacheEntry<T>(key: string, data: T, size: number) {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      size,
      lastAccessed: new Date(),
      accessCount: 0
    });

    // Check if we need to cleanup
    if (this.calculateCacheSize() > this.cacheSizeLimit) {
      this.cleanupCache();
    }
  }

  public getCacheEntry<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = new Date();
      entry.accessCount++;
      return entry.data as T;
    }
    return undefined;
  }

  private calculateCacheSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  public setRateLimiter(key: string, limit: number, window: number) {
    this.rateLimiters.set(key, {
      key,
      count: 0,
      resetTime: new Date(),
      limit,
      window
    });
  }

  public checkRateLimit(key: string): boolean {
    const limiter = this.rateLimiters.get(key);
    if (!limiter) return true;

    const now = new Date();
    if (now.getTime() - limiter.resetTime.getTime() > limiter.window) {
      limiter.count = 0;
      limiter.resetTime = now;
    }

    if (limiter.count >= limiter.limit) {
      return false;
    }

    limiter.count++;
    return true;
  }

  public async cleanup() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }

    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }

    if (this.rateLimiterCleanupInterval) {
      clearInterval(this.rateLimiterCleanupInterval);
      this.rateLimiterCleanupInterval = null;
    }

    this.cache.clear();
    this.rateLimiters.clear();
    this.memoryMetrics = [];
    this.heapSnapshots = [];
    this.isProfiling = false;

    this.forceGarbageCollection();
  }

  public setCacheTTL(key: string, ttl: number): Promise<void> {
    // Implementation for setting cache TTL
    const entry = this.cache.get(key);
    if (entry) {
      entry.timestamp = new Date(Date.now() + ttl);
    }
    return Promise.resolve();
  }
}

export const memoryManager = MemoryManager.getInstance(); 