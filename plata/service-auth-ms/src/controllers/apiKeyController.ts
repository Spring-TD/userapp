
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiKeyService } from '../services/apiKeyService';
import { ApiKeyEnvironment, CreateApiKeyRequest } from '../models/ApiKey';
import { logger } from '../utils/logger';
import { validateInput } from '../utils/validation';

// Validation schemas
const createApiKeySchema = Joi.object({
    name: Joi.string().required().min(3).max(50),
    environment: Joi.string().valid(ApiKeyEnvironment.TEST, ApiKeyEnvironment.LIVE).required(),
    permissions: Joi.array().items(Joi.string()).optional(),
    expires_in_days: Joi.number().integer().min(1).max(365).optional()
});

export class ApiKeyController {
    /**
     * POST /api/v1/keys
     * Create a new API key pair
     */
    static async createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || req.user.userType !== 'merchant') {
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

            const result = await ApiKeyService.createApiKey(req.user.userId, value!);

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
            if (!req.user || req.user.userType !== 'merchant') {
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

            // Remove secret_key_hash from response to keep it clean, though strictly not a security risk if hash is strong
            const safeKeys = result.apiKeys?.map(k => {
                const { secret_key_hash, ...rest } = k;
                return rest;
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
            if (!req.user || req.user.userType !== 'merchant') {
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
}
