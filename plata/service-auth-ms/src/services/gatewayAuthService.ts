import { mockDb } from '../utils/mockDatabase';
import { verifyApiKey } from '../utils/crypto';
import { ApiKeyStatus } from '../models/ApiKey';
import { IPWhitelistModel } from '../models/SAMS';
import { logger } from '../utils/logger';

export type GatewayVerifyResult =
  | {
      success: true;
      merchant_id: string;
      api_key_id: string;
      environment: string;
    }
  | { success: false; error: string };

/**
 * Validates merchant public/secret API key and optional IP allowlist (unified gateway checks).
 */
export class GatewayAuthService {
  static async verifyMerchantAccess(
    publicKey: string,
    secretKey: string,
    clientIp: string
  ): Promise<GatewayVerifyResult> {
    try {
      const trimmedPublic = publicKey.trim();
      const trimmedSecret = secretKey.trim();
      if (!trimmedPublic || !trimmedSecret) {
        return { success: false, error: 'Missing public or secret key' };
      }

      const record = await mockDb.findApiKeyByPublicKey(trimmedPublic);
      if (!record) {
        return { success: false, error: 'Invalid API key' };
      }

      if (record.status !== ApiKeyStatus.ACTIVE) {
        return { success: false, error: 'API key is not active' };
      }

      if (record.expires_at && new Date(record.expires_at) < new Date()) {
        return { success: false, error: 'API key has expired' };
      }

      // Prefer raw secret verification (new keys). Fall back to hash (legacy keys).
      const secretOk = record.secret_key
        ? trimmedSecret === record.secret_key
        : (record.secret_key_hash ? verifyApiKey(trimmedSecret, record.secret_key_hash) : false);

      if (!secretOk) return { success: false, error: 'Invalid secret key' };

      const ipOk = await IPWhitelistModel.isIPAllowedForMerchantGateway(record.merchant_id, clientIp);
      if (!ipOk) {
        logger.warn('Gateway IP denied', { merchantId: record.merchant_id, clientIp });
        return { success: false, error: 'IP address is not allowed for this merchant' };
      }

      return {
        success: true,
        merchant_id: record.merchant_id,
        api_key_id: record.id,
        environment: record.environment,
      };
    } catch (error) {
      logger.error('Gateway verify error', { error: error instanceof Error ? error.message : 'unknown' });
      return { success: false, error: 'Verification failed' };
    }
  }
}
