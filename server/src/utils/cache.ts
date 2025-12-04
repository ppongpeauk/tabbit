import Redis from "ioredis";

class CacheService {
  private redis: Redis | null = null;
  private isConnected = false;
  private connectionAttempted = false;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.connectionAttempted) {
      return;
    }

    this.connectionAttempted = true;
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.warn("[Cache] REDIS_URL not set, caching disabled");
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.redis.on("error", (error) => {
        console.error("[Cache] Redis error:", error.message);
        this.isConnected = false;
      });

      this.redis.on("connect", () => {
        console.log("[Cache] Redis connecting...");
      });

      this.redis.on("ready", () => {
        console.log("[Cache] Redis connected and ready");
        this.isConnected = true;
      });

      this.redis.on("close", () => {
        console.warn("[Cache] Redis connection closed");
        this.isConnected = false;
      });

      await this.redis.connect();
    } catch (error) {
      console.warn(
        "[Cache] Failed to connect to Redis, caching disabled:",
        error instanceof Error ? error.message : "Unknown error"
      );
      this.redis = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if cache is available
   */
  private isAvailable(): boolean {
    return this.isConnected && this.redis !== null;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.redis!.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Cache] Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis!.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis!.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`[Cache] Error setting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redis!.del(key);
      return true;
    } catch (error) {
      console.error(`[Cache] Error deleting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keys = await this.redis!.keys(pattern);
      if (keys.length > 0) {
        await this.redis!.del(...keys);
      }
      return true;
    } catch (error) {
      console.error(`[Cache] Error deleting pattern ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }
}

export const cacheService = new CacheService();
