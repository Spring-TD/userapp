import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { WalletService } from '../services';
import { payonusWebhookConfig } from '../config/payonusWebhook';
import { logger } from '../utils/logger';
import { validateInput, fundingCallbackSchema } from '../utils/validation';
import { MerchantWalletType } from '../models/Wallet';
import { normalizeMerchantWalletType } from '../utils/merchantWalletType';

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
}

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

function normalizeFundingCallback(data: FundingCallbackData): FundingCallbackData {
  const transactionId = data.transactionId || data.onusReference || data.id;
  if (!transactionId) return data;

  const amount =
    typeof data.amount === 'number'
      ? data.amount
      : typeof data.transactionAmount === 'number'
        ? data.transactionAmount
        : Number(data.transactionAmount || 0);

  return {
    ...data,
    transactionId,
    amount,
    currency: data.currency || 'NGN',
    status: data.status || mapPaymentStatus(data.paymentStatus),
    paymentMethod: data.paymentMethod || mapPaymentMethod(data.paymentChannel),
    providerReference: data.providerReference || data.onusReference,
    merchantId: data.merchantId || data.businessId,
    merchantWalletType:
      normalizeMerchantWalletType(String(data.merchantWalletType || '')) ||
      payonusWebhookConfig.defaultMerchantWalletType,
    description:
      data.description ||
      `PayOnUs ${data.type || 'transaction'} (${data.paymentStatus || data.status || 'PENDING'})`,
    accountNumber: data.accountNumber || data.virtual_account_number,
    hash: data.hash
  };
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
    merchantId: wallet.merchantId
  };
}

function verifyPayonusWebhookSignature(payload: FundingCallbackData, incomingHash?: string): boolean {
  if (!payonusWebhookConfig.enabled) return true;
  if (!payonusWebhookConfig.verificationKey) return !payonusWebhookConfig.enforceSignature;
  if (!incomingHash) return !payonusWebhookConfig.enforceSignature;

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

export class FundingController {
  static async handleFundingCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const normalized = normalizeFundingCallback(req.body as FundingCallbackData);
      const callbackData = await enrichCallbackFromVirtualAccount(normalized);
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
        logger.warn('Funding callback validation failed', { error });
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
          description || `Funding via ${providerReference || 'external provider'} for ${merchantWalletType} wallet`
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
          description || `Funding via ${providerReference || 'external provider'}`
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
        description || `Funding via ${providerReference || 'external provider'}`
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
}
