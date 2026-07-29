import axios from 'axios';
import { config } from '../config/environment';
import { db } from '../db/database';
import { logger } from '../utils/logger';
import type { Transaction, Wallet } from '../models/Wallet';
import { TransactionType } from '../models/Wallet';
import { TRANSACTION_CREATED, transactionEvents } from '../events/transactionEvents';
import { AppTransactionMirrorService } from './appTransactionMirrorService';
import { buildTransactionReceipt, buildReceiptNumber } from './receiptService';
import { createReceiptToken } from '../utils/receiptToken';
import { fetchMerchantOwner, fetchRetailUserProfile, formatPersonName } from './authProfileClient';

const NOTIFY_TEMPLATE = 'wallet-transaction-receipt';

/**
 * PayOnUs funding credits and bank payouts have dedicated mirrors + notifications with
 * richer provider metadata and a multi-step status lifecycle (pending → completed via
 * webhook). Skip them here to avoid duplicate rows/receipts.
 */
function isHandledElsewhere(transaction: Transaction): boolean {
  const source = String(transaction.source || '').toUpperCase();
  if (source === 'PAYONUS' || source === 'FUNDING_CALLBACK') return true;
  if (transaction.metadata && (transaction.metadata as Record<string, unknown>).__skipReceipt) {
    return true;
  }
  return false;
}

function mirrorStatus(status: string): 'completed' | 'pending' | 'failed' | 'cancelled' {
  switch (String(status).toUpperCase()) {
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function receiptPdfUrl(transactionId: string): string | undefined {
  if (!config.walletPublicBaseUrl) return undefined;
  const token = createReceiptToken(transactionId);
  return `${config.walletPublicBaseUrl}/api/v1/transactions/${transactionId}/receipt.pdf?token=${token}`;
}

async function resolveAppName(appId?: string): Promise<string> {
  if (!appId?.trim() || !config.createAppServiceUrl || !config.jwtSecret) return 'Spring';
  try {
    const res = await axios.get<{ success?: boolean; data?: { name?: string } }>(
      `${config.createAppServiceUrl}/api/v1/special/internal/apps/${encodeURIComponent(appId.trim())}`,
      { headers: { 'X-Internal-Token': config.jwtSecret }, timeout: 10_000, validateStatus: () => true }
    );
    const name = res.data?.data?.name?.trim();
    if (name) return name;
  } catch {
    // best-effort
  }
  return 'Spring';
}

function walletOwnerUserId(wallet: Wallet | null | undefined): string | undefined {
  if (wallet && wallet.walletType === 'USER') {
    return (wallet as { userId?: string }).userId;
  }
  return undefined;
}

async function mirrorTransaction(transaction: Transaction, wallet: Wallet | null | undefined): Promise<void> {
  const receiptNumber = buildReceiptNumber(transaction);
  const type = transaction.type === TransactionType.CREDIT ? 'credit' : 'debit';

  await AppTransactionMirrorService.recordTransaction({
    appId: wallet?.appId,
    userId: walletOwnerUserId(wallet),
    walletId: transaction.walletId,
    amount: Math.abs(transaction.amount),
    currency: wallet?.currency || (transaction.metadata?.currency as string) || 'NGN',
    type,
    status: mirrorStatus(String(transaction.status)),
    description: transaction.description || `${type === 'credit' ? 'Credit' : 'Debit'} transaction`,
    reference: transaction.referenceId,
    metaRef: transaction.externalReference || transaction.referenceId,
    provider: 'wallet-ms',
    providerReference: transaction.id,
    metadata: {
      category: transaction.category,
      source: transaction.source,
      receiptNumber,
      receipt: { url: receiptPdfUrl(transaction.id) },
      walletType: wallet?.walletType,
      merchantWalletType:
        wallet && wallet.walletType === 'MERCHANT'
          ? (wallet as { merchantWalletType?: string }).merchantWalletType
          : undefined,
      ...(transaction.metadata ?? {})
    }
  });
}

async function sendReceiptNotification(input: {
  userId: string;
  email?: string;
  data: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
}): Promise<void> {
  if (!config.notificationsServiceUrl.trim()) return;
  try {
    await axios.post(
      `${config.notificationsServiceUrl.replace(/\/+$/, '')}/api/v1/notifications/send-dual`,
      {
        userId: input.userId,
        ...(input.email?.trim() ? { email: input.email.trim() } : {}),
        template: NOTIFY_TEMPLATE,
        data: input.data,
        priority: input.priority ?? 'normal'
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 12_000 }
    );
  } catch (error) {
    logger.warn('Transaction receipt notification failed', {
      userId: input.userId,
      transactionId: input.data.transactionId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/** Send email + in-app receipt for a completed ledger transaction (user or merchant wallet). */
export async function notifyTransactionReceipt(
  transaction: Transaction,
  wallet?: Wallet | null
): Promise<void> {
  const resolvedWallet = wallet === undefined ? await db.getWalletById(transaction.walletId) : wallet;
  await notifyTransaction(transaction, resolvedWallet);
}

async function notifyTransaction(transaction: Transaction, wallet: Wallet | null | undefined): Promise<void> {
  const appName = await resolveAppName(wallet?.appId);
  const isUserWallet = wallet?.walletType === 'USER';

  let recipientUserId: string | undefined;
  let recipientEmail: string | undefined;
  let ownerName = 'Customer';

  if (isUserWallet) {
    recipientUserId = (wallet as { userId?: string }).userId;
    if (recipientUserId) {
      const profile = await fetchRetailUserProfile(recipientUserId);
      recipientEmail = profile?.email;
      ownerName = formatPersonName(profile?.firstName, profile?.lastName, 'Customer');
    }
  } else if (wallet && wallet.walletType === 'MERCHANT') {
    const merchantId = (wallet as { merchantId?: string }).merchantId;
    if (merchantId) {
      const owner = await fetchMerchantOwner(merchantId);
      recipientUserId = owner?.userId;
      recipientEmail = owner?.email;
      ownerName = formatPersonName(owner?.firstName, owner?.lastName, 'Merchant');
    }
  }

  if (!recipientUserId) return;

  const receipt = buildTransactionReceipt(transaction, wallet, { ownerName, appName });
  const pdfUrl = receiptPdfUrl(transaction.id);

  await sendReceiptNotification({
    userId: recipientUserId,
    email: recipientEmail,
    data: {
      appName,
      userName: ownerName,
      receiptNumber: receipt.receiptNumber,
      transactionId: receipt.transactionId,
      direction: receipt.direction,
      amount: receipt.amountFormatted,
      currency: receipt.currency,
      status: receipt.status,
      description: receipt.description,
      reference: receipt.reference || receipt.transactionId,
      dateTime: receipt.dateTime,
      balanceAfter: receipt.balanceAfterFormatted || '—',
      receiptUrl: pdfUrl || '',
      detail: `${receipt.direction} of ${receipt.amountFormatted} — ${receipt.description} (${receipt.status}).`
    }
  });
}

export async function handleTransactionRecorded(transaction: Transaction): Promise<void> {
  try {
    if (!transaction || !transaction.walletId || !transaction.amount) return;
    if (isHandledElsewhere(transaction)) return;

    const wallet = await db.getWalletById(transaction.walletId);

    // Mirror every ledger movement to the merchant Transactions tab (all statuses).
    await mirrorTransaction(transaction, wallet);

    // Notify + issue receipt once the movement is final to avoid pending/completed duplicates.
    if (String(transaction.status).toUpperCase() === 'COMPLETED') {
      await notifyTransaction(transaction, wallet);
    }
  } catch (error) {
    logger.warn('handleTransactionRecorded failed', {
      transactionId: transaction?.id,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

let registered = false;
export function registerTransactionReceiptHandler(): void {
  if (registered) return;
  registered = true;
  transactionEvents.on(TRANSACTION_CREATED, (transaction: Transaction) => {
    void handleTransactionRecorded(transaction);
  });
  logger.info('Transaction receipt handler registered');
}
