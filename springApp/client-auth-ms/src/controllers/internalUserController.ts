import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { db } from '../utils/mongoDatabase';

export class InternalUserController {
  static async getUserPhone(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.params.userId || '').trim();
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      const user = await AuthService.getUserById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const phone = user.phone?.trim();
      if (!phone) {
        res.status(404).json({ success: false, error: 'Phone number is not set on user profile' });
        return;
      }

      res.status(200).json({
        success: true,
        phone
      });
    } catch (error) {
      console.error('Error in internal getUserPhone:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async getApplicantName(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.params.userId || '').trim();
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      const user = await AuthService.getUserById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      const emailPrefix = user.email?.split('@')[0]?.replace(/[._+-]+/g, ' ').trim();
      const applicantName = fullName || emailPrefix;
      if (!applicantName) {
        res.status(404).json({ success: false, error: 'Applicant name is not available for this user' });
        return;
      }

      res.status(200).json({
        success: true,
        applicantName
      });
    } catch (error) {
      console.error('Error in internal getApplicantName:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async getMerchantOwnerByTenantId(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = String(req.params.merchantId || '').trim();
      if (!merchantId) {
        res.status(400).json({ success: false, error: 'merchantId is required' });
        return;
      }

      const owner = await db.findMerchantOwnerByTenantMerchantId(merchantId);
      if (!owner) {
        res.status(404).json({ success: false, error: 'Merchant owner not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          userId: owner.id,
          email: owner.email,
          firstName: owner.first_name,
          lastName: owner.last_name
        }
      });
    } catch (error) {
      console.error('Error in internal getMerchantOwnerByTenantId:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async getAppCustomerCount(req: Request, res: Response): Promise<void> {
    try {
      const appId = String(req.params.appId || '').trim();
      if (!appId) {
        res.status(400).json({ success: false, error: 'appId is required' });
        return;
      }

      const customerCount = await db.countRetailCustomersByAppId(appId);

      res.status(200).json({
        success: true,
        data: {
          appId,
          customerCount
        }
      });
    } catch (error) {
      console.error('Error in internal getAppCustomerCount:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async getInternalProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.params.userId || '').trim();
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      const user = await AuthService.getUserById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const kycSummary = await AuthService.resolveKycSummary(user);

      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          userType: user.user_type,
          status: user.status,
          emailVerified: user.email_verified,
          phoneVerified: user.phone_verified,
          country: 'country' in user ? user.country : undefined,
          appId: 'app_id' in user ? user.app_id : undefined,
          profilePictureUrl: 'profile_picture_url' in user ? user.profile_picture_url : undefined,
          lastLoginAt: user.last_login_at?.toISOString?.() ?? user.last_login_at,
          kycStatus: kycSummary?.kycStatus,
          kycCompleted: kycSummary?.kycCompleted ?? false
        }
      });
    } catch (error) {
      console.error('Error in internal getInternalProfile:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async listAppRetailCustomers(req: Request, res: Response): Promise<void> {
    try {
      const appId = String(req.params.appId || '').trim();
      if (!appId) {
        res.status(400).json({ success: false, error: 'appId is required' });
        return;
      }

      const customers = await db.listRetailCustomersByAppId(appId);
      res.status(200).json({
        success: true,
        data: { appId, customers }
      });
    } catch (error) {
      console.error('Error in internal listAppRetailCustomers:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
