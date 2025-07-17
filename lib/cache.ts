import { LRUCache } from 'lru-cache';

// Cache configuration
export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  maxAge: number; // Maximum age in milliseconds
  updateAgeOnGet: boolean;
  allowStale: boolean;
  noDisposeOnSet: boolean;
}

// Default cache configurations
export const CACHE_CONFIGS = {
  // Short-lived cache for frequently changing data
  SHORT: {
    maxSize: 100,
    ttl: 5 * 60 * 1000, // 5 minutes
    maxAge: 10 * 60 * 1000, // 10 minutes
    updateAgeOnGet: true,
    allowStale: false,
    noDisposeOnSet: false,
  },
  
  // Medium-lived cache for moderately changing data
  MEDIUM: {
    maxSize: 500,
    ttl: 30 * 60 * 1000, // 30 minutes
    maxAge: 60 * 60 * 1000, // 1 hour
    updateAgeOnGet: true,
    allowStale: true,
    noDisposeOnSet: false,
  },
  
  // Long-lived cache for static data
  LONG: {
    maxSize: 1000,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    updateAgeOnGet: false,
    allowStale: true,
    noDisposeOnSet: true,
  },
  
  // User-specific cache
  USER: {
    maxSize: 200,
    ttl: 15 * 60 * 1000, // 15 minutes
    maxAge: 60 * 60 * 1000, // 1 hour
    updateAgeOnGet: true,
    allowStale: false,
    noDisposeOnSet: false,
  },
} as const;

// Cache types
export type CacheType = keyof typeof CACHE_CONFIGS;

// Cache instance
class CacheManager {
  private caches: Map<CacheType, LRUCache<string, any>>;
  private userCaches: Map<string, LRUCache<string, any>>;
  private cacheStats: Map<string, { hits: number; misses: number; sets: number }>;

  constructor() {
    this.caches = new Map();
    this.userCaches = new Map();
    this.cacheStats = new Map();
    
    // Initialize caches
    Object.entries(CACHE_CONFIGS).forEach(([type, config]) => {
      this.caches.set(type as CacheType, new LRUCache({
        max: config.maxSize,
        ttl: config.ttl,
        maxEntrySize: 1024 * 1024, // 1MB max entry size
        updateAgeOnGet: config.updateAgeOnGet,
        allowStale: config.allowStale,
        noDisposeOnSet: config.noDisposeOnSet,
        dispose: (value, key) => {
          this.logCacheDisposal(type as CacheType, key);
        },
      }));
      
      this.cacheStats.set(type, { hits: 0, misses: 0, sets: 0 });
    });
  }

  // Get cache instance
  private getCache(type: CacheType, userId?: string): LRUCache<string, any> {
    if (userId) {
      if (!this.userCaches.has(userId)) {
        const config = CACHE_CONFIGS.USER;
        this.userCaches.set(userId, new LRUCache({
          max: config.maxSize,
          ttl: config.ttl,
          maxEntrySize: 1024 * 1024,
          updateAgeOnGet: config.updateAgeOnGet,
          allowStale: config.allowStale,
          noDisposeOnSet: config.noDisposeOnSet,
        }));
      }
      return this.userCaches.get(userId)!;
    }
    
    return this.caches.get(type)!;
  }

  // Generate cache key
  private generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  // Get value from cache
  async get<T>(
    type: CacheType,
    key: string,
    userId?: string
  ): Promise<T | undefined> {
    const cache = this.getCache(type, userId);
    const fullKey = userId ? `${userId}:${key}` : key;
    
    const value = cache.get(fullKey);
    
    if (value !== undefined) {
      this.incrementStats(type, 'hits');
      return value as T;
    } else {
      this.incrementStats(type, 'misses');
      return undefined;
    }
  }

  // Set value in cache
  async set<T>(
    type: CacheType,
    key: string,
    value: T,
    userId?: string,
    ttl?: number
  ): Promise<void> {
    const cache = this.getCache(type, userId);
    const fullKey = userId ? `${userId}:${key}` : key;
    
    cache.set(fullKey, value, { ttl });
    this.incrementStats(type, 'sets');
  }

  // Delete value from cache
  async delete(type: CacheType, key: string, userId?: string): Promise<void> {
    const cache = this.getCache(type, userId);
    const fullKey = userId ? `${userId}:${key}` : key;
    
    cache.delete(fullKey);
  }

  // Clear entire cache
  async clear(type: CacheType, userId?: string): Promise<void> {
    if (userId) {
      this.userCaches.delete(userId);
    } else {
      this.caches.get(type)?.clear();
    }
  }

  // Clear all caches
  async clearAll(): Promise<void> {
    this.caches.forEach(cache => cache.clear());
    this.userCaches.clear();
  }

  // Get cache statistics
  getStats(type?: CacheType) {
    if (type) {
      return this.cacheStats.get(type);
    }
    const stats: Record<string, { hits: number; misses: number; sets: number }> = {};
    this.cacheStats.forEach((value, key) => {
      stats[key] = value;
    });
    return stats;
  }

  // Get cache size
  getSize(type: CacheType, userId?: string): number {
    const cache = this.getCache(type, userId);
    return cache.size;
  }

  // Check if key exists
  has(type: CacheType, key: string, userId?: string): boolean {
    const cache = this.getCache(type, userId);
    const fullKey = userId ? `${userId}:${key}` : key;
    return cache.has(fullKey);
  }

  // Invalidate cache by pattern
  async invalidatePattern(type: CacheType, pattern: string, userId?: string): Promise<void> {
    const cache = this.getCache(type, userId);
    const keys = cache.keys();
    
    for (const key of keys) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }

  // Invalidate user-specific caches
  async invalidateUser(userId: string): Promise<void> {
    this.userCaches.delete(userId);
  }

  // Cache with fallback function
  async getOrSet<T>(
    type: CacheType,
    key: string,
    fallback: () => Promise<T>,
    userId?: string,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(type, key, userId);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await fallback();
    await this.set(type, key, value, userId, ttl);
    return value;
  }

  // Batch operations
  async getMultiple<T>(
    type: CacheType,
    keys: string[],
    userId?: string
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    
    for (const key of keys) {
      const value = await this.get<T>(type, key, userId);
      if (value !== undefined) {
        result.set(key, value);
      }
    }
    
    return result;
  }

  async setMultiple<T>(
    type: CacheType,
    entries: Array<{ key: string; value: T }>,
    userId?: string,
    ttl?: number
  ): Promise<void> {
    for (const { key, value } of entries) {
      await this.set(type, key, value, userId, ttl);
    }
  }

  // Utility methods
  private incrementStats(type: CacheType, stat: 'hits' | 'misses' | 'sets'): void {
    const stats = this.cacheStats.get(type);
    if (stats) {
      stats[stat]++;
    }
  }

  private logCacheDisposal(type: CacheType, key: string): void {
    // Cache disposal logged for debugging
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: unknown }> {
    try {
      const stats = this.getStats();
      const totalCaches = this.caches.size + this.userCaches.size;
      
      return {
        status: 'healthy',
        details: {
          totalCaches,
          stats,
          memoryUsage: process.memoryUsage(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Convenience functions
export const cache = {
  // Short-lived cache operations
  short: {
    get: <T>(key: string, userId?: string) => cacheManager.get<T>('SHORT', key, userId),
    set: <T>(key: string, value: T, userId?: string, ttl?: number) => 
      cacheManager.set<T>('SHORT', key, value, userId, ttl),
    delete: (key: string, userId?: string) => cacheManager.delete('SHORT', key, userId),
    getOrSet: <T>(key: string, fallback: () => Promise<T>, userId?: string, ttl?: number) =>
      cacheManager.getOrSet<T>('SHORT', key, fallback, userId, ttl),
  },
  
  // Medium-lived cache operations
  medium: {
    get: <T>(key: string, userId?: string) => cacheManager.get<T>('MEDIUM', key, userId),
    set: <T>(key: string, value: T, userId?: string, ttl?: number) => 
      cacheManager.set<T>('MEDIUM', key, value, userId, ttl),
    delete: (key: string, userId?: string) => cacheManager.delete('MEDIUM', key, userId),
    getOrSet: <T>(key: string, fallback: () => Promise<T>, userId?: string, ttl?: number) =>
      cacheManager.getOrSet<T>('MEDIUM', key, fallback, userId, ttl),
  },
  
  // Long-lived cache operations
  long: {
    get: <T>(key: string, userId?: string) => cacheManager.get<T>('LONG', key, userId),
    set: <T>(key: string, value: T, userId?: string, ttl?: number) => 
      cacheManager.set<T>('LONG', key, value, userId, ttl),
    delete: (key: string, userId?: string) => cacheManager.delete('LONG', key, userId),
    getOrSet: <T>(key: string, fallback: () => Promise<T>, userId?: string, ttl?: number) =>
      cacheManager.getOrSet<T>('LONG', key, fallback, userId, ttl),
  },
  
  // User-specific cache operations
  user: {
    get: <T>(key: string, userId: string) => cacheManager.get<T>('USER', key, userId),
    set: <T>(key: string, value: T, userId: string, ttl?: number) => 
      cacheManager.set<T>('USER', key, value, userId, ttl),
    delete: (key: string, userId: string) => cacheManager.delete('USER', key, userId),
    getOrSet: <T>(key: string, fallback: () => Promise<T>, userId: string, ttl?: number) =>
      cacheManager.getOrSet<T>('USER', key, fallback, userId, ttl),
    invalidate: (userId: string) => cacheManager.invalidateUser(userId),
  },
  
  // Utility operations
  clear: (type?: CacheType, userId?: string) => cacheManager.clear(type!, userId),
  clearAll: () => cacheManager.clearAll(),
  stats: (type?: CacheType) => cacheManager.getStats(type),
  health: () => cacheManager.healthCheck(),
  invalidatePattern: (type: CacheType, pattern: string, userId?: string) =>
    cacheManager.invalidatePattern(type, pattern, userId),
};

// CDN cache headers
export const getCDNHeaders = (maxAge: number = 3600): Record<string, string> => ({
  'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`,
  'CDN-Cache-Control': `public, max-age=${maxAge * 2}`,
  'Vary': 'Accept-Encoding, Accept-Language',
});

// Browser cache headers
export const getBrowserHeaders = (maxAge: number = 3600): Record<string, string> => ({
  'Cache-Control': `public, max-age=${maxAge}`,
  'ETag': `"${Date.now()}"`,
  'Last-Modified': new Date().toUTCString(),
});

// No-cache headers
export const getNoCacheHeaders = (): Record<string, string> => ({
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}); 