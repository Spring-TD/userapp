import { ProductApplicationModel } from '../models/ProductApplicationModel';
import { ProductModel, toProduct } from '../models/ProductModel';
import { ApiError } from '../middleware/errorHandler';
import {
  isSettlementWalletConfigured,
  payoutMaturityOnSpringWallet,
  payoutCommodityMaturityOnSpringWallet
} from './settlement/walletSettlementClient';
import {
  notifyWithdrawalRequestApproved,
  notifyWithdrawalRequestRejected
} from './maturityWithdrawalNotificationService';
import clientAuthUserService from './clientAuthUserService';

function snapshotOf(application: { contractSnapshot?: unknown }): Record<string, unknown> {
  return application.contractSnapshot && typeof application.contractSnapshot === 'object'
    ? (application.contractSnapshot as Record<string, unknown>)
    : {};
}

class MaturityWithdrawalCompletionService {
  async completeApproved(args: {
    localApplicationId: string;
    referenceId: string;
    principal: number;
    interest: number;
    totalPayout: number;
    currency?: string;
    productType?: string;
  }): Promise<{ success: boolean; duplicate?: boolean }> {
    if (!isSettlementWalletConfigured()) {
      throw new ApiError(503, 'Wallet settlement is not configured');
    }

    const application = await ProductApplicationModel.findById(args.localApplicationId);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    const snapshot = snapshotOf(application);
    const holding =
      String(snapshot.holdingStatus || snapshot.accountHoldingStatus || snapshot.commodityHoldingStatus || '')
        .trim()
        .toUpperCase();

    if (holding === 'WITHDRAWN') {
      return { success: true, duplicate: true };
    }
    if (holding !== 'WITHDRAWAL_PENDING' && holding !== 'PENDING_WITHDRAWAL') {
      throw new ApiError(409, 'Application is not awaiting withdrawal approval');
    }

    const productDoc = await ProductModel.findById(application.productId);
    const product = productDoc ? toProduct(productDoc) : null;
    const productType = String(
      args.productType || application.productType || product?.type || 'COMMODITY'
    )
      .trim()
      .toUpperCase();

    const creatorMerchantId =
      (typeof snapshot.creatorMerchantId === 'string' && snapshot.creatorMerchantId.trim()) ||
      application.merchantId ||
      '';
    const creatorAppId =
      (typeof snapshot.creatorAppId === 'string' && snapshot.creatorAppId.trim()) ||
      application.appId ||
      '';
    const offeringMerchantId = application.merchantId || '';
    const offeringAppId = application.appId || '';

    if (!offeringMerchantId || !offeringAppId || !creatorMerchantId || !creatorAppId) {
      throw new ApiError(409, 'Missing merchant context for maturity credit');
    }

    const payoutArgs = {
      userId: application.userId,
      offeringMerchantId,
      offeringAppId,
      creatorMerchantId,
      creatorAppId,
      principalAmount: args.principal,
      interestAmount: args.interest,
      referenceId: args.referenceId,
      applicationId: application._id.toString(),
      currency: args.currency || application.currency,
      treasuryFundedExternally: true,
      productType,
      metadata: {
        plataApproved: true,
        upstreamApplicationId: application.upstreamApplicationId,
        productId: application.productId
      }
    };

    const payout =
      productType === 'COMMODITY'
        ? await payoutCommodityMaturityOnSpringWallet(payoutArgs)
        : await payoutMaturityOnSpringWallet(payoutArgs);

    if (!payout.success) {
      throw new ApiError(502, payout.error || 'Failed to credit storefront user wallet');
    }

    const withdrawnAt = new Date().toISOString();
    const balanceField =
      productType === 'SAVINGS'
        ? 'savingsBalance'
        : productType === 'INVESTMENT'
          ? 'investmentBalance'
          : 'commodityPrincipal';

    const updatedSnapshot = {
      ...snapshot,
      holdingStatus: 'WITHDRAWN',
      accountHoldingStatus: 'WITHDRAWN',
      commodityHoldingStatus: productType === 'COMMODITY' ? 'WITHDRAWN' : snapshot.commodityHoldingStatus,
      withdrawnAt,
      withdrawalReferenceId: args.referenceId,
      interestPaid: args.interest,
      totalWithdrawn: args.totalPayout,
      totalWithdrawals: args.totalPayout,
      [balanceField]: productType === 'COMMODITY' ? undefined : 0,
      ...(productType === 'COMMODITY' ? { commodityPrincipal: 0 } : {}),
      currentBalance: 0,
      balance: 0,
      amount: 0,
      maturityPayoutSource: 'plata-treasury-approved'
    };

    application.contractSnapshot = updatedSnapshot;
    application.amount = 0;
    await application.save();

    const applicantName =
      (typeof snapshot.applicantName === 'string' && snapshot.applicantName.trim()) ||
      (await clientAuthUserService.resolveApplicantName(application.userId, undefined, application.email)) ||
      'Customer';
    const productName =
      (typeof snapshot.productName === 'string' && snapshot.productName.trim()) ||
      product?.name ||
      `${productType} product`;

    void notifyWithdrawalRequestApproved({
      userId: application.userId,
      email: application.email,
      userName: applicantName,
      productName,
      productType,
      amount: args.totalPayout,
      currency: application.currency,
      applicationId: application._id.toString()
    });

    return { success: true, duplicate: payout.duplicate === true };
  }

  async completeRejected(args: {
    localApplicationId: string;
    referenceId: string;
    reason?: string;
    productType?: string;
  }): Promise<{ success: boolean }> {
    const application = await ProductApplicationModel.findById(args.localApplicationId);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    const snapshot = snapshotOf(application);
    const holding =
      String(snapshot.holdingStatus || snapshot.accountHoldingStatus || snapshot.commodityHoldingStatus || '')
        .trim()
        .toUpperCase();

    if (holding === 'WITHDRAWN') {
      throw new ApiError(409, 'Withdrawal was already completed');
    }

    const productDoc = await ProductModel.findById(application.productId);
    const product = productDoc ? toProduct(productDoc) : null;
    const productType = String(
      args.productType || application.productType || product?.type || 'COMMODITY'
    )
      .trim()
      .toUpperCase();

    const updatedSnapshot = {
      ...snapshot,
      holdingStatus: 'ACTIVE',
      accountHoldingStatus: 'ACTIVE',
      commodityHoldingStatus:
        productType === 'COMMODITY' ? 'HELD' : snapshot.commodityHoldingStatus,
      withdrawalRejectedAt: new Date().toISOString(),
      withdrawalRejectReason: args.reason || 'Rejected by merchant',
      withdrawalReferenceId: args.referenceId
    };
    application.contractSnapshot = updatedSnapshot;
    await application.save();

    const applicantName =
      (typeof snapshot.applicantName === 'string' && snapshot.applicantName.trim()) ||
      (await clientAuthUserService.resolveApplicantName(application.userId, undefined, application.email)) ||
      'Customer';
    const productName =
      (typeof snapshot.productName === 'string' && snapshot.productName.trim()) ||
      product?.name ||
      `${productType} product`;
    const pendingAmount = Number(
      snapshot.pendingWithdrawalTotal ??
        snapshot.totalWithdrawn ??
        application.amount ??
        0
    );

    void notifyWithdrawalRequestRejected({
      userId: application.userId,
      email: application.email,
      userName: applicantName,
      productName,
      productType,
      amount: Number.isFinite(pendingAmount) ? pendingAmount : undefined,
      currency: application.currency,
      applicationId: application._id.toString(),
      reason: args.reason
    });

    return { success: true };
  }
}

export default new MaturityWithdrawalCompletionService();
