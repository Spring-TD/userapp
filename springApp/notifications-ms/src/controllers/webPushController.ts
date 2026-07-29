import { Request, Response } from 'express';
import webPushService from '../services/webPushService';
import webPushSubscriptionService from '../services/webPushSubscriptionService';
import { ApiError } from '../middleware/errorHandler';
import { WebPushSubscriptionPayload } from '../models/WebPushSubscription';

export class WebPushController {
  /**
   * GET /api/v1/notifications/push/vapid-public-key
   */
  async getVapidPublicKey(_req: Request, res: Response): Promise<void> {
    const publicKey = webPushService.getPublicKey();
    if (!publicKey) {
      res.status(503).json({
        success: false,
        error: 'Web Push is not configured on this server (VAPID_PUBLIC_KEY missing)'
      });
      return;
    }
    res.json({
      success: true,
      data: { publicKey }
    });
  }

  /**
   * POST /api/v1/notifications/push/subscribe
   */
  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const { userId, subscription, appId } = req.body as {
        userId: string;
        subscription: WebPushSubscriptionPayload;
        appId?: string;
      };

      const record = await webPushSubscriptionService.upsert({ userId, subscription, appId });
      res.status(200).json({
        success: true,
        data: {
          id: record.id,
          userId: record.userId,
          endpoint: record.endpoint,
          appId: record.appId
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Error in web push subscribe:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * DELETE /api/v1/notifications/push/subscribe
   */
  async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { userId, endpoint } = req.body as { userId: string; endpoint: string };
      const removed = await webPushSubscriptionService.remove({ userId, endpoint });
      res.status(200).json({
        success: true,
        data: { removed }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Error in web push unsubscribe:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

export default new WebPushController();
