import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { WalletService } from '../services';
import { mapPayoutProviderStatus } from '../services/walletService';
import { payonusWebhookConfig } from '../config/payonusWebhook';
import { AppTransactionMirrorService } from '../services/appTransactionMirrorService';
import { logger } from '../utils/logger';
import { validateInput, fundingCallbackSchema } from '../utils/validation';
import { MerchantWalletType } from '../models/Wallet';
import { normalizeMerchantWalletType } from '../utils/merchantWalletType';
import {
  getRawBodyTopLevelKeys,
  parsePayonusFundingWebhookBody,
  parsePayonusRawPayload,
  summarizeRawBodyForLog
} from '../utils/payonusWebhookParser';
import {
  parseLegerblockCollectionWebhook,
  parseLegerblockPayoutWebhook,
  verifyLegerblockSignature
} from '../utils/legerblockWebhook';
import { parseSavingsDepositUpstreamApplicationId } from '../utils/savingsDepositReference';
import { forwardExternalSavingsDepositToProductMs } from '../services/savingsDepositWebhookService';
import { notifyTransactionReceipt } from '../services/transactionReceiptService';
import type { Transaction } from '../models/Wallet';

interface FundingCallbackData {
  id?: string;
  type?: string;
  walletId?: string;
  userId?: string;
  amount: number;
  currency: string;
  transactionId: string;
  paymentMethod: string;
  status: string;
  description?: string;
  providerReference?: string;
  signature?: string;
  merchantId?: string;
  appId?: string;
  merchantWalletType?: MerchantWalletType;
  onusReference?: string;
  paymentChannel?: string;
  paymentStatus?: string;
  transactionAmount?: number;
  businessId?: string;
  merchantReference?: string;
  accountNumber?: string;
  virtual_account_number?: string;
  hash?: string;
  transactionFee?: number;
  sessionId?: string;
  businessName?: string;
  merchantName?: string;
  customerName?: string;
  customerEmail?: string;
  beneficiaryAccountName?: string;
  beneficiaryBankName?: string;
  beneficiaryBankCode?: string;
  senderName?: string;
  senderAccountNumber?: string;
  senderBankName?: string;
  senderBankCode?: string;
  transactionDateTime?: string;
  fixedAccountId?: string;
  fixedAccountMerchantReference?: string;
}

type FundingTransactionAudit = {
  referenceId?: string;
  category?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  externalReference?: string;
  ipAddress?: string;
  userAgent?: string;
};

const processedTransactions = new Set<string>();

function readHeaderValue(req: Request, name: string): string | undefined {
  const value = req.header(name);
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function mapPaymentStatus(status?: string): string {
  const normalized = (status || '').trim().toUpperCase();
  if (normalized === 'SUCCESSFUL' || normalized === 'SUCCESS') return 'SUCCESS';
  if (normalized === 'COMPLETED') return 'COMPLETED';
  if (normalized === 'FAILED') return 'FAILED';
  if (normalized === 'CANCELLED') return 'CANCELLED';
  return 'PENDING';
}

function mapPaymentMethod(channel?: string): string {
  const normalized = (channel || '').trim().toUpperCase();
  if (normalized === 'CARD') return 'CARD';
  if (normalized.includes('BANK')) return 'BANK_TRANSFER';
  if (normalized.includes('WALLET')) return 'WALLET';
  return 'OTHER';
}

function parseFundingAmount(data: Record<string, unknown>): number {
  const amount = data.amount;
  const transactionAmount = data.transactionAmount;
  if (typeof amount === 'number' && Number.isFinite(amount)) return amount;
  if (typeof transactionAmount === 'number' && Number.isFinite(transactionAmount)) return transactionAmount;
  const raw =
    (typeof transactionAmount === 'string' ? transactionAmount : undefined) ??
    (typeof amount === 'string' ? amount : undefined);
  if (raw?.trim()) {
    const parsed = Number(raw.replace(/,/g, '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeFundingCallback(data: FundingCallbackData): FundingCallbackData {
  const transactionId = data.transactionId || data.onusReference || data.id || data.providerReference || '';
  const amount = parseFundingAmount(data as unknown as Record<string, unknown>);

  return {
    ...data,
    transactionId: transactionId || data.transactionId,
    amount,
    currency: (data.currency || 'NGN').toUpperCase(),
    status: mapPaymentStatus(data.status || data.paymentStatus),
    paymentMethod: data.paymentMethod || mapPaymentMethod(data.paymentChannel || data.type),
    providerReference: data.providerReference || data.onusReference || data.merchantReference,
    merchantId: data.merchantId || (data.accountNumber || data.virtual_account_number ? undefined : data.businessId),
    merchantWalletType:
      normalizeMerchantWalletType(String(data.merchantWalletType || '')) ||
      (data.userId || data.walletId ? undefined : payonusWebhookConfig.defaultMerchantWalletType),
    description:
      data.description ||
      `PayOnUs ${data.type || 'transaction'} (${data.paymentStatus || data.status || 'PENDING'})`,
    accountNumber: data.accountNumber || data.virtual_account_number,
    hash: data.hash
  };
}

function mergeFundingCallbackBody(rawBody: unknown): FundingCallbackData {
  const flatRaw =
    rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
      ? (rawBody as FundingCallbackData)
      : ({} as FundingCallbackData);
  const parsed = parsePayonusFundingWebhookBody(rawBody);
  return normalizeFundingCallback({
    ...flatRaw,
    ...parsed
  });
}

function sanitizeForMetadata(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[max-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 20000 ? `${value.slice(0, 20000)}...[truncated]` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForMetadata(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/authorization|password|secret|token|api[-_]?key|client[-_]?secret/i.test(key)) {
        output[key] = '[redacted]';
      } else {
        output[key] = sanitizeForMetadata(nested, depth + 1);
      }
    }
    return output;
  }

  return String(value);
}

function compactMetadataObject(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function buildPayonusReceiptMetadata(callbackData: FundingCallbackData): Record<string, unknown> {
  return compactMetadataObject({
    transactionId: callbackData.transactionId,
    transactionDateTime: callbackData.transactionDateTime,
    paymentChannel: callbackData.paymentChannel || callbackData.paymentMethod,
    transactionStatus: callbackData.paymentStatus || callbackData.status,
    transactionAmount: callbackData.transactionAmount ?? callbackData.amount,
    transactionFee: callbackData.transactionFee,
    currency: callbackData.currency,
    businessName: callbackData.businessName,
    merchantName: callbackData.merchantName,
    customerName: callbackData.customerName,
    customerEmail: callbackData.customerEmail,
    beneficiaryAccountName: callbackData.beneficiaryAccountName,
    beneficiaryAccountNumber: callbackData.accountNumber || callbackData.virtual_account_number,
    beneficiaryBankName: callbackData.beneficiaryBankName,
    beneficiaryBankCode: callbackData.beneficiaryBankCode,
    senderName: callbackData.senderName,
    senderAccountNumber: callbackData.senderAccountNumber,
    senderBankName: callbackData.senderBankName,
    senderBankCode: callbackData.senderBankCode,
    onusReference: callbackData.onusReference,
    merchantReference: callbackData.merchantReference,
    sessionId: callbackData.sessionId,
    businessId: callbackData.businessId,
    fixedAccountId: callbackData.fixedAccountId,
    fixedAccountMerchantReference: callbackData.fixedAccountMerchantReference
  });
}

function buildFundingTransactionAudit(
  req: Request,
  rawBody: unknown,
  callbackData: FundingCallbackData,
  validatedData: FundingCallbackData
): FundingTransactionAudit {
  const referenceId = callbackData.onusReference || callbackData.transactionId || validatedData.transactionId;
  const externalReference =
    callbackData.onusReference || callbackData.providerReference || callbackData.merchantReference || callbackData.transactionId;
  const isPayonus = Boolean(callbackData.accountNumber || callbackData.onusReference || callbackData.businessId);
  const payonusReceipt = buildPayonusReceiptMetadata(callbackData);
  const decodedRawPayload = parsePayonusRawPayload(rawBody);

  return {
    referenceId,
    externalReference,
    category: 'FUNDING',
    source: isPayonus ? 'payonus' : 'funding_callback',
    tags: ['funding', ...(isPayonus ? ['payonus'] : [])],
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    metadata: {
      provider: isPayonus ? 'payonus' : 'external',
      receivedAt: new Date().toISOString(),
      rawPayload: sanitizeForMetadata(rawBody),
      decodedRawPayload: sanitizeForMetadata(decodedRawPayload),
      parsedPayload: sanitizeForMetadata(callbackData),
      payonus: sanitizeForMetadata(payonusReceipt),
      references: {
        transactionId: callbackData.transactionId || validatedData.transactionId,
        onusReference: callbackData.onusReference,
        providerReference: callbackData.providerReference,
        merchantReference: callbackData.merchantReference,
        businessId: callbackData.businessId,
        accountNumber: callbackData.accountNumber,
        sessionId: callbackData.sessionId,
        fixedAccountId: callbackData.fixedAccountId,
        fixedAccountMerchantReference: callbackData.fixedAccountMerchantReference
      },
      parties: {
        business: compactMetadataObject({
          name: callbackData.businessName,
          businessId: callbackData.businessId
        }),
        merchant: compactMetadataObject({
          name: callbackData.merchantName,
          merchantReference: callbackData.merchantReference
        }),
        customer: compactMetadataObject({
          name: callbackData.customerName,
          email: callbackData.customerEmail
        }),
        beneficiary: compactMetadataObject({
          accountName: callbackData.beneficiaryAccountName,
          accountNumber: callbackData.accountNumber || callbackData.virtual_account_number,
          bankName: callbackData.beneficiaryBankName,
          bankCode: callbackData.beneficiaryBankCode
        }),
        sender: compactMetadataObject({
          name: callbackData.senderName,
          accountNumber: callbackData.senderAccountNumber,
          bankName: callbackData.senderBankName,
          bankCode: callbackData.senderBankCode
        })
      },
      payment: compactMetadataObject({
        channel: callbackData.paymentChannel || callbackData.paymentMethod,
        status: callbackData.paymentStatus || callbackData.status,
        amount: callbackData.transactionAmount ?? callbackData.amount,
        fee: callbackData.transactionFee,
        currency: callbackData.currency,
        transactionDateTime: callbackData.transactionDateTime
      }),
      http: {
        contentType: req.get('content-type'),
        userAgent: req.get('user-agent'),
        ipAddress: req.ip || req.socket.remoteAddress,
        topLevelKeys: getRawBodyTopLevelKeys(rawBody)
      }
    }
  };
}

/** Email + in-app receipt when a storefront user's wallet is credited via PayOnUs / bank transfer. */
function notifyUserWalletFundingReceipt(
  userId: string | undefined,
  amount: number,
  transaction?: Transaction
): void {
  if (!userId || amount <= 0 || !transaction) return;
  void notifyTransactionReceipt(transaction);
}

async function mirrorFundingToAppTransactions(input: {
  appId?: string;
  userId?: string;
  walletId: string;
  amount: number;
  currency: string;
  description?: string;
  transactionId: string;
  onusReference?: string;
  providerReference?: string;
  audit: FundingTransactionAudit;
}): Promise<void> {
  await AppTransactionMirrorService.recordTransaction({
    appId: input.appId,
    userId: input.userId,
    walletId: input.walletId,
    amount: input.amount,
    currency: input.currency,
    type: input.amount >= 0 ? 'credit' : 'debit',
    status: 'completed',
    description: input.description || `PayOnUs funding ${input.onusReference || input.transactionId}`,
    reference: input.transactionId,
    metaRef: input.onusReference || input.providerReference || input.transactionId,
    provider: input.audit.source === 'payonus' ? 'payonus' : 'wallet-ms',
    providerReference: input.audit.externalReference || input.onusReference || input.transactionId,
    metadata: input.audit.metadata
  });
}

async function enrichCallbackFromVirtualAccount(callbackData: FundingCallbackData): Promise<FundingCallbackData> {
  const accountNumber = (callbackData.accountNumber || '').trim();
  if (!accountNumber) return callbackData;
  if (callbackData.walletId || callbackData.userId || callbackData.merchantId) return callbackData;

  const walletLookup = await WalletService.getWalletByPayonusAccountNumber(accountNumber);
  if (!walletLookup.success || !walletLookup.wallet) return callbackData;

  const wallet = walletLookup.wallet;
  if (wallet.walletType === 'MERCHANT') {
    return {
      ...callbackData,
      walletId: wallet.id,
      merchantId: wallet.merchantId,
      appId: wallet.appId,
      merchantWalletType: wallet.merchantWalletType
    };
  }

  return {
    ...callbackData,
    walletId: wallet.id,
    userId: wallet.userId,
    merchantId: wallet.merchantId,
    appId: wallet.appId
  };
}

function verifyPayonusWebhookSignature(payload: FundingCallbackData, incomingHash?: string): boolean {
  if (!payonusWebhookConfig.enabled) return true;
  if (!payonusWebhookConfig.enforceSignature) return true;
  if (!payonusWebhookConfig.verificationKey) return false;
  if (!incomingHash) return false;

  const accountNumber = payload.accountNumber || '';
  const onusReference = payload.onusReference || payload.transactionId || '';
  const paymentStatus = payload.paymentStatus || payload.status || '';
  const verificationString = `${accountNumber}${onusReference}${paymentStatus}${payonusWebhookConfig.verificationKey}`;
  const computedHash = crypto.createHash('sha256').update(verificationString, 'utf8').digest('hex');

  const provided = incomingHash.toLowerCase();
  const computed = computedHash.toLowerCase();
  if (provided.length !== computed.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed, 'utf8'), Buffer.from(provided, 'utf8'));
}

function extractPayoutStatusFields(callbackData: FundingCallbackData): {
  onusReference?: string;
  merchantReference?: string;
  providerStatus?: string;
} {
  return {
    onusReference: callbackData.onusReference || callbackData.providerReference || callbackData.transactionId,
    merchantReference: callbackData.merchantReference,
    providerStatus: callbackData.paymentStatus || callbackData.status
  };
}

/**
 * Detect whether an inbound PayOnUs callback corresponds to a known outbound payout
 * transaction. PayOnUs may deliver payout status callbacks to the same notification URL
 * as funding credits, so the funding handler delegates to the payout handler when it
 * sees a reference that matches an existing PAYONUS payout/settlement-payout transaction.
 */
async function matchesKnownPayout(callbackData: FundingCallbackData): Promise<boolean> {
  const { onusReference, merchantReference } = extractPayoutStatusFields(callbackData);
  const refs = [onusReference, merchantReference].filter((r): r is string => Boolean(r && r.trim()));
  for (const ref of refs) {
    const byExternal = await WalletService.findPayonusPayoutTransaction(ref);
    if (byExternal) return true;
  }
  return false;
}

export class FundingController {
  static async describeFundingCallback(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      service: 'Wallet Microservice',
      version: '1.0.0',
      status: 'running',
      endpoint: '/api/v1/wallets/funding/callback',
      method: 'POST',
      message: 'PayOnUs and payment providers should POST funding webhooks to this URL.',
      endpoints: {
        health: '/health',
        apiDocs: '/api-docs',
        openApiSpec: '/api-docs.json',
        wallets: '/api/v1/wallets',
        transactions: '/api/v1/transactions',
        fundingCallback: '/api/v1/wallets/funding/callback',
        fundingStatus: '/api/v1/wallets/funding/status/:transactionId'
      },
      features: [
        'User Wallets',
        'Merchant Wallets (Billing, KYC, Repayment)',
        'Wallet Balance Management',
        'Transaction History',
        'Wallet Funding',
        'Transfer Operations'
      ],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Dedicated PayOnUs payout status webhook. Updates the matching payout transaction
   * and reverses the wallet debit automatically when the payout fails or is reversed.
   *
   * Configure PAYONUS_PAYOUT_NOTIFICATION_URL to point at this endpoint
   * (e.g. https://<gateway>/api/v1/wallets/payout/callback).
   */
  static async handlePayoutStatusCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBody = req.body;
      const callbackData = mergeFundingCallbackBody(rawBody);
      const { onusReference, merchantReference, providerStatus } = extractPayoutStatusFields(callbackData);

      logger.info('PayOnUs payout status callback received', {
        contentType: req.get('content-type'),
        topLevelKeys: getRawBodyTopLevelKeys(rawBody),
        onusReference,
        merchantReference,
        providerStatus,
        mappedStatus: mapPayoutProviderStatus(providerStatus)
      });

      const incomingHash = readHeaderValue(req, 'hash') || callbackData.hash;
      const hasPayonusSignatureContext = Boolean(callbackData.onusReference || callbackData.paymentStatus);
      if (
        payonusWebhookConfig.enforceSignature &&
        hasPayonusSignatureContext &&
        !verifyPayonusWebhookSignature(callbackData, incomingHash)
      ) {
        logger.warn('Rejected PayOnUs payout callback: invalid signature', { onusReference, merchantReference });
        res.status(401).json({ success: false, error: 'Invalid webhook signature' });
        return;
      }

      if (!onusReference && !merchantReference) {
        res.status(400).json({ success: false, error: 'onusReference or merchantReference is required' });
        return;
      }

      const result = await WalletService.applyPayoutStatusUpdate({
        onusReference,
        merchantReference,
        providerStatus,
        rawPayload: sanitizeForMetadata(parsePayonusRawPayload(rawBody)) as Record<string, unknown>
      });

      if (!result.success) {
        res.status(500).json({ success: false, error: result.error || 'Failed to process payout status callback' });
        return;
      }

      // Always acknowledge with 200 so PayOnUs does not retry indefinitely, even when
      // the reference does not match a known payout (e.g. duplicate or unrelated event).
      res.status(200).json({
        success: true,
        matched: result.matched,
        refunded: result.refunded ?? false,
        alreadyApplied: result.alreadyApplied ?? false,
        status: result.status,
        transactionId: result.transactionId,
        message: result.matched
          ? 'Payout status callback processed'
          : 'No matching payout transaction; acknowledged'
      });
    } catch (error) {
      logger.error('Error processing payout status callback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async handleFundingCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBody = req.body;
      const callbackData = await enrichCallbackFromVirtualAccount(mergeFundingCallbackBody(rawBody));

      // PayOnUs may deliver payout status callbacks to the funding notification URL.
      // If the reference matches a known outbound payout, handle it as a payout status
      // update (and reverse on failure) instead of treating it as an inbound credit.
      if (await matchesKnownPayout(callbackData)) {
        const { onusReference, merchantReference, providerStatus } = extractPayoutStatusFields(callbackData);
        logger.info('Funding callback matched an outbound payout; delegating to payout handler', {
          onusReference,
          merchantReference,
          providerStatus
        });
        const result = await WalletService.applyPayoutStatusUpdate({
          onusReference,
          merchantReference,
          providerStatus,
          rawPayload: sanitizeForMetadata(parsePayonusRawPayload(rawBody)) as Record<string, unknown>
        });
        res.status(result.success ? 200 : 500).json({
          success: result.success,
          payout: true,
          matched: result.matched,
          refunded: result.refunded ?? false,
          status: result.status,
          transactionId: result.transactionId,
          ...(result.success ? {} : { error: result.error })
        });
        return;
      }

      logger.info('PayOnUs funding callback received', {
        contentType: req.get('content-type'),
        userAgent: req.get('user-agent'),
        topLevelKeys: getRawBodyTopLevelKeys(rawBody),
        parsedAccountNumber: callbackData.accountNumber,
        parsedTransactionId: callbackData.transactionId,
        parsedOnusReference: callbackData.onusReference,
        parsedAmount: callbackData.amount,
        parsedStatus: callbackData.status || callbackData.paymentStatus
      });
      const incomingHash = readHeaderValue(req, 'hash') || callbackData.hash;

      const hasPayonusSignatureContext =
        Boolean(callbackData.onusReference || callbackData.paymentStatus || callbackData.businessId);
      if (hasPayonusSignatureContext && !verifyPayonusWebhookSignature(callbackData, incomingHash)) {
        logger.warn('Rejected PayOnUs webhook: invalid signature', {
          transactionId: callbackData.transactionId,
          onusReference: callbackData.onusReference,
          businessId: callbackData.businessId
        });
        res.status(401).json({
          success: false,
          error: 'Invalid webhook signature'
        });
        return;
      }

      logger.info('Received funding callback', {
        transactionId: callbackData.transactionId,
        onusReference: callbackData.onusReference,
        walletId: callbackData.walletId,
        userId: callbackData.userId,
        merchantId: callbackData.merchantId,
        appId: callbackData.appId,
        merchantWalletType: callbackData.merchantWalletType,
        amount: callbackData.amount,
        status: callbackData.status
      });

      const { error, value } = validateInput<FundingCallbackData>(fundingCallbackSchema, callbackData);
      if (error) {
        logger.warn('Funding callback validation failed', {
          error,
          contentType: req.get('content-type'),
          userAgent: req.get('user-agent'),
          topLevelKeys: getRawBodyTopLevelKeys(rawBody),
          rawBodyPreview: summarizeRawBodyForLog(rawBody),
          parsedCallback: {
            transactionId: callbackData.transactionId,
            onusReference: callbackData.onusReference,
            accountNumber: callbackData.accountNumber,
            amount: callbackData.amount,
            currency: callbackData.currency,
            status: callbackData.status,
            paymentStatus: callbackData.paymentStatus,
            paymentMethod: callbackData.paymentMethod
          }
        });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const {
        walletId,
        userId,
        amount,
        transactionId,
        status,
        description,
        providerReference,
        merchantId,
        appId,
        merchantWalletType,
        onusReference
      } = value!;

      const dedupeKey = onusReference || transactionId;
      if (processedTransactions.has(dedupeKey)) {
        logger.warn('Duplicate funding callback received', {
          transactionId,
          onusReference,
          walletId,
          userId,
          merchantId
        });

        res.status(200).json({
          success: true,
          message: 'Transaction already processed',
          duplicate: true
        });
        return;
      }

      if (status !== 'SUCCESS' && status !== 'COMPLETED') {
        logger.info('Funding callback received for non-successful transaction', {
          transactionId,
          status
        });

        res.status(200).json({
          success: true,
          message: 'Callback received but transaction not successful'
        });
        return;
      }

      const transactionAudit = buildFundingTransactionAudit(req, rawBody, callbackData, value!);

      const savingsUpstreamApplicationId = parseSavingsDepositUpstreamApplicationId(
        value!.merchantReference || callbackData.merchantReference || callbackData.description
      );
      if (savingsUpstreamApplicationId) {
        const providerReference = onusReference || transactionId;
        const savingsResult = await forwardExternalSavingsDepositToProductMs({
          upstreamApplicationId: savingsUpstreamApplicationId,
          amount,
          currency: value!.currency || callbackData.currency || 'NGN',
          providerReference,
          merchantId,
          appId
        });

        if (!savingsResult.success) {
          const statusCode =
            savingsResult.status && savingsResult.status >= 400 && savingsResult.status < 600
              ? savingsResult.status
              : 502;
          res.status(statusCode).json({
            success: false,
            error: savingsResult.error || 'Failed to record external savings deposit'
          });
          return;
        }

        processedTransactions.add(dedupeKey);

        res.status(200).json({
          success: true,
          duplicate: savingsResult.duplicate === true,
          message: 'External savings deposit recorded',
          data: {
            upstreamApplicationId: savingsUpstreamApplicationId,
            amount,
            transactionId,
            providerReference
          }
        });
        return;
      }

      if (walletId && userId) {
        logger.info('Processing user wallet funding by resolved walletId', {
          walletId,
          userId,
          merchantId,
          amount,
          transactionId
        });

        const userWalletResult = await WalletService.getUserWallet(userId);
        if (!userWalletResult.success || !userWalletResult.wallet) {
          res.status(404).json({
            success: false,
            error: 'User wallet not found'
          });
          return;
        }

        if (userWalletResult.wallet.id !== walletId) {
          res.status(400).json({
            success: false,
            error: 'Resolved wallet does not match user wallet'
          });
          return;
        }

        if (userWalletResult.wallet.merchantId !== merchantId) {
          res.status(400).json({
            success: false,
            error: 'User wallet does not belong to the specified merchant'
          });
          return;
        }

        const result = await WalletService.updateWalletBalance(
          walletId,
          amount,
          description || `Funding via ${providerReference || 'external provider'}`,
          transactionAudit
        );

        if (!result.success) {
          res.status(500).json({
            success: false,
            error: result.error
          });
          return;
        }

        await mirrorFundingToAppTransactions({
          appId: appId || userWalletResult.wallet.appId,
          userId,
          walletId,
          amount,
          currency: value!.currency,
          description,
          transactionId,
          onusReference,
          providerReference,
          audit: transactionAudit
        });

        notifyUserWalletFundingReceipt(userId, amount, result.transaction);

        processedTransactions.add(dedupeKey);

        logger.info('User wallet balance updated from funding callback', {
          walletId,
          userId,
          merchantId,
          amount,
          newMainBalance: result.wallet?.mainBalance,
          newLedgerBalance: result.wallet?.ledgerBalance,
          transactionId
        });

        res.status(200).json({
          success: true,
          message: 'User wallet funding callback processed successfully',
          data: {
            walletId,
            userId,
            merchantId,
            newMainBalance: result.wallet?.mainBalance,
            newLedgerBalance: result.wallet?.ledgerBalance,
            transactionId
          }
        });
        return;
      }

      if (merchantId && merchantWalletType) {
        logger.info('Processing merchant wallet funding', {
          merchantId,
          appId,
          merchantWalletType,
          amount,
          transactionId
        });

        const merchantWalletResult = await WalletService.getMerchantWalletByType(
          merchantId,
          merchantWalletType,
          appId
        );
        if (!merchantWalletResult.success || !merchantWalletResult.wallet) {
          logger.error('Failed to find merchant wallet for funding', {
            merchantId,
            appId,
            merchantWalletType,
            transactionId
          });

          res.status(404).json({
            success: false,
            error: `Merchant ${merchantWalletType} wallet not found`
          });
          return;
        }

        const result = await WalletService.updateWalletBalance(
          merchantWalletResult.wallet.id,
          amount,
          description || `Funding via ${providerReference || 'external provider'} for ${merchantWalletType} wallet`,
          transactionAudit
        );

        if (!result.success) {
          logger.error('Failed to update merchant wallet balance from funding callback', {
            walletId: merchantWalletResult.wallet.id,
            amount,
            error: result.error
          });

          res.status(500).json({
            success: false,
            error: result.error
          });
          return;
        }

        await mirrorFundingToAppTransactions({
          appId: appId || merchantWalletResult.wallet.appId,
          walletId: merchantWalletResult.wallet.id,
          amount,
          currency: value!.currency,
          description,
          transactionId,
          onusReference,
          providerReference,
          audit: transactionAudit
        });

        processedTransactions.add(dedupeKey);

        logger.info('Merchant wallet balance updated from funding callback', {
          walletId: merchantWalletResult.wallet.id,
          merchantId,
          appId,
          merchantWalletType,
          amount,
          newMainBalance: result.wallet?.mainBalance,
          newLedgerBalance: result.wallet?.ledgerBalance,
          transactionId
        });

        res.status(200).json({
          success: true,
          message: 'Merchant wallet funding callback processed successfully',
          data: {
            walletId: merchantWalletResult.wallet.id,
            merchantId,
            appId,
            merchantWalletType,
            newMainBalance: result.wallet?.mainBalance,
            newLedgerBalance: result.wallet?.ledgerBalance,
            transactionId
          }
        });
        return;
      }

      if (userId && merchantId && !walletId) {
        logger.info('Processing user wallet funding by userId', {
          userId,
          merchantId,
          amount,
          transactionId
        });

        const userWalletResult = await WalletService.getUserWallet(userId);
        if (!userWalletResult.success || !userWalletResult.wallet) {
          logger.error('Failed to find user wallet for funding', {
            userId,
            merchantId,
            transactionId
          });

          res.status(404).json({
            success: false,
            error: 'User wallet not found'
          });
          return;
        }

        if (userWalletResult.wallet.merchantId !== merchantId) {
          logger.error('User wallet does not belong to specified merchant', {
            userId,
            walletMerchantId: userWalletResult.wallet.merchantId,
            requestedMerchantId: merchantId,
            transactionId
          });

          res.status(400).json({
            success: false,
            error: 'User wallet does not belong to the specified merchant'
          });
          return;
        }

        const result = await WalletService.updateWalletBalance(
          userWalletResult.wallet.id,
          amount,
          description || `Funding via ${providerReference || 'external provider'}`,
          transactionAudit
        );

        if (!result.success) {
          logger.error('Failed to update user wallet balance from funding callback', {
            walletId: userWalletResult.wallet.id,
            userId,
            merchantId,
            amount,
            error: result.error
          });

          res.status(500).json({
            success: false,
            error: result.error
          });
          return;
        }

        await mirrorFundingToAppTransactions({
          appId: userWalletResult.wallet.appId,
          userId,
          walletId: userWalletResult.wallet.id,
          amount,
          currency: value!.currency,
          description,
          transactionId,
          onusReference,
          providerReference,
          audit: transactionAudit
        });

        notifyUserWalletFundingReceipt(userId, amount, result.transaction);

        processedTransactions.add(dedupeKey);

        logger.info('User wallet balance updated from funding callback', {
          walletId: userWalletResult.wallet.id,
          userId,
          merchantId,
          amount,
          newMainBalance: result.wallet?.mainBalance,
          newLedgerBalance: result.wallet?.ledgerBalance,
          transactionId
        });

        res.status(200).json({
          success: true,
          message: 'User wallet funding callback processed successfully',
          data: {
            walletId: userWalletResult.wallet.id,
            userId,
            merchantId,
            newMainBalance: result.wallet?.mainBalance,
            newLedgerBalance: result.wallet?.ledgerBalance,
            transactionId
          }
        });
        return;
      }

      if (!walletId) {
        logger.error('Missing required fields for funding', {
          walletId,
          userId,
          merchantId,
          merchantWalletType,
          transactionId
        });

        res.status(400).json({
          success: false,
          error:
            'Either walletId or (userId + merchantId) or (merchantId + merchantWalletType) or a resolvable Payonus account number must be provided'
        });
        return;
      }

      const result = await WalletService.updateWalletBalance(
        walletId,
        amount,
        description || `Funding via ${providerReference || 'external provider'}`,
        transactionAudit
      );

      if (!result.success) {
        logger.error('Failed to update wallet balance from funding callback', {
          walletId,
          amount,
          error: result.error
        });

        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      await mirrorFundingToAppTransactions({
        appId,
        userId,
        walletId,
        amount,
        currency: value!.currency,
        description,
        transactionId,
        onusReference,
        providerReference,
        audit: transactionAudit
      });

      notifyUserWalletFundingReceipt(userId, amount, result.transaction);

      processedTransactions.add(dedupeKey);

      logger.info('Wallet balance updated from funding callback', {
        walletId,
        amount,
        newMainBalance: result.wallet?.mainBalance,
        newLedgerBalance: result.wallet?.ledgerBalance,
        transactionId
      });

      res.status(200).json({
        success: true,
        message: 'Funding callback processed successfully',
        data: {
          walletId,
          newMainBalance: result.wallet?.mainBalance,
          newLedgerBalance: result.wallet?.ledgerBalance,
          transactionId
        }
      });
    } catch (error) {
      logger.error('Error processing funding callback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      next(error);
    }
  }

  static async checkFundingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: 'Transaction ID is required'
        });
        return;
      }

      logger.info('Checking funding status', {
        transactionId
      });

      res.status(200).json({
        success: true,
        data: {
          transactionId,
          status: 'COMPLETED',
          message: 'Funding transaction completed successfully'
        }
      });
    } catch (error) {
      logger.error('Error checking funding status', {
        transactionId: req.params.transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      next(error);
    }
  }

  /**
   * LegerBlock collection (funding) webhook.
   * Configure LEGERBLOCK_COLLECTION_NOTIFICATION_URL to this path.
   */
  static async handleLegerblockFundingCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBodyBuf = (req as Request & { rawBody?: Buffer }).rawBody;
      const rawBodyText = rawBodyBuf?.toString('utf8') || JSON.stringify(req.body ?? {});
      const signature = readHeaderValue(req, 'x-ledgerblock-signature');

      if (!verifyLegerblockSignature(rawBodyText, signature)) {
        logger.warn('Rejected LegerBlock funding webhook: invalid signature');
        res.status(401).json({ success: false, error: 'Invalid webhook signature' });
        return;
      }

      const parsed = parseLegerblockCollectionWebhook(req.body);
      const paymentStatus = mapPaymentStatus(parsed.paymentStatus);
      const transactionId = parsed.txRef || `legerblock:${parsed.accountNumber || 'unknown'}:${Date.now()}`;

      logger.info('LegerBlock funding callback received', {
        accountNumber: parsed.accountNumber,
        txRef: parsed.txRef,
        amount: parsed.amount,
        paymentStatus: parsed.paymentStatus
      });

      if (paymentStatus !== 'SUCCESS' && paymentStatus !== 'COMPLETED') {
        res.status(200).json({ success: true, message: 'Callback received but transaction not successful' });
        return;
      }

      if (!parsed.accountNumber || !parsed.amount || parsed.amount <= 0) {
        res.status(400).json({ success: false, error: 'account_number and positive amount are required' });
        return;
      }

      if (processedTransactions.has(transactionId)) {
        res.status(200).json({ success: true, message: 'Transaction already processed', duplicate: true });
        return;
      }

      const walletLookup = await WalletService.getWalletByPayonusAccountNumber(parsed.accountNumber);
      if (!walletLookup.success || !walletLookup.wallet) {
        res.status(404).json({ success: false, error: 'Wallet not found for account number' });
        return;
      }

      const wallet = walletLookup.wallet;
      const result = await WalletService.updateWalletBalance(
        wallet.id,
        parsed.amount,
        `Funding via LegerBlock ${parsed.txRef || ''}`.trim(),
        {
          referenceId: transactionId,
          category: 'FUNDING',
          source: 'LEGERBLOCK',
          externalReference: parsed.txRef,
          metadata: {
            provider: 'legerblock',
            legerblock: parsed.raw,
            sender: parsed.sender
          },
          tags: ['legerblock', 'funding'],
          ipAddress: req.ip,
          userAgent: req.get('user-agent') || undefined
        }
      );

      if (!result.success) {
        res.status(500).json({ success: false, error: result.error || 'Failed to credit wallet' });
        return;
      }

      processedTransactions.add(transactionId);
      res.status(200).json({
        success: true,
        message: 'LegerBlock funding processed',
        data: { walletId: wallet.id, amount: parsed.amount, transactionId }
      });
    } catch (error) {
      logger.error('Error processing LegerBlock funding callback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  /**
   * LegerBlock payout status webhook.
   * Configure LEGERBLOCK_PAYOUT_NOTIFICATION_URL to this path.
   */
  static async handleLegerblockPayoutCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBodyBuf = (req as Request & { rawBody?: Buffer }).rawBody;
      const rawBodyText = rawBodyBuf?.toString('utf8') || JSON.stringify(req.body ?? {});
      const signature = readHeaderValue(req, 'x-ledgerblock-signature');

      if (!verifyLegerblockSignature(rawBodyText, signature)) {
        logger.warn('Rejected LegerBlock payout webhook: invalid signature');
        res.status(401).json({ success: false, error: 'Invalid webhook signature' });
        return;
      }

      const parsed = parseLegerblockPayoutWebhook(req.body);
      logger.info('LegerBlock payout callback received', {
        reference: parsed.reference,
        status: parsed.status,
        event: parsed.event
      });

      if (!parsed.reference) {
        res.status(400).json({ success: false, error: 'payout reference is required' });
        return;
      }

      const result = await WalletService.applyPayoutStatusUpdate({
        onusReference: parsed.reference,
        merchantReference: parsed.reference,
        providerStatus: parsed.status,
        rawPayload: { provider: 'legerblock', ...parsed.raw }
      });

      res.status(result.success ? 200 : 500).json({
        success: result.success,
        matched: result.matched,
        refunded: result.refunded ?? false,
        alreadyApplied: result.alreadyApplied ?? false,
        status: result.status,
        transactionId: result.transactionId,
        ...(result.success ? {} : { error: result.error })
      });
    } catch (error) {
      logger.error('Error processing LegerBlock payout callback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }
}
