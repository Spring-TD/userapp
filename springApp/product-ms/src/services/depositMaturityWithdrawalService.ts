import { ProductApplicationModel, type IProductApplicationDocument } from '../models/ProductApplicationModel';
import { ProductModel, toProduct } from '../models/ProductModel';
import { ApiError } from '../middleware/errorHandler';
import {
  calculateFlatMaturityInterest,
  isMoratoriumEnded,
  resolveAccountMaturityAt
} from '../utils/commodityPricing';
import { extractDepositBalanceFromSnapshot } from '../utils/moneySnapshotAmounts';
import { appendDepositActivity, isFlexibleSavingsProduct, roundMoney } from '../utils/savingsInterest';
import {
  enqueueMaturityWithdrawalRequestViaPlataGateway,
  isPlataGatewayConfigured
} from './settlement/plataGatewayClient';
import { resolveProductCreatorMerchant } from './settlement/productCreatorResolver';
import clientAuthUserService from './clientAuthUserService';
import { notifyWithdrawalRequestUnderReview } from './maturityWithdrawalNotificationService';

export type DepositProductType = 'SAVINGS' | 'INVESTMENT';

export type DepositMaturityWithdrawRequest = {
  userId: string;
  /** Partial amount — only for flexible/anytime SAVINGS. */
  amount?: number;
};

export type DepositMaturityWithdrawResponse = {
  applicationId: string;
  referenceId: string;
  principal: number;
  interest: number;
  totalPayout: number;
  currency: string;
  withdrawnAt: string;
  productType: DepositProductType;
  status?: 'pending_approval' | 'completed';
  remainingBalance?: number;
};

function snapshotOf(application: IProductApplicationDocument): Record<string, unknown> {
  return application.contractSnapshot && typeof application.contractSnapshot === 'object'
    ? (application.contractSnapshot as Record<string, unknown>)
    : {};
}

function balanceFieldForType(productType: DepositProductType): string {
  return productType === 'SAVINGS' ? 'savingsBalance' : 'investmentBalance';
}

class DepositMaturityWithdrawalService {
  private async loadOwnedDepositApplication(
    applicationId: string,
    userId: string,
    productType: DepositProductType
  ) {
    const application = await ProductApplicationModel.findById(applicationId);
    if (!application) {
      throw new ApiError(404, `${productType} account not found`);
    }
    if (application.userId !== userId.trim()) {
      throw new ApiError(403, `${productType} account does not belong to this user`);
    }
    const appProductType = String(application.productType || '').trim().toUpperCase();
    if (appProductType !== productType) {
      throw new ApiError(400, `Application is not a ${productType.toLowerCase()} account`);
    }
    if (application.status !== 'APPROVED') {
      throw new ApiError(400, `${productType} account is not active`);
    }
    if (!application.merchantId || !application.appId) {
      throw new ApiError(409, `${productType} account is missing storefront merchant context`);
    }

    const productDoc = await ProductModel.findById(application.productId);
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    return { application, product: toProduct(productDoc) };
  }

  async withdraw(
    applicationId: string,
    input: DepositMaturityWithdrawRequest,
    productType: DepositProductType
  ): Promise<{ withdrawal: DepositMaturityWithdrawResponse; duplicate: boolean }> {
    const { application, product } = await this.loadOwnedDepositApplication(
      applicationId,
      input.userId,
      productType
    );
    const offeringMerchantId = application.merchantId!;
    const appId = application.appId!;
    const snapshot = snapshotOf(application);
    const holdingStatus = String(snapshot.holdingStatus || snapshot.accountHoldingStatus || '')
      .trim()
      .toUpperCase();

    if (holdingStatus === 'WITHDRAWN') {
      throw new ApiError(409, `${productType} account has already been withdrawn`);
    }
    if (holdingStatus === 'WITHDRAWAL_PENDING' || holdingStatus === 'PENDING_WITHDRAWAL') {
      throw new ApiError(409, `${productType} withdrawal request is already pending merchant approval`);
    }

    const maturityAt = resolveAccountMaturityAt({
      product,
      snapshot,
      createdAt: application.createdAt
    });
    if (!isMoratoriumEnded(maturityAt)) {
      throw new ApiError(403, 'Withdrawal is blocked until the holding period ends');
    }

    const available = extractDepositBalanceFromSnapshot(snapshot);
    if (!Number.isFinite(available) || available <= 0) {
      throw new ApiError(409, `${productType} balance is not available for withdrawal`);
    }

    const isFlexSavings = productType === 'SAVINGS' && isFlexibleSavingsProduct(product);
    const requestedAmount =
      input.amount != null && Number.isFinite(Number(input.amount)) ? Number(input.amount) : undefined;

    if (requestedAmount != null) {
      if (requestedAmount <= 0) {
        throw new ApiError(400, 'Withdrawal amount must be positive');
      }
      if (!isFlexSavings) {
        throw new ApiError(400, 'Partial withdrawals are only supported for flexible savings plans');
      }
      if (requestedAmount > available) {
        throw new ApiError(400, 'Withdrawal amount exceeds available balance');
      }
    }

    const principal = roundMoney(requestedAmount != null ? requestedAmount : available);
    // Flex plans accrue interest into balance daily — do not add flat maturity interest again.
    const interest = isFlexSavings ? 0 : calculateFlatMaturityInterest(principal, product);
    const totalPayout = roundMoney(principal + interest);
    const isPartial = isFlexSavings && principal < available;
    const referenceId = isPartial
      ? `${productType.toLowerCase()}-withdrawal:${application._id.toString()}:${principal}:${Date.now()}`
      : `${productType.toLowerCase()}-withdrawal:${application._id.toString()}`;
    const remainingBalance = roundMoney(available - principal);

    const snapshotCreatorMerchantId =
      typeof snapshot.creatorMerchantId === 'string' ? snapshot.creatorMerchantId.trim() : '';
    const snapshotCreatorAppId =
      typeof snapshot.creatorAppId === 'string' ? snapshot.creatorAppId.trim() : '';
    const creatorContext = await resolveProductCreatorMerchant(application.productId);
    const creatorMerchantId = snapshotCreatorMerchantId || creatorContext?.creatorMerchantId || '';
    // Same-merchant FI storefronts (e.g. EbbiesGallery) often omit upstreamProductId;
    // fall back to the offering app id so Plata Treasury enqueue still works.
    const creatorAppId =
      snapshotCreatorAppId ||
      creatorContext?.creatorAppId ||
      (creatorMerchantId && creatorMerchantId === offeringMerchantId ? appId : '') ||
      '';
    if (!creatorMerchantId || !creatorAppId) {
      throw new ApiError(409, `${productType} creator settlement context is missing for maturity payout`);
    }

    const usesPlataTreasury =
      isPlataGatewayConfigured() && Boolean(creatorMerchantId && creatorAppId);

    if (!usesPlataTreasury) {
      throw new ApiError(
        503,
        `${productType} maturity withdrawal requires Plata creator Treasury approval queue`
      );
    }

    const applicantName =
      (typeof snapshot.applicantName === 'string' && snapshot.applicantName.trim()) ||
      (await clientAuthUserService.resolveApplicantName(application.userId, undefined, application.email)) ||
      'Customer';

    const enqueue = await enqueueMaturityWithdrawalRequestViaPlataGateway({
      creatorMerchantId,
      creatorAppId,
      amount: totalPayout,
      principalAmount: principal,
      interestAmount: interest,
      referenceId,
      currency: application.currency,
      description: `${productType} maturity withdrawal request (${totalPayout} ${application.currency})`,
      productId: product.upstreamProductId || product.id,
      productType,
      applicationId: application.upstreamApplicationId || application._id.toString(),
      offeringMerchantId,
      offeringAppId: appId,
      userId: application.userId,
      customerName: applicantName,
      customerEmail: application.email,
      productName: product.name,
      maturityAt: maturityAt || undefined,
      springLocalApplicationId: application._id.toString(),
      metadata: {
        localApplicationId: application._id.toString(),
        productId: application.productId
      }
    });

    if (!enqueue.success) {
      throw new ApiError(502, enqueue.error || 'Failed to submit withdrawal request for approval');
    }

    const requestedAt = new Date().toISOString();
    const balanceField = balanceFieldForType(productType);
    let updatedSnapshot: Record<string, unknown> = {
      ...snapshot,
      withdrawalRequestedAt: requestedAt,
      withdrawalReferenceId: referenceId,
      pendingWithdrawalPrincipal: principal,
      pendingWithdrawalInterest: interest,
      pendingWithdrawalTotal: totalPayout,
      [balanceField]: isPartial ? remainingBalance : principal
    };

    if (isPartial) {
      updatedSnapshot = appendDepositActivity({
        snapshot: {
          ...updatedSnapshot,
          holdingStatus: holdingStatus || 'ACTIVE',
          accountHoldingStatus: holdingStatus || 'ACTIVE'
        },
        amount: -principal,
        balanceAfter: remainingBalance,
        productName: product.name,
        referenceId,
        at: requestedAt,
        isFirstDeposit: false
      });
      // appendDepositActivity forces TOP_UP/DEPOSIT titles — rewrite last row as withdrawal
      const ledger = Array.isArray(updatedSnapshot.activityLedger)
        ? [...(updatedSnapshot.activityLedger as Record<string, unknown>[])]
        : [];
      if (ledger.length) {
        const last = { ...ledger[ledger.length - 1] };
        last.type = 'WITHDRAWAL';
        last.title = 'Withdrawal';
        last.subtitle = 'Pending merchant approval';
        last.amount = -principal;
        ledger[ledger.length - 1] = last;
        updatedSnapshot.activityLedger = ledger;
      }
      updatedSnapshot.holdingStatus = remainingBalance > 0 ? 'ACTIVE' : 'WITHDRAWAL_PENDING';
      updatedSnapshot.accountHoldingStatus = updatedSnapshot.holdingStatus;
    } else {
      updatedSnapshot.holdingStatus = 'WITHDRAWAL_PENDING';
      updatedSnapshot.accountHoldingStatus = 'WITHDRAWAL_PENDING';
    }

    application.contractSnapshot = updatedSnapshot;
    application.amount = isPartial ? remainingBalance : principal;
    await application.save();

    if (!enqueue.duplicate) {
      void notifyWithdrawalRequestUnderReview({
        userId: application.userId,
        email: application.email,
        userName: applicantName,
        productName: product.name,
        productType,
        amount: totalPayout,
        currency: application.currency,
        applicationId: application._id.toString()
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
        withdrawnAt: requestedAt,
        productType,
        status: 'pending_approval',
        ...(isPartial ? { remainingBalance } : {})
      },
      duplicate: enqueue.duplicate === true
    };
  }
}

export default new DepositMaturityWithdrawalService();
