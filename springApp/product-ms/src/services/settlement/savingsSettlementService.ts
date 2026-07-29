import { config as envConfig } from '../../config/environment';
import type { Product } from '../../types/product';
import {
  collectSavingsPrincipalViaPlataGateway,
  fetchPlataCatalogProductById,
  isPlataGatewayConfigured,
  resolvePlataIntegratorContext
} from './plataGatewayClient';
import {
  collectSavingsPurchaseOnSpringWallet,
  collectToSettlementWallet,
  isSettlementWalletConfigured,
  reverseSavingsPurchaseOnSpringWallet,
  type SavingsPurchaseCollectRequest
} from './walletSettlementClient';

export class SavingsDepositSettlementError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONFIG_ERROR' | 'INSUFFICIENT_FUNDS' | 'SETTLEMENT_FAILED'
  ) {
    super(message);
    this.name = 'SavingsDepositSettlementError';
  }
}

type SavingsSettlementBaseInput = {
  offeringMerchantId: string;
  offeringAppId: string;
  productId: string;
  applicationId: string;
  upstreamApplicationId: string;
  principal: number;
  currency: string;
  product: Product;
  referenceId: string;
  providerReference?: string;
};

export type ExecuteSavingsDepositSettlementInput = SavingsSettlementBaseInput & {
  userId: string;
};

export type ExecuteExternalSavingsDepositSettlementInput = SavingsSettlementBaseInput;

export type ExecuteSavingsDepositSettlementResult = {
  referenceId: string;
  principalAmount: number;
  creatorMerchantId: string;
  creatorAppId?: string;
  duplicate?: boolean;
};

async function resolveCreatorContext(product: Product): Promise<{
  creatorMerchantId: string;
  creatorAppId?: string;
}> {
  let creatorMerchantId = (product.merchant?.id || '').trim();
  let creatorAppId = (product.upstreamAppId || '').trim() || undefined;
  if (!creatorMerchantId && product.upstreamProductId) {
    const upstreamCatalog = await fetchPlataCatalogProductById(product.upstreamProductId);
    creatorMerchantId = (upstreamCatalog?.merchant?.id || '').trim();
    if (!creatorAppId && upstreamCatalog?.appId) {
      creatorAppId = upstreamCatalog.appId.trim();
    }
  }
  if (!creatorMerchantId) {
    throw new SavingsDepositSettlementError(
      'Product creator merchant not found — savings must be linked to a Plata catalog product',
      'CONFIG_ERROR'
    );
  }
  return { creatorMerchantId, creatorAppId };
}

async function creditPlataCreator(input: {
  creatorMerchantId: string;
  creatorAppId?: string;
  amount: number;
  referenceId: string;
  currency: string;
  product: Product;
  applicationId: string;
  upstreamApplicationId: string;
  offeringMerchantId: string;
  offeringAppId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const plataCredit = await collectSavingsPrincipalViaPlataGateway({
    creatorMerchantId: input.creatorMerchantId,
    creatorAppId: input.creatorAppId,
    amount: input.amount,
    referenceId: input.referenceId,
    currency: input.currency,
    productId: input.product.upstreamProductId || input.product.id,
    productType: 'SAVINGS',
    applicationId: input.upstreamApplicationId,
    description: `Savings deposit settlement (${input.amount} ${input.currency})`,
    metadata: {
      offeringMerchantId: input.offeringMerchantId,
      offeringAppId: input.offeringAppId,
      localApplicationId: input.applicationId,
      ...(input.metadata ?? {})
    }
  });

  if (!plataCredit.success && !plataCredit.skipped) {
    throw new SavingsDepositSettlementError(
      plataCredit.error || 'Failed to credit Plata creator settlement wallet',
      'SETTLEMENT_FAILED'
    );
  }
}

export async function executeSavingsDepositSettlement(
  input: ExecuteSavingsDepositSettlementInput
): Promise<ExecuteSavingsDepositSettlementResult> {
  if (!isSettlementWalletConfigured()) {
    throw new SavingsDepositSettlementError('Wallet settlement is not configured', 'CONFIG_ERROR');
  }
  if (!isPlataGatewayConfigured()) {
    throw new SavingsDepositSettlementError('Plata gateway keys are not configured', 'CONFIG_ERROR');
  }

  const principalAmount = Number(input.principal);
  if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
    throw new SavingsDepositSettlementError('Savings deposit amount must be positive', 'CONFIG_ERROR');
  }

  const { creatorMerchantId, creatorAppId } = await resolveCreatorContext(input.product);
  const integratorContext = await resolvePlataIntegratorContext();
  if (!integratorContext.success || !integratorContext.data?.merchantId) {
    throw new SavingsDepositSettlementError(
      integratorContext.error || 'Failed to resolve Plata integrator merchant',
      'CONFIG_ERROR'
    );
  }

  const referenceId = input.referenceId.trim();
  const integratorAppId =
    (envConfig.plataIntegratorAppId || '').trim() || input.offeringAppId;
  const purchaseRequest: SavingsPurchaseCollectRequest = {
    userId: input.userId,
    offeringMerchantId: input.offeringMerchantId,
    offeringAppId: input.offeringAppId,
    integratorMerchantId: integratorContext.data.merchantId,
    integratorAppId,
    principalAmount,
    referenceId,
    productId: input.productId,
    applicationId: input.applicationId,
    currency: input.currency,
    creatorMerchantId,
    creatorAppId,
    metadata: {
      upstreamProductId: input.product.upstreamProductId,
      upstreamApplicationId: input.upstreamApplicationId,
      channel: 'wallet'
    }
  };

  const springCollect = await collectSavingsPurchaseOnSpringWallet(purchaseRequest);
  if (springCollect.insufficientFunds) {
    throw new SavingsDepositSettlementError(
      springCollect.error || 'Insufficient balance in user wallet for savings deposit',
      'INSUFFICIENT_FUNDS'
    );
  }
  if (!springCollect.success) {
    throw new SavingsDepositSettlementError(
      springCollect.error || 'Failed to collect savings deposit on Spring wallet',
      'SETTLEMENT_FAILED'
    );
  }

  if (springCollect.duplicate) {
    return {
      referenceId,
      principalAmount,
      creatorMerchantId,
      creatorAppId,
      duplicate: true
    };
  }

  try {
    await creditPlataCreator({
      creatorMerchantId,
      creatorAppId,
      amount: principalAmount,
      referenceId,
      currency: input.currency,
      product: input.product,
      applicationId: input.applicationId,
      upstreamApplicationId: input.upstreamApplicationId,
      offeringMerchantId: input.offeringMerchantId,
      offeringAppId: input.offeringAppId,
      metadata: { channel: 'wallet' }
    });
  } catch (error) {
    await reverseSavingsPurchaseOnSpringWallet(purchaseRequest);
    throw error;
  }

  return {
    referenceId,
    principalAmount,
    creatorMerchantId,
    creatorAppId
  };
}

export async function executeExternalSavingsDepositSettlement(
  input: ExecuteExternalSavingsDepositSettlementInput
): Promise<ExecuteSavingsDepositSettlementResult> {
  if (!isSettlementWalletConfigured()) {
    throw new SavingsDepositSettlementError('Wallet settlement is not configured', 'CONFIG_ERROR');
  }
  if (!isPlataGatewayConfigured()) {
    throw new SavingsDepositSettlementError('Plata gateway keys are not configured', 'CONFIG_ERROR');
  }

  const principalAmount = Number(input.principal);
  if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
    throw new SavingsDepositSettlementError('Savings deposit amount must be positive', 'CONFIG_ERROR');
  }

  const { creatorMerchantId, creatorAppId } = await resolveCreatorContext(input.product);
  const integratorContext = await resolvePlataIntegratorContext();
  if (!integratorContext.success || !integratorContext.data?.merchantId) {
    throw new SavingsDepositSettlementError(
      integratorContext.error || 'Failed to resolve Plata integrator merchant',
      'CONFIG_ERROR'
    );
  }

  const referenceId = input.referenceId.trim();
  const integratorMerchantId = integratorContext.data.merchantId;

  const springCollect = await collectToSettlementWallet({
    merchantId: integratorMerchantId,
    appId: integratorContext.data.merchantId,
    amount: principalAmount,
    referenceId,
    source: 'product-savings-external',
    category: 'SAVINGS_DEPOSIT',
    description: `External savings deposit (${principalAmount} ${input.currency})`,
    applicationId: input.applicationId,
    productId: input.productId,
    productType: 'SAVINGS',
    currency: input.currency,
    debitUserWallet: false,
    metadata: {
      upstreamApplicationId: input.upstreamApplicationId,
      providerReference: input.providerReference,
      channel: 'external'
    }
  });

  if (!springCollect.success) {
    throw new SavingsDepositSettlementError(
      springCollect.error || 'Failed to record external savings deposit on integrator settlement',
      'SETTLEMENT_FAILED'
    );
  }

  if (springCollect.duplicate) {
    return {
      referenceId,
      principalAmount,
      creatorMerchantId,
      creatorAppId,
      duplicate: true
    };
  }

  await creditPlataCreator({
    creatorMerchantId,
    creatorAppId,
    amount: principalAmount,
    referenceId,
    currency: input.currency,
    product: input.product,
    applicationId: input.applicationId,
    upstreamApplicationId: input.upstreamApplicationId,
    offeringMerchantId: input.offeringMerchantId,
    offeringAppId: input.offeringAppId,
    metadata: {
      channel: 'external',
      providerReference: input.providerReference
    }
  });

  return {
    referenceId,
    principalAmount,
    creatorMerchantId,
    creatorAppId
  };
}
