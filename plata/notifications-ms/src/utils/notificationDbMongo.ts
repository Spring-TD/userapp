import { NotificationModel, toNotification } from '../models/NotificationModel';
import type { INotificationDocument } from '../models/NotificationModel';
import { INotification } from '../models/Notification';
import { NotificationChannel, NotificationStatus } from '../types/notification';

export const notificationDbMongo = {
  async createNotification(notificationData: Omit<INotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<INotification> {
    const doc = await NotificationModel.create(notificationData);
    return toNotification(doc as INotificationDocument);
  },

  async findNotificationById(id: string): Promise<INotification | null> {
    const doc = await NotificationModel.findById(id).lean();
    if (!doc) return null;
    return toNotification(doc as INotificationDocument);
  },

  async findNotificationsByRecipient(recipient: string, channel?: NotificationChannel): Promise<INotification[]> {
    const filter: Record<string, unknown> = { recipient };
    if (channel) {
      filter.channel = channel;
    }
    const docs = await NotificationModel.find(filter).sort({ createdAt: -1 }).lean();
    return docs.map((d) => toNotification(d as INotificationDocument));
  },

  async getAllNotifications(): Promise<INotification[]> {
    const docs = await NotificationModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map((d) => toNotification(d as INotificationDocument));
  },

  async updateNotification(id: string, updates: Partial<INotification>): Promise<INotification | null> {
    const { id: _id, createdAt, ...rest } = updates as Partial<INotification> & { id?: string };
    const doc = await NotificationModel.findByIdAndUpdate(
      id,
      { $set: { ...rest, updatedAt: new Date() } },
      { new: true }
    ).lean();
    return doc ? toNotification(doc as INotificationDocument) : null;
  },

  async deleteNotification(id: string): Promise<boolean> {
    const result = await NotificationModel.findByIdAndDelete(id);
    return !!result;
  },

  async findNotificationsByStatus(status: NotificationStatus): Promise<INotification[]> {
    const docs = await NotificationModel.find({ status }).sort({ createdAt: -1 }).lean();
    return docs.map((d) => toNotification(d as INotificationDocument));
  },

  async clearAll(): Promise<void> {
    await NotificationModel.deleteMany({});
  },

  async getStats(): Promise<{ total: number; pending: number; sent: number; failed: number }> {
    const [total, pending, sent, failed] = await Promise.all([
      NotificationModel.countDocuments(),
      NotificationModel.countDocuments({ status: 'pending' }),
      NotificationModel.countDocuments({ status: 'sent' }),
      NotificationModel.countDocuments({ status: 'failed' })
    ]);
    return { total, pending, sent, failed };
  }
};
