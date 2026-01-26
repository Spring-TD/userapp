
import { v4 as uuidv4 } from 'uuid';
import { mockDb } from '../utils/mockDatabase';
import { ApiKey, ApiKeyStatus, CreateApiKeyRequest } from '../models/ApiKey';
import { generateApiKeyPair, hashApiKey } from '../utils/crypto';
import { logger } from '../utils/logger';

export class ApiKeyService {
    /**
     * Create a new API key pair
     */
    static async createApiKey(merchantId: string, request: CreateApiKeyRequest): Promise<{
        success: boolean;
        apiKey?: ApiKey;
        secretKey?: string;
        error?: string
    }> {
        try {
            const { publicKey, secretKey } = generateApiKeyPair(request.environment);
            const secretKeyHash = hashApiKey(secretKey);
            const now = new Date();

            let expiresAt: Date | undefined;
            if (request.expires_in_days) {
                expiresAt = new Date(now.getTime() + request.expires_in_days * 24 * 60 * 60 * 1000);
            }

            const apiKey: ApiKey = {
                id: uuidv4(),
                merchant_id: merchantId,
                name: request.name,
                public_key: publicKey,
                secret_key_hash: secretKeyHash,
                environment: request.environment,
                status: ApiKeyStatus.ACTIVE,
                permissions: request.permissions || [],
                created_at: now,
                updated_at: now,
                ...(expiresAt ? { expires_at: expiresAt } : {})
            };

            await mockDb.createApiKey(apiKey);

            logger.info('API Key created successfully', {
                apiKeyId: apiKey.id,
                merchantId: merchantId,
                environment: apiKey.environment
            });

            // Return the raw secret key only once!
            return {
                success: true,
                apiKey,
                secretKey
            };
        } catch (error) {
            logger.error('Error creating API key', { error: error instanceof Error ? error.message : 'Unknown error' });
            return {
                success: false,
                error: 'Internal server error while creating API key'
            };
        }
    }

    /**
     * Get all API keys for a merchant
     */
    static async getApiKeys(merchantId: string): Promise<{ success: boolean; apiKeys?: ApiKey[]; error?: string }> {
        try {
            const apiKeys = await mockDb.findApiKeysByMerchantId(merchantId);

            // Don't return secret hash in list view if not needed, but model implies it's there. 
            // It's safe to return the hash, but useless to the user.

            return {
                success: true,
                apiKeys
            };
        } catch (error) {
            logger.error('Error getting API keys', { error: error instanceof Error ? error.message : 'Unknown error' });
            return {
                success: false,
                error: 'Internal server error while retrieving API keys'
            };
        }
    }

    /**
     * Revoke an API key
     */
    static async revokeApiKey(merchantId: string, apiKeyId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const apiKey = await mockDb.findApiKeyById(apiKeyId);

            if (!apiKey) {
                return { success: false, error: 'API key not found' };
            }

            if (apiKey.merchant_id !== merchantId) {
                return { success: false, error: 'Unauthorized to revoke this API key' };
            }

            await mockDb.updateApiKey(apiKeyId, {
                status: ApiKeyStatus.REVOKED
            });

            logger.info('API Key revoked', { apiKeyId, merchantId });

            return { success: true };
        } catch (error) {
            logger.error('Error revoking API key', { error: error instanceof Error ? error.message : 'Unknown error' });
            return {
                success: false,
                error: 'Internal server error while revoking API key'
            };
        }
    }
}
