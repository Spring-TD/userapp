import axios from 'axios';
import { config } from '../config/environment';

function notificationsBaseUrl(): string {
  return config.notificationsServiceUrl.replace(/\/+$/, '');
}

export function formatMoney(amount: number, currency: string): string {
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

export async function sendCommodityOrderReceivedNotification(args: {
  userId: string;
  email?: string;
  applicantName: string;
  productName: string;
}): Promise<void> {
  await postNotify(
    {
      userId: args.userId,
      email: args.email,
      template: 'commodity-order-received',
      data: {
        userName: args.applicantName,
        commodityName: args.productName,
        productName: args.productName
      }
    },
    'commodity-order-received'
  );
}

export async function sendCommodityEnrollmentNotifications(args: {
  userId: string;
  email?: string;
  applicantName: string;
  productName: string;
  applicationId: string;
  principal: number;
  expectedInterest: number;
  maturityAt: string;
  currency: string;
  merchantName?: string;
}): Promise<void> {
  const amount = formatMoney(args.principal, args.currency);
  const base = {
    userId: args.userId,
    email: args.email,
    data: {
      userName: args.applicantName,
      commodityName: args.productName,
      productName: args.productName,
      applicationId: args.applicationId,
      principal: args.principal,
      expectedInterest: args.expectedInterest,
      totalAtMaturity: Math.round((args.principal + args.expectedInterest) * 100) / 100,
      maturityAt: args.maturityAt,
      currency: args.currency,
      merchantName: args.merchantName || 'Merchant',
      amount
    }
  };

  await postNotify({ ...base, template: 'commodity-payment-confirmed' }, 'commodity-payment-confirmed');
  await postNotify({ ...base, template: 'commodity-order-processing' }, 'commodity-order-processing');
  await postNotify(
    {
      ...base,
      template: 'commodity-settlement-scheduled',
      data: { ...base.data, settlementDate: args.maturityAt }
    },
    'commodity-settlement-scheduled'
  );
  await postNotify({ ...base, template: 'commodity-enrolled' }, 'commodity-enrolled');
}

export async function sendCommodityWithdrawalNotification(args: {
  userId: string;
  email?: string;
  applicantName: string;
  productName: string;
  applicationId: string;
  principal: number;
  interest: number;
  totalPayout: number;
  currency: string;
}): Promise<void> {
  const amount = formatMoney(args.totalPayout, args.currency);
  const data = {
    userName: args.applicantName,
    commodityName: args.productName,
    productName: args.productName,
    applicationId: args.applicationId,
    principal: args.principal,
    interest: args.interest,
    totalPayout: args.totalPayout,
    currency: args.currency,
    amount
  };

  await postNotify(
    { userId: args.userId, email: args.email, template: 'commodity-settlement-confirmed', data },
    'commodity-settlement-confirmed'
  );
  await postNotify(
    { userId: args.userId, email: args.email, template: 'commodity-payout-processed', data },
    'commodity-payout-processed'
  );
  await postNotify(
    { userId: args.userId, email: args.email, template: 'commodity-withdrawn', data },
    'commodity-withdrawn'
  );
}
