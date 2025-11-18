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

  constructor() {
    this.paymentServiceUrl = config.payment.serviceUrl;
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
}

export const paymentService = new PaymentService();
export default paymentService;
