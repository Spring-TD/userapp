import { randomUUID } from 'crypto';
import createAppService from './createAppService';
import productService from './productService';
import {
  calculateCommodityCharge,
  resolveMerchantCommissionRatePercent
} from './settlement/commissionCalculators';
import {
  collectCommodityPurchaseOnSpringWallet,
  reverseCommodityPurchaseOnSpringWallet,
  type CommodityPurchaseCollectRequest
} from './settlement/walletSettlementClient';
import {
  collectCommodityPrincipalViaPlataGateway,
  fetchPlataCatalogProductById,
  isPlataGatewayConfigured
} from './plataGatewayClient';

export type CommodityPurchaseInput = {
  userId: string;
  productId: string;
  appId: string;
  amount?: number;
  currency: string;
  accountId?: string;
};

export type CommodityPurchaseResult = {
  referenceId: string;
  basePrice: number;
  commissionAmount: number;
  totalAmount: number;
  commissionRatePercent: number;
  offeringMerchantId: string;
  creatorMerchantId: string;
  creatorAppId: string;
  duplicate?: boolean;
};

export class CommodityPurchaseError extends Error {
  constructor(
    message: string,
    public readonly code: 'INSUFFICIENT_FUNDS' | 'SETTLEMENT_FAILED' | 'INVALID_PRODUCT' | 'CONFIG_ERROR'
  ) {
    super(message);
    this.name = 'CommodityPurchaseError';
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function executeCommodityPurchase(
  input: CommodityPurchaseInput
): Promise<CommodityPurchaseResult> {
  const product = await productService.getProductInfo(input.productId);
  if (!product) {
    throw new CommodityPurchaseError('Product not found', 'INVALID_PRODUCT');
  }

  const basePrice = roundMoney(Number(product.price ?? input.amount ?? 0));
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw new CommodityPurchaseError('Commodity price is not configured for this product', 'INVALID_PRODUCT');
  }

  const pricing = await productService.getProductPricing(input.productId, input.appId);
  const commissionRatePercent = resolveMerchantCommissionRatePercent({
    springTDFee: pricing?.springTDFee,
    serviceFee: pricing?.serviceFee,
    markupRate: pricing?.markupRate
  });
  const commissionAmount = calculateCommodityCharge(basePrice, commissionRatePercent);
  const totalAmount = roundMoney(basePrice + commissionAmount);

  const appInfo = await createAppService.getAppInfo(input.appId);
  if (!appInfo?.merchantId) {
    throw new CommodityPurchaseError('Storefront merchant not found for app', 'CONFIG_ERROR');
  }

  let creatorMerchantId = (product.merchant?.id || '').trim();
  let creatorAppId = (product.upstreamAppId || '').trim();
  if (!creatorMerchantId && product.upstreamProductId) {
    const upstreamCatalog = await fetchPlataCatalogProductById(product.upstreamProductId);
    creatorMerchantId = (upstreamCatalog?.merchant?.id || '').trim();
    if (!creatorAppId && upstreamCatalog?.appId) {
      creatorAppId = upstreamCatalog.appId.trim();
    }
  }
  if (!creatorMerchantId) {
    throw new CommodityPurchaseError(
      'Product creator merchant not found — commodity must be linked to a Plata catalog product',
      'CONFIG_ERROR'
    );
  }
  if (!creatorAppId) {
    throw new CommodityPurchaseError(
      'Product creator app not found — commodity must be linked to a Plata catalog product with appId',
      'CONFIG_ERROR'
    );
  }

  const referenceId = input.accountId
    ? `commodity-purchase:${input.accountId}`
    : `commodity-purchase:${input.userId}:${input.productId}:${randomUUID()}`;

  const purchaseRequest: CommodityPurchaseCollectRequest = {
    userId: input.userId,
    offeringMerchantId: appInfo.merchantId,
    offeringAppId: input.appId,
    creatorMerchantId,
    creatorAppId,
    baseAmount: basePrice,
    commissionAmount,
    referenceId,
    productId: input.productId,
    currency: input.currency,
    allowExternalPrincipalSettlement: true,
    metadata: {
      accountId: input.accountId,
      upstreamProductId: product.upstreamProductId,
      commissionRatePercent
    }
  };

  const springResult = await collectCommodityPurchaseOnSpringWallet(purchaseRequest);
  if (springResult.insufficientFunds) {
    throw new CommodityPurchaseError(
      springResult.error || 'Insufficient balance in user wallet',
      'INSUFFICIENT_FUNDS'
    );
  }
  if (!springResult.success) {
    throw new CommodityPurchaseError(
      springResult.error || 'Failed to collect commodity purchase on Spring wallet',
      'SETTLEMENT_FAILED'
    );
  }

  if (!springResult.duplicate && springResult.principalPendingExternalSettlement) {
    if (!isPlataGatewayConfigured()) {
      await reverseCommodityPurchaseOnSpringWallet(purchaseRequest);
      throw new CommodityPurchaseError('Plata gateway keys are not configured', 'CONFIG_ERROR');
    }

    const plataResult = await collectCommodityPrincipalViaPlataGateway({
      creatorMerchantId,
      creatorAppId,
      amount: basePrice,
      referenceId,
      source: 'spring-commodity-purchase',
      category: 'COMMODITY_DEPOSIT',
      productId: input.productId,
      productType: 'COMMODITY',
      currency: input.currency,
      description: `Commodity principal from Spring purchase (${basePrice} ${input.currency})`,
      metadata: {
        springReferenceId: referenceId,
        offeringMerchantId: appInfo.merchantId,
        offeringAppId: input.appId,
        userId: input.userId,
        basePrice,
        commissionAmount,
        totalAmount
      }
    });

    if (!plataResult.success && !plataResult.skipped) {
      await reverseCommodityPurchaseOnSpringWallet(purchaseRequest);
      throw new CommodityPurchaseError(
        plataResult.error || 'Failed to credit product creator settlement on Plata',
        'SETTLEMENT_FAILED'
      );
    }
  }

  return {
    referenceId,
    basePrice,
    commissionAmount,
    totalAmount,
    commissionRatePercent,
    offeringMerchantId: appInfo.merchantId,
    creatorMerchantId,
    creatorAppId,
    duplicate: springResult.duplicate
  };
}

