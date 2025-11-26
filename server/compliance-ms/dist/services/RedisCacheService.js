"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisCacheService = exports.RedisCacheService = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
class RedisCacheService {
    constructor(ttl) {
        this.redisClient = null;
        this.isConnected = false;
        this.cacheTtl = 3600;
        this.fallbackCache = new Map();
        this.cacheTtl = ttl || this.cacheTtl;
        this.initializeRedis().catch(error => {
            logger_1.logger.error('Failed to initialize Redis during construction', { error });
        });
    }
    async initializeRedis() {
        try {
            const redisUrl = process.env.REDIS_URL;
            if (!redisUrl) {
                logger_1.logger.warn('REDIS_URL not configured, Redis cache will not be available');
                return;
            }
            this.redisClient = (0, redis_1.createClient)({
                url: redisUrl,
                password: process.env.REDIS_PASSWORD || undefined,
            });
            this.redisClient.on('error', (err) => {
                logger_1.logger.error('Redis connection error', { error: err.message });
                this.isConnected = false;
            });
            this.redisClient.on('connect', () => {
                logger_1.logger.info('Redis connected successfully');
                this.isConnected = true;
            });
            this.redisClient.on('disconnect', () => {
                logger_1.logger.warn('Redis disconnected');
                this.isConnected = false;
            });
            await this.redisClient.connect();
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Redis', { error: error instanceof Error ? error.message : 'Unknown error' });
            this.isConnected = false;
        }
    }
    async get(key) {
        try {
            if (!this.isConnected || !this.redisClient) {
                logger_1.logger.warn('Redis not connected, using in-memory cache');
                return this.fallbackGet(key);
            }
            const data = await this.redisClient.get(key);
            if (!data || typeof data !== 'string')
                return null;
            return JSON.parse(data);
        }
        catch (error) {
            logger_1.logger.error('Failed to get from cache', { error: error instanceof Error ? error.message : 'Unknown error' });
            return this.fallbackGet(key);
        }
    }
    async set(key, value, ttl) {
        try {
            if (!this.isConnected || !this.redisClient) {
                logger_1.logger.warn('Redis not connected, using in-memory cache');
                return this.fallbackSet(key, value, ttl);
            }
            const expiration = ttl || this.cacheTtl;
            await this.redisClient.setEx(key, expiration, JSON.stringify(value));
            logger_1.logger.debug('Data cached successfully', { key });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to set cache', { error: error instanceof Error ? error.message : 'Unknown error' });
            return this.fallbackSet(key, value, ttl);
        }
    }
    async delete(key) {
        try {
            if (!this.isConnected || !this.redisClient) {
                logger_1.logger.warn('Redis not connected, using in-memory cache');
                return this.fallbackDelete(key);
            }
            const result = await this.redisClient.del(key);
            return result > 0;
        }
        catch (error) {
            logger_1.logger.error('Failed to delete cache', { error: error instanceof Error ? error.message : 'Unknown error' });
            return this.fallbackDelete(key);
        }
    }
    async clear() {
        try {
            if (!this.isConnected || !this.redisClient) {
                this.fallbackClear();
                return;
            }
            const keys = await this.redisClient.keys('*');
            if (keys.length > 0) {
                await this.redisClient.del(keys);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to clear cache', { error: error instanceof Error ? error.message : 'Unknown error' });
            this.fallbackClear();
        }
    }
    async getStats() {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get cache stats', { error: error instanceof Error ? error.message : 'Unknown error' });
            return {
                count: this.fallbackSize(),
                isRedisConnected: false
            };
        }
    }
    fallbackGet(key) {
        const entry = this.fallbackCache.get(key);
        if (!entry)
            return null;
        if (entry.expiration < Date.now()) {
            this.fallbackCache.delete(key);
            return null;
        }
        return entry.value;
    }
    fallbackSet(key, value, ttl) {
        const exp = ttl ? Date.now() + (ttl * 1000) : Date.now() + (this.cacheTtl * 1000);
        this.fallbackCache.set(key, { value, expiration: exp });
        this.cleanupExpiredEntries();
        return true;
    }
    fallbackDelete(key) {
        return this.fallbackCache.delete(key);
    }
    fallbackClear() {
        this.fallbackCache.clear();
    }
    fallbackSize() {
        this.cleanupExpiredEntries();
        return this.fallbackCache.size;
    }
    cleanupExpiredEntries() {
        const now = Date.now();
        const expiredKeys = [];
        const entries = Array.from(this.fallbackCache.entries());
        for (const [key, entry] of entries) {
            if (entry.expiration < now) {
                expiredKeys.push(key);
            }
        }
        for (const key of expiredKeys) {
            this.fallbackCache.delete(key);
        }
    }
}
exports.RedisCacheService = RedisCacheService;
exports.redisCacheService = new RedisCacheService();
//# sourceMappingURL=RedisCacheService.js.map