import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { fetchMerchantOwner, fetchRetailUserProfile, formatPersonName } from './authProfileClient';
import { createReceiptToken } from '../utils/receiptToken';

export type WalletPayoutNotificationInput = {
  userId: string;
  merchantId: string;
  appId?: string;
  appName?: string;
  amount: number;
  currency: string;
  reference: string;
  providerReference?: string;
  providerStatus?: string;
  customerName?: string;
  customerEmail?: string;
  sourceAccountLast4?: string;
  destinationBankName?: string;
  destinationAccountLast4?: string;
  destinationAccountName?: string;
  balanceAfter?: number;
  narration?: string;
  event: 'initiated' | 'completed' | 'failed';
  /** wallet-ms ledger transaction id — used to build a PDF receipt download link */
  walletTransactionId?: string;
};

function notificationsBaseUrl(): string {
  return config.notificationsServiceUrl.replace(/\/+$/, '');
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

function statusLabel(providerStatus?: string, event?: WalletPayoutNotificationInput['event']): string {
  const normalized = (providerStatus || '').trim().toUpperCase();
  if (event === 'failed' || normalized.includes('FAIL') || normalized.includes('REJECT')) {
    return 'Failed';
  }
  if (event === 'completed' || normalized.includes('SUCCESS') || normalized === 'COMPLETED') {
    return 'Completed';
  }
  return 'Pending';
}

async function sendDualNotification(input: {
  userId: string;
  email?: string;
  template: string;
  data: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
}): Promise<void> {
  if (!config.notificationsServiceUrl.trim()) {
    logger.warn('Skipping payout notification: NOTIFICATIONS_SERVICE_URL not configured', {
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
        priority: input.priority ?? 'normal'
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 12_000 }
    );
  } catch (error) {
    logger.warn('Payout notification send failed', {
      template: input.template,
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function resolveAppName(appId?: string, fallback?: string): Promise<string> {
  if (fallback?.trim()) return fallback.trim();
  if (!appId?.trim() || !config.createAppServiceUrl || !config.jwtSecret) {
    return 'Spring';
  }
  try {
    const res = await axios.get<{ success?: boolean; data?: { name?: string } }>(
      `${config.createAppServiceUrl}/api/v1/special/internal/apps/${encodeURIComponent(appId.trim())}`,
      {
        headers: { 'X-Internal-Token': config.jwtSecret },
        timeout: 10_000,
        validateStatus: () => true
      }
    );
    const name = res.data?.data?.name?.trim();
    if (name) return name;
  } catch {
    // best-effort
  }
  return 'Spring';
}

export async function notifyWalletBankPayout(input: WalletPayoutNotificationInput): Promise<void> {
  const [userProfile, merchantOwner, appName] = await Promise.all([
    fetchRetailUserProfile(input.userId),
    fetchMerchantOwner(input.merchantId),
    resolveAppName(input.appId, input.appName)
  ]);

  const customerEmail = input.customerEmail?.trim() || userProfile?.email;
  const customerName =
    input.customerName?.trim() ||
    formatPersonName(userProfile?.firstName, userProfile?.lastName, 'Customer');

  const amountFormatted = formatMoney(input.amount, input.currency);
  const status = statusLabel(input.providerStatus, input.event);
  const dateTime = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });
  const destinationLabel = [input.destinationBankName, input.destinationAccountLast4 ? `••••${input.destinationAccountLast4}` : '']
    .filter(Boolean)
    .join(' ');

  const sharedData: Record<string, unknown> = {
    appName,
    amount: amountFormatted,
    currency: input.currency,
    reference: input.reference,
    providerReference: input.providerReference || input.reference,
    status,
    dateTime,
    customerName,
    narration: input.narration || 'Wallet withdrawal',
    destinationBankName: input.destinationBankName || 'Bank',
    destinationAccountLast4: input.destinationAccountLast4 || '',
    destinationAccountName: input.destinationAccountName || customerName,
    destinationLabel,
    sourceAccountLast4: input.sourceAccountLast4 || '',
    balanceAfter:
      input.balanceAfter !== undefined
        ? formatMoney(input.balanceAfter, input.currency)
        : '—',
    detail: `Withdrawal of ${amountFormatted} to ${destinationLabel || 'external account'} (${status}).`,
    receiptUrl:
      input.walletTransactionId && config.walletPublicBaseUrl
        ? `${config.walletPublicBaseUrl}/api/v1/transactions/${input.walletTransactionId}/receipt.pdf?token=${createReceiptToken(input.walletTransactionId)}`
        : ''
  };

  const userTemplate =
    input.event === 'failed' ? 'wallet-bank-payout-failed-user' : 'wallet-bank-payout-user';

  await sendDualNotification({
    userId: input.userId,
    email: customerEmail,
    template: userTemplate,
    data: {
      ...sharedData,
      userName: customerName
    }
  });

  if (merchantOwner?.userId) {
    const merchantName = formatPersonName(merchantOwner.firstName, merchantOwner.lastName, 'Merchant');
    await sendDualNotification({
      userId: merchantOwner.userId,
      email: merchantOwner.email,
      template: 'wallet-bank-payout-merchant',
      data: {
        ...sharedData,
        merchantName,
        detail: `${customerName} withdrew ${amountFormatted} to ${destinationLabel || 'an external bank account'} (${status}).`
      },
      priority: 'high'
    });
  }
}
