import * as walletRepo from '../repositories/walletRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import { TransactionModel } from '../models/TransactionModel';
import { WalletStatus, TransactionType, TransactionStatus, type MerchantWallet, type Transaction } from '../models/Wallet';
import { assertIntegerKobo, nairaToKobo } from '../utils/money';
import { logger } from '../utils/logger';
import { WalletService } from './walletService';

export type MaturityWithdrawalRequestInput = {
  creatorMerchantId: string;
  creatorAppId: string;
  amount: number;
  /** When true, `amount` / principal / interest are already integer kobo. Default: naira. */
  amountUnit?: 'kobo' | 'naira';
  principalAmount?: number;
  interestAmount?: number;
  currency?: string;
  referenceId: string;
  description?: string;
  productId?: string;
  productType?: string;
  applicationId?: string;
  offeringMerchantId?: string;
  offeringAppId?: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  productName?: string;
  maturityAt?: string;
  springLocalApplicationId?: string;
  metadata?: Record<string, unknown>;
};

function categoryForProductType(productType: string): string {
  if (productType === 'SAVINGS') return 'SAVINGS_MATURITY_PAYOUT';
  if (productType === 'INVESTMENT') return 'INVESTMENT_LIQUIDATION_REQUEST';
  return 'COMMODITY_LIQUIDATION_REQUEST';
}

function toKobo(amount: number | undefined, unit: 'kobo' | 'naira'): number {
  if (amount == null || !Number.isFinite(amount)) return 0;
  return unit === 'kobo' ? Math.trunc(amount) : nairaToKobo(amount);
}

/**
 * Enqueue a maturity / liquidation payout on the creator Treasury ledger as PENDING.
 * Does not debit balance — merchant must Approve in the Withdrawals console.
 */
export async function enqueueMaturityWithdrawalRequest(
  input: MaturityWithdrawalRequestInput
): Promise<{
  success: boolean;
  duplicate?: boolean;
  transaction?: Transaction;
  treasuryWallet?: MerchantWallet;
  error?: string;
}> {
  try {
    const merchantId = input.creatorMerchantId.trim();
    const appId = input.creatorAppId.trim();
    const referenceId = input.referenceId.trim();
    if (!merchantId || !appId || !referenceId) {
      return { success: false, error: 'creatorMerchantId, creatorAppId, and referenceId are required' };
    }

    const unit = input.amountUnit === 'kobo' ? 'kobo' : 'naira';
    const amountKobo = toKobo(input.amount, unit);
    if (!(amountKobo > 0)) {
      return { success: false, error: 'amount must be a positive number' };
    }
    assertIntegerKobo(amountKobo);

    const treasuryResult = await WalletService.getTreasuryWallet(merchantId, appId);
    if (!treasuryResult.success || !treasuryResult.wallet) {
      return { success: false, error: treasuryResult.error || 'Treasury wallet not found' };
    }
    const treasuryWallet = treasuryResult.wallet;
    if (treasuryWallet.status !== WalletStatus.ACTIVE) {
      return { success: false, error: 'Treasury wallet is not active' };
    }

    const existingCompleted = await transactionRepo.findCompletedTransactionByReference(
      treasuryWallet.id,
      referenceId
    );
    if (existingCompleted) {
      return {
        success: true,
        duplicate: true,
        transaction: existingCompleted,
        treasuryWallet
      };
    }

    const existingPending = await TransactionModel.findOne({
      walletId: treasuryWallet.id,
      $or: [{ referenceId }, { externalReference: referenceId }],
      status: TransactionStatus.PENDING
    }).lean();
    if (existingPending) {
      const tx = await transactionRepo.getTransactionById(String(existingPending._id));
      return {
        success: true,
        duplicate: true,
        transaction: tx || undefined,
        treasuryWallet
      };
    }

    const productType = String(input.productType || 'COMMODITY').trim().toUpperCase() || 'COMMODITY';
    const principalKobo = toKobo(input.principalAmount, unit);
    const interestKobo = toKobo(input.interestAmount, unit);
    const principalNaira = principalKobo / 100;
    const interestNaira = interestKobo / 100;
    const amountNaira = amountKobo / 100;

    const balance = treasuryWallet.mainBalance ?? treasuryWallet.balance ?? 0;
    const metadata: Record<string, unknown> = {
      appId,
      merchantId,
      productType,
      maturityPayout: true,
      liquidationRequest: productType !== 'SAVINGS',
      withdrawalRequest: productType === 'SAVINGS',
      springStorefrontPayout: true,
      principal: principalNaira || amountNaira,
      returnAmount: interestNaira,
      interest: interestNaira,
      ...(input.userId ? { userId: input.userId.trim() } : {}),
      ...(input.applicationId ? { applicationId: input.applicationId.trim() } : {}),
      ...(input.productId ? { productId: input.productId.trim() } : {}),
      ...(input.productName ? { productName: input.productName.trim() } : {}),
      ...(input.customerName ? { customerName: input.customerName.trim() } : {}),
      ...(input.customerEmail ? { customerEmail: input.customerEmail.trim() } : {}),
      ...(input.maturityAt ? { maturity: input.maturityAt, maturityDate: input.maturityAt } : {}),
      ...(input.offeringMerchantId ? { offeringMerchantId: input.offeringMerchantId.trim() } : {}),
      ...(input.offeringAppId ? { offeringAppId: input.offeringAppId.trim() } : {}),
      ...(input.springLocalApplicationId
        ? { springLocalApplicationId: input.springLocalApplicationId.trim() }
        : {}),
      requestingFrom: productType === 'SAVINGS' ? 'Maturity payout' : 'Maturity / liquidation',
      ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {})
    };

    const transaction = await transactionRepo.createTransaction({
      walletId: treasuryWallet.id,
      amount: amountKobo,
      amountUnit: 'kobo',
      type: TransactionType.DEBIT,
      status: TransactionStatus.PENDING,
      description:
        input.description?.trim() ||
        `${productType} maturity withdrawal request (${referenceId})`,
      referenceId,
      externalReference: referenceId,
      balanceBefore: balance,
      balanceAfter: balance,
      category: categoryForProductType(productType),
      source: 'spring-maturity-withdrawal-request',
      metadata,
      tags: ['treasury-console', 'maturity-withdrawal-request', productType.toLowerCase()]
    });

    logger.info('Enqueued maturity withdrawal request on Treasury', {
      merchantId,
      appId,
      referenceId,
      productType,
      amountKobo
    });

    return { success: true, duplicate: false, transaction, treasuryWallet };
  } catch (error) {
    logger.error('Failed to enqueue maturity withdrawal request', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enqueue withdrawal request'
    };
  }
}

/** Soft dependency for tests / unused import guard */
void walletRepo;
