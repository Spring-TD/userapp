import {
  WebPushSubscriptionModel,
  toWebPushSubscription
} from '../models/WebPushSubscriptionModel';
import {
  IWebPushSubscription,
  WebPushSubscriptionPayload
} from '../models/WebPushSubscription';
import { ApiError } from '../middleware/errorHandler';

export class WebPushSubscriptionService {
  async upsert(args: {
    userId: string;
    subscription: WebPushSubscriptionPayload;
    appId?: string;
  }): Promise<IWebPushSubscription> {
    const userId = args.userId.trim();
    const endpoint = args.subscription.endpoint?.trim();
    if (!userId || !endpoint) {
      throw new ApiError(400, 'userId and subscription.endpoint are required');
    }
    if (!args.subscription.keys?.p256dh?.trim() || !args.subscription.keys?.auth?.trim()) {
      throw new ApiError(400, 'subscription.keys.p256dh and subscription.keys.auth are required');
    }

    const existing = await WebPushSubscriptionModel.findOne({ endpoint }).exec();
    if (existing) {
      existing.userId = userId;
      existing.keys = {
        p256dh: args.subscription.keys.p256dh.trim(),
        auth: args.subscription.keys.auth.trim()
      };
      existing.expirationTime =
        typeof args.subscription.expirationTime === 'number' ? args.subscription.expirationTime : null;
      existing.appId = args.appId?.trim() || undefined;
      await existing.save();
      return toWebPushSubscription(existing);
    }

    const created = await WebPushSubscriptionModel.create({
      userId,
      endpoint,
      keys: {
        p256dh: args.subscription.keys.p256dh.trim(),
        auth: args.subscription.keys.auth.trim()
      },
      expirationTime:
        typeof args.subscription.expirationTime === 'number' ? args.subscription.expirationTime : null,
      appId: args.appId?.trim() || undefined
    });
    return toWebPushSubscription(created);
  }

  async remove(args: { userId: string; endpoint: string }): Promise<boolean> {
    const result = await WebPushSubscriptionModel.deleteOne({
      userId: args.userId.trim(),
      endpoint: args.endpoint.trim()
    }).exec();
    return result.deletedCount > 0;
  }

  async listForUser(userId: string): Promise<IWebPushSubscription[]> {
    const docs = await WebPushSubscriptionModel.find({ userId: userId.trim() }).exec();
    return docs.map(toWebPushSubscription);
  }

  async removeByEndpoint(endpoint: string): Promise<void> {
    await WebPushSubscriptionModel.deleteOne({ endpoint: endpoint.trim() }).exec();
  }
}

export default new WebPushSubscriptionService();
