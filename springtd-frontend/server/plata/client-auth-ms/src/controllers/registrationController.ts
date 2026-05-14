import { Request, Response } from 'express';
import { MerchantRegistrationForm, UserRegistrationForm, AdminRegistrationForm } from '../types/forms';
import { merchantRegistrationSchema, userRegistrationSchema, adminRegistrationSchema, validateForm } from '../utils/validation';
import { AuthService } from '../services/AuthService';

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
      const { error, value } = validateForm<UserRegistrationForm>(userRegistrationSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const result = await AuthService.registerUser(value!);

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