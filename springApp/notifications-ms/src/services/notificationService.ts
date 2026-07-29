import { INotification } from '../models/Notification';
import { notificationDbMongo as mockDb } from '../utils/notificationDbMongo';
import emailService from './emailService';
import smsService from './smsService';
import templateService from './templateService';
import webPushService from './webPushService';
import {
  SendNotificationRequest,
  NotificationResponse,
  SendEmailAndInAppRequest,
  SendEmailAndInAppResponse,
  NotificationChannel
} from '../types/notification';
import { ApiError } from '../middleware/errorHandler';
import { inboxRealtimeHub } from '../realtime/inboxRealtimeHub';
import { serializeInboxItem } from '../utils/inboxSerializer';

export class NotificationService {
  private getSenderName(data: Record<string, any>): string | undefined {
    const appName = data?.appName;
    return typeof appName === 'string' && appName.trim() ? appName.trim() : undefined;
  }

  /**
   * Send in-app notification: persists rendered title/body; optionally sends Web Push (VAPID).
   */
  private async sendInApp(
    request: SendNotificationRequest,
    options?: { skipWebPush?: boolean }
  ): Promise<NotificationResponse> {
    const notification = await mockDb.createNotification({
      channel: 'in_app',
      recipient: request.recipient,
      template: request.template,
      data: request.data,
      status: 'pending',
      retryCount: 0
    });

    try {
      const payload = templateService.getInAppPayload(request.template, request.data);
      const mergedData = {
        ...request.data,
        inAppTitle: payload.title,
        inAppBody: payload.body
      };
      await mockDb.updateNotification(notification.id, {
        data: mergedData,
        status: 'sent',
        sentAt: new Date()
      });

      const saved = await mockDb.findNotificationById(notification.id);
      if (saved) {
        inboxRealtimeHub.publish(request.recipient, {
          type: 'notification.new',
          notification: serializeInboxItem(saved)
        });
        const unreadCount = await mockDb.countUnreadInApp(request.recipient);
        inboxRealtimeHub.publish(request.recipient, {
          type: 'inbox.unread_count',
          unreadCount
        });
      }

      if (!options?.skipWebPush) {
        const pushResult = await webPushService.sendToUser({
          userId: request.recipient,
          title: payload.title,
          body: payload.body,
          template: request.template,
          url: '/notifications',
          data: {
            userId: request.recipient,
            template: request.template
          }
        });
        if (!pushResult.success && pushResult.sentCount === 0 && pushResult.error) {
          console.warn(
            `[notificationService] Web Push skipped/failed for ${request.recipient}:`,
            pushResult.error
          );
        }
      }

      return {
        success: true,
        id: notification.id,
        message: 'In-app notification saved'
      };
    } catch (err: any) {
      await mockDb.updateNotification(notification.id, {
        status: 'failed',
        error: err.message || 'Failed to render in-app template',
        retryCount: notification.retryCount + 1
      });
      return {
        success: false,
        id: notification.id,
        error: err.message || 'Failed to save in-app notification'
      };
    }
  }

  /**
   * Send notification (email, sms, or in_app).
   */
  async send(request: SendNotificationRequest): Promise<NotificationResponse> {
    try {
      this.validateRequest(request);

      if (request.channel === 'in_app') {
        return await this.sendInApp(request);
      }

      const notification = await mockDb.createNotification({
        channel: request.channel,
        recipient: request.recipient,
        template: request.template,
        data: request.data,
        status: 'pending',
        retryCount: 0
      });

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
            text: renderedContent.text,
            fromName: this.getSenderName(request.data)
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
   * Send the same template + data as in-app and optionally email.
   */
  async sendEmailAndInApp(request: SendEmailAndInAppRequest): Promise<SendEmailAndInAppResponse> {
    const base = {
      template: request.template,
      data: request.data,
      priority: request.priority
    };

    const inAppResult = await this.sendInApp(
      {
        channel: 'in_app',
        recipient: request.userId,
        ...base
      },
      { skipWebPush: request.skipWebPush }
    );

    const emailAddress = request.email?.trim();
    let emailResult: NotificationResponse | undefined;
    if (emailAddress) {
      emailResult = await this.send({
        channel: 'email',
        recipient: emailAddress,
        ...base
      });
    }

    const emailSucceeded = !emailAddress || !!emailResult?.success;
    const success = !!(inAppResult.success && emailSucceeded);
    return {
      success,
      inApp: {
        success: !!inAppResult.success,
        id: inAppResult.id,
        error: inAppResult.error
      },
      email: emailAddress
        ? {
            success: !!emailResult?.success,
            id: emailResult?.id,
            error: emailResult?.error
          }
        : {
            success: true,
            skipped: true
          },
      error: success ? undefined : 'One or more deliveries failed; see inApp and email details'
    };
  }

  async getInAppUnreadCount(userId: string): Promise<number> {
    return mockDb.countUnreadInApp(userId);
  }

  async getInbox(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly?: boolean
  ): Promise<{ notifications: INotification[]; total: number }> {
    try {
      return await mockDb.findInAppInboxPaginated(userId, limit, offset, unreadOnly);
    } catch (error: any) {
      throw new ApiError(500, `Failed to get inbox: ${error.message}`);
    }
  }

  async markInboxRead(userId: string, id: string): Promise<INotification | null> {
    const readAt = new Date();
    const updated = await mockDb.markInAppRead(id, userId, readAt);
    if (updated) {
      inboxRealtimeHub.publish(userId, {
        type: 'notification.read',
        id,
        readAt: readAt.toISOString()
      });
      const unreadCount = await mockDb.countUnreadInApp(userId);
      inboxRealtimeHub.publish(userId, { type: 'inbox.unread_count', unreadCount });
    }
    return updated;
  }

  async markInboxReadBulk(userId: string, ids?: string[]): Promise<{ modifiedCount: number; readAt: string }> {
    const readAt = new Date();
    const modifiedCount = await mockDb.markInAppReadMany(userId, ids, readAt);
    if (modifiedCount > 0) {
      inboxRealtimeHub.publish(userId, {
        type: 'notification.read_bulk',
        ids: ids ?? [],
        readAt: readAt.toISOString()
      });
      const unreadCount = await mockDb.countUnreadInApp(userId);
      inboxRealtimeHub.publish(userId, { type: 'inbox.unread_count', unreadCount });
    }
    return { modifiedCount, readAt: readAt.toISOString() };
  }

  async deleteInboxItem(userId: string, id: string): Promise<boolean> {
    const removed = await mockDb.deleteInApp(id, userId);
    if (removed) {
      inboxRealtimeHub.publish(userId, { type: 'notification.deleted', id });
      const unreadCount = await mockDb.countUnreadInApp(userId);
      inboxRealtimeHub.publish(userId, { type: 'inbox.unread_count', unreadCount });
    }
    return removed;
  }

  async deleteInboxItemsBulk(userId: string, ids: string[]): Promise<number> {
    const deletedCount = await mockDb.deleteInAppMany(userId, ids);
    if (deletedCount > 0) {
      inboxRealtimeHub.publish(userId, { type: 'notification.deleted_bulk', ids });
      const unreadCount = await mockDb.countUnreadInApp(userId);
      inboxRealtimeHub.publish(userId, { type: 'inbox.unread_count', unreadCount });
    }
    return deletedCount;
  }

  async getNotificationStatus(id: string): Promise<INotification | null> {
    try {
      const notification = await mockDb.findNotificationById(id);
      return notification;
    } catch (error: any) {
      throw new ApiError(500, `Failed to get notification status: ${error.message}`);
    }
  }

  async getUserNotifications(
    recipient: string,
    limit: number = 50,
    offset: number = 0,
    channel?: NotificationChannel
  ): Promise<{
    notifications: INotification[];
    total: number;
  }> {
    try {
      const allNotifications = await mockDb.findNotificationsByRecipient(recipient, channel);
      const total = allNotifications.length;
      const notifications = allNotifications.slice(offset, offset + limit);

      return { notifications, total };
    } catch (error: any) {
      throw new ApiError(500, `Failed to get user notifications: ${error.message}`);
    }
  }

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

  private validateRequest(request: SendNotificationRequest): void {
    if (!request.channel || !['email', 'sms', 'in_app'].includes(request.channel)) {
      throw new ApiError(400, 'Invalid channel. Must be "email", "sms", or "in_app"');
    }

    if (!request.recipient || request.recipient.trim() === '') {
      throw new ApiError(400, 'Recipient is required');
    }

    if (request.channel === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.recipient)) {
        throw new ApiError(400, 'Invalid email address');
      }
    }

    if (request.channel === 'sms') {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(request.recipient.replace(/[\s-]/g, ''))) {
        throw new ApiError(400, 'Invalid phone number');
      }
    }

    if (request.channel === 'in_app') {
      const id = request.recipient.trim();
      if (id.length < 1 || id.length > 256) {
        throw new ApiError(400, 'Invalid in-app recipient (user id)');
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
