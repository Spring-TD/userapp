import { v4 as uuidv4 } from 'uuid';
import { INotification } from '../models/Notification';
import { NotificationChannel, NotificationStatus } from '../types/notification';

// Mock in-memory database for notifications-ms
class MockDatabase {
  private notifications: Map<string, INotification> = new Map();

  /**
   * Create a new notification
   */
  async createNotification(notificationData: Omit<INotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<INotification> {
    const id = uuidv4();
    const now = new Date();

    const notification: INotification = {
      id,
      ...notificationData,
      createdAt: now,
      updatedAt: now
    } as INotification;

    this.notifications.set(id, notification);
    return notification;
  }

  /**
   * Find notification by ID
   */
  async findNotificationById(id: string): Promise<INotification | null> {
    return this.notifications.get(id) || null;
  }

  /**
   * Find notifications by recipient
   */
  async findNotificationsByRecipient(recipient: string, channel?: NotificationChannel): Promise<INotification[]> {
    const result: INotification[] = [];
    for (const notification of this.notifications.values()) {
      if (notification.recipient === recipient && (!channel || notification.channel === channel)) {
        result.push(notification);
      }
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all notifications
   */
  async getAllNotifications(): Promise<INotification[]> {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Update notification
   */
  async updateNotification(id: string, updates: Partial<INotification>): Promise<INotification | null> {
    const notification = this.notifications.get(id);
    if (!notification) return null;

    const updatedNotification = {
      ...notification,
      ...updates,
      updatedAt: new Date()
    } as INotification;

    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<boolean> {
    return this.notifications.delete(id);
  }

  /**
   * Get notifications by status
   */
  async findNotificationsByStatus(status: NotificationStatus): Promise<INotification[]> {
    const result: INotification[] = [];
    for (const notification of this.notifications.values()) {
      if (notification.status === status) {
        result.push(notification);
      }
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Clear all data (for testing purposes)
   */
  async clearAll(): Promise<void> {
    this.notifications.clear();
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ total: number; pending: number; sent: number; failed: number }> {
    const all = Array.from(this.notifications.values());
    return {
      total: all.length,
      pending: all.filter(n => n.status === 'pending').length,
      sent: all.filter(n => n.status === 'sent').length,
      failed: all.filter(n => n.status === 'failed').length
    };
  }
}

// Export singleton instance
export const mockDb = new MockDatabase();