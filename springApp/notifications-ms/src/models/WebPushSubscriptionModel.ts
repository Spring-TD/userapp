import mongoose, { Schema, Document, Model } from 'mongoose';
import { IWebPushSubscription, WebPushSubscriptionKeys } from './WebPushSubscription';

export interface IWebPushSubscriptionDocument extends Omit<IWebPushSubscription, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const KeysSchema = new Schema<WebPushSubscriptionKeys>(
  {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  { _id: false }
);

const WebPushSubscriptionSchema = new Schema<IWebPushSubscriptionDocument>(
  {
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    expirationTime: { type: Number, default: null },
    keys: { type: KeysSchema, required: true },
    appId: { type: String }
  },
  { timestamps: true }
);

WebPushSubscriptionSchema.index({ userId: 1, appId: 1 });

export const WebPushSubscriptionModel: Model<IWebPushSubscriptionDocument> =
  mongoose.models.WebPushSubscription ??
  mongoose.model<IWebPushSubscriptionDocument>('WebPushSubscription', WebPushSubscriptionSchema);

export function toWebPushSubscription(
  doc: IWebPushSubscriptionDocument | Record<string, unknown>
): IWebPushSubscription {
  const o =
    doc && typeof (doc as IWebPushSubscriptionDocument).toObject === 'function'
      ? (doc as IWebPushSubscriptionDocument).toObject()
      : (doc as Record<string, unknown>);
  const raw = o as Record<string, unknown>;
  return {
    id: (raw._id ?? (doc as IWebPushSubscriptionDocument)?._id)?.toString?.() ?? String(raw._id),
    userId: raw.userId as string,
    endpoint: raw.endpoint as string,
    expirationTime: (raw.expirationTime as number | null) ?? null,
    keys: raw.keys as WebPushSubscriptionKeys,
    appId: raw.appId as string | undefined,
    createdAt: raw.createdAt as Date,
    updatedAt: raw.updatedAt as Date
  };
}
