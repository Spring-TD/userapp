import crypto from 'crypto';
import { legerblockWebhookConfig } from '../config/legerblockWebhook';

/**
 * Verify LedgerBlock webhook signature.
 * Header: `x-ledgerblock-signature`
 * Algorithm: HMAC-SHA512 over the raw request body with the webhook secret.
 * @see https://docs.legerblock.com/docs/webhook-algorithm-hmac-sha512
 */
export function verifyLegerblockSignature(rawBody: string | Buffer, incomingSignature?: string): boolean {
  if (!legerblockWebhookConfig.enabled) return true;
  if (!legerblockWebhookConfig.enforceSignature) return true;
  if (!legerblockWebhookConfig.secret) return false;
  if (!incomingSignature?.trim()) return false;

  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const computed = crypto.createHmac('sha512', legerblockWebhookConfig.secret).update(body, 'utf8').digest('hex');
  const provided = incomingSignature.trim().toLowerCase().replace(/^sha512=/i, '');
  const expected = computed.toLowerCase();
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
}

export type LegerblockCollectionWebhook = {
  accountNumber?: string;
  walletId?: string;
  txRef?: string;
  amount?: number;
  paymentStatus?: string;
  paymentChannel?: string;
  currency?: string;
  sender?: {
    name?: string;
    accountNumber?: string;
    bankCode?: string;
    bankName?: string;
  };
  raw: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Normalize collection (funding) webhook payloads from LegerBlock. */
export function parseLegerblockCollectionWebhook(body: unknown): LegerblockCollectionWebhook {
  const root = asRecord(body);
  const data = asRecord(root.data);
  const senderRoot = asRecord(root.sender);
  const senderData = asRecord(data.sender);

  return {
    accountNumber: firstString(root.account_number, root.accountNumber, data.account_number, data.accountNumber),
    walletId: firstString(root.wallet_id, root.walletId, data.wallet_id, data.walletId),
    txRef: firstString(root.tx_ref, root.txRef, root.payment_ref, data.tx_ref, data.payment_ref, data.reference),
    amount: firstNumber(root.amount, data.amount, root.transaction_amount, data.transaction_amount),
    paymentStatus: firstString(root.payment_status, root.paymentStatus, root.status, data.payment_status, data.status),
    paymentChannel: firstString(root.payment_channel, root.paymentChannel, data.payment_channel),
    currency: firstString(root.currency, data.currency, 'NGN'),
    sender: {
      name: firstString(senderRoot.name, senderData.name),
      accountNumber: firstString(
        senderRoot.accountNumber,
        senderRoot.account_number,
        senderData.accountNumber,
        senderData.account_number
      ),
      bankCode: firstString(senderRoot.bankCode, senderRoot.bank_code, senderData.bankCode, senderData.bank_code),
      bankName: firstString(senderRoot.bankName, senderRoot.bank_name, senderData.bankName, senderData.bank_name)
    },
    raw: root
  };
}

export type LegerblockPayoutWebhook = {
  event?: string;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  accountNumber?: string;
  accountName?: string;
  bankCode?: string;
  bankName?: string;
  reason?: string;
  raw: Record<string, unknown>;
};

export function parseLegerblockPayoutWebhook(body: unknown): LegerblockPayoutWebhook {
  const root = asRecord(body);
  const data = asRecord(root.data);
  return {
    event: firstString(root.event),
    status: firstString(root.status, data.status, data.payment_status),
    reference: firstString(data.reference, root.reference, data.payment_ref, data.txn_merchant_ref),
    amount: firstNumber(data.amount, root.amount),
    currency: firstString(data.currency, root.currency),
    accountNumber: firstString(data.account_number, data.accountNumber),
    accountName: firstString(data.account_name, data.accountName),
    bankCode: firstString(data.bank_code, data.bankCode),
    bankName: firstString(data.bank_name, data.bankName),
    reason: firstString(data.reason, root.reason) || undefined,
    raw: root
  };
}
