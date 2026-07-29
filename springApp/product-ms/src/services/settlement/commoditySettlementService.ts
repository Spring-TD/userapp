import type { Product } from '../../types/product';

import { db } from '../../db/database';

import {

  calculateCommodityCharge,

  resolveMerchantCommissionRatePercent

} from './commissionCalculators';

import {

  collectCommodityPrincipalViaPlataGateway,

  fetchPlataCatalogProductById,

  isPlataGatewayConfigured

} from './plataGatewayClient';

import {

  collectCommodityPurchaseOnSpringWallet,

  isSettlementWalletConfigured,

  reverseCommodityPurchaseOnSpringWallet,

  type CommodityPurchaseCollectRequest

} from './walletSettlementClient';



export class CommodityEnrollmentSettlementError extends Error {

  constructor(

    message: string,

    public readonly code: 'CONFIG_ERROR' | 'INSUFFICIENT_FUNDS' | 'SETTLEMENT_FAILED'

  ) {

    super(message);

    this.name = 'CommodityEnrollmentSettlementError';

  }

}



export type ExecuteCommodityEnrollmentSettlementInput = {

  userId: string;

  offeringMerchantId: string;

  offeringAppId: string;

  productId: string;

  applicationId: string;

  upstreamApplicationId?: string;

  baseAmount: number;

  currency: string;

  product: Product;

  referenceId: string;

};



export type ExecuteCommodityEnrollmentSettlementResult = {

  referenceId: string;

  basePrice: number;

  commissionAmount: number;

  totalAmount: number;

  commissionRatePercent: number;

  creatorMerchantId: string;

  creatorAppId: string;

  duplicate?: boolean;

};



async function resolveCreatorContext(product: Product): Promise<{

  creatorMerchantId: string;

  creatorAppId: string;

}> {

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

    throw new CommodityEnrollmentSettlementError(

      'Product creator merchant not found — commodity must be linked to a Plata catalog product',

      'CONFIG_ERROR'

    );

  }

  if (!creatorAppId) {

    throw new CommodityEnrollmentSettlementError(

      'Product creator app not found — commodity must be linked to a Plata catalog product with appId',

      'CONFIG_ERROR'

    );

  }

  return { creatorMerchantId, creatorAppId };

}



export async function executeCommodityEnrollmentSettlement(

  input: ExecuteCommodityEnrollmentSettlementInput

): Promise<ExecuteCommodityEnrollmentSettlementResult> {

  if (!isSettlementWalletConfigured()) {

    throw new CommodityEnrollmentSettlementError('Wallet settlement is not configured', 'CONFIG_ERROR');

  }

  if (!isPlataGatewayConfigured()) {

    throw new CommodityEnrollmentSettlementError('Plata gateway keys are not configured', 'CONFIG_ERROR');

  }



  const basePrice = Number(input.baseAmount);

  if (!Number.isFinite(basePrice) || basePrice <= 0) {

    throw new CommodityEnrollmentSettlementError('Commodity principal must be positive', 'CONFIG_ERROR');

  }



  const merchantConfig = await db.findMerchantConfiguration(input.offeringAppId, input.productId);

  const commissionRatePercent = resolveMerchantCommissionRatePercent({

    springTDFee: merchantConfig?.springTDFee,

    serviceFee: merchantConfig?.serviceFee,

    markupRate: merchantConfig?.markupRate

  });

  const commissionAmount = calculateCommodityCharge(basePrice, commissionRatePercent);

  const totalAmount = Math.round((basePrice + commissionAmount) * 100) / 100;



  const { creatorMerchantId, creatorAppId } = await resolveCreatorContext(input.product);



  const referenceId = input.referenceId.trim();

  const purchaseRequest: CommodityPurchaseCollectRequest = {

    userId: input.userId,

    offeringMerchantId: input.offeringMerchantId,

    offeringAppId: input.offeringAppId,

    creatorMerchantId,

    creatorAppId,

    baseAmount: basePrice,

    commissionAmount,

    referenceId,

    productId: input.productId,

    applicationId: input.applicationId,

    currency: input.currency,

    allowExternalPrincipalSettlement: true,

    metadata: {

      upstreamProductId: input.product.upstreamProductId,

      upstreamApplicationId: input.upstreamApplicationId,

      enrollment: true

    }

  };



  const springCollect = await collectCommodityPurchaseOnSpringWallet(purchaseRequest);

  if (springCollect.insufficientFunds) {

    throw new CommodityEnrollmentSettlementError(

      springCollect.error || 'Insufficient balance in user wallet for commodity enrollment',

      'INSUFFICIENT_FUNDS'

    );

  }

  if (!springCollect.success) {

    throw new CommodityEnrollmentSettlementError(

      springCollect.error || 'Failed to collect commodity enrollment payment on Spring wallet',

      'SETTLEMENT_FAILED'

    );

  }



  if (springCollect.duplicate) {

    return {

      referenceId,

      basePrice,

      commissionAmount,

      totalAmount,

      commissionRatePercent,

      creatorMerchantId,

      creatorAppId,

      duplicate: true

    };

  }



  if (springCollect.principalPendingExternalSettlement) {

    try {

      const plataCredit = await collectCommodityPrincipalViaPlataGateway({

        creatorMerchantId,

        creatorAppId,

        amount: basePrice,

        referenceId,

        currency: input.currency,

        productId: input.product.upstreamProductId || input.product.id,

        productType: 'COMMODITY',

        applicationId: input.upstreamApplicationId || input.applicationId,

        description: `Commodity enrollment principal (${basePrice} ${input.currency})`,

        metadata: {

          localApplicationId: input.applicationId,

          offeringMerchantId: input.offeringMerchantId,

          offeringAppId: input.offeringAppId,

          userId: input.userId,

          basePrice,

          commissionAmount,

          totalAmount

        }

      });



      if (!plataCredit.success && !plataCredit.skipped) {

        throw new CommodityEnrollmentSettlementError(

          plataCredit.error || 'Failed to credit Plata creator settlement wallet',

          'SETTLEMENT_FAILED'

        );

      }

    } catch (error) {

      await reverseCommodityPurchaseOnSpringWallet(purchaseRequest);

      throw error;

    }

  }



  return {

    referenceId,

    basePrice,

    commissionAmount,

    totalAmount,

    commissionRatePercent,

    creatorMerchantId,

    creatorAppId

  };

}


