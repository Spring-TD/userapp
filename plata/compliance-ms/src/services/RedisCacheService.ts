/**
 * In-memory cache service (Redis disabled).
 * Same API as before for compatibility; uses only in-memory storage.
 */
export class RedisCacheService {
  private cacheTtl = 3600; // Default TTL in seconds (1 hour)
  private fallbackCache = new Map<string, { value: any; expiration: number }>();

  constructor(ttl?: number) {
    this.cacheTtl = ttl || this.cacheTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.fallbackGet(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    return this.fallbackSet(key, value, ttl);
  }

  async delete(key: string): Promise<boolean> {
    return this.fallbackDelete(key);
  }

  async clear(): Promise<void> {
    this.fallbackClear();
  }

  async getStats(): Promise<{ count: number; isRedisConnected: boolean }> {
    this.cleanupExpiredEntries();
    return {
      count: this.fallbackCache.size,
      isRedisConnected: false
    };
  }

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
    this.cleanupExpiredEntries();
    return true;
  }

  private fallbackDelete(key: string): boolean {
    return this.fallbackCache.delete(key);
  }

  private fallbackClear(): void {
    this.fallbackCache.clear();
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const entries = Array.from(this.fallbackCache.entries());
    for (const [key, entry] of entries) {
      if (entry.expiration < now) {
        this.fallbackCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();
