import { INotification } from '../models/Notification';
import { mockDb } from '../utils/mockDatabase';
import emailService from './emailService';
import smsService from './smsService';
import templateService from './templateService';
import { SendNotificationRequest, NotificationResponse, NotificationStatus } from '../types/notification';
import { ApiError } from '../middleware/errorHandler';

export class NotificationService {
  /**
   * Send notification
   */
  async send(request: SendNotificationRequest): Promise<NotificationResponse> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Create notification record (status: 'pending')
      const notification = await mockDb.createNotification({
        channel: request.channel,
        recipient: request.recipient,
        template: request.template,
        data: request.data,
        status: 'pending',
        retryCount: 0
      });

      // 3. Load and render template
      let renderedContent: { html?: string; text?: string; message?: string };
      let subject: string | undefined;

      if (request.channel === 'email') {
        const emailTemplate = templateService.getEmailTemplate(request.template, request.data);
        renderedContent = {
          html: emailTemplate.html,
          text: emailTemplate.text
        };
        subject = templateService.getEmailSubject(request.template, request.data);
      } else {
        const smsTemplate = templateService.getSMSTemplate(request.template, request.data);
        renderedContent = {
          message: smsTemplate
        };
      }

      // 4. Send via appropriate channel
      let success = false;
      let error: string | undefined;

      try {
        if (request.channel === 'email') {
          if (!emailService.isEmailEnabled()) {
            throw new Error('Email service is not configured');
          }
          success = await emailService.sendEmail({
            to: request.recipient,
            subject: subject!,
            html: renderedContent.html!,
            text: renderedContent.text
          });
        } else {
          if (!smsService.isSMSEnabled()) {
            throw new Error('SMS service is not configured');
          }
          success = await smsService.sendSMS({
            to: request.recipient,
            message: renderedContent.message!
          });
        }

        // 5. Update record status
        if (success) {
          await mockDb.updateNotification(notification.id, {
            status: 'sent',
            sentAt: new Date()
          });
        } else {
          await mockDb.updateNotification(notification.id, {
            status: 'failed',
            error: 'Failed to send notification',
            retryCount: notification.retryCount + 1
          });
        }
      } catch (sendError: any) {
        error = sendError.message;
        await mockDb.updateNotification(notification.id, {
          status: 'failed',
          error: error,
          retryCount: notification.retryCount + 1
        });
      }

      // 6. Return response
      if (success) {
        return {
          success: true,
          id: notification.id,
          message: 'Notification sent successfully'
        };
      } else {
        return {
          success: false,
          id: notification.id,
          error: error || 'Failed to send notification'
        };
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(id: string): Promise<INotification | null> {
    try {
      const notification = await mockDb.findNotificationById(id);
      return notification;
    } catch (error: any) {
      throw new ApiError(500, `Failed to get notification status: ${error.message}`);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(recipient: string, limit: number = 50, offset: number = 0): Promise<{
    notifications: INotification[];
    total: number;
  }> {
    try {
      const allNotifications = await mockDb.findNotificationsByRecipient(recipient);
      const total = allNotifications.length;
      const notifications = allNotifications.slice(offset, offset + limit);

      return { notifications, total };
    } catch (error: any) {
      throw new ApiError(500, `Failed to get user notifications: ${error.message}`);
    }
  }

  /**
   * Get all notifications (admin)
   */
  async getAllNotifications(limit: number = 50, offset: number = 0): Promise<{
    notifications: INotification[];
    total: number;
  }> {
    try {
      const allNotifications = await mockDb.getAllNotifications();
      const total = allNotifications.length;
      const notifications = allNotifications.slice(offset, offset + limit);

      return { notifications, total };
    } catch (error: any) {
      throw new ApiError(500, `Failed to get notifications: ${error.message}`);
    }
  }

  /**
   * Validate notification request
   */
  private validateRequest(request: SendNotificationRequest): void {
    if (!request.channel || !['email', 'sms'].includes(request.channel)) {
      throw new ApiError(400, 'Invalid channel. Must be "email" or "sms"');
    }

    if (!request.recipient || request.recipient.trim() === '') {
      throw new ApiError(400, 'Recipient is required');
    }

    // Basic email validation
    if (request.channel === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.recipient)) {
        throw new ApiError(400, 'Invalid email address');
      }
    }

    // Basic phone validation (simple check)
    if (request.channel === 'sms') {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(request.recipient.replace(/[\s-]/g, ''))) {
        throw new ApiError(400, 'Invalid phone number');
      }
    }

    if (!request.template || request.template.trim() === '') {
      throw new ApiError(400, 'Template is required');
    }

    if (!request.data || typeof request.data !== 'object') {
      throw new ApiError(400, 'Data must be an object');
    }
  }
}

export default new NotificationService();

