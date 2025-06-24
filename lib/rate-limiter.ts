import { recordOperationLatency, recordError } from '@/lib/monitoring';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDuration: number;
}

interface RateLimitTier {
  name: string;
  config: RateLimitConfig;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private records: Map<string, RateLimitRecord> = new Map();
  private tiers: Map<string, RateLimitTier>;
  private isInitialized: boolean = false;

  private constructor() {
    this.tiers = new Map([
      ['free', {
        name: 'Free Tier',
        config: {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 60,
          blockDuration: 5 * 60 * 1000 // 5 minutes
        }
      }],
      ['basic', {
        name: 'Basic Tier',
        config: {
          windowMs: 60 * 1000,
          maxRequests: 120,
          blockDuration: 5 * 60 * 1000
        }
      }],
      ['premium', {
        name: 'Premium Tier',
        config: {
          windowMs: 60 * 1000,
          maxRequests: 300,
          blockDuration: 5 * 60 * 1000
        }
      }]
    ]);
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start cleanup interval
      setInterval(() => this.cleanup(), 60 * 1000); // Every minute
      this.isInitialized = true;
    } catch (error) {
      recordError('rate_limiter_initialization', error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now > record.resetTime) {
        this.records.delete(key);
      }
    }
  }

  private getKey(identifier: string, tier: string): string {
    return `${tier}:${identifier}`;
  }

  async checkRateLimit(identifier: string, tier: string = 'free'): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    blockedUntil?: number;
  }> {
    const startTime = Date.now();
    try {
      const tierConfig = this.tiers.get(tier);
      if (!tierConfig) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      const key = this.getKey(identifier, tier);
      const now = Date.now();
      let record = this.records.get(key);

      // Check if blocked
      if (record?.blockedUntil && now < record.blockedUntil) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: record.resetTime,
          blockedUntil: record.blockedUntil
        };
      }

      // Initialize or reset record if needed
      if (!record || now > record.resetTime) {
        record = {
          count: 0,
          resetTime: now + tierConfig.config.windowMs
        };
      }

      // Check rate limit
      if (record.count >= tierConfig.config.maxRequests) {
        record.blockedUntil = now + tierConfig.config.blockDuration;
        this.records.set(key, record);
        return {
          allowed: false,
          remaining: 0,
          resetTime: record.resetTime,
          blockedUntil: record.blockedUntil
        };
      }

      // Update record
      record.count++;
      this.records.set(key, record);

      const remaining = tierConfig.config.maxRequests - record.count;
      return {
        allowed: true,
        remaining,
        resetTime: record.resetTime
      };
    } catch (error) {
      recordError('rate_limit_check', error instanceof Error ? error.name : 'Unknown');
      throw error;
    } finally {
      recordOperationLatency('rate_limit_check', Date.now() - startTime);
    }
  }

  async resetRateLimit(identifier: string, tier: string = 'free'): Promise<void> {
    const key = this.getKey(identifier, tier);
    this.records.delete(key);
  }

  async getRateLimitInfo(identifier: string, tier: string = 'free'): Promise<{
    tier: string;
    maxRequests: number;
    windowMs: number;
    currentCount: number;
    remaining: number;
    resetTime: number;
    blockedUntil?: number;
  }> {
    const tierConfig = this.tiers.get(tier);
    if (!tierConfig) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    const key = this.getKey(identifier, tier);
    const record = this.records.get(key);
    const now = Date.now();

    if (!record || now > record.resetTime) {
      return {
        tier,
        maxRequests: tierConfig.config.maxRequests,
        windowMs: tierConfig.config.windowMs,
        currentCount: 0,
        remaining: tierConfig.config.maxRequests,
        resetTime: now + tierConfig.config.windowMs
      };
    }

    return {
      tier,
      maxRequests: tierConfig.config.maxRequests,
      windowMs: tierConfig.config.windowMs,
      currentCount: record.count,
      remaining: tierConfig.config.maxRequests - record.count,
      resetTime: record.resetTime,
      blockedUntil: record.blockedUntil
    };
  }
}

export const rateLimiter = RateLimiter.getInstance();
export default rateLimiter; 