import {
  ProductApplicationModel,
  toProductApplication,
  type IProductApplicationDocument
} from '../models/ProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';
import type { ProductApplication } from '../types/productApplication';
import walletService from './walletService';

export type ApplyProductTransferOutInput = {
  userId: string;
  amount: number;
  referenceId?: string;
  description?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toNonNegativeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 0;
}

function readBalance(snapshot: Record<string, unknown>, productType: string): number {
  const type = productType.toUpperCase();
  if (type === 'INVESTMENT') {
    return toNonNegativeNumber(
      snapshot.investmentBalance ?? snapshot.currentBalance ?? snapshot.balance ?? snapshot.amount
    );
  }
  if (type === 'SAVINGS') {
    return toNonNegativeNumber(
      snapshot.savingsBalance ?? snapshot.currentBalance ?? snapshot.balance ?? snapshot.amount
    );
  }
  return toNonNegativeNumber(snapshot.currentBalance ?? snapshot.balance ?? snapshot.amount);
}

function applyDebitToSnapshot(
  snapshot: Record<string, unknown> | undefined,
  productType: string,
  amount: number,
  referenceId?: string
): Record<string, unknown> {
  const base = { ...(snapshot ?? {}) };
  const previous = readBalance(base, productType);
  const nextBalance = Math.max(0, previous - amount);
  const previousWithdrawals = toNonNegativeNumber(base.totalWithdrawals);
  const type = productType.toUpperCase();
  const now = new Date().toISOString();

  const next: Record<string, unknown> = {
    ...base,
    currentBalance: nextBalance,
    balance: nextBalance,
    totalWithdrawals: previousWithdrawals + amount,
    lastWithdrawalAt: now,
    lastWithdrawalAmount: amount,
    ...(referenceId ? { lastTransferToPrimaryReferenceId: referenceId } : {})
  };

  if (type === 'INVESTMENT') {
    next.investmentBalance = nextBalance;
  }
  if (type === 'SAVINGS') {
    next.savingsBalance = nextBalance;
  }

  return next;
}

class ProductTransferOutService {
  async applyTransferOut(
    applicationId: string,
    input: ApplyProductTransferOutInput
  ): Promise<{ application: ProductApplication; duplicate: boolean; balance: number }> {
    if (!applicationId.trim()) {
      throw new ApiError(400, 'applicationId is required');
    }
    if (!input.userId.trim()) {
      throw new ApiError(400, 'userId is required');
    }
    if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
      throw new ApiError(400, 'amount must be a positive number');
    }

    const application = await ProductApplicationModel.findById(applicationId.trim());
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }
    if (application.userId !== input.userId.trim()) {
      throw new ApiError(403, 'Application does not belong to this user');
    }

    const productType = String(application.productType || '').trim().toUpperCase();
    if (productType !== 'INVESTMENT' && productType !== 'SAVINGS') {
      // Lending uses transfer-to-primary for proceeds without a savings-style ledger snapshot.
      return {
        application: toProductApplication(application),
        duplicate: false,
        balance: toNonNegativeNumber(application.amount)
      };
    }

    const snapshot = asRecord(application.contractSnapshot) ?? {};
    const referenceId = input.referenceId?.trim();
    if (
      referenceId &&
      typeof snapshot.lastTransferToPrimaryReferenceId === 'string' &&
      snapshot.lastTransferToPrimaryReferenceId === referenceId
    ) {
      return {
        application: toProductApplication(application),
        duplicate: true,
        balance: readBalance(snapshot, productType)
      };
    }

    const nextSnapshot = applyDebitToSnapshot(snapshot, productType, input.amount, referenceId);
    application.contractSnapshot = nextSnapshot;
    application.amount = readBalance(nextSnapshot, productType);
    await application.save();

    return {
      application: toProductApplication(application as IProductApplicationDocument),
      duplicate: false,
      balance: application.amount
    };
  }

  /**
   * Ensure Spring PRODUCT wallet exists and matches application ledger balance.
   * Used to repair savings/investment accounts enrolled before PRODUCT-wallet sync.
   */
  async syncProductWalletBalance(applicationId: string): Promise<{
    application: ProductApplication;
    walletId: string;
    ledgerBalance: number;
    walletBalanceBefore: number;
    credited: number;
    duplicate: boolean;
  }> {
    if (!applicationId.trim()) {
      throw new ApiError(400, 'applicationId is required');
    }

    const application = await ProductApplicationModel.findById(applicationId.trim());
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    const productType = String(application.productType || '').trim().toUpperCase();
    if (productType !== 'SAVINGS' && productType !== 'INVESTMENT') {
      throw new ApiError(400, 'PRODUCT wallet sync is only supported for SAVINGS and INVESTMENT');
    }
    if (!application.merchantId?.trim()) {
      throw new ApiError(400, 'Application merchantId is required');
    }
    if (!application.appId?.trim()) {
      throw new ApiError(400, 'Application appId is required');
    }

    const snapshot = asRecord(application.contractSnapshot) ?? {};
    const ledgerBalance = Math.max(
      readBalance(snapshot, productType),
      toNonNegativeNumber(application.amount)
    );

    const ensured = await walletService.ensureProductWallet({
      userId: application.userId,
      merchantId: application.merchantId,
      applicationId: application._id.toString(),
      productId: application.productId,
      productName: application.productName,
      productType,
      appId: application.appId,
      currency: (application.currency || 'NGN').trim().toUpperCase()
    });

    const walletBalanceBefore = toNonNegativeNumber(
      ensured.wallet.mainBalance ?? ensured.wallet.balance
    );
    const shortfall = Math.max(0, ledgerBalance - walletBalanceBefore);

    const nuban = ensured.wallet.virtualNuban;
    application.productWallet = {
      walletId: ensured.wallet.id,
      walletPurpose: ensured.wallet.walletPurpose || 'PRODUCT',
      reusedUpstreamAccount: ensured.reusedUpstreamAccount === true,
      upstreamAccount: {
        accountNumber: nuban?.accountNumber,
        bankName: nuban?.bankName,
        bankCode: nuban?.bankCode,
        providerReference: nuban?.providerReference,
        provisionStatus:
          (nuban?.provisionStatus as 'active' | 'failed' | undefined) ||
          (nuban?.accountNumber ? 'active' : 'failed'),
        provisionError: nuban?.provisionError
      }
    };
    application.upstreamSyncError = undefined;
    await application.save();

    if (shortfall <= 0) {
      return {
        application: toProductApplication(application),
        walletId: ensured.wallet.id,
        ledgerBalance,
        walletBalanceBefore,
        credited: 0,
        duplicate: false
      };
    }

    const referenceId = `product-wallet-backfill:${application._id.toString()}:${ledgerBalance}`;
    const credited = await walletService.applyProductApplicationApproval({
      userId: application.userId,
      applicationId: application._id.toString(),
      merchantId: application.merchantId,
      productId: application.productId,
      productName: application.productName,
      productType,
      appId: application.appId,
      amount: shortfall,
      currency: (application.currency || 'NGN').trim().toUpperCase(),
      referenceId,
      description: `${productType} product wallet backfill to match ledger`,
      metadata: {
        source: 'product-wallet-backfill',
        productType,
        ledgerBalance,
        walletBalanceBefore
      }
    });

    const creditedNuban = credited.wallet.virtualNuban;
    if (creditedNuban?.accountNumber) {
      application.productWallet = {
        walletId: credited.wallet.id,
        walletPurpose: credited.wallet.walletPurpose || 'PRODUCT',
        reusedUpstreamAccount: true,
        upstreamAccount: {
          accountNumber: creditedNuban.accountNumber,
          bankName: creditedNuban.bankName,
          bankCode: creditedNuban.bankCode,
          providerReference: creditedNuban.providerReference,
          provisionStatus:
            (creditedNuban.provisionStatus as 'active' | 'failed' | undefined) || 'active',
          provisionError: creditedNuban.provisionError
        }
      };
      await application.save();
    }

    return {
      application: toProductApplication(application),
      walletId: credited.wallet.id,
      ledgerBalance,
      walletBalanceBefore,
      credited: shortfall,
      duplicate: credited.duplicate === true
    };
  }
}

export default new ProductTransferOutService();
