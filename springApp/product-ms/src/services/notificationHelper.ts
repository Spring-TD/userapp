import axios from 'axios';
import { config } from '../config/environment';

function baseUrl(): string {
  return config.notificationsServiceUrl.replace(/\/$/, '');
}

export async function sendProductConfigurationNotification(args: {
  userId: string;
  email: string;
  productId: string;
  productType: string;
  appId: string;
  action: string;
  detail?: string;
}): Promise<void> {
  try {
    await axios.post(
      `${baseUrl()}/api/v1/notifications/send-dual`,
      {
        userId: args.userId,
        email: args.email,
        template: 'product-configuration',
        data: {
          productId: args.productId,
          productType: args.productType,
          appId: args.appId,
          action: args.action,
          detail: args.detail ?? ''
        }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 12000 }
    );
  } catch (err) {
    console.error('[product-ms] Failed to send product-configuration notification:', err);
  }
}
