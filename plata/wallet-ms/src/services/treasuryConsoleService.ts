import { WalletService } from './walletService';
import { koboToNaira, nairaToKobo } from '../utils/money';
import { walletForApi, transactionForApi } from '../utils/walletApiMoney';
import {
  TreasuryConsoleSettingsModel,
  type TreasurySettlementMode,
  type TreasurySettlementType
} from '../models/TreasuryConsoleSettingsModel';
import {
  findTreasuryConsolePendingByReference,
  listTreasuryConsoleHistory,
  listTreasuryConsolePending,
  markTreasuryConsoleTransactionStatus,
  sumTreasuryConsolePendingAmount,
  type TreasuryConsoleHistoryDecision,
  type TreasuryConsoleHistoryPage,
  type TreasuryConsolePendingRow,
  type TreasuryConsoleSettlementKind
} from '../repositories/treasuryConsoleRepository';
import { TransactionStatus, TransactionType } from '../models/Wallet';
import {
  notifySpringMaturityWithdrawalApproved,
  notifySpringMaturityWithdrawalRejected
} from './springMaturityWithdrawalCallback';

export type MerchantWalletTypeKey = 'treasury' | 'billing' | 'repayment';

export interface TreasuryOverviewData {
  appId: string;
  merchantId: string;
  wallets: {
    treasury: { balance: number; currency: string; virtualNuban?: unknown; fundable: boolean };
    billing: { balance: number; currency: string; virtualNuban?: unknown; fundable: boolean };
    repayment: { balance: number; currency: string; virtualNuban?: unknown; fundable: boolean };
  };
  pendingTotal: number;
}

export interface ApproveBatchResult {
  paidCount: number;
  blockedCount: number;
  paid: Array<{ reference: string; amount: number; userId?: string }>;
  blocked: Array<{ reference: string; amount: number; reason: string }>;
  treasuryBalanceAfter?: number;
  revertedToManual?: boolean;
}

function productTypeFromPending(
  kind: TreasuryConsoleSettlementKind,
  meta: Record<string, unknown>
): string {
  const fromMeta = typeof meta.productType === 'string' ? meta.productType.trim().toUpperCase() : '';
  if (fromMeta === 'SAVINGS' || fromMeta === 'INVESTMENT' || fromMeta === 'COMMODITY') {
    return fromMeta;
  }
  if (kind === 'withdrawals' || kind === 'savings') return 'SAVINGS';
  if (kind === 'investments') return 'INVESTMENT';
  return 'COMMODITY';
}

function mapWalletSummary(
  wallet: { mainBalance: number; currency: string; virtualNuban?: unknown } | undefined,
  fundable: boolean
) {
  return {
    balance: wallet ? koboToNaira(wallet.mainBalance) : 0,
    currency: wallet?.currency ?? 'NGN',
    virtualNuban: wallet?.virtualNuban,
    fundable
  };
}

function walletBalanceNairaFromKobo(kobo: number): number {
  return koboToNaira(kobo);
}

export class TreasuryConsoleService {
  static async getOverview(merchantId: string, appId: string): Promise<TreasuryOverviewData> {
    const walletsResult = await WalletService.getAllMerchantWallets(merchantId, appId);
    if (!walletsResult.success || !walletsResult.wallets) {
      throw new Error(walletsResult.error || 'Failed to load merchant wallets');
    }

    const byType = new Map(
      walletsResult.wallets.map((w) => [String(w.merchantWalletType).toUpperCase(), w])
    );

    const treasury = byType.get('TREASURY');
    const billing = byType.get('BILLING') ?? byType.get('OPERATION');
    const repayment = byType.get('REPAYMENT') ?? byType.get('SETTLEMENT') ?? byType.get('KYC');

    const pendingTotal = await sumTreasuryConsolePendingAmount(appId);

    return {
      appId,
      merchantId,
      wallets: {
        treasury: mapWalletSummary(treasury, true),
        billing: mapWalletSummary(billing, true),
        repayment: mapWalletSummary(repayment, false)
      },
      pendingTotal
    };
  }

  static async listWalletTransactions(
    merchantId: string,
    appId: string,
    walletType: MerchantWalletTypeKey,
    filter: {
      startDate?: string;
      endDate?: string;
      type?: string;
      limit?: number;
      skip?: number;
      search?: string;
    }
  ) {
    const filterData = {
      startDate: filter.startDate ? new Date(filter.startDate) : undefined,
      endDate: filter.endDate ? new Date(filter.endDate) : undefined,
      type: filter.type as TransactionType | undefined,
      limit: filter.limit,
      skip: filter.skip
    };

    let result;
    if (walletType === 'treasury') {
      result = await WalletService.filterTreasuryTransactions(merchantId, filterData, appId);
    } else if (walletType === 'billing') {
      result = await WalletService.filterBillingTransactions(merchantId, filterData, appId);
    } else {
      result = await WalletService.filterRepaymentTransactions(merchantId, filterData, appId);
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to load transactions');
    }

    let items = (result.transactions || []).map((t) => transactionForApi(t));
    const search = (filter.search || '').trim().toLowerCase();
    if (search) {
      items = items.filter((t) => {
        const blob = JSON.stringify(t).toLowerCase();
        return blob.includes(search);
      });
    }

    return {
      items,
      pagination: result.pagination
    };
  }

  static async listWithdrawals(appId: string, limit = 50): Promise<TreasuryConsolePendingRow[]> {
    return listTreasuryConsolePending(appId, 'withdrawals', limit);
  }

  static async listWithdrawalHistory(
    appId: string,
    options: {
      decision?: TreasuryConsoleHistoryDecision;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<TreasuryConsoleHistoryPage> {
    return listTreasuryConsoleHistory(appId, 'withdrawals', options);
  }

  static async listSettlements(
    appId: string,
    settlementType: TreasurySettlementType,
    limit = 50
  ): Promise<TreasuryConsolePendingRow[]> {
    const kind: TreasuryConsoleSettlementKind = settlementType;
    return listTreasuryConsolePending(appId, kind, limit);
  }

  static async listSettlementHistory(
    appId: string,
    settlementType: TreasurySettlementType,
    options: {
      decision?: TreasuryConsoleHistoryDecision;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<TreasuryConsoleHistoryPage> {
    return listTreasuryConsoleHistory(appId, settlementType, options);
  }

  static async getSettlementMode(
    merchantId: string,
    appId: string,
    settlementType: TreasurySettlementType
  ): Promise<{ mode: TreasurySettlementMode; revertedToManual: boolean }> {
    const doc = await TreasuryConsoleSettingsModel.findOne({ merchantId, appId, settlementType }).lean();
    return {
      mode: (doc?.mode as TreasurySettlementMode) || 'manual',
      revertedToManual: doc?.revertedToManual === true
    };
  }

  static async setSettlementMode(
    merchantId: string,
    appId: string,
    settlementType: TreasurySettlementType,
    mode: TreasurySettlementMode
  ): Promise<ApproveBatchResult | { mode: TreasurySettlementMode; revertedToManual: boolean }> {
    if (mode === 'automatic') {
      const approveResult = await this.approveSettlements(
        merchantId,
        appId,
        settlementType,
        [],
        true
      );
      await TreasuryConsoleSettingsModel.findOneAndUpdate(
        { merchantId, appId, settlementType },
        {
          $set: {
            mode: approveResult.revertedToManual ? 'manual' : 'automatic',
            revertedToManual: approveResult.revertedToManual === true
          }
        },
        { upsert: true, new: true }
      );
      return approveResult;
    }

    await TreasuryConsoleSettingsModel.findOneAndUpdate(
      { merchantId, appId, settlementType },
      { $set: { mode: 'manual', revertedToManual: false } },
      { upsert: true, new: true }
    );
    return { mode: 'manual', revertedToManual: false };
  }

  static async approveWithdrawals(
    merchantId: string,
    appId: string,
    references: string[]
  ): Promise<ApproveBatchResult> {
    return this.approvePendingRows(merchantId, appId, 'withdrawals', references);
  }

  static async approveSettlements(
    merchantId: string,
    appId: string,
    settlementType: TreasurySettlementType,
    references: string[],
    automaticAll = false
  ): Promise<ApproveBatchResult> {
    return this.approvePendingRows(
      merchantId,
      appId,
      settlementType,
      references,
      automaticAll
    );
  }

  static async rejectWithdrawals(
    merchantId: string,
    appId: string,
    references: string[],
    reason?: string
  ): Promise<ApproveBatchResult> {
    return this.rejectPendingRows(merchantId, appId, 'withdrawals', references, reason);
  }

  static async rejectSettlements(
    merchantId: string,
    appId: string,
    settlementType: TreasurySettlementType,
    references: string[],
    reason?: string
  ): Promise<ApproveBatchResult> {
    return this.rejectPendingRows(merchantId, appId, settlementType, references, reason);
  }

  private static async approvePendingRows(
    merchantId: string,
    appId: string,
    kind: TreasuryConsoleSettlementKind,
    references: string[],
    automaticAll = false
  ): Promise<ApproveBatchResult> {
    let rows: TreasuryConsolePendingRow[] = [];
    if (automaticAll) {
      rows = await listTreasuryConsolePending(appId, kind, 100);
    } else {
      for (const ref of references) {
        const row = await findTreasuryConsolePendingByReference(appId, kind, ref);
        if (row) rows.push(row);
      }
    }

    const paid: ApproveBatchResult['paid'] = [];
    const blocked: ApproveBatchResult['blocked'] = [];

    for (const row of rows) {
      if (!row.userId) {
        blocked.push({ reference: row.reference, amount: row.amount, reason: 'Missing userId on pending row' });
        continue;
      }

      const meta = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<
        string,
        unknown
      >;
      const springStorefrontPayout = meta.springStorefrontPayout === true;
      const springLocalApplicationId =
        typeof meta.springLocalApplicationId === 'string' ? meta.springLocalApplicationId.trim() : '';
      const productType = productTypeFromPending(kind, meta);

      if (springStorefrontPayout) {
        if (!springLocalApplicationId) {
          blocked.push({
            reference: row.reference,
            amount: row.amount,
            reason: 'Missing springLocalApplicationId for storefront payout'
          });
          continue;
        }

        const amountKobo = nairaToKobo(row.amount);
        const debit = await WalletService.debitTreasuryForSettlement({
          merchantId,
          appId,
          amount: amountKobo,
          referenceId: `treasury-console:${kind}:${row.reference}`,
          applicationId: row.applicationId,
          productId: row.productId,
          productType,
          offeringMerchantId:
            typeof meta.offeringMerchantId === 'string' ? meta.offeringMerchantId : undefined,
          category:
            productType === 'SAVINGS'
              ? 'SAVINGS_MATURITY_PAYOUT'
              : productType === 'INVESTMENT'
                ? 'INVESTMENT_MATURITY_PAYOUT'
                : 'COMMODITY_MATURITY_PAYOUT',
          description: `Treasury console approved storefront payout — ${kind} (${row.reference})`
        });

        if (!debit.success) {
          blocked.push({
            reference: row.reference,
            amount: row.amount,
            reason: debit.error || 'Treasury debit failed'
          });
          continue;
        }

        const principal =
          typeof row.principal === 'number' && Number.isFinite(row.principal)
            ? row.principal
            : row.amount;
        const interest =
          typeof row.returnAmount === 'number' && Number.isFinite(row.returnAmount)
            ? row.returnAmount
            : Math.max(0, row.amount - principal);

        const spring = await notifySpringMaturityWithdrawalApproved({
          localApplicationId: springLocalApplicationId,
          referenceId: row.reference,
          principal,
          interest,
          totalPayout: row.amount,
          currency: 'NGN',
          productType
        });

        if (!spring.success) {
          blocked.push({
            reference: row.reference,
            amount: row.amount,
            reason: spring.error || 'Storefront credit callback failed'
          });
          continue;
        }

        await markTreasuryConsoleTransactionStatus(row.id, TransactionStatus.COMPLETED, {
          'metadata.treasuryConsoleApprovedAt': new Date().toISOString(),
          'metadata.treasuryConsolePayoutReference': `treasury-console:${kind}:${row.reference}`,
          'metadata.springStorefrontCredited': true
        });

        paid.push({ reference: row.reference, amount: row.amount, userId: row.userId });
        continue;
      }

      const amountKobo = nairaToKobo(row.amount);
      const disburse = await WalletService.disburseFromTreasury({
        merchantId,
        appId,
        userId: row.userId,
        amount: amountKobo,
        referenceId: `treasury-console:${kind}:${row.reference}`,
        applicationId: row.applicationId,
        productId: row.productId,
        productType,
        description: `Treasury console payout — ${kind} (${row.reference})`
      });

      if (!disburse.success) {
        blocked.push({
          reference: row.reference,
          amount: row.amount,
          reason: disburse.error || 'Treasury disbursement failed'
        });
        continue;
      }

      await markTreasuryConsoleTransactionStatus(row.id, TransactionStatus.COMPLETED, {
        'metadata.treasuryConsoleApprovedAt': new Date().toISOString(),
        'metadata.treasuryConsolePayoutReference': `treasury-console:${kind}:${row.reference}`
      });

      paid.push({ reference: row.reference, amount: row.amount, userId: row.userId });
    }

    const treasury = await WalletService.getTreasuryWallet(merchantId, appId);
    const treasuryBalanceAfter =
      treasury.wallet?.mainBalance !== undefined
        ? walletBalanceNairaFromKobo(treasury.wallet.mainBalance)
        : undefined;

    const blockedCount = blocked.length;
    const paidCount = paid.length;
    const revertedToManual = automaticAll && blockedCount > 0;

    if (revertedToManual && (kind === 'investments' || kind === 'commodities' || kind === 'savings')) {
      await TreasuryConsoleSettingsModel.findOneAndUpdate(
        { merchantId, appId, settlementType: kind },
        { $set: { mode: 'manual', revertedToManual: true } },
        { upsert: true }
      );
    }

    return {
      paidCount,
      blockedCount,
      paid,
      blocked,
      treasuryBalanceAfter,
      revertedToManual
    };
  }

  private static async rejectPendingRows(
    merchantId: string,
    appId: string,
    kind: TreasuryConsoleSettlementKind,
    references: string[],
    reason?: string
  ): Promise<ApproveBatchResult> {
    const paid: ApproveBatchResult['paid'] = [];
    const blocked: ApproveBatchResult['blocked'] = [];

    for (const ref of references) {
      const row = await findTreasuryConsolePendingByReference(appId, kind, ref);
      if (!row) {
        blocked.push({ reference: ref, amount: 0, reason: 'Pending request not found' });
        continue;
      }

      const meta = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<
        string,
        unknown
      >;
      const springLocalApplicationId =
        typeof meta.springLocalApplicationId === 'string' ? meta.springLocalApplicationId.trim() : '';
      const productType = productTypeFromPending(kind, meta);

      if (meta.springStorefrontPayout === true && springLocalApplicationId) {
        const spring = await notifySpringMaturityWithdrawalRejected({
          localApplicationId: springLocalApplicationId,
          referenceId: row.reference,
          reason,
          productType
        });
        if (!spring.success) {
          blocked.push({
            reference: row.reference,
            amount: row.amount,
            reason: spring.error || 'Storefront reject callback failed'
          });
          continue;
        }
      }

      await markTreasuryConsoleTransactionStatus(row.id, TransactionStatus.FAILED, {
        'metadata.treasuryConsoleRejectedAt': new Date().toISOString(),
        'metadata.treasuryConsoleRejectReason': reason || 'Rejected by merchant',
        'metadata.rejectedByMerchantId': merchantId
      });

      paid.push({ reference: row.reference, amount: row.amount, userId: row.userId || '' });
    }

    const treasury = await WalletService.getTreasuryWallet(merchantId, appId);
    const treasuryBalanceAfter =
      treasury.wallet?.mainBalance !== undefined
        ? walletBalanceNairaFromKobo(treasury.wallet.mainBalance)
        : undefined;

    return {
      paidCount: paid.length,
      blockedCount: blocked.length,
      paid,
      blocked,
      treasuryBalanceAfter,
      revertedToManual: false
    };
  }

  static formatOverviewForApi(data: TreasuryOverviewData) {
    return {
      ...data,
      wallets: {
        treasury: { ...data.wallets.treasury },
        billing: { ...data.wallets.billing },
        repayment: { ...data.wallets.repayment }
      }
    };
  }

  static formatWalletForFundingInstructions(
    merchantId: string,
    appId: string,
    walletType: 'treasury' | 'billing',
    amountNaira: number
  ) {
    return WalletService.getTreasuryWallet(merchantId, appId).then((treasury) => {
      if (walletType === 'treasury' && treasury.wallet) {
        return WalletService.buildTreasuryWalletFundingInstructions(treasury.wallet, nairaToKobo(amountNaira));
      }
      return WalletService.getBillingWallet(merchantId, appId).then((billing) => {
        if (billing.wallet) {
          return WalletService.buildBillingWalletFundingInstructions(billing.wallet, nairaToKobo(amountNaira));
        }
        return undefined;
      });
    });
  }
}

export { walletForApi };
