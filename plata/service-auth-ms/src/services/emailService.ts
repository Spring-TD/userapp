import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Email Service for sending notifications via notifications-ms
 */
export class EmailService {
  private notificationServiceUrl: string;

  constructor() {
    // Default to localhost:4009 for local development
    const baseUrl = process.env['NOTIFICATIONS_MS_URL'] || 'http://localhost:4009';
    this.notificationServiceUrl = `${baseUrl}/api/v1/notifications/send`;
  }

  /**
   * Generic method to send notification via microservice
   */
  private async sendNotification(recipient: string, template: string, data: any): Promise<boolean> {
    try {
      await axios.post(this.notificationServiceUrl, {
        channel: 'email',
        recipient,
        template,
        data
      });

      logger.info('Email notification request sent', {
        recipient,
        template,
        service: 'notifications-ms'
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to send email notification request', {
        error: error.message,
        recipient,
        template,
        url: this.notificationServiceUrl
      });

      // Fallback logging for development if service is unreachable
      if (process.env['NODE_ENV'] !== 'production') {
        logger.warn('Mock Email Fallback (Service Unreachable)', {
          recipient,
          template,
          data
        });
        return true; // Return true in dev so flow doesn't break
      }

      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    const resetUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    return this.sendNotification(email, 'password-reset', { userName, resetUrl });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(email: string, verificationToken: string, userName: string): Promise<boolean> {
    const verificationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    return this.sendNotification(email, 'email-verification', { userName, verificationUrl });
  }

  /**
   * Send password change notification email
   */
  async sendPasswordChangeNotification(email: string, userName: string): Promise<boolean> {
    return this.sendNotification(email, 'password-change', { userName });
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(email: string, invitationUrl: string, merchantName: string, roleName: string): Promise<boolean> {
    return this.sendNotification(email, 'invitation', { merchantName, roleName, invitationUrl });
  }
}

// Export singleton instance
export const emailService = new EmailService();
