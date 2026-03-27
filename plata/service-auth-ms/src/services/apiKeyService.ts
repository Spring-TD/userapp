
import { v4 as uuidv4 } from 'uuid';
import { mockDb } from '../utils/mockDatabase';
import { ApiKey, ApiKeyStatus, CreateApiKeyRequest, ApiKeyEnvironment } from '../models/ApiKey';
<<<<<<< HEAD
import { generateApiKeyPair } from '../utils/crypto';
=======
import { generateApiKeyPair, hashApiKey } from '../utils/crypto';
>>>>>>> 2cce30eb1fb2f3fe3d777aee3fbca61844c4c49d
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
            // Ensure environment has a valid value (default to LIVE)
            const environment = request.environment ?? ApiKeyEnvironment.LIVE;
            const { publicKey, secretKey } = generateApiKeyPair(environment);
<<<<<<< HEAD
=======
            const secretKeyHash = hashApiKey(secretKey);
>>>>>>> 2cce30eb1fb2f3fe3d777aee3fbca61844c4c49d
            const now = new Date();

            // Auto-set expiration: use provided expires_in_days or default to 90 days
            const expiresInDays = request.expires_in_days ?? 90;
            const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

            // Ensure name has a valid value (generate default if not provided)
            const name = request.name ?? `key-${Date.now()}`;

            const apiKey: ApiKey = {
                id: uuidv4(),
                merchant_id: merchantId,
                name: name,
                public_key: publicKey,
<<<<<<< HEAD
                secret_key: secretKey,
=======
                secret_key_hash: secretKeyHash,
>>>>>>> 2cce30eb1fb2f3fe3d777aee3fbca61844c4c49d
                environment: environment,
                status: ApiKeyStatus.ACTIVE,
                permissions: request.permissions ?? ['read'],
                created_at: now,
                updated_at: now,
                expires_at: expiresAt
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
