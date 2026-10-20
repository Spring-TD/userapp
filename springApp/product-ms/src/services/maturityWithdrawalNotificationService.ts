import axios from 'axios';
import { config } from '../config/environment';

function notificationsBaseUrl(): string {
  return config.notificationsServiceUrl.replace(/\/+$/, '');
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

async function postNotify(
  body: {
    userId: string;
    email?: string;
    template: string;
    data: Record<string, unknown>;
    priority?: string;
  },
  label: string
): Promise<void> {
  try {
    await axios.post(`${notificationsBaseUrl()}/api/v1/notifications/send-dual`, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 12_000
    });
  } catch (error) {
    console.error(`[product-ms] Failed to send ${label} notification:`, error);
  }
}

function productLabel(productType: string): string {
  const t = productType.toUpperCase();
  if (t === 'SAVINGS') return 'savings';
  if (t === 'INVESTMENT') return 'investment';
  return 'commodity';
}

export async function notifyWithdrawalRequestUnderReview(args: {
  userId: string;
  email?: string;
  userName: string;
  productName: string;
  productType: string;
  amount: number;
  currency: string;
  applicationId: string;
}): Promise<void> {
  const amount = formatMoney(args.amount, args.currency);
  const kind = productLabel(args.productType);
  await postNotify(
    {
      userId: args.userId,
      email: args.email,
      template: 'withdrawal-request-under-review',
      priority: 'high',
      data: {
        userName: args.userName,
        planName: args.productName,
        productName: args.productName,
        productType: kind,
        amount,
        applicationId: args.applicationId,
        year: new Date().getFullYear(),
        appName: 'Spring'
      }
    },
    'withdrawal-request-under-review'
  );
}

export async function notifyWithdrawalRequestApproved(args: {
  userId: string;
  email?: string;
  userName: string;
  productName: string;
  productType: string;
  amount: number;
  currency: string;
  applicationId: string;
}): Promise<void> {
  const amount = formatMoney(args.amount, args.currency);
  const kind = productLabel(args.productType);
  await postNotify(
    {
      userId: args.userId,
      email: args.email,
      template: 'withdrawal-request-approved',
      priority: 'high',
      data: {
        userName: args.userName,
        planName: args.productName,
        productName: args.productName,
        productType: kind,
        amount,
        applicationId: args.applicationId,
        year: new Date().getFullYear(),
        appName: 'Spring'
      }
    },
    'withdrawal-request-approved'
  );
}

export async function notifyWithdrawalRequestRejected(args: {
  userId: string;
  email?: string;
  userName: string;
  productName: string;
  productType: string;
  amount?: number;
  currency?: string;
  applicationId: string;
  reason?: string;
}): Promise<void> {
  const kind = productLabel(args.productType);
  const amount =
    args.amount != null && args.currency
      ? formatMoney(args.amount, args.currency)
      : undefined;
  await postNotify(
    {
      userId: args.userId,
      email: args.email,
      template: 'withdrawal-request-rejected',
      priority: 'high',
      data: {
        userName: args.userName,
        planName: args.productName,
        productName: args.productName,
        productType: kind,
        amount: amount || '',
        reason: args.reason || 'Your withdrawal request was not approved.',
        applicationId: args.applicationId,
        year: new Date().getFullYear(),
        appName: 'Spring'
      }
    },
    'withdrawal-request-rejected'
  );
}
