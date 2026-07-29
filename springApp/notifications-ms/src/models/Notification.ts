import { NotificationChannel, NotificationStatus } from '../types/notification';

export interface INotification {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  template: string;
  data: Record<string, any>;
  status: NotificationStatus;
  retryCount: number;
  error?: string;
  sentAt?: Date;
  /** Set when the user marks an in-app notification as read. */
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

