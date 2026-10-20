import axios from 'axios';
import type { Transaction } from '../models/Wallet';
import { koboToNaira } from '../utils/money';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { fetchMerchantOwner } from './merchantOwnerClient';
import { isTreasuryPendingWithdrawalInput } from '../utils/treasuryPendingWithdrawal';

const TEMPLATE = 'treasury-withdrawal-pending-merchant';

function formatMoney(amountNaira: number, currency = 'NGN'): string {
  return `${currency} ${amountNaira.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

function metaString(meta: Record<string, unknown> | undefined, key: string): string {
  const v = meta?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

async function postDual(body: Record<string, unknown>): Promise<void> {
  const baseUrl = config.notificationsServiceUrl.replace(/\/+$/, '');
  await axios.post(`${baseUrl}/api/v1/notifications/send-dual`, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 12_000
  });
}

export async function notifyMerchantPendingTreasuryWithdrawal(tx: Transaction): Promise<void> {
  if (
    !isTreasuryPendingWithdrawalInput({
      type: tx.type,
      status: tx.status,
      amount: tx.amount,
      category: tx.category,
      metadata: tx.metadata as Record<string, unknown> | undefined
    })
  ) {
    return;
  }

  const meta = (tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
    ? tx.metadata
    : {}) as Record<string, unknown>;

  const merchantId = metaString(meta, 'merchantId');
  if (!merchantId) {
    logger.warn('Skipping treasury withdrawal alert: metadata.merchantId missing', {
      transactionId: tx.id,
      referenceId: tx.referenceId
    });
    return;
  }

  const merchantOwner = await fetchMerchantOwner(merchantId);
  if (!merchantOwner?.email.trim()) {
    logger.warn('Skipping treasury withdrawal alert: merchant owner email unavailable', {
      merchantId,
      transactionId: tx.id
    });
    return;
  }

  const amountNaira = koboToNaira(tx.amount);
  const currency = metaString(meta, 'currency') || 'NGN';
  const amountLabel = formatMoney(amountNaira, currency);
  const customerName =
    metaString(meta, 'customerName') ||
    metaString(meta, 'customer') ||
    'A customer';
  const productName = metaString(meta, 'productName') || metaString(meta, 'planName') || 'Product';
  const productType = metaString(meta, 'productType').toUpperCase() || 'SAVINGS';
  const reference = String(tx.referenceId || tx.id).trim();
  const applicationId = metaString(meta, 'applicationId');
  const appId = metaString(meta, 'appId');
  const merchantOwnerName = [merchantOwner.firstName, merchantOwner.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const kindLabel =
    productType === 'COMMODITY'
      ? 'commodity'
      : productType === 'INVESTMENT'
        ? 'investment'
        : 'savings';

  try {
    await postDual({
      userId: merchantOwner.userId,
      email: merchantOwner.email.trim(),
      template: TEMPLATE,
      priority: 'high',
      data: {
        recipientName: merchantOwnerName || 'Merchant',
        customerName,
        productName,
        amount: amountLabel,
        reference,
        applicationId,
        appId,
        merchantName: metaString(meta, 'merchantName') || 'Your business',
        detail: `${customerName} requested a ${kindLabel} withdrawal of ${amountLabel} from ${productName}. Review and approve it in Treasury & Settlements → Withdrawals.`,
        year: new Date().getFullYear(),
        appName: 'Plata'
      }
    });
  } catch (error) {
    logger.error('Failed to send treasury withdrawal pending alert', {
      merchantId,
      transactionId: tx.id,
      reference,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
