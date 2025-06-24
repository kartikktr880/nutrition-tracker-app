interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum number of requests per window
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  public check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    this.cleanup();
    const now = Date.now();
    
    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: this.store[key].resetTime
      };
    }

    if (now > this.store[key].resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: this.store[key].resetTime
      };
    }

    if (this.store[key].count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.store[key].resetTime
      };
    }

    this.store[key].count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - this.store[key].count,
      resetTime: this.store[key].resetTime
    };
  }
}

// Create rate limiter instances for different endpoints
export const exerciseRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute
});

export const userProfileRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30 // 30 requests per minute
});

export const sessionRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20 // 20 requests per minute
}); 