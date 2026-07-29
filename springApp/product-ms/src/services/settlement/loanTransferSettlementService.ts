import { ProductApplicationModel } from '../../models/ProductApplicationModel';
import {
  calculateLoanCharge,
  calculateMortgageCharge,
  resolveEquityContributionFromSnapshot,
  resolveMerchantCommissionRatePercent
} from './commissionCalculators';
import { db } from '../../db/database';
import { collectLoanCharge, collectMortgageCharge } from './settlementChargeService';
import type { SettlementCollectResult } from './walletSettlementClient';

export const LENDING_TRANSFER_SETTLEMENT_SOURCE = 'product-ms-settlement';

export type LendingTransferChargeCollectParams = {
  merchantId: string;
  appId?: string;
  userId: string;
  amount: number;
  referenceId: string;
  source: string;
  category: 'LOAN_CHARGE' | 'MORTGAGE_CHARGE';
  applicationId: string;
  productId: string;
  productType: 'LOAN' | 'MORTGAGE';
  currency: string;
  description: string;
  metadata: Record<string, unknown>;
};

export type LendingTransferChargeContext = {
  skipped: boolean;
  skippedReason?: string;
  chargeAmount: number;
  collect?: LendingTransferChargeCollectParams;
};

/** @deprecated use LENDING_TRANSFER_SETTLEMENT_SOURCE */
export const LOAN_TRANSFER_SETTLEMENT_SOURCE = LENDING_TRANSFER_SETTLEMENT_SOURCE;

/** @deprecated use LendingTransferChargeContext */
export type LoanTransferChargeContext = LendingTransferChargeContext;

/** @deprecated use LendingTransferChargeCollectParams */
export type LoanTransferChargeCollectParams = LendingTransferChargeCollectParams;

async function buildLendingTransferChargeContext(input: {
  applicationId: string;
  userId: string;
}): Promise<LendingTransferChargeContext | { error: string }> {
  const applicationId = input.applicationId.trim();
  const userId = input.userId.trim();
  if (!applicationId || !userId) {
    return { error: 'applicationId and userId are required' };
  }

  const application = await ProductApplicationModel.findById(applicationId);
  if (!application) {
    return { error: 'Application not found' };
  }
  if (application.userId !== userId) {
    return { error: 'Application does not belong to user' };
  }

  const productType = String(application.productType || '').toUpperCase();
  if (productType !== 'LOAN' && productType !== 'MORTGAGE') {
    return { skipped: true, skippedReason: 'not_lending_product', chargeAmount: 0 };
  }

  const snapshot =
    application.contractSnapshot && typeof application.contractSnapshot === 'object'
      ? (application.contractSnapshot as Record<string, unknown>)
      : undefined;
  const equity = resolveEquityContributionFromSnapshot(snapshot);
  if (equity != null && equity > 0) {
    return { skipped: true, skippedReason: 'equity_lending_charged_on_approval', chargeAmount: 0 };
  }

  const merchantId = application.merchantId?.trim();
  if (!merchantId) {
    return { skipped: true, skippedReason: 'no_merchant', chargeAmount: 0 };
  }

  const principal = Number(application.amount);
  if (!Number.isFinite(principal) || principal <= 0) {
    return { error: 'Invalid lending principal on application' };
  }

  const config =
    application.appId != null
      ? await db.findMerchantConfiguration(application.appId, application.productId)
      : null;
  const merchantRate = resolveMerchantCommissionRatePercent({
    springTDFee: config?.springTDFee,
    serviceFee: config?.serviceFee,
    markupRate: config?.markupRate
  });

  const chargeResult =
    productType === 'MORTGAGE'
      ? calculateMortgageCharge({
          loanPrincipal: principal,
          equityContribution: equity,
          merchantRatePercent: merchantRate
        })
      : calculateLoanCharge({
          loanPrincipal: principal,
          equityContribution: equity,
          merchantRatePercent: merchantRate
        });

  const { merchantAmount, ofiAmount, loanFeeComponent } = chargeResult;
  if (!merchantAmount || merchantAmount <= 0) {
    return { skipped: true, skippedReason: 'zero_charge', chargeAmount: 0 };
  }

  const referenceId =
    productType === 'MORTGAGE'
      ? `settlement:mortgage:transfer:${applicationId}`
      : `settlement:loan:transfer:${applicationId}`;
  const category = productType === 'MORTGAGE' ? 'MORTGAGE_CHARGE' : 'LOAN_CHARGE';
  const principalLabel = productType === 'MORTGAGE' ? 'mortgagePrincipal' : 'loanPrincipal';

  return {
    skipped: false,
    chargeAmount: merchantAmount,
    collect: {
      merchantId,
      appId: application.appId,
      userId: application.userId,
      amount: merchantAmount,
      referenceId,
      source: LENDING_TRANSFER_SETTLEMENT_SOURCE,
      category,
      applicationId,
      productId: application.productId,
      productType: productType as 'LOAN' | 'MORTGAGE',
      currency: application.currency,
      description: `${productType === 'MORTGAGE' ? 'Mortgage' : 'Loan'} merchant charge (${merchantRate}% on principal ${principal})`,
      metadata: {
        [principalLabel]: principal,
        equityContribution: equity,
        merchantRatePercent: merchantRate,
        loanFeeComponent,
        ofiAmount
      }
    }
  };
}

export async function resolveLendingChargeOnProductTransfer(input: {
  applicationId: string;
  userId: string;
}): Promise<LendingTransferChargeContext | { error: string }> {
  return buildLendingTransferChargeContext(input);
}

/** @deprecated use resolveLendingChargeOnProductTransfer */
export async function resolveLoanChargeOnProductTransfer(input: {
  applicationId: string;
  userId: string;
}): Promise<LendingTransferChargeContext | { error: string }> {
  return resolveLendingChargeOnProductTransfer(input);
}

export type LendingTransferChargeResult = SettlementCollectResult & {
  skippedReason?: string;
};

/** @deprecated use LendingTransferChargeResult */
export type LoanTransferChargeResult = LendingTransferChargeResult;

export async function collectLendingChargeOnProductTransfer(input: {
  applicationId: string;
  userId: string;
}): Promise<LendingTransferChargeResult> {
  const context = await buildLendingTransferChargeContext(input);
  if ('error' in context) {
    return { success: false, error: context.error };
  }
  if (context.skipped || !context.collect) {
    return { success: true, skipped: true, skippedReason: context.skippedReason };
  }

  const c = context.collect;
  const principal = Number(c.metadata.loanPrincipal ?? c.metadata.mortgagePrincipal);
  if (c.productType === 'MORTGAGE') {
    return collectMortgageCharge({
      merchantId: c.merchantId,
      appId: c.appId,
      userId: c.userId,
      productId: c.productId,
      applicationId: c.applicationId,
      mortgagePrincipal: principal,
      currency: c.currency,
      referenceId: c.referenceId,
      contractSnapshot: undefined,
      debitUserWallet: true
    });
  }

  return collectLoanCharge({
    merchantId: c.merchantId,
    appId: c.appId,
    userId: c.userId,
    productId: c.productId,
    applicationId: c.applicationId,
    loanPrincipal: principal,
    currency: c.currency,
    referenceId: c.referenceId,
    contractSnapshot: undefined,
    debitUserWallet: true
  });
}

/** @deprecated use collectLendingChargeOnProductTransfer */
export async function collectLoanChargeOnProductTransfer(input: {
  applicationId: string;
  userId: string;
}): Promise<LendingTransferChargeResult> {
  return collectLendingChargeOnProductTransfer(input);
}
