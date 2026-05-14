export type NotificationChannel = 'email' | 'sms' | 'in_app';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export type NotificationPriority = 'high' | 'normal' | 'low';

export interface SendNotificationRequest {
  channel: NotificationChannel;
  recipient: string;
  template: string;
  data: Record<string, any>;
  priority?: NotificationPriority;
}

/** Send both in-app (by user id) and email for the same template + data. */
export interface SendEmailAndInAppRequest {
  userId: string;
  email: string;
  template: string;
  data: Record<string, any>;
  priority?: NotificationPriority;
}

export interface SendEmailAndInAppResponse {
  success: boolean;
  inApp?: { success: boolean; id?: string; error?: string };
  email?: { success: boolean; id?: string; error?: string };
  error?: string;
}

export interface NotificationResponse {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
}

export interface NotificationStatusResponse {
  success: boolean;
  data?: {
    id: string;
    status: NotificationStatus;
    channel: NotificationChannel;
    recipient: string;
    template: string;
    sentAt?: Date;
    error?: string;
    createdAt: Date;
  };
  error?: string;
}

export interface UserNotificationsResponse {
  success: boolean;
  data?: {
    notifications: Array<{
      id: string;
      channel: NotificationChannel;
      template: string;
      status: NotificationStatus;
      createdAt: Date;
      sentAt?: Date;
    }>;
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}
