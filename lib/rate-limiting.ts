import { NextRequest, NextResponse } from 'next/server';

// Rate limiting strategies
export type RateLimitStrategy = 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket';

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  strategy: RateLimitStrategy;
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean;
  retryAfter?: boolean;
  store?: RateLimitStore;
}

// Rate limit store interface
export interface RateLimitStore {
  get(key: string): Promise<{ count: number; resetTime: number } | null>;
  set(key: string, count: number, resetTime: number): Promise<void>;
  increment(key: string, resetTime: number): Promise<{ count: number; resetTime: number }>;
  reset(key: string): Promise<void>;
}

// Rate limit result
export interface RateLimitResult {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  isLimited: boolean;
}

// Default configuration
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  strategy: 'sliding-window',
  message: 'Too many requests, please try again later.',
  statusCode: 429,
  headers: true,
  retryAfter: true,
};

// In-memory store (for development/testing)
export class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const data = this.store.get(key);
    if (!data) return null;

    // Check if window has expired
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return null;
    }

    return data;
  }

  async set(key: string, count: number, resetTime: number): Promise<void> {
    this.store.set(key, { count, resetTime });
  }

  async increment(key: string, resetTime: number): Promise<{ count: number; resetTime: number }> {
    const existing = await this.get(key);
    const count = (existing?.count || 0) + 1;
    
    await this.set(key, count, resetTime);
    return { count, resetTime };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Redis store (for production)
export class RedisRateLimitStore implements RateLimitStore {
  private redis: unknown; // Redis client

  constructor(redisClient: unknown) {
    this.redis = redisClient;
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const data = await (this.redis as any).get(key);
    if (!data) return null;

    const parsed = JSON.parse(data);
    if (Date.now() > parsed.resetTime) {
      await (this.redis as any).del(key);
      return null;
    }

    return parsed;
  }

  async set(key: string, count: number, resetTime: number): Promise<void> {
    const data = JSON.stringify({ count, resetTime });
    const ttl = Math.ceil((resetTime - Date.now()) / 1000);
    await (this.redis as any).setex(key, ttl, data);
  }

  async increment(key: string, resetTime: number): Promise<{ count: number; resetTime: number }> {
    const script = `
      local key = KEYS[1]
      local resetTime = tonumber(ARGV[1])
      local current = redis.call('get', key)
      
      if current then
        local data = cjson.decode(current)
        if tonumber(ARGV[2]) > data.resetTime then
          redis.call('del', key)
          current = nil
        end
      end
      
      if not current then
        local newData = {count = 1, resetTime = resetTime}
        redis.call('setex', key, math.ceil((resetTime - tonumber(ARGV[2])) / 1000), cjson.encode(newData))
        return cjson.encode(newData)
      else
        local data = cjson.decode(current)
        data.count = data.count + 1
        redis.call('setex', key, math.ceil((resetTime - tonumber(ARGV[2])) / 1000), cjson.encode(data))
        return cjson.encode(data)
      end
    `;

    const result = await (this.redis as any).eval(script, 1, key, resetTime, Date.now());
    return JSON.parse(result);
  }

  async reset(key: string): Promise<void> {
    await (this.redis as any).del(key);
  }
}

// Rate limiting class
export class RateLimiter {
  private config: RateLimitConfig;
  private store: RateLimitStore;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this.store = config.store || new MemoryRateLimitStore();
  }

  // Generate rate limit key
  private generateKey(request: NextRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }

    // Default key generation
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const path = request.nextUrl.pathname;
    
    return `rate-limit:${ip}:${path}:${userAgent}`;
  }

  // Check rate limit
  async checkLimit(request: NextRequest): Promise<RateLimitResult> {
    const key = this.generateKey(request);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    let result: { count: number; resetTime: number };

    switch (this.config.strategy) {
      case 'fixed-window':
        result = await this.fixedWindowStrategy(key, resetTime);
        break;
      case 'sliding-window':
        result = await this.slidingWindowStrategy(key, resetTime);
        break;
      case 'token-bucket':
        result = await this.tokenBucketStrategy(key, resetTime);
        break;
      case 'leaky-bucket':
        result = await this.leakyBucketStrategy(key, resetTime);
        break;
      default:
        result = await this.slidingWindowStrategy(key, resetTime);
    }

    const remaining = Math.max(0, this.config.maxRequests - result.count);
    const isLimited = result.count > this.config.maxRequests;
    const retryAfter = isLimited ? Math.ceil((result.resetTime - now) / 1000) : undefined;

    return {
      limit: this.config.maxRequests,
      remaining,
      reset: result.resetTime,
      retryAfter,
      isLimited,
    };
  }

  // Fixed window strategy
  private async fixedWindowStrategy(key: string, resetTime: number): Promise<{ count: number; resetTime: number }> {
    const existing = await this.store.get(key);
    
    if (!existing) {
      await this.store.set(key, 1, resetTime);
      return { count: 1, resetTime };
    }

    const count = existing.count + 1;
    await this.store.set(key, count, existing.resetTime);
    return { count, resetTime: existing.resetTime };
  }

  // Sliding window strategy
  private async slidingWindowStrategy(key: string, resetTime: number): Promise<{ count: number; resetTime: number }> {
    return await this.store.increment(key, resetTime);
  }

  // Token bucket strategy
  private async tokenBucketStrategy(key: string, resetTime: number): Promise<{ count: number; resetTime: number }> {
    const existing = await this.store.get(key);
    const now = Date.now();
    
    if (!existing) {
      await this.store.set(key, this.config.maxRequests - 1, resetTime);
      return { count: 1, resetTime };
    }

    // Calculate tokens to add based on time passed
    const timePassed = now - (resetTime - this.config.windowMs);
    const tokensToAdd = Math.floor(timePassed / this.config.windowMs) * this.config.maxRequests;
    const currentTokens = Math.min(this.config.maxRequests, existing.count + tokensToAdd);

    if (currentTokens > 0) {
      const newTokens = currentTokens - 1;
      await this.store.set(key, newTokens, resetTime);
      return { count: 1, resetTime };
    } else {
      await this.store.set(key, 0, resetTime);
      return { count: this.config.maxRequests + 1, resetTime };
    }
  }

  // Leaky bucket strategy
  private async leakyBucketStrategy(key: string, resetTime: number): Promise<{ count: number; resetTime: number }> {
    const existing = await this.store.get(key);
    const now = Date.now();
    
    if (!existing) {
      await this.store.set(key, 1, resetTime);
      return { count: 1, resetTime };
    }

    // Calculate leaked tokens
    const timePassed = now - (resetTime - this.config.windowMs);
    const leakRate = this.config.maxRequests / this.config.windowMs;
    const leakedTokens = Math.floor(timePassed * leakRate);
    const currentTokens = Math.max(0, existing.count - leakedTokens);

    if (currentTokens < this.config.maxRequests) {
      const newTokens = currentTokens + 1;
      await this.store.set(key, newTokens, resetTime);
      return { count: 1, resetTime };
    } else {
      await this.store.set(key, currentTokens, resetTime);
      return { count: this.config.maxRequests + 1, resetTime };
    }
  }

  // Create rate limit middleware
  createMiddleware() {
    return async (request: NextRequest) => {
      // Skip rate limiting for certain requests
      if (this.shouldSkipRateLimit(request)) {
        return NextResponse.next();
      }

      const result = await this.checkLimit(request);

      // Create response
      const response = NextResponse.next();

      // Add rate limit headers
      if (this.config.headers) {
        response.headers.set('X-RateLimit-Limit', result.limit.toString());
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', result.reset.toString());
        
        if (result.retryAfter && this.config.retryAfter) {
          response.headers.set('Retry-After', result.retryAfter.toString());
        }
      }

      // Check if request should be limited
      if (result.isLimited) {
        const errorResponse = new NextResponse(
          JSON.stringify({
            error: this.config.message || 'Too many requests',
            retryAfter: result.retryAfter,
          }),
          {
            status: this.config.statusCode || 429,
            headers: {
              'Content-Type': 'application/json',
              ...(this.config.headers && {
                'X-RateLimit-Limit': result.limit.toString(),
                'X-RateLimit-Remaining': result.remaining.toString(),
                'X-RateLimit-Reset': result.reset.toString(),
                ...(result.retryAfter && this.config.retryAfter && {
                  'Retry-After': result.retryAfter.toString(),
                }),
              }),
            },
          }
        );

        return errorResponse;
      }

      return response;
    };
  }

  // Check if request should skip rate limiting
  private shouldSkipRateLimit(request: NextRequest): boolean {
    const url = request.nextUrl.pathname;
    
    // Skip for static assets
    if (url.startsWith('/_next/') || url.startsWith('/static/')) {
      return true;
    }

    // Skip for health checks
    if (url === '/api/health' || url === '/health') {
      return true;
    }

    // Skip for webhook endpoints
    if (url.includes('/webhook')) {
      return true;
    }

    // Skip for successful requests if configured
    if (this.config.skipSuccessfulRequests) {
      // This would need to be checked after the request is processed
      return false;
    }

    return false;
  }

  // Reset rate limit for a key
  async resetLimit(key: string): Promise<void> {
    await this.store.reset(key);
  }

  // Get rate limit info for a key
  async getLimitInfo(key: string): Promise<RateLimitResult | null> {
    const data = await this.store.get(key);
    if (!data) return null;

    const now = Date.now();
    const remaining = Math.max(0, this.config.maxRequests - data.count);
    const isLimited = data.count > this.config.maxRequests;
    const retryAfter = isLimited ? Math.ceil((data.resetTime - now) / 1000) : undefined;

    return {
      limit: this.config.maxRequests,
      remaining,
      reset: data.resetTime,
      retryAfter,
      isLimited,
    };
  }
}

// Predefined rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // Strict rate limiting for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    strategy: 'sliding-window' as RateLimitStrategy,
    message: 'Too many authentication attempts, please try again later.',
  },

  // Moderate rate limiting for API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    strategy: 'sliding-window' as RateLimitStrategy,
    message: 'API rate limit exceeded, please try again later.',
  },

  // Loose rate limiting for general endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    strategy: 'sliding-window' as RateLimitStrategy,
    message: 'Too many requests, please try again later.',
  },

  // Rate limiting for file uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    strategy: 'fixed-window' as RateLimitStrategy,
    message: 'Too many file uploads, please try again later.',
  },
};

// Create rate limiters with predefined configurations
export const rateLimiters = {
  auth: new RateLimiter(RATE_LIMIT_CONFIGS.auth),
  api: new RateLimiter(RATE_LIMIT_CONFIGS.api),
  general: new RateLimiter(RATE_LIMIT_CONFIGS.general),
  upload: new RateLimiter(RATE_LIMIT_CONFIGS.upload),
};

// Export utilities
export const rateLimitUtils = {
  RateLimiter,
  MemoryRateLimitStore,
  RedisRateLimitStore,
  RATE_LIMIT_CONFIGS,
  rateLimiters,
}; 