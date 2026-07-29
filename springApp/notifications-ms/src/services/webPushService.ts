import webpush, { PushSubscription, WebPushError } from 'web-push';
import { config } from '../config/environment';
import webPushSubscriptionService from './webPushSubscriptionService';
import { notificationDbMongo as mockDb } from '../utils/notificationDbMongo';

export type WebPushDeliveryResult = {
  success: boolean;
  sentCount: number;
  failedCount: number;
  error?: string;
};

class WebPushService {
  private configured = false;

  private ensureConfigured(): boolean {
    if (this.configured) {
      return true;
    }
    const { publicKey, privateKey, subject } = config.vapid;
    if (!publicKey || !privateKey || !subject) {
      return false;
    }
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
      console.log('[WebPushService] Web Push (VAPID) enabled');
      return true;
    } catch (error: any) {
      console.error('[WebPushService] Failed to configure VAPID:', error.message);
      return false;
    }
  }

  isWebPushEnabled(): boolean {
    return this.ensureConfigured();
  }

  getPublicKey(): string | null {
    const key = config.vapid.publicKey?.trim();
    return key || null;
  }

  async sendToUser(args: {
    userId: string;
    title: string;
    body: string;
    template: string;
    url?: string;
    data?: Record<string, string>;
  }): Promise<WebPushDeliveryResult> {
    const subscriptions = await webPushSubscriptionService.listForUser(args.userId);
    if (subscriptions.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    const notification = await mockDb.createNotification({
      channel: 'web_push',
      recipient: args.userId,
      template: args.template,
      data: {
        pushTitle: args.title,
        pushBody: args.body,
        ...(args.data ?? {})
      },
      status: 'pending',
      retryCount: 0
    });

    if (!this.ensureConfigured()) {
      await mockDb.updateNotification(notification.id, {
        status: 'failed',
        error: 'Web Push is not configured (set VAPID keys)',
        retryCount: notification.retryCount + 1
      });
      return {
        success: false,
        sentCount: 0,
        failedCount: subscriptions.length,
        error: 'Web Push is not configured'
      };
    }

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      template: args.template,
      url: args.url || '/',
      ...(args.data ?? {})
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      const pushSubscription: PushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys
      };
      try {
        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 60 * 60 * 24
        });
        sentCount += 1;
      } catch (error: any) {
        failedCount += 1;
        const statusCode = (error as WebPushError).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await webPushSubscriptionService.removeByEndpoint(sub.endpoint);
        }
        console.warn(`[WebPushService] Failed to send to ${sub.endpoint}:`, error.message);
      }
    }

    const success = sentCount > 0 || failedCount === 0;
    await mockDb.updateNotification(notification.id, {
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date() : undefined,
      error: success ? undefined : 'All Web Push deliveries failed',
      retryCount: success ? notification.retryCount : notification.retryCount + 1
    });

    return {
      success,
      sentCount,
      failedCount,
      error: success ? undefined : 'All Web Push deliveries failed'
    };
  }
}

export default new WebPushService();
