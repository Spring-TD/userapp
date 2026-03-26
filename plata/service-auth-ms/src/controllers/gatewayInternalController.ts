import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validateInput } from '../utils/validation';
import { GatewayAuthService } from '../services/gatewayAuthService';
import { IPWhitelistModel } from '../models/SAMS';
import type { IPWhitelist } from '../types/samsTypes';
import { logger } from '../utils/logger';

const verifyBodySchema = Joi.object({
  public_key: Joi.string().required().min(10).max(200),
  secret_key: Joi.string().required().min(10).max(300),
  client_ip: Joi.string().required().max(100),
});

const merchantIpWhitelistSchema = Joi.object({
  ip_addresses: Joi.array().items(Joi.string().required()).min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
});

export class GatewayInternalController {
  /**
   * POST /internal/api/v1/gateway/verify
   * Called by account-ms gateway: validate pk/sk + merchant IP policy.
   */
  static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = validateInput<{
        public_key: string;
        secret_key: string;
        client_ip: string;
      }>(verifyBodySchema, req.body);

      if (error || !value) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const result = await GatewayAuthService.verifyMerchantAccess(
        value.public_key,
        value.secret_key,
        value.client_ip.trim()
      );

      if (!result.success) {
        res.status(401).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          merchant_id: result.merchant_id,
          api_key_id: result.api_key_id,
          environment: result.environment,
        },
      });
    } catch (err) {
      logger.error('gateway verify controller', { err });
      next(err);
    }
  }

  /**
   * POST /internal/api/v1/gateway/merchants/:merchantId/ip-whitelist
   * Register IPs allowed to use merchant API keys through the gateway.
   */
  static async addMerchantIpWhitelist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = req.params['merchantId'];
      if (!merchantId) {
        res.status(400).json({ success: false, error: 'merchantId is required' });
        return;
      }

      const { error, value } = validateInput<{ ip_addresses: string[]; description?: string }>(
        merchantIpWhitelistSchema,
        req.body
      );

      if (error || !value) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const serviceId = IPWhitelistModel.merchantGatewayServiceId(merchantId);
      const created: unknown[] = [];

      for (const ip of value.ip_addresses) {
        const row: Omit<IPWhitelist, 'id' | 'created_at' | 'updated_at'> = {
          service_id: serviceId.trim(),
          ip_address: ip.trim(),
          is_active: true,
        };
        if (value.description !== undefined) {
          row.description = value.description;
        }
        const entry = await IPWhitelistModel.create(row);
        created.push(entry);
      }

      res.status(201).json({
        success: true,
        message: `${created.length} IP address(es) whitelisted for merchant gateway`,
        data: { entries: created },
      });
    } catch (err) {
      logger.error('addMerchantIpWhitelist', { err });
      next(err);
    }
  }
}
