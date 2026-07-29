import { ProductApplicationModel, type IProductApplicationDocument } from '../models/ProductApplicationModel';
import { ProductModel, toProduct } from '../models/ProductModel';
import { ApiError } from '../middleware/errorHandler';
import {
  calculateCommodityFlatInterest,
  isMoratoriumEnded
} from '../utils/commodityPricing';
import {
  isSettlementWalletConfigured,
  payoutCommodityMaturityOnSpringWallet
} from './settlement/walletSettlementClient';
import { resolveProductCreatorMerchant } from './settlement/productCreatorResolver';
import upstreamApplicationService from './upstreamApplicationService';
import clientAuthUserService from './clientAuthUserService';
import complianceBvnService from './complianceBvnService';
import merchantDisplayNameService from './merchantDisplayNameService';
import { sendCommodityWithdrawalNotification } from './commodityNotificationService';
import type { CommodityWithdrawRequest, CommodityWithdrawResponse } from '../types/commodityAccount';

function snapshotOf(application: IProductApplicationDocument): Record<string, unknown> {
  return application.contractSnapshot && typeof application.contractSnapshot === 'object'
    ? (application.contractSnapshot as Record<string, unknown>)
    : {};
}

class CommodityWithdrawalService {
  private async loadOwnedCommodityApplication(applicationId: string, userId: string) {
    const application = await ProductApplicationModel.findById(applicationId);
    if (!application) {
      throw new ApiError(404, 'Commodity account not found');
    }
    if (application.userId !== userId.trim()) {
      throw new ApiError(403, 'Commodity account does not belong to this user');
    }
    const productType = String(application.productType || '').trim().toUpperCase();
    if (productType !== 'COMMODITY') {
      throw new ApiError(400, 'Application is not a commodity account');
    }
    if (application.status !== 'APPROVED') {
      throw new ApiError(400, 'Commodity account is not active');
    }
    if (!application.merchantId || !application.appId) {
      throw new ApiError(409, 'Commodity account is missing storefront merchant context');
    }

    const productDoc = await ProductModel.findById(application.productId);
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    return { application, product: toProduct(productDoc) };
  }

  async withdraw(
    applicationId: string,
    input: CommodityWithdrawRequest
  ): Promise<{ withdrawal: CommodityWithdrawResponse; duplicate: boolean }> {
    if (!isSettlementWalletConfigured()) {
      throw new ApiError(503, 'Wallet settlement is not configured');
    }

    const { application, product } = await this.loadOwnedCommodityApplication(applicationId, input.userId);
    const offeringMerchantId = application.merchantId!;
    const appId = application.appId!;
    const snapshot = snapshotOf(application);
    const holdingStatus = snapshot.commodityHoldingStatus;

    if (holdingStatus === 'WITHDRAWN') {
      throw new ApiError(409, 'Commodity holding has already been withdrawn');
    }

    const maturityAt = typeof snapshot.maturityAt === 'string' ? snapshot.maturityAt : undefined;
    if (!isMoratoriumEnded(maturityAt)) {
      throw new ApiError(403, 'Withdrawal is blocked until the holding period ends');
    }

    const principal = Number(snapshot.commodityPrincipal ?? application.amount ?? 0);
    if (!Number.isFinite(principal) || principal <= 0) {
      throw new ApiError(409, 'Commodity principal is not recorded for this account');
    }

    const interest = calculateCommodityFlatInterest(principal, product);
    const totalPayout = Math.round((principal + interest) * 100) / 100;
    const referenceId = `commodity-withdrawal:${application._id.toString()}`;

    const snapshotCreatorMerchantId =
      typeof snapshot.creatorMerchantId === 'string' ? snapshot.creatorMerchantId.trim() : '';
    const snapshotCreatorAppId =
      typeof snapshot.creatorAppId === 'string' ? snapshot.creatorAppId.trim() : '';
    const creatorContext = await resolveProductCreatorMerchant(application.productId);
    const creatorMerchantId = snapshotCreatorMerchantId || creatorContext?.creatorMerchantId || '';
    const creatorAppId = snapshotCreatorAppId || creatorContext?.creatorAppId || '';
    if (!creatorMerchantId || !creatorAppId) {
      throw new ApiError(409, 'Commodity creator settlement context is missing for maturity payout');
    }

    const payout = await payoutCommodityMaturityOnSpringWallet({
      userId: application.userId,
      offeringMerchantId,
      creatorMerchantId,
      creatorAppId,
      principalAmount: principal,
      interestAmount: interest,
      referenceId,
      applicationId: application._id.toString(),
      currency: application.currency,
      metadata: {
        upstreamApplicationId: application.upstreamApplicationId,
        productId: application.productId
      }
    });

    if (!payout.success) {
      throw new ApiError(502, payout.error || 'Failed to process commodity maturity payout');
    }

    const withdrawnAt = new Date().toISOString();
    const updatedSnapshot = {
      ...snapshot,
      commodityHoldingStatus: 'WITHDRAWN',
      withdrawnAt,
      withdrawalReferenceId: referenceId,
      interestPaid: interest,
      totalWithdrawn: totalPayout,
      totalWithdrawals: totalPayout
    };

    application.contractSnapshot = updatedSnapshot;
    await application.save();

    if (!payout.duplicate && application.upstreamApplicationId) {
      const applicantName =
        (typeof snapshot.applicantName === 'string' && snapshot.applicantName.trim()) ||
        (await clientAuthUserService.resolveApplicantName(application.userId, undefined, application.email)) ||
        'Applicant';
      const email = application.email?.trim();
      if (email) {
        const phone = (await clientAuthUserService.resolveUserPhone(application.userId)) || '+2340000000000';
        const bvn = (await complianceBvnService.resolveUserBvn(application.userId)) || '00000000000';
        const offeringMerchantName = await merchantDisplayNameService.resolveOfferingMerchantName({
          merchantId: offeringMerchantId,
          appId,
          fallback: undefined
        });
        await upstreamApplicationService.syncSavingsDepositSnapshot({
          localApplicationId: application._id.toString(),
          product,
          userId: application.userId,
          applicantName,
          email,
          phone,
          bvn,
          currency: application.currency,
          offeringMerchantId,
          offeringMerchantName,
          contractSnapshot: updatedSnapshot
        });
      }
    }

    if (!payout.duplicate) {
      void sendCommodityWithdrawalNotification({
        userId: application.userId,
        email: application.email,
        applicantName:
          (typeof snapshot.applicantName === 'string' && snapshot.applicantName) || application.email || 'User',
        productName: application.productName,
        applicationId: application._id.toString(),
        principal,
        interest,
        totalPayout,
        currency: application.currency
      });
    }

    return {
      withdrawal: {
        applicationId: application._id.toString(),
        referenceId,
        principal,
        interest,
        totalPayout,
        currency: application.currency,
        withdrawnAt
      },
      duplicate: payout.duplicate === true
    };
  }
}

export default new CommodityWithdrawalService();
