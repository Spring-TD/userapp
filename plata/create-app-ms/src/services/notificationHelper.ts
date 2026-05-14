import axios from 'axios';
import { config } from '../config/environment';

export async function sendAppCreatedNotification(args: {
  userId: string;
  email: string;
  appName: string;
  merchantName: string;
  detail?: string;
}): Promise<void> {
  const baseUrl = config.notificationsServiceUrl.replace(/\/$/, '');
  try {
    await axios.post(
      `${baseUrl}/api/v1/notifications/send-dual`,
      {
        userId: args.userId,
        email: args.email,
        template: 'app-created',
        data: {
          appName: args.appName,
          merchantName: args.merchantName,
          detail: args.detail ?? ''
        }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 12000 }
    );
  } catch (err) {
    console.error('[create-app-ms] Failed to send app-created notification:', err);
  }
}
