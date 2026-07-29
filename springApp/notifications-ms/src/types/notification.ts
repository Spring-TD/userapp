export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'web_push';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export type NotificationPriority = 'high' | 'normal' | 'low';

export interface SendNotificationRequest {
  channel: NotificationChannel;
  recipient: string;
  template: string;
  data: Record<string, any>;
  priority?: NotificationPriority;
}

/** Send in-app (+ Web Push when subscribed) and optionally email for the same template + data. */
export interface SendEmailAndInAppRequest {
  userId: string;
  /** When omitted, only in-app (+ Web Push) is sent. */
  email?: string;
  template: string;
  data: Record<string, any>;
  priority?: NotificationPriority;
  /** When true, skip Web Push even if the user has browser subscriptions. */
  skipWebPush?: boolean;
}

export interface SendEmailAndInAppResponse {
  success: boolean;
  inApp?: { success: boolean; id?: string; error?: string };
  email?: { success: boolean; id?: string; error?: string; skipped?: boolean };
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
