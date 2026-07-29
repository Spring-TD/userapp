import axios from 'axios';
import { config } from '../config/environment';
import { db } from '../db/database';
import { logger } from '../utils/logger';
import { payoutMirrorDescriptionStatus, resolvePayoutMirrorStatus } from '../utils/payoutMirrorStatus';
import { createReceiptToken } from '../utils/receiptToken';

export type AppTransactionMirrorPayload = {
  appId?: string;
  userId?: string;
  walletId: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  description: string;
  reference?: string;
  metaRef?: string;
  provider?: string;
  providerReference?: string;
  metadata?: Record<string, unknown>;
};

export class AppTransactionMirrorService {
  static async recordTransaction(payload: AppTransactionMirrorPayload): Promise<void> {
    let appId = payload.appId?.trim() || undefined;

    // Legacy PRIMARY user wallets and PayOnUs funding callbacks frequently omit
    // appId. A retail user belongs to exactly one storefront app, so resolve it
    // from the user's other wallets (keyed by userId + walletId's merchantId)
    // rather than silently dropping the mirror.
    if (!appId && payload.userId) {
      const resolved = await db.getAppIdForUser(payload.userId);
      if (resolved) {
        appId = resolved;
        logger.info('Resolved app transaction mirror appId from user wallets', {
          userId: payload.userId,
          walletId: payload.walletId,
          appId,
          providerReference: payload.providerReference
        });
      }
    }

    if (!appId) {
      logger.warn('Skipping app transaction mirror: no appId on payload and none resolvable for user', {
        userId: payload.userId,
        walletId: payload.walletId,
        providerReference: payload.providerReference,
        amount: payload.amount,
        provider: payload.provider
      });
      return;
    }

    if (!config.createAppServiceUrl || !config.jwtSecret) {
      logger.warn('Skipping app transaction mirror: create-app-ms config missing', {
        appId,
        providerReference: payload.providerReference
      });
      return;
    }

    const body: AppTransactionMirrorPayload = { ...payload, appId };

    try {
      const url = `${config.createAppServiceUrl}/api/v1/special/transactions/app`;
      await axios.post(url, body, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': config.jwtSecret
        }
      });
      logger.info('Mirrored wallet funding to app transactions', {
        appId,
        providerReference: payload.providerReference,
        amount: payload.amount
      });
    } catch (error) {
      logger.error('Failed to mirror wallet funding to app transactions', {
        appId,
        providerReference: payload.providerReference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /** Mirror a user PRIMARY wallet bank payout into create-app-ms for the merchant Transactions tab. */
  static async mirrorUserWalletPayout(input: {
    appId?: string;
    userId: string;
    walletId: string;
    amount: number;
    currency: string;
    reference: string;
    providerReference?: string;
    providerStatus?: string;
    walletTransactionStatus?: string;
    reversed?: boolean;
    customerName?: string;
    destinationBankName?: string;
    destinationAccountLast4?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const providerStatus = (input.providerStatus || 'PENDING').toUpperCase();
    const payoutStatus =
      typeof input.metadata?.payoutStatus === 'string' ? input.metadata.payoutStatus : undefined;
    const mirrorStatus = resolvePayoutMirrorStatus({
      providerStatus: input.providerStatus,
      payoutStatus,
      walletTransactionStatus: input.walletTransactionStatus,
      reversed: input.reversed
    });
    const descriptionStatus = payoutMirrorDescriptionStatus(providerStatus, mirrorStatus);

    const destinationLabel = [input.destinationBankName, input.destinationAccountLast4 ? `••••${input.destinationAccountLast4}` : '']
      .filter(Boolean)
      .join(' ');

    const walletTxnId =
      typeof input.metadata?.walletTransactionId === 'string'
        ? input.metadata.walletTransactionId
        : undefined;
    const receiptUrl =
      walletTxnId && config.walletPublicBaseUrl
        ? `${config.walletPublicBaseUrl}/api/v1/transactions/${walletTxnId}/receipt.pdf?token=${createReceiptToken(walletTxnId)}`
        : undefined;

    await this.recordTransaction({
      appId: input.appId,
      userId: input.userId,
      walletId: input.walletId,
      amount: input.amount,
      currency: input.currency,
      type: 'debit',
      status: mirrorStatus,
      description: `PayOnUs PAYOUT (${descriptionStatus})${destinationLabel ? ` to ${destinationLabel}` : ''}`,
      reference: input.reference,
      metaRef: input.providerReference || input.reference,
      provider: 'payonus',
      providerReference: input.providerReference || input.reference,
      metadata: {
        category: 'PAYOUT',
        parties: {
          sender: {
            name: input.customerName
          }
        },
        payout: {
          destinationBankName: input.destinationBankName,
          destinationAccountLast4: input.destinationAccountLast4
        },
        providerStatus: input.providerStatus,
        ...(receiptUrl ? { receipt: { url: receiptUrl } } : {}),
        ...input.metadata
      }
    });
  }
}
