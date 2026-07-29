import { ProductModel, toProduct } from '../models/ProductModel';
import {
  ProductApplicationModel,
  type IProductApplicationDocument
} from '../models/ProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';
import type { Product } from '../types/product';
import { extractDepositBalanceFromSnapshot } from '../utils/moneySnapshotAmounts';
import { buildSavingsDepositMerchantReference } from '../utils/savingsDepositReference';
import complianceBvnService from './complianceBvnService';
import clientAuthUserService from './clientAuthUserService';
import merchantDisplayNameService from './merchantDisplayNameService';
import upstreamApplicationService from './upstreamApplicationService';
import {
  executeSavingsDepositSettlement,
  executeExternalSavingsDepositSettlement,
  SavingsDepositSettlementError
} from './settlement/savingsSettlementService';
import {
  formatMoney,
  notifySavingsContribution,
  notifySavingsGoalMilestone
} from './productFlowNotificationService';
import type {
  SavingsDepositDetailsResponse,
  SavingsDepositRequest,
  SavingsDepositResponse,
  SavingsDepositWebhookRequest
} from '../types/savingsAccount';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function savingsBalanceFrom(application: IProductApplicationDocument): number {
  return extractDepositBalanceFromSnapshot(application.contractSnapshot as Record<string, unknown> | undefined);
}

function validateDepositAmount(product: Product, amount: number, currency: string): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Deposit amount must be positive');
  }

  const savingsAmount = asRecord(product.structure)?.savingsAmount as
    | { min?: number; max?: number }
    | undefined;
  if (savingsAmount?.min != null && amount < savingsAmount.min) {
    throw new ApiError(400, `Deposit amount must be at least ${savingsAmount.min} ${currency}`);
  }
  if (savingsAmount?.max != null && amount > savingsAmount.max) {
    throw new ApiError(400, `Deposit amount cannot exceed ${savingsAmount.max} ${currency}`);
  }
}

function bumpSavingsSnapshot(
  snapshot: Record<string, unknown> | undefined,
  amount: number,
  currency: string
): Record<string, unknown> {
  const base = { ...(snapshot ?? {}) };
  const previousBalance = extractDepositBalanceFromSnapshot(base);
  const previousDeposits = Number(base.totalDeposits);
  const totalDeposits =
    Number.isFinite(previousDeposits) && previousDeposits >= 0 ? previousDeposits + amount : amount;
  const nextBalance = previousBalance + amount;

  return {
    ...base,
    currency: currency.trim().toUpperCase(),
    savingsBalance: nextBalance,
    currentBalance: nextBalance,
    totalDeposits,
    lastDepositAt: new Date().toISOString(),
    lastDepositAmount: amount
  };
}

function toDepositResponse(application: IProductApplicationDocument, referenceId: string): SavingsDepositResponse {
  return {
    applicationId: application._id.toString(),
    upstreamApplicationId: application.upstreamApplicationId,
    referenceId,
    amount: application.amount,
    balance: savingsBalanceFrom(application),
    currency: application.currency,
    account: {
      id: application._id.toString(),
      userId: application.userId,
      accountType: 'savings',
      balance: savingsBalanceFrom(application),
      currency: application.currency,
      status: 'active',
      productId: application.productId,
      productName: application.productName,
      applicationId: application._id.toString()
    }
  };
}

class SavingsDepositService {
  private notifyAfterDeposit(
    application: IProductApplicationDocument,
    product: Product,
    amount: number,
    currency: string
  ): void {
    const balance = savingsBalanceFrom(application);
    const amountLabel = formatMoney(amount, currency);
    const snapshot = application.contractSnapshot as Record<string, unknown> | undefined;
    const userName =
      (typeof snapshot?.applicantName === 'string' && snapshot.applicantName.trim()) || application.userId;

    void notifySavingsContribution({
      userId: application.userId,
      email: application.email,
      userName,
      planName: application.productName,
      amount: amountLabel
    });
    this.maybeNotifySavingsMilestone(application, product, balance, currency, userName);
  }

  private maybeNotifySavingsMilestone(
    application: IProductApplicationDocument,
    product: Product,
    balance: number,
    currency: string,
    userName: string
  ): void {
    const structure = asRecord(product.structure);
    const goalRaw = structure?.savingsGoal ?? structure?.targetAmount ?? structure?.goalAmount;
    const goalAmount = typeof goalRaw === 'number' && goalRaw > 0 ? goalRaw : undefined;
    if (!goalAmount) return;

    const snapshot = application.contractSnapshot as Record<string, unknown> | undefined;
    if (snapshot?.goalMilestoneNotified === true) return;

    const pct = Math.floor((balance / goalAmount) * 100);
    const milestones = [25, 50, 75, 100];
    const hit = milestones.filter((m) => pct >= m).pop();
    if (!hit) return;

    snapshot!.goalMilestoneNotified = true;
    application.contractSnapshot = snapshot;
    void application.save().catch(() => undefined);

    void notifySavingsGoalMilestone({
      userId: application.userId,
      email: application.email,
      userName,
      planName: application.productName,
      milestone: `${hit}%`,
      goalAmount: formatMoney(goalAmount, currency)
    });
  }

  private async loadOwnedSavingsApplication(
    applicationId: string,
    userId: string
  ): Promise<{ application: IProductApplicationDocument; product: Product }> {
    const application = await ProductApplicationModel.findById(applicationId);
    if (!application) {
      throw new ApiError(404, 'Savings account not found');
    }
    if (application.userId !== userId.trim()) {
      throw new ApiError(403, 'Savings account does not belong to this user');
    }
    const productType = String(application.productType || '').trim().toUpperCase();
    if (productType !== 'SAVINGS') {
      throw new ApiError(400, 'Application is not a savings account');
    }
    if (application.status !== 'APPROVED') {
      throw new ApiError(400, 'Savings account is not active');
    }
    if (!application.upstreamApplicationId?.trim()) {
      throw new ApiError(409, 'Savings account is not linked to Plata upstream');
    }
    if (!application.merchantId || !application.appId) {
      throw new ApiError(409, 'Savings account is missing storefront merchant context');
    }

    const productDoc = await ProductModel.findById(application.productId);
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    return { application, product: toProduct(productDoc) };
  }

  private async loadByUpstreamApplicationId(
    upstreamApplicationId: string
  ): Promise<{ application: IProductApplicationDocument; product: Product }> {
    const application = await ProductApplicationModel.findOne({
      upstreamApplicationId: upstreamApplicationId.trim(),
      productType: { $in: ['SAVINGS', 'Savings'] },
      status: 'APPROVED'
    })
      .sort({ updatedAt: -1 })
      .exec();

    if (!application) {
      throw new ApiError(404, 'Savings account not found for upstream application');
    }
    if (!application.merchantId || !application.appId) {
      throw new ApiError(409, 'Savings account is missing storefront merchant context');
    }

    const productDoc = await ProductModel.findById(application.productId);
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    return { application, product: toProduct(productDoc) };
  }

  private async syncSnapshotToPlata(
    application: IProductApplicationDocument,
    product: Product,
    contractSnapshot: Record<string, unknown>
  ): Promise<void> {
    const applicantName =
      (typeof contractSnapshot.applicantName === 'string' && contractSnapshot.applicantName.trim()) ||
      application.email ||
      'Applicant';
    const email = application.email?.trim();
    if (!email) {
      throw new ApiError(409, 'Savings account email is required to sync deposit to Plata');
    }

    const phone =
      (await clientAuthUserService.resolveUserPhone(application.userId)) || '+2340000000000';
    const bvn = (await complianceBvnService.resolveUserBvn(application.userId)) || '00000000000';

    const offeringMerchantName = await merchantDisplayNameService.resolveOfferingMerchantName({
      merchantId: application.merchantId!,
      appId: application.appId!,
      fallback: undefined
    });

    const upstream = await upstreamApplicationService.syncSavingsDepositSnapshot({
      localApplicationId: application._id.toString(),
      product,
      userId: application.userId,
      applicantName,
      email,
      phone,
      bvn,
      currency: application.currency,
      offeringMerchantId: application.merchantId!,
      offeringMerchantName,
      contractSnapshot
    });

    if (upstream.skipReason) {
      throw new ApiError(502, `Plata savings deposit sync failed: ${upstream.skipReason}`);
    }
  }

  async getDepositDetails(applicationId: string, userId: string): Promise<SavingsDepositDetailsResponse> {
    const { application, product } = await this.loadOwnedSavingsApplication(applicationId, userId);
    const savingsAmount = asRecord(product.structure)?.savingsAmount as
      | { min?: number; max?: number }
      | undefined;

    return {
      applicationId: application._id.toString(),
      upstreamApplicationId: application.upstreamApplicationId,
      currency: application.currency,
      balance: savingsBalanceFrom(application),
      minAmount: savingsAmount?.min,
      maxAmount: savingsAmount?.max,
      centralWalletAvailable: true,
      bankDetails: {
        merchantReference: buildSavingsDepositMerchantReference(application.upstreamApplicationId!)
      }
    };
  }

  async depositFromWallet(
    applicationId: string,
    input: SavingsDepositRequest
  ): Promise<{ deposit: SavingsDepositResponse; duplicate: boolean }> {
    const { application, product } = await this.loadOwnedSavingsApplication(applicationId, input.userId);
    const currency = (input.currency || application.currency).trim().toUpperCase();
    if (currency !== application.currency.trim().toUpperCase()) {
      throw new ApiError(400, 'Deposit currency does not match savings account currency');
    }

    validateDepositAmount(product, input.amount, currency);

    const referenceId =
      input.referenceId?.trim() ||
      `savings-deposit:wallet:${application._id.toString()}:${Date.now()}`;

    let settlementDuplicate = false;
    try {
      const settlement = await executeSavingsDepositSettlement({
        userId: application.userId,
        offeringMerchantId: application.merchantId!,
        offeringAppId: application.appId!,
        productId: application.productId,
        applicationId: application._id.toString(),
        upstreamApplicationId: application.upstreamApplicationId!,
        principal: input.amount,
        currency,
        product,
        referenceId
      });
      settlementDuplicate = settlement.duplicate === true;
    } catch (error) {
      if (error instanceof SavingsDepositSettlementError && error.code === 'INSUFFICIENT_FUNDS') {
        throw new ApiError(402, error.message);
      }
      if (error instanceof SavingsDepositSettlementError) {
        if (/currency|does not match|not found|not configured|not active/i.test(error.message)) {
          throw new ApiError(400, error.message);
        }
        throw new ApiError(502, error.message);
      }
      throw error;
    }

    if (settlementDuplicate) {
      return {
        deposit: toDepositResponse(application, referenceId),
        duplicate: true
      };
    }

    const nextSnapshot = bumpSavingsSnapshot(
      application.contractSnapshot as Record<string, unknown> | undefined,
      input.amount,
      currency
    );
    application.contractSnapshot = nextSnapshot;
    application.amount = savingsBalanceFrom(application);
    await application.save();

    try {
      await this.syncSnapshotToPlata(application, product, nextSnapshot);
    } catch (error) {
      throw error instanceof ApiError ? error : new ApiError(502, 'Failed to sync savings deposit to Plata');
    }

    this.notifyAfterDeposit(application, product, input.amount, currency);

    return {
      deposit: toDepositResponse(application, referenceId),
      duplicate: false
    };
  }

  async depositFromExternalTransfer(
    input: SavingsDepositWebhookRequest
  ): Promise<{ deposit: SavingsDepositResponse; duplicate: boolean }> {
    const { application, product } = await this.loadByUpstreamApplicationId(input.upstreamApplicationId);
    const currency = (input.currency || application.currency).trim().toUpperCase();
    validateDepositAmount(product, input.amount, currency);

    const providerReference = input.providerReference.trim();
    const referenceId = `savings-deposit-external:${providerReference}`;

    let settlementDuplicate = false;
    try {
      const settlement = await executeExternalSavingsDepositSettlement({
        offeringMerchantId: application.merchantId!,
        offeringAppId: application.appId!,
        productId: application.productId,
        applicationId: application._id.toString(),
        upstreamApplicationId: application.upstreamApplicationId!,
        principal: input.amount,
        currency,
        product,
        referenceId,
        providerReference
      });
      settlementDuplicate = settlement.duplicate === true;
    } catch (error) {
      if (error instanceof SavingsDepositSettlementError) {
        throw new ApiError(502, error.message);
      }
      throw error;
    }

    if (settlementDuplicate) {
      return {
        deposit: toDepositResponse(application, referenceId),
        duplicate: true
      };
    }

    const nextSnapshot = bumpSavingsSnapshot(
      application.contractSnapshot as Record<string, unknown> | undefined,
      input.amount,
      currency
    );
    application.contractSnapshot = nextSnapshot;
    application.amount = savingsBalanceFrom(application);
    await application.save();

    await this.syncSnapshotToPlata(application, product, nextSnapshot);

    this.notifyAfterDeposit(application, product, input.amount, currency);

    return {
      deposit: toDepositResponse(application, referenceId),
      duplicate: false
    };
  }
}

export default new SavingsDepositService();
