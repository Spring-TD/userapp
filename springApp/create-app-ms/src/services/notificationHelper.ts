import axios from 'axios';
import { config } from '../config/environment';

function baseUrl(): string {
  return config.notificationsServiceUrl.replace(/\/$/, '');
}

/** Email + in-app inbox (send-dual). Failures are logged only. */
async function postSendDual(body: Record<string, unknown>, label: string): Promise<void> {
  try {
    await axios.post(`${baseUrl()}/api/v1/notifications/send-dual`, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 12000
    });
  } catch (err) {
    console.error(`[create-app-ms] Failed to send ${label} notification:`, err);
  }
}

export async function sendAppCreatedNotification(args: {
  userId: string;
  email: string;
  appName: string;
  merchantName: string;
  detail?: string;
}): Promise<void> {
  await postSendDual(
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
    'app-created'
  );
}

export async function sendAppDeactivatedNotification(args: {
  userId: string;
  email: string;
  appName: string;
  merchantName: string;
  action: 'suspended' | 'deleted';
}): Promise<void> {
  const actionLabel = args.action === 'suspended' ? 'suspended' : 'deleted';
  await postSendDual(
    {
      userId: args.userId,
      email: args.email,
      template: 'app-deactivated',
      data: {
        appName: args.appName,
        merchantName: args.merchantName,
        action: actionLabel
      }
    },
    'app-deactivated'
  );
}

export async function sendAppReactivatedNotification(args: {
  userId: string;
  email: string;
  appName: string;
  merchantName: string;
}): Promise<void> {
  await postSendDual(
    {
      userId: args.userId,
      email: args.email,
      template: 'app-reactivated',
      data: {
        appName: args.appName,
        merchantName: args.merchantName
      }
    },
    'app-reactivated'
  );
}
