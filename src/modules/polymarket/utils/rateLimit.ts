// src/modules/polymarket/utils/rateLimit.ts

interface RateLimitConfig {
  requestsPerSecond: number;
}

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = config.requestsPerSecond;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.config.requestsPerSecond;
    
    this.tokens = Math.min(
      this.config.requestsPerSecond,
      this.tokens + tokensToAdd
    );
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitTime = (1 - this.tokens) / this.config.requestsPerSecond * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.tokens = 0;
  }
}

export class RateLimitManager {
  private limiters: Map<string, RateLimiter> = new Map();

  createLimiter(key: string, requestsPerSecond: number): void {
    this.limiters.set(key, new RateLimiter({ requestsPerSecond }));
  }

  async acquire(key: string): Promise<void> {
    const limiter = this.limiters.get(key);
    if (!limiter) {
      throw new Error(`Rate limiter not found for key: ${key}`);
    }
    await limiter.acquire();
  }
}

export const rateLimitManager = new RateLimitManager();