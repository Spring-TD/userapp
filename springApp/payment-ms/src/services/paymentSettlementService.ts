import { TransactionType } from '../types/record';
import type { FeeBreakdown } from '../types/record';
import {
  calculateOtherServiceCharge,
  calculateTransactionCharge,
  defaultTransactionFixedFee,
  defaultTransactionPercentRate
} from './settlement/commissionCalculators';
import { collectToSettlementWallet } from './settlement/walletSettlementClient';

const OTHER_SERVICE_TYPES = new Set<TransactionType>([
  TransactionType.AIRTIME_PURCHASE,
  TransactionType.UTILITY_PAYMENT,
  TransactionType.BILL_PAYMENT
]);

const TRANSACTION_TYPES = new Set<TransactionType>([
  TransactionType.TRANSFER,
  TransactionType.MERCHANT_PAYMENT,
  TransactionType.WITHDRAWAL,
  TransactionType.DEPOSIT,
  TransactionType.PAYOUT
]);

export async function collectPaymentSettlementCharge(input: {
  merchantId: string;
  userId?: string;
  appId?: string;
  amount: number;
  currency: string;
  txnRef: string;
  transactionType: TransactionType;
  feeBreakdown?: FeeBreakdown;
}): Promise<void> {
  if (process.env.PAYMENT_SETTLEMENT_ENABLED === 'false') {
    return;
  }

  const isOtherService = OTHER_SERVICE_TYPES.has(input.transactionType);
  const isTransaction = TRANSACTION_TYPES.has(input.transactionType);
  if (!isOtherService && !isTransaction) {
    return;
  }

  const chargeAmount = isOtherService
    ? calculateOtherServiceCharge({
        amount: input.amount,
        merchantCommission: input.feeBreakdown?.merchant_commission,
        fixedFee: defaultTransactionFixedFee(),
        percentRate: defaultTransactionPercentRate()
      })
    : calculateTransactionCharge({
        amount: input.amount,
        merchantCommission: input.feeBreakdown?.merchant_commission,
        fixedFee: defaultTransactionFixedFee(),
        percentRate: defaultTransactionPercentRate()
      });

  const category = isOtherService ? 'OTHER_SERVICE_CHARGE' : 'TRANSACTION_CHARGE';

  if (chargeAmount > 0 && !input.userId?.trim()) {
    console.warn('Payment settlement charge skipped: userId required when debiting user wallet', {
      txnRef: input.txnRef,
      category,
      chargeAmount
    });
    return;
  }

  const result = await collectToSettlementWallet({
    merchantId: input.merchantId,
    appId: input.appId,
    userId: input.userId,
    amount: chargeAmount,
    referenceId: `settlement:payment:${category}:${input.txnRef}`,
    source: 'payment-ms-settlement',
    category,
    currency: input.currency,
    description: `${category} on ${input.transactionType}`,
    debitUserWallet: true,
    metadata: {
      transactionType: input.transactionType,
      txnRef: input.txnRef,
      grossAmount: input.amount,
      merchantCommission: input.feeBreakdown?.merchant_commission,
      payoutFee: input.feeBreakdown?.payout_fee
    }
  });

  if (!result.success && !result.skipped) {
    console.warn('Payment settlement charge failed', {
      txnRef: input.txnRef,
      category,
      error: result.error
    });
  }
}
