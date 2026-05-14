import mongoose, { Schema, Document, Model } from 'mongoose';
import { INotification } from './Notification';

export interface INotificationDocument extends Omit<INotification, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    channel: { type: String, enum: ['email', 'sms', 'in_app'], required: true },
    recipient: { type: String, required: true, index: true },
    template: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
    retryCount: { type: Number, default: 0 },
    error: { type: String },
    sentAt: { type: Date }
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

export const NotificationModel: Model<INotificationDocument> =
  mongoose.models.Notification ?? mongoose.model<INotificationDocument>('Notification', NotificationSchema);

export function toNotification(doc: INotificationDocument | Record<string, unknown>): INotification {
  const o = doc && typeof (doc as INotificationDocument).toObject === 'function'
    ? (doc as INotificationDocument).toObject()
    : (doc as Record<string, unknown>);
  const raw = o as Record<string, unknown>;
  return {
    id: (raw._id ?? (doc as INotificationDocument)?._id)?.toString?.() ?? String(raw._id),
    channel: raw.channel as INotification['channel'],
    recipient: raw.recipient as string,
    template: raw.template as string,
    data: (raw.data as Record<string, unknown>) ?? {},
    status: raw.status as INotification['status'],
    retryCount: (raw.retryCount as number) ?? 0,
    error: raw.error as string | undefined,
    sentAt: raw.sentAt as Date | undefined,
    createdAt: raw.createdAt as Date,
    updatedAt: raw.updatedAt as Date
  };
}
