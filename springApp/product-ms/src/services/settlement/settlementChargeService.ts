import { db } from '../../db/database';
import {
  calculateCommodityCharge,
  calculateInvestmentCharge,
  calculateLoanCharge,
  calculateMortgageCharge,
  resolveMerchantCommissionRatePercent,
  resolveEquityContributionFromSnapshot
} from './commissionCalculators';
import { collectInvestmentPrincipalViaPlataGateway } from './plataGatewayClient';
import { resolveProductCreatorMerchant } from './productCreatorResolver';
import { collectToSettlementWallet, type SettlementCollectResult } from './walletSettlementClient';

const SETTLEMENT_SOURCE = 'product-ms-settlement';

async function creditCreatorEquitySettlement(input: {
  productId: string;
  applicationId: string;
  productType: 'LOAN' | 'MORTGAGE';
  currency: string;
  amount: number;
  referenceId: string;
  description: string;
  category: 'LOAN_EQUITY' | 'MORTGAGE_EQUITY';
  metadata?: Record<string, unknown>;
}): Promise<SettlementCollectResult> {
  if (!input.amount || input.amount <= 0) {
    return { success: true, skipped: true };
  }

  const creator = await resolveProductCreatorMerchant(input.productId);
  if (!creator?.creatorMerchantId) {
    return {
      success: false,
      error: 'Product creator merchant not found for equity settlement'
    };
  }
  if (!creator.creatorAppId?.trim()) {
    return {
      success: false,
      error: 'Product creator appId is required for Plata equity settlement'
    };
  }

  return collectInvestmentPrincipalViaPlataGateway({
    creatorMerchantId: creator.creatorMerchantId,
    creatorAppId: creator.creatorAppId,
    amount: input.amount,
    referenceId: input.referenceId,
    source: SETTLEMENT_SOURCE,
    category: input.category,
    currency: input.currency,
    productId: creator.upstreamProductId || input.productId,
    productType: input.productType,
    applicationId: input.applicationId,
    description: input.description,
    metadata: input.metadata
  });
}

export async function collectCommodityCharge(input: {
  merchantId: string;
  appId: string;
  userId: string;
  productId: string;
  basePrice: number;
  currency: string;
  referenceId: string;
  debitUserWallet?: boolean;
}): Promise<SettlementCollectResult> {
  const config = await db.findMerchantConfiguration(input.appId, input.productId);
  const merchantRate = resolveMerchantCommissionRatePercent({
    springTDFee: config?.springTDFee,
    serviceFee: config?.serviceFee,
    markupRate: config?.markupRate
  });
  const amount = calculateCommodityCharge(input.basePrice, merchantRate);
  return collectToSettlementWallet({
    merchantId: input.merchantId,
    appId: input.appId,
    userId: input.userId,
    amount,
    referenceId: input.referenceId,
    source: SETTLEMENT_SOURCE,
    category: 'COMMODITY_CHARGE',
    productId: input.productId,
    productType: 'COMMODITY',
    currency: input.currency,
    description: `Commodity merchant charge (${merchantRate}% on ${input.basePrice})`,
    debitUserWallet: input.debitUserWallet !== false,
    metadata: { basePrice: input.basePrice, merchantRatePercent: merchantRate }
  });
}

export async function collectLoanCharge(input: {
  merchantId: string;
  appId?: string;
  userId?: string;
  productId: string;
  applicationId: string;
  loanPrincipal: number;
  currency: string;
  referenceId: string;
  contractSnapshot?: Record<string, unknown>;
  debitUserWallet?: boolean;
}): Promise<SettlementCollectResult> {
  const config =
    input.appId != null
      ? await db.findMerchantConfiguration(input.appId, input.productId)
      : null;
  const merchantRate = resolveMerchantCommissionRatePercent({
    springTDFee: config?.springTDFee,
    serviceFee: config?.serviceFee,
    markupRate: config?.markupRate
  });
  const equity = resolveEquityContributionFromSnapshot(input.contractSnapshot);
  const { merchantAmount, ofiAmount, loanFeeComponent } = calculateLoanCharge({
    loanPrincipal: input.loanPrincipal,
    equityContribution: equity,
    merchantRatePercent: merchantRate
  });

  const springResult =
    merchantAmount > 0
      ? await collectToSettlementWallet({
          merchantId: input.merchantId,
          appId: input.appId,
          userId: input.userId,
          amount: merchantAmount,
          referenceId: input.referenceId,
          source: SETTLEMENT_SOURCE,
          category: 'LOAN_CHARGE',
          applicationId: input.applicationId,
          productId: input.productId,
          productType: 'LOAN',
          currency: input.currency,
          description: `Loan merchant charge (${merchantRate}% on principal ${input.loanPrincipal})`,
          debitUserWallet: input.debitUserWallet === true,
          metadata: {
            loanPrincipal: input.loanPrincipal,
            equityContribution: equity,
            merchantRatePercent: merchantRate,
            loanFeeComponent,
            ofiAmount
          }
        })
      : { success: true, skipped: true as const };

  if (equity != null && equity > 0 && ofiAmount > 0) {
    if (merchantAmount > 0 && !springResult.success && !springResult.skipped) {
      return springResult;
    }

    const creatorResult = await creditCreatorEquitySettlement({
      productId: input.productId,
      applicationId: input.applicationId,
      productType: 'LOAN',
      currency: input.currency,
      amount: ofiAmount,
      referenceId: `${input.referenceId}:creator-equity`,
      category: 'LOAN_EQUITY',
      description: `Loan creator equity settlement (equity ${equity} − ${loanFeeComponent} fee)`,
      metadata: {
        loanPrincipal: input.loanPrincipal,
        equityContribution: equity,
        loanFeeComponent,
        springMerchantAmount: merchantAmount
      }
    });
    if (!creatorResult.success && !creatorResult.skipped) {
      return {
        ...springResult,
        error: creatorResult.error || 'Spring LOAN_CHARGE collected but creator equity settlement failed'
      };
    }
  }

  return springResult;
}

/**
 * Storefront lending down payment (LOAN / MORTGAGE):
 * 1) Debit applicant Central Wallet under the Spring integrator app
 * 2) Credit product-creator REPAYMENT on Plata (gateway principal-settlement)
 */
async function collectLendingDownPayment(input: {
  merchantId: string;
  appId: string;
  userId: string;
  productId: string;
  applicationId: string;
  amount: number;
  currency: string;
  referenceId: string;
  description?: string;
  productType: 'LOAN' | 'MORTGAGE';
  category: 'LOAN_EQUITY' | 'MORTGAGE_EQUITY';
  purpose: 'loan_down_payment' | 'mortgage_down_payment';
}): Promise<SettlementCollectResult> {
  if (!input.amount || input.amount <= 0) {
    return { success: true, skipped: true };
  }

  const label = input.productType === 'LOAN' ? 'Loan' : 'Mortgage';
  const springResult = await collectToSettlementWallet({
    merchantId: input.merchantId,
    appId: input.appId,
    userId: input.userId,
    amount: input.amount,
    referenceId: input.referenceId,
    source: SETTLEMENT_SOURCE,
    category: input.category,
    applicationId: input.applicationId,
    productId: input.productId,
    productType: input.productType,
    currency: input.currency,
    description:
      input.description || `${label} down payment for application ${input.applicationId}`,
    debitUserWallet: true,
    metadata: { purpose: input.purpose }
  });

  if (!springResult.success) {
    return springResult;
  }
  if (springResult.duplicate || springResult.skipped) {
    return springResult;
  }

  const creatorResult = await creditCreatorEquitySettlement({
    productId: input.productId,
    applicationId: input.applicationId,
    productType: input.productType,
    currency: input.currency,
    amount: input.amount,
    referenceId: `${input.referenceId}:plata-creator`,
    category: input.category,
    description:
      input.description ||
      `${label} down payment creator repayment credit (${input.amount} ${input.currency})`,
    metadata: {
      purpose: input.purpose,
      springReferenceId: input.referenceId,
      springTransactionId: springResult.transactionId,
      springUserTransactionId: springResult.userTransactionId
    }
  });

  if (!creatorResult.success && !creatorResult.skipped) {
    return {
      ...springResult,
      error:
        creatorResult.error ||
        'Central Wallet debited but Plata product-creator Repayment credit failed'
    };
  }

  return {
    ...springResult,
    transactionId: creatorResult.transactionId ?? springResult.transactionId
  };
}

/** Storefront LOAN down payment — Central Wallet debit + Plata creator Repayment credit. */
export async function collectLoanDownPayment(input: {
  merchantId: string;
  appId: string;
  userId: string;
  productId: string;
  applicationId: string;
  amount: number;
  currency: string;
  referenceId: string;
  description?: string;
}): Promise<SettlementCollectResult> {
  return collectLendingDownPayment({
    ...input,
    productType: 'LOAN',
    category: 'LOAN_EQUITY',
    purpose: 'loan_down_payment'
  });
}

/** Storefront MORTGAGE down payment — Central Wallet debit + Plata creator Repayment credit. */
export async function collectMortgageDownPayment(input: {
  merchantId: string;
  appId: string;
  userId: string;
  productId: string;
  applicationId: string;
  amount: number;
  currency: string;
  referenceId: string;
  description?: string;
}): Promise<SettlementCollectResult> {
  return collectLendingDownPayment({
    ...input,
    productType: 'MORTGAGE',
    category: 'MORTGAGE_EQUITY',
    purpose: 'mortgage_down_payment'
  });
}

export async function collectMortgageCharge(input: {
  merchantId: string;
  appId?: string;
  userId?: string;
  productId: string;
  applicationId: string;
  mortgagePrincipal: number;
  currency: string;
  referenceId: string;
  contractSnapshot?: Record<string, unknown>;
  debitUserWallet?: boolean;
}): Promise<SettlementCollectResult> {
  const config =
    input.appId != null
      ? await db.findMerchantConfiguration(input.appId, input.productId)
      : null;
  const merchantRate = resolveMerchantCommissionRatePercent({
    springTDFee: config?.springTDFee,
    serviceFee: config?.serviceFee,
    markupRate: config?.markupRate
  });
  const equity = resolveEquityContributionFromSnapshot(input.contractSnapshot);
  const { merchantAmount, ofiAmount, loanFeeComponent } = calculateMortgageCharge({
    loanPrincipal: input.mortgagePrincipal,
    equityContribution: equity,
    merchantRatePercent: merchantRate
  });

  const springResult =
    merchantAmount > 0
      ? await collectToSettlementWallet({
          merchantId: input.merchantId,
          appId: input.appId,
          userId: input.userId,
          amount: merchantAmount,
          referenceId: input.referenceId,
          source: SETTLEMENT_SOURCE,
          category: 'MORTGAGE_CHARGE',
          applicationId: input.applicationId,
          productId: input.productId,
          productType: 'MORTGAGE',
          currency: input.currency,
          description: `Mortgage merchant charge (${merchantRate}% on principal ${input.mortgagePrincipal})`,
          debitUserWallet: input.debitUserWallet === true,
          metadata: {
            mortgagePrincipal: input.mortgagePrincipal,
            equityContribution: equity,
            merchantRatePercent: merchantRate,
            loanFeeComponent,
            ofiAmount
          }
        })
      : { success: true, skipped: true as const };

  if (equity != null && equity > 0 && ofiAmount > 0) {
    if (merchantAmount > 0 && !springResult.success && !springResult.skipped) {
      return springResult;
    }

    const creatorResult = await creditCreatorEquitySettlement({
      productId: input.productId,
      applicationId: input.applicationId,
      productType: 'MORTGAGE',
      currency: input.currency,
      amount: ofiAmount,
      referenceId: `${input.referenceId}:creator-equity`,
      category: 'MORTGAGE_EQUITY',
      description: `Mortgage creator equity settlement (equity ${equity} − ${loanFeeComponent} fee)`,
      metadata: {
        mortgagePrincipal: input.mortgagePrincipal,
        equityContribution: equity,
        loanFeeComponent,
        springMerchantAmount: merchantAmount
      }
    });
    if (!creatorResult.success && !creatorResult.skipped) {
      return {
        ...springResult,
        error: creatorResult.error || 'Spring MORTGAGE_CHARGE collected but creator equity settlement failed'
      };
    }
  }

  return springResult;
}

export async function collectInvestmentCharge(input: {
  merchantId: string;
  appId: string;
  userId: string;
  productId: string;
  applicationId: string;
  principal: number;
  currency: string;
  referenceId: string;
  debitUserWallet?: boolean;
}): Promise<SettlementCollectResult> {
  const config = await db.findMerchantConfiguration(input.appId, input.productId);
  const merchantRate = resolveMerchantCommissionRatePercent({
    springTDFee: config?.springTDFee,
    serviceFee: config?.serviceFee,
    markupRate: config?.markupRate
  });
  const amount = calculateInvestmentCharge(input.principal, merchantRate);
  return collectToSettlementWallet({
    merchantId: input.merchantId,
    appId: input.appId,
    userId: input.userId,
    amount,
    referenceId: input.referenceId,
    source: SETTLEMENT_SOURCE,
    category: 'INVESTMENT_CHARGE',
    applicationId: input.applicationId,
    productId: input.productId,
    productType: 'INVESTMENT',
    currency: input.currency,
    description: `Investment merchant charge (${merchantRate}% on ${input.principal})`,
    debitUserWallet: input.debitUserWallet !== false,
    metadata: { principal: input.principal, merchantRatePercent: merchantRate }
  });
}
