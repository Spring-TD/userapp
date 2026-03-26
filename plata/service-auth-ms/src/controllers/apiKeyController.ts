
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiKeyService } from '../services/apiKeyService';
import { ApiKey, ApiKeyEnvironment, CreateApiKeyRequest } from '../models/ApiKey';
import { logger } from '../utils/logger';
import { validateInput } from '../utils/validation';

// Validation schemas
const createApiKeySchema = Joi.object({
    name: Joi.string().optional().min(3).max(50),
    environment: Joi.string().valid(ApiKeyEnvironment.TEST, ApiKeyEnvironment.LIVE).optional(),
    permissions: Joi.array().items(Joi.string()).optional(),
    expires_in_days: Joi.number().integer().min(1).max(365).optional()
});

const bootstrapApiKeySchema = Joi.object({
    merchantId: Joi.string().required().min(3).max(100),
    name: Joi.string().required().min(3).max(50),
    environment: Joi.string().valid(ApiKeyEnvironment.TEST, ApiKeyEnvironment.LIVE).required(),
    permissions: Joi.array().items(Joi.string()).optional(),
    expires_in_days: Joi.number().integer().min(1).max(365).optional()
});

export class ApiKeyController {
    private static isMerchantOrAdmin(userType?: string): boolean {
        const normalized = (userType || '').toLowerCase();
        return normalized === 'merchant' || normalized === 'admin';
    }

    /**
     * POST /api/v1/keys
     * Create a new API key pair
     */
    static async createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || !ApiKeyController.isMerchantOrAdmin(req.user.userType)) {
                res.status(403).json({
                    success: false,
                    error: 'Only merchants can create API keys'
                });
                return;
            }

            // Validate input
            const { error, value } = validateInput<CreateApiKeyRequest>(createApiKeySchema, req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error
                });
                return;
            }

            // Set default values if not provided
            const createRequest: CreateApiKeyRequest = {
                name: value?.name || `key-${Date.now()}`,
                environment: value?.environment || ApiKeyEnvironment.LIVE,
                permissions: value?.permissions ?? ['read'],
                expires_in_days: value?.expires_in_days ?? 90
            };

            const result = await ApiKeyService.createApiKey(req.user.userId, createRequest);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
                return;
            }

            res.status(201).json({
                success: true,
                message: 'API Key created successfully. Store the secret key safely, it will not be shown again.',
                data: {
                    apiKey: result.apiKey,
                    secretKey: result.secretKey // Only returned once!
                }
            });
        } catch (error) {
            logger.error('Error in createApiKey controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }

    /**
     * GET /api/v1/keys
     * List all API keys
     */
    static async getApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || !ApiKeyController.isMerchantOrAdmin(req.user.userType)) {
                res.status(403).json({
                    success: false,
                    error: 'Only merchants can view their API keys'
                });
                return;
            }

            const result = await ApiKeyService.getApiKeys(req.user.userId);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
                return;
            }

            const safeKeys = result.apiKeys?.map(k => {
                const safe: Partial<ApiKey> = { ...k };
                delete safe.secret_key_hash;
                return safe;
            });

            res.status(200).json({
                success: true,
                data: {
                    apiKeys: safeKeys
                }
            });
        } catch (error) {
            logger.error('Error in getApiKeys controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }

    /**
     * DELETE /api/v1/keys/:keyId
     * Revoke an API key
     */
    static async revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || !ApiKeyController.isMerchantOrAdmin(req.user.userType)) {
                res.status(403).json({
                    success: false,
                    error: 'Only merchants can revoke API keys'
                });
                return;
            }

            const keyId = req.params['keyId'];
            if (!keyId) {
                res.status(400).json({
                    success: false,
                    error: 'API Key ID is required'
                });
                return;
            }

            const result = await ApiKeyService.revokeApiKey(req.user.userId, keyId);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'API Key revoked successfully'
            });
        } catch (error) {
            logger.error('Error in revokeApiKey controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }

    /**
     * POST /internal/api/v1/keys/bootstrap
     * Create a default API key pair for a merchant after signup.
     * Idempotent by merchant + name + environment for active keys.
     */
    static async bootstrapMerchantApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { error, value } = validateInput<{
                merchantId: string;
                name: string;
                environment: ApiKeyEnvironment;
                permissions?: string[];
                expires_in_days?: number;
            }>(bootstrapApiKeySchema, req.body);

            if (error || !value) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error
                });
                return;
            }

            const existing = await ApiKeyService.getApiKeys(value.merchantId);
            if (existing.success && existing.apiKeys) {
                const duplicate = existing.apiKeys.find((k) =>
                    k.environment === value.environment &&
                    k.name === value.name &&
                    k.status === 'active'
                );
                if (duplicate) {
                    const safeApiKey: Partial<ApiKey> = { ...duplicate };
                    delete safeApiKey.secret_key_hash;
                    res.status(200).json({
                        success: true,
                        message: 'Bootstrap API key already exists for this merchant/environment',
                        data: {
                            apiKey: safeApiKey,
                            secretKey: null
                        }
                    });
                    return;
                }
            }

            const createRequest: CreateApiKeyRequest = {
                name: value.name,
                environment: value.environment,
            };
            if (value.permissions !== undefined) {
                createRequest.permissions = value.permissions;
            }
            if (value.expires_in_days !== undefined) {
                createRequest.expires_in_days = value.expires_in_days;
            }

            const result = await ApiKeyService.createApiKey(value.merchantId, createRequest);
            if (!result.success || !result.apiKey) {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Failed to bootstrap API key'
                });
                return;
            }

            const safeApiKey: Partial<ApiKey> = { ...result.apiKey };
            delete safeApiKey.secret_key_hash;
            res.status(201).json({
                success: true,
                message: 'Bootstrap API key created successfully. Store the secret key safely; it will not be shown again.',
                data: {
                    apiKey: safeApiKey,
                    secretKey: result.secretKey || null
                }
            });
        } catch (error) {
            logger.error('Error in bootstrapMerchantApiKey controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }
}
