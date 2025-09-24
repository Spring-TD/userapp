import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

/**
 * Redis Cache Service for general data caching
 * Uses Redis for fast data retrieval and fallback in-memory cache when Redis is unavailable
 */
export class RedisCacheService {
  private redisClient: RedisClientType | null = null;
  private isConnected = false;
  private cacheTtl = 3600; // Default TTL in seconds (1 hour)
  private fallbackCache = new Map<string, { value: any; expiration: number }>();

  constructor(ttl?: number) {
    this.cacheTtl = ttl || this.cacheTtl;
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Check if REDIS_URL is configured
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        logger.warn('REDIS_URL not configured, Redis cache will not be available');
        return;
      }

      this.redisClient = createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD || undefined,
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis connection error', { error: err.message });
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.redisClient.on('disconnect', () => {
        logger.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis', { error: error instanceof Error ? error.message : 'Unknown error' });
      this.isConnected = false;
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected || !this.redisClient) {
        logger.warn('Redis not connected, using in-memory cache');
        return this.fallbackGet(key);
      }

      const data = await this.redisClient.get(key);
      if (!data || typeof data !== 'string') return null;

      return JSON.parse(data) as T;
    } catch (error) {
      logger.error('Failed to get from cache', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.fallbackGet(key);
    }
  }

  /**
   * Set data in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.redisClient) {
        logger.warn('Redis not connected, using in-memory cache');
        return this.fallbackSet(key, value, ttl);
      }

      const expiration = ttl || this.cacheTtl;
      await this.redisClient.setEx(key, expiration, JSON.stringify(value));
      logger.debug('Data cached successfully', { key });
      return true;
    } catch (error) {
      logger.error('Failed to set cache', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.fallbackSet(key, value, ttl);
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.redisClient) {
        logger.warn('Redis not connected, using in-memory cache');
        return this.fallbackDelete(key);
      }

      const result = await this.redisClient.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete cache', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.fallbackDelete(key);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (!this.isConnected || !this.redisClient) {
        this.fallbackClear();
        return;
      }

      const keys = await this.redisClient.keys('*');
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      logger.error('Failed to clear cache', { error: error instanceof Error ? error.message : 'Unknown error' });
      this.fallbackClear();
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; isRedisConnected: boolean }> {
    try {
      if (!this.isConnected || !this.redisClient) {
        return {
          count: this.fallbackSize(),
          isRedisConnected: false
        };
      }

      const keys = await this.redisClient.keys('*');
      return {
        count: keys.length,
        isRedisConnected: true
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        count: this.fallbackSize(),
        isRedisConnected: false
      };
    }
  }

  /**
   * Fallback methods for in-memory cache
   */
  private fallbackGet<T>(key: string): T | null {
    const entry = this.fallbackCache.get(key);
    if (!entry) return null;
    
    if (entry.expiration < Date.now()) {
      this.fallbackCache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  private fallbackSet(key: string, value: any, ttl?: number): boolean {
    const exp = ttl ? Date.now() + (ttl * 1000) : Date.now() + (this.cacheTtl * 1000);
    this.fallbackCache.set(key, { value, expiration: exp });
    
    // Clean up expired entries
    this.cleanupExpiredEntries();
    
    return true;
  }

  private fallbackDelete(key: string): boolean {
    return this.fallbackCache.delete(key);
  }

  private fallbackClear(): void {
    this.fallbackCache.clear();
  }

  private fallbackSize(): number {
    this.cleanupExpiredEntries();
    return this.fallbackCache.size;
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    // Collect expired keys first using Array.from to avoid iteration issues
    const entries = Array.from(this.fallbackCache.entries());
    for (const [key, entry] of entries) {
      if (entry.expiration < now) {
        expiredKeys.push(key);
      }
    }
    
    // Delete expired entries
    for (const key of expiredKeys) {
      this.fallbackCache.delete(key);
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();