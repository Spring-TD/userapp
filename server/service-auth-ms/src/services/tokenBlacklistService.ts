import { createClient, RedisClientType } from 'redis';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * Token Blacklist Service for managing revoked tokens
 * Uses Redis to store blacklisted tokens with expiration
 */
export class TokenBlacklistService {
  private redisClient: RedisClientType | null = null;
  private isConnected = false;
  private fallbackBlacklist = new Map<string, number>();

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: config.redis.url,
        password: config.redis.password || undefined,
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
   * Add token to blacklist
   */
  async addToBlacklist(token: string, expirationTime?: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.redisClient) {
        logger.warn('Redis not connected, using fallback blacklist');
        return this.fallbackAdd(token, expirationTime);
      }

      const key = `blacklist:${token}`;
      const ttl = expirationTime ? Math.ceil((expirationTime - Date.now()) / 1000) : 86400; // Default 24 hours

      await this.redisClient.setEx(key, ttl, '1');
      logger.info('Token added to blacklist', { token: token.substring(0, 10) + '...' });
      return true;
    } catch (error) {
      logger.error('Failed to add token to blacklist', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.fallbackAdd(token, expirationTime);
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.redisClient) {
        logger.warn('Redis not connected, using fallback blacklist');
        return this.fallbackHas(token);
      }

      const key = `blacklist:${token}`;
      const result = await this.redisClient.get(key);
      return result !== null;
    } catch (error) {
      logger.error('Failed to check token blacklist', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.fallbackHas(token);
    }
  }

  /**
   * Remove token from blacklist (for testing purposes)
   */
  async removeFromBlacklist(token: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.redisClient) {
        return this.fallbackDelete(token);
      }

      const key = `blacklist:${token}`;
      const result = await this.redisClient.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Failed to remove token from blacklist', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.fallbackDelete(token);
    }
  }

  /**
   * Clear all blacklisted tokens (for testing purposes)
   */
  async clearBlacklist(): Promise<void> {
    try {
      if (!this.isConnected || !this.redisClient) {
        this.fallbackClear();
        return;
      }

      const keys = await this.redisClient.keys('blacklist:*');
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      logger.error('Failed to clear blacklist', { error: error instanceof Error ? error.message : 'Unknown error' });
      this.fallbackClear();
    }
  }

  /**
   * Get blacklist statistics
   */
  async getBlacklistStats(): Promise<{ count: number; isRedisConnected: boolean }> {
    try {
      if (!this.isConnected || !this.redisClient) {
        return {
          count: this.fallbackSize(),
          isRedisConnected: false
        };
      }

      const keys = await this.redisClient.keys('blacklist:*');
      return {
        count: keys.length,
        isRedisConnected: true
      };
    } catch (error) {
      logger.error('Failed to get blacklist stats', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        count: this.fallbackSize(),
        isRedisConnected: false
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        this.isConnected = false;
      }
    } catch (error) {
      logger.error('Failed to close Redis connection', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Fallback in-memory blacklist methods
   */
  private fallbackAdd(token: string, expirationTime?: number): boolean {
    const exp = expirationTime || (Date.now() + 86400000); // Default 24 hours
    this.fallbackBlacklist.set(token, exp);
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return true;
  }

  private fallbackHas(token: string): boolean {
    const expTime = this.fallbackBlacklist.get(token);
    if (!expTime) return false;
    
    if (expTime < Date.now()) {
      this.fallbackBlacklist.delete(token);
      return false;
    }
    
    return true;
  }

  private fallbackDelete(token: string): boolean {
    return this.fallbackBlacklist.delete(token);
  }

  private fallbackClear(): void {
    this.fallbackBlacklist.clear();
  }

  private fallbackSize(): number {
    this.cleanupExpiredTokens();
    return this.fallbackBlacklist.size;
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [key, expTime] of this.fallbackBlacklist.entries()) {
      if (expTime < now) {
        this.fallbackBlacklist.delete(key);
      }
    }
  }
}