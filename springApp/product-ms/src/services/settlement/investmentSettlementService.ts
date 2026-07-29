import { config as envConfig } from '../../config/environment';
import { db } from '../../db/database';
import type { Product } from '../../types/product';
import {
  calculateInvestmentSettlementSplit,
  resolveMerchantCommissionRatePercent
} from './commissionCalculators';
import {
  collectInvestmentPrincipalViaPlataGateway,
  fetchPlataCatalogProductById,
  isPlataGatewayConfigured,
  resolvePlataIntegratorContext
} from './plataGatewayClient';
import {
  collectInvestmentPurchaseOnSpringWallet,
  isSettlementWalletConfigured,
  reverseInvestmentPurchaseOnSpringWallet,
  type InvestmentPurchaseCollectRequest
} from './walletSettlementClient';

export class InvestmentSettlementError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONFIG_ERROR' | 'INSUFFICIENT_FUNDS' | 'SETTLEMENT_FAILED'
  ) {
    super(message);
    this.name = 'InvestmentSettlementError';
  }
}

export type ExecuteInvestmentSettlementInput = {
  userId: string;
  offeringMerchantId: string;
  offeringAppId: string;
  productId: string;
  applicationId: string;
  principal: number;
  currency: string;
  product: Product;
  referenceId?: string;
};

export type ExecuteInvestmentSettlementResult = {
  referenceId: string;
  principalAmount: number;
  commissionAmount: number;
  creatorPrincipalAmount: number;
  commissionRatePercent: number;
  creatorMerchantId: string;
  creatorAppId?: string;
  duplicate?: boolean;
};

export async function executeInvestmentSettlement(
  input: ExecuteInvestmentSettlementInput
): Promise<ExecuteInvestmentSettlementResult> {
  if (!isSettlementWalletConfigured()) {
    throw new InvestmentSettlementError('Wallet settlement is not configured', 'CONFIG_ERROR');
  }
  if (!isPlataGatewayConfigured()) {
    throw new InvestmentSettlementError('Plata gateway keys are not configured', 'CONFIG_ERROR');
  }

  const principal = Number(input.principal);
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new InvestmentSettlementError('Investment principal must be positive', 'CONFIG_ERROR');
  }

  const merchantConfig = await db.findMerchantConfiguration(input.offeringAppId, input.productId);
  const commissionRatePercent = resolveMerchantCommissionRatePercent({
    springTDFee: merchantConfig?.springTDFee,
    serviceFee: merchantConfig?.serviceFee,
    markupRate: merchantConfig?.markupRate
  });
  const split = calculateInvestmentSettlementSplit(principal, commissionRatePercent);

  let creatorMerchantId = (input.product.merchant?.id || '').trim();
  let creatorAppId = (input.product.upstreamAppId || '').trim() || undefined;
  if (!creatorMerchantId && input.product.upstreamProductId) {
    const upstreamCatalog = await fetchPlataCatalogProductById(input.product.upstreamProductId);
    creatorMerchantId = (upstreamCatalog?.merchant?.id || '').trim();
    if (!creatorAppId && upstreamCatalog?.appId) {
      creatorAppId = upstreamCatalog.appId.trim();
    }
  }
  if (!creatorMerchantId) {
    throw new InvestmentSettlementError(
      'Product creator merchant not found — investment must be linked to a Plata catalog product',
      'CONFIG_ERROR'
    );
  }

  const integratorContext = await resolvePlataIntegratorContext();
  if (!integratorContext.success || !integratorContext.data?.merchantId) {
    throw new InvestmentSettlementError(
      integratorContext.error || 'Failed to resolve Plata integrator merchant',
      'CONFIG_ERROR'
    );
  }

  const referenceId =
    input.referenceId?.trim() || `investment-purchase:${input.userId}:${input.productId}:${input.applicationId}`;

  // Principal hold uses the Spring integrator REPAYMENT wallet (app-scoped).
  // Never pass merchantId as appId — wallet-ms looks up by appId and returns
  // "REPAYMENT wallet not found for merchant app". Prefer dedicated env, else offering app.
  const integratorAppId =
    (envConfig.plataIntegratorAppId || '').trim() || input.offeringAppId;

  const purchaseRequest: InvestmentPurchaseCollectRequest = {
    userId: input.userId,
    offeringMerchantId: input.offeringMerchantId,
    offeringAppId: input.offeringAppId,
    integratorMerchantId: integratorContext.data.merchantId,
    integratorAppId,
    principalAmount: split.principalAmount,
    commissionAmount: split.commissionAmount,
    creatorPrincipalAmount: split.creatorPrincipalAmount,
    referenceId,
    productId: input.productId,
    applicationId: input.applicationId,
    currency: input.currency,
    creatorMerchantId,
    creatorAppId,
    metadata: {
      commissionRatePercent,
      upstreamProductId: input.product.upstreamProductId
    }
  };

  const springCollect = await collectInvestmentPurchaseOnSpringWallet(purchaseRequest);
  if (springCollect.insufficientFunds) {
    throw new InvestmentSettlementError(
      springCollect.error || 'Insufficient balance in user wallet for investment',
      'INSUFFICIENT_FUNDS'
    );
  }
  if (!springCollect.success) {
    throw new InvestmentSettlementError(
      springCollect.error || 'Failed to collect investment on Spring wallet',
      'SETTLEMENT_FAILED'
    );
  }

  if (springCollect.duplicate) {
    return {
      referenceId,
      principalAmount: split.principalAmount,
      commissionAmount: split.commissionAmount,
      creatorPrincipalAmount: split.creatorPrincipalAmount,
      commissionRatePercent,
      creatorMerchantId,
      creatorAppId,
      duplicate: true
    };
  }

  if (split.creatorPrincipalAmount > 0) {
    const plataCredit = await collectInvestmentPrincipalViaPlataGateway({
      creatorMerchantId,
      creatorAppId,
      amount: split.creatorPrincipalAmount,
      referenceId,
      currency: input.currency,
      productId: input.product.upstreamProductId || input.productId,
      productType: 'INVESTMENT',
      applicationId: input.applicationId,
      description: `Investment principal settlement (${split.creatorPrincipalAmount} ${input.currency})`,
      metadata: {
        offeringMerchantId: input.offeringMerchantId,
        offeringAppId: input.offeringAppId,
        commissionAmount: split.commissionAmount,
        principalAmount: split.principalAmount
      }
    });

    if (!plataCredit.success && !plataCredit.skipped) {
      await reverseInvestmentPurchaseOnSpringWallet(purchaseRequest);
      throw new InvestmentSettlementError(
        plataCredit.error || 'Failed to credit Plata creator settlement wallet',
        'SETTLEMENT_FAILED'
      );
    }
  }

  return {
    referenceId,
    principalAmount: split.principalAmount,
    commissionAmount: split.commissionAmount,
    creatorPrincipalAmount: split.creatorPrincipalAmount,
    commissionRatePercent,
    creatorMerchantId,
    creatorAppId
  };
}
