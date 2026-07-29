import { Request, Response } from 'express';
import { MerchantRegistrationForm, UserRegistrationForm, AdminRegistrationForm } from '../types/forms';
import { merchantRegistrationSchema, userRegistrationSchema, adminRegistrationSchema, validateForm } from '../utils/validation';
import { AuthService, type UserRegistrationData } from '../services/AuthService';
import { normalizeUserRegistrationBody } from '../utils/registrationBody';
import { resolveTenantFromRequest } from '../utils/tenantHostResolver';

interface TypedRequest<T> extends Request {
  body: T;
}

export class RegistrationController {
  static async registerMerchant(req: TypedRequest<MerchantRegistrationForm>, res: Response): Promise<void> {
    try {
      const { error, value } = validateForm<MerchantRegistrationForm>(merchantRegistrationSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Generate user_merchant_id for merchant
      const merchantData = {
        ...value!,
        user_merchant_id: `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      const result = await AuthService.registerMerchant(merchantData);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error in registerMerchant controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async registerUser(req: TypedRequest<UserRegistrationForm>, res: Response): Promise<void> {
    try {
      let tenantMerchantId = (req.headers['x-tenant-merchant-id'] as string | undefined)?.trim() || '';
      let tenantAppId = (req.headers['x-tenant-app-id'] as string | undefined)?.trim() || '';
      let tenantAppName = (req.headers['x-tenant-app-name'] as string | undefined)?.trim() || '';

      if (!tenantMerchantId || !tenantAppId || !tenantAppName) {
        const resolved = await resolveTenantFromRequest(req);
        if (resolved) {
          if (!tenantMerchantId) {
            tenantMerchantId = resolved.merchantId;
          }
          if (!tenantAppId) {
            tenantAppId = resolved.appId;
          }
          if (!tenantAppName && resolved.appName) {
            tenantAppName = resolved.appName;
          }
        }
      }

      const normalizedBody = normalizeUserRegistrationBody(req.body);
      const bodyRecord = req.body as unknown as Record<string, unknown>;
      const bodyMerchantId =
        (typeof bodyRecord.merchant_id === 'string' && bodyRecord.merchant_id.trim()) ||
        (typeof bodyRecord.merchantId === 'string' && bodyRecord.merchantId.trim()) ||
        '';
      const payload: UserRegistrationForm = {
        ...normalizedBody,
        user_merchant_id:
          normalizedBody.user_merchant_id || bodyMerchantId || tenantMerchantId || ''
      };

      const { error, value } = validateForm<UserRegistrationForm>(userRegistrationSchema, payload);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const bodyAppId =
        (typeof bodyRecord.app_id === 'string' && bodyRecord.app_id.trim()) ||
        (typeof bodyRecord.appId === 'string' && bodyRecord.appId.trim()) ||
        '';
      const resolvedAppId = tenantAppId || bodyAppId;
      const registrationPayload: UserRegistrationData = {
        ...(value as UserRegistrationData),
        ...(resolvedAppId.length > 0 ? { app_id: resolvedAppId } : {}),
        ...(tenantAppName ? { appName: tenantAppName } : {})
      };

      const result = await AuthService.registerUser(registrationPayload);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error in registerUser controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async registerAdmin(req: TypedRequest<AdminRegistrationForm>, res: Response): Promise<void> {
    try {
      const { error, value } = validateForm<AdminRegistrationForm>(adminRegistrationSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const result = await AuthService.registerAdmin(value!);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error in registerAdmin controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getRegistrationForms(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        merchantForm: {
          fields: [
            { name: 'first_name', type: 'text', required: true, label: 'First Name' },
            { name: 'last_name', type: 'text', required: true, label: 'Last Name' },
            { name: 'email', type: 'email', required: true, label: 'Email Address' },
            { name: 'phone', type: 'tel', required: true, label: 'Phone Number' },
            { name: 'country', type: 'text', required: true, label: 'Country' },
            { name: 'password', type: 'password', required: true, label: 'Password' }
          ]
        },
        userForm: {
          fields: [
            { name: 'user_merchant_id', type: 'text', required: true, label: 'Merchant ID' },
            { name: 'first_name', type: 'text', required: true, label: 'First Name' },
            { name: 'last_name', type: 'text', required: true, label: 'Last Name' },
            { name: 'email', type: 'email', required: true, label: 'Email Address' },
            { name: 'phone', type: 'tel', required: true, label: 'Phone Number' },
            { name: 'country', type: 'text', required: true, label: 'Country' },
            { name: 'password', type: 'password', required: true, label: 'Password' }
          ]
        },
        adminForm: {
          fields: [
            { name: 'first_name', type: 'text', required: true, label: 'First Name' },
            { name: 'last_name', type: 'text', required: true, label: 'Last Name' },
            { name: 'email', type: 'email', required: true, label: 'Email Address' },
            { name: 'phone', type: 'tel', required: true, label: 'Phone Number' },
            { name: 'country', type: 'text', required: true, label: 'Country' },
            { name: 'password', type: 'password', required: true, label: 'Password' }
          ]
        }
      }
    });
  }
}