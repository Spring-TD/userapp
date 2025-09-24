export declare class RedisCacheService {
    private redisClient;
    private isConnected;
    private cacheTtl;
    private fallbackCache;
    constructor(ttl?: number);
    private initializeRedis;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    getStats(): Promise<{
        count: number;
        isRedisConnected: boolean;
    }>;
    private fallbackGet;
    private fallbackSet;
    private fallbackDelete;
    private fallbackClear;
    private fallbackSize;
    private cleanupExpiredEntries;
}
export declare const redisCacheService: RedisCacheService;
//# sourceMappingURL=RedisCacheService.d.ts.map