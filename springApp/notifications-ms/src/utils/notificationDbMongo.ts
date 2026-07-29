import { NotificationModel, toNotification } from '../models/NotificationModel';
import type { INotificationDocument } from '../models/NotificationModel';
import { INotification } from '../models/Notification';

const inAppFilter = (recipient: string) => ({
  recipient: recipient.trim(),
  channel: 'in_app' as const
});

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

  async findInAppNotificationForUser(id: string, userId: string): Promise<INotification | null> {
    const doc = await NotificationModel.findOne({ _id: id, ...inAppFilter(userId) }).lean();
    if (!doc) return null;
    return toNotification(doc as INotificationDocument);
  },

  async findNotificationsByRecipient(recipient: string, channel?: INotification['channel']): Promise<INotification[]> {
    const filter: Record<string, unknown> = { recipient };
    if (channel) {
      filter.channel = channel;
    }
    const docs = await NotificationModel.find(filter).sort({ createdAt: -1 }).lean();
    return docs.map((d) => toNotification(d as INotificationDocument));
  },

  async findInAppInboxPaginated(
    userId: string,
    limit: number,
    offset: number,
    unreadOnly?: boolean
  ): Promise<{ notifications: INotification[]; total: number }> {
    const filter: Record<string, unknown> = { ...inAppFilter(userId) };
    if (unreadOnly) {
      filter.readAt = null;
    }
    const [docs, total] = await Promise.all([
      NotificationModel.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      NotificationModel.countDocuments(filter)
    ]);
    return {
      notifications: docs.map((d) => toNotification(d as INotificationDocument)),
      total
    };
  },

  async countUnreadInApp(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ ...inAppFilter(userId), readAt: null });
  },

  async markInAppRead(id: string, userId: string, readAt: Date): Promise<INotification | null> {
    const doc = await NotificationModel.findOneAndUpdate(
      { _id: id, ...inAppFilter(userId), readAt: null },
      { $set: { readAt, updatedAt: new Date() } },
      { new: true }
    ).lean();
    return doc ? toNotification(doc as INotificationDocument) : null;
  },

  async markInAppReadMany(userId: string, ids: string[] | undefined, readAt: Date): Promise<number> {
    const filter: Record<string, unknown> = { ...inAppFilter(userId), readAt: null };
    if (ids && ids.length > 0) {
      filter._id = { $in: ids };
    }
    const result = await NotificationModel.updateMany(filter, {
      $set: { readAt, updatedAt: new Date() }
    });
    return result.modifiedCount ?? 0;
  },

  async deleteInApp(id: string, userId: string): Promise<boolean> {
    const result = await NotificationModel.deleteOne({ _id: id, ...inAppFilter(userId) });
    return (result.deletedCount ?? 0) > 0;
  },

  async deleteInAppMany(userId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    const result = await NotificationModel.deleteMany({
      ...inAppFilter(userId),
      _id: { $in: ids }
    });
    return result.deletedCount ?? 0;
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

  async findNotificationsByStatus(status: INotification['status']): Promise<INotification[]> {
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
