import axios from 'axios';
import { config } from '../config/environment';

export type NotifyRecipient = {
  userId: string;
  email: string;
  merchantName?: string;
};

async function postDual(body: Record<string, unknown>): Promise<void> {
  const baseUrl = config.notificationsServiceUrl.replace(/\/$/, '');
  await axios.post(`${baseUrl}/api/v1/notifications/send-dual`, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 12000
  });
}

export async function sendProductCreatedNotification(
  recipient: NotifyRecipient,
  productName: string
): Promise<void> {
  try {
    await postDual({
      userId: recipient.userId,
      email: recipient.email,
      template: 'product-created',
      data: {
        productName,
        merchantName: recipient.merchantName ?? 'Your business',
        detail: ''
      }
    });
  } catch (err) {
    console.error('[product-ms] product-created notification failed:', err);
  }
}

export async function sendProductStatusNotification(
  recipient: NotifyRecipient,
  productName: string,
  statusLabel: string
): Promise<void> {
  try {
    await postDual({
      userId: recipient.userId,
      email: recipient.email,
      template: 'merchant-product-status',
      data: {
        productName,
        merchantName: recipient.merchantName ?? 'Your business',
        statusLabel,
        detail: ''
      }
    });
  } catch (err) {
    console.error('[product-ms] merchant-product-status notification failed:', err);
  }
}
