import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { User, Merchant } from '../models/User';

/**
 * Payment Service
 * Handles communication with payment-ms for record creation
 */
class PaymentService {
  private paymentServiceUrl: string;
  private billingServiceUrl: string;

  constructor() {
    this.paymentServiceUrl = config.payment.serviceUrl;
    this.billingServiceUrl = config.billing.serviceUrl;
  }

  /**
   * Notify payment-ms to create a record after successful account verification
   */
  async createRecordAfterVerification(user: User | Merchant): Promise<boolean> {
    try {
      logger.info('Notifying payment service to create record', {
        userId: user.id,
        email: user.email,
        userType: user.user_type
      });

      const payload = {
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type === 'merchant' ? 'MERCHANT' : 'USER',
        userMerchantId: user.user_merchant_id,
        country: user.country,
        phone: user.phone,
        verifiedAt: new Date().toISOString(),
        metadata: {
          emailVerified: user.email_verified,
          phoneVerified: user.phone_verified,
          status: user.status
        }
      };

      const response = await axios.post(
        `${this.paymentServiceUrl}/api/v1/records/webhook/create`,
        payload,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        logger.info('Record created successfully in payment service', {
          userId: user.id,
          recordId: response.data.data?.record?.recordId
        });
        return true;
      } else {
        logger.error('Failed to create record in payment service', {
          userId: user.id,
          error: response.data.error
        });
        return false;
      }
    } catch (error) {
      logger.error('Error calling payment service webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
        paymentServiceUrl: this.paymentServiceUrl
      });
      // Don't fail the verification if payment service is down
      // This is a non-blocking operation
      return false;
    }
  }

  /**
   * Pause all active subscriptions (recurring billings) for a user
   */
  async pauseUserSubscriptions(userId: string): Promise<{ success: boolean; pausedCount: number; errors: string[] }> {
    try {
      logger.info('Pausing subscriptions for user', { userId });

      // 1. Get all recurring billings for the user
      const response = await axios.get(
        `${this.billingServiceUrl}/api/v1/billing/recurring-billings`,
        {
          params: { billTo: userId },
          timeout: 5000
        }
      );

      if (!response.data.success) {
        throw new Error('Failed to fetch recurring billings');
      }

      const billings = response.data.data || [];
      const activeBillings = billings.filter((b: any) => b.status === 'active');

      let pausedCount = 0;
      const errors: string[] = [];

      // 2. Pause each active billing
      for (const billing of activeBillings) {
        try {
          await axios.post(
            `${this.billingServiceUrl}/api/v1/billing/recurring-billings/${billing.id}/pause`,
            {},
            { timeout: 5000 }
          );
          pausedCount++;
        } catch (err: any) {
          logger.error(`Failed to pause billing ${billing.id}`, { error: err.message });
          errors.push(`Failed to pause billing ${billing.id}: ${err.message}`);
        }
      }

      return {
        success: errors.length === 0,
        pausedCount,
        errors
      };

    } catch (error) {
      logger.error('Error pausing user subscriptions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        billingServiceUrl: this.billingServiceUrl
      });
      return {
        success: false,
        pausedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
