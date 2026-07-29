import { ProductModel, toProduct } from '../models/ProductModel';
import {
  ProductApplicationModel,
  type IProductApplicationDocument
} from '../models/ProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';
import type { Product } from '../types/product';
import { extractDepositBalanceFromSnapshot } from '../utils/moneySnapshotAmounts';
import complianceBvnService from './complianceBvnService';
import clientAuthUserService from './clientAuthUserService';
import merchantDisplayNameService from './merchantDisplayNameService';
import upstreamApplicationService from './upstreamApplicationService';
import {
  executeInvestmentSettlement,
  InvestmentSettlementError
} from './settlement/investmentSettlementService';
import {
  formatMoney,
  notifyInvestmentActive,
  notifyInvestmentFundingConfirmed
} from './productFlowNotificationService';
import walletService from './walletService';
import type {
  InvestmentDepositDetailsResponse,
  InvestmentDepositRequest,
  InvestmentDepositResponse
} from '../types/investmentAccount';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function investmentBalanceFrom(application: IProductApplicationDocument): number {
  const snapshot = application.contractSnapshot as Record<string, unknown> | undefined;
  const fromInvestment = snapshot?.investmentBalance;
  if (typeof fromInvestment === 'number' && Number.isFinite(fromInvestment) && fromInvestment >= 0) {
    return fromInvestment;
  }
  return extractDepositBalanceFromSnapshot(snapshot);
}

function validateDepositAmount(product: Product, amount: number, currency: string): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Deposit amount must be positive');
  }

  const investmentAmount = asRecord(product.structure)?.investmentAmount as
    | { min?: number; max?: number }
    | undefined;
  if (investmentAmount?.min != null && amount < investmentAmount.min) {
    throw new ApiError(400, `Deposit amount must be at least ${investmentAmount.min} ${currency}`);
  }
  if (investmentAmount?.max != null && amount > investmentAmount.max) {
    throw new ApiError(400, `Deposit amount cannot exceed ${investmentAmount.max} ${currency}`);
  }
}

function bumpInvestmentSnapshot(
  snapshot: Record<string, unknown> | undefined,
  amount: number,
  currency: string
): Record<string, unknown> {
  const base = { ...(snapshot ?? {}) };
  const fromInvestment = base.investmentBalance;
  const previousBalance =
    typeof fromInvestment === 'number' && Number.isFinite(fromInvestment) && fromInvestment >= 0
      ? fromInvestment
      : extractDepositBalanceFromSnapshot(base);
  const previousDeposits = Number(base.totalDeposits);
  const totalDeposits =
    Number.isFinite(previousDeposits) && previousDeposits >= 0 ? previousDeposits + amount : amount;
  const nextBalance = previousBalance + amount;

  return {
    ...base,
    currency: currency.trim().toUpperCase(),
    investmentBalance: nextBalance,
    currentBalance: nextBalance,
    totalDeposits,
    lastDepositAt: new Date().toISOString(),
    lastDepositAmount: amount
  };
}

function toDepositResponse(
  application: IProductApplicationDocument,
  referenceId: string
): InvestmentDepositResponse {
  return {
    applicationId: application._id.toString(),
    upstreamApplicationId: application.upstreamApplicationId,
    referenceId,
    amount: application.amount,
    balance: investmentBalanceFrom(application),
    currency: application.currency,
    account: {
      id: application._id.toString(),
      userId: application.userId,
      accountType: 'investment',
      balance: investmentBalanceFrom(application),
      currency: application.currency,
      status: 'active',
      productId: application.productId,
      productName: application.productName,
      applicationId: application._id.toString()
    }
  };
}

class InvestmentDepositService {
  private notifyAfterDeposit(
    application: IProductApplicationDocument,
    product: Product,
    amount: number,
    currency: string
  ): void {
    const amountLabel = formatMoney(amount, currency);
    const snapshot = application.contractSnapshot as Record<string, unknown> | undefined;
    const userName =
      (typeof snapshot?.applicantName === 'string' && snapshot.applicantName.trim()) || application.userId;
    const returnTerms =
      String(asRecord(product.structure)?.expectedReturn || '') ||
      String(asRecord(product.about)?.expectedReturn || '') ||
      'as per product terms';

    void notifyInvestmentFundingConfirmed({
      userId: application.userId,
      email: application.email,
      userName,
      productName: application.productName,
      amount: amountLabel
    });
    void notifyInvestmentActive({
      userId: application.userId,
      email: application.email,
      userName,
      productName: application.productName,
      amount: amountLabel,
      returnTerms
    });
  }

  private async loadOwnedInvestmentApplication(
    applicationId: string,
    userId: string
  ): Promise<{ application: IProductApplicationDocument; product: Product }> {
    const application = await ProductApplicationModel.findById(applicationId);
    if (!application) {
      throw new ApiError(404, 'Investment account not found');
    }
    if (application.userId !== userId.trim()) {
      throw new ApiError(403, 'Investment account does not belong to this user');
    }
    const productType = String(application.productType || '').trim().toUpperCase();
    if (productType !== 'INVESTMENT') {
      throw new ApiError(400, 'Application is not an investment account');
    }
    if (application.status !== 'APPROVED') {
      throw new ApiError(400, 'Investment account is not active');
    }
    if (!application.upstreamApplicationId?.trim()) {
      throw new ApiError(409, 'Investment account is not linked to Plata upstream');
    }
    if (!application.merchantId || !application.appId) {
      throw new ApiError(409, 'Investment account is missing storefront merchant context');
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
      throw new ApiError(409, 'Investment account email is required to sync deposit to Plata');
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
      throw new ApiError(502, `Plata investment deposit sync failed: ${upstream.skipReason}`);
    }
  }

  async getDepositDetails(
    applicationId: string,
    userId: string
  ): Promise<InvestmentDepositDetailsResponse> {
    const { application, product } = await this.loadOwnedInvestmentApplication(applicationId, userId);
    const investmentAmount = asRecord(product.structure)?.investmentAmount as
      | { min?: number; max?: number }
      | undefined;

    return {
      applicationId: application._id.toString(),
      upstreamApplicationId: application.upstreamApplicationId,
      currency: application.currency,
      balance: investmentBalanceFrom(application),
      minAmount: investmentAmount?.min,
      maxAmount: investmentAmount?.max,
      centralWalletAvailable: true
    };
  }

  async depositFromWallet(
    applicationId: string,
    input: InvestmentDepositRequest
  ): Promise<{ deposit: InvestmentDepositResponse; duplicate: boolean }> {
    const { application, product } = await this.loadOwnedInvestmentApplication(applicationId, input.userId);
    const currency = (input.currency || application.currency).trim().toUpperCase();
    if (currency !== application.currency.trim().toUpperCase()) {
      throw new ApiError(400, 'Deposit currency does not match investment account currency');
    }

    validateDepositAmount(product, input.amount, currency);

    const referenceId =
      input.referenceId?.trim() ||
      `investment-deposit:wallet:${application._id.toString()}:${Date.now()}`;

    let settlementDuplicate = false;
    try {
      const settlement = await executeInvestmentSettlement({
        userId: application.userId,
        offeringMerchantId: application.merchantId!,
        offeringAppId: application.appId!,
        productId: application.productId,
        applicationId: application._id.toString(),
        principal: input.amount,
        currency,
        product,
        referenceId
      });
      settlementDuplicate = settlement.duplicate === true;
    } catch (error) {
      if (error instanceof InvestmentSettlementError && error.code === 'INSUFFICIENT_FUNDS') {
        throw new ApiError(402, error.message);
      }
      if (error instanceof InvestmentSettlementError) {
        throw new ApiError(502, error.message);
      }
      throw error;
    }

    if (settlementDuplicate) {
      try {
        await walletService.applyProductApplicationApproval({
          userId: application.userId,
          applicationId: application._id.toString(),
          merchantId: application.merchantId!,
          productId: application.productId,
          productName: application.productName,
          productType: product.type,
          appId: application.appId,
          amount: input.amount,
          currency,
          referenceId,
          description: `Investment deposit (${input.amount} ${currency})`,
          metadata: {
            source: 'investment-deposit',
            productType: 'INVESTMENT',
            settlementDuplicate: true
          }
        });
      } catch (walletError) {
        console.warn(
          'Investment PRODUCT wallet credit skipped on duplicate settlement:',
          walletError instanceof Error ? walletError.message : walletError
        );
      }
      return {
        deposit: toDepositResponse(application, referenceId),
        duplicate: true
      };
    }

    const nextSnapshot = bumpInvestmentSnapshot(
      application.contractSnapshot as Record<string, unknown> | undefined,
      input.amount,
      currency
    );
    application.contractSnapshot = nextSnapshot;
    application.amount = investmentBalanceFrom(application);
    await application.save();

    // Keep Spring PRODUCT wallet in sync so storefront Total Investment (product-type-summary) matches.
    try {
      const credited = await walletService.applyProductApplicationApproval({
        userId: application.userId,
        applicationId: application._id.toString(),
        merchantId: application.merchantId!,
        productId: application.productId,
        productName: application.productName,
        productType: product.type,
        appId: application.appId,
        amount: input.amount,
        currency,
        referenceId,
        description: `Investment deposit (${input.amount} ${currency})`,
        metadata: {
          source: 'investment-deposit',
          productType: 'INVESTMENT'
        }
      });
      const nuban = credited.wallet.virtualNuban;
      if (nuban?.accountNumber) {
        application.productWallet = {
          walletId: credited.wallet.id,
          walletPurpose: credited.wallet.walletPurpose || 'PRODUCT',
          reusedUpstreamAccount: true,
          upstreamAccount: {
            accountNumber: nuban.accountNumber,
            bankName: nuban.bankName,
            bankCode: nuban.bankCode,
            providerReference: nuban.providerReference,
            provisionStatus: (nuban.provisionStatus as 'active' | 'failed' | undefined) || 'active',
            provisionError: nuban.provisionError
          }
        };
        application.upstreamSyncError = undefined;
        await application.save();
      }
    } catch (walletError) {
      const message =
        walletError instanceof Error ? walletError.message : 'Failed to credit Spring product wallet';
      console.warn('Investment PRODUCT wallet credit failed after settlement:', message);
      throw new ApiError(502, `Investment settled, but product wallet credit failed: ${message}`);
    }

    try {
      await this.syncSnapshotToPlata(application, product, nextSnapshot);
    } catch (error) {
      throw error instanceof ApiError ? error : new ApiError(502, 'Failed to sync investment deposit to Plata');
    }

    this.notifyAfterDeposit(application, product, input.amount, currency);

    return {
      deposit: toDepositResponse(application, referenceId),
      duplicate: false
    };
  }
}

export default new InvestmentDepositService();
