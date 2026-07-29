import { INotification } from '../models/Notification';

export function serializeInboxItem(notification: INotification): Record<string, unknown> {
  const readAt = notification.readAt ?? null;
  return {
    id: notification.id,
    channel: notification.channel,
    template: notification.template,
    status: notification.status,
    createdAt: notification.createdAt,
    sentAt: notification.sentAt,
    readAt,
    isRead: readAt != null,
    data: notification.data
  };
}
