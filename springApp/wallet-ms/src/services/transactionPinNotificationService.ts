import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

function notificationsBaseUrl(): string {
  return config.notificationsServiceUrl.replace(/\/+$/, '');
}

async function sendDualNotification(input: {
  userId: string;
  email?: string;
  template: string;
  data: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
}): Promise<void> {
  if (!config.notificationsServiceUrl.trim()) {
    logger.warn('Skipping notification: NOTIFICATIONS_SERVICE_URL not configured', {
      template: input.template,
      userId: input.userId
    });
    return;
  }

  try {
    await axios.post(
      `${notificationsBaseUrl()}/api/v1/notifications/send-dual`,
      {
        userId: input.userId,
        ...(input.email?.trim() ? { email: input.email.trim() } : {}),
        template: input.template,
        data: input.data,
        priority: input.priority ?? 'high'
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 12_000 }
    );
  } catch (error) {
    logger.warn('Notification send failed', {
      template: input.template,
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function notifyTransactionPinChanged(args: {
  userId: string;
  email?: string;
  userName?: string;
}): Promise<void> {
  await sendDualNotification({
    userId: args.userId,
    email: args.email,
    template: 'transaction-pin-changed',
    data: {
      userName: args.userName?.trim() || 'there'
    },
    priority: 'high'
  });
}
