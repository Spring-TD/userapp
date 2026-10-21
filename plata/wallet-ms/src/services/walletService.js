"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = exports.SETTLEMENT_COLLECTION_SOURCE = exports.REPAYMENT_COLLECTION_SOURCE = exports.TREASURY_DISBURSEMENT_SOURCE = exports.LOAN_DISBURSEMENT_SOURCE = void 0;
exports.normalizeTransactionPagination = normalizeTransactionPagination;
const Wallet_1 = require("../models/Wallet");
const logger_1 = require("../utils/logger");
const axios_1 = __importDefault(require("axios"));
const walletRepo = __importStar(require("../repositories/walletRepository"));
const transactionRepo = __importStar(require("../repositories/transactionRepository"));
const TransactionModel_1 = require("../models/TransactionModel");
const payonusNubanProvisioning_1 = require("./payonusNubanProvisioning");
const provisionUserNuban_1 = require("./nuban/provisionUserNuban");
const payonusNubanClient_1 = require("./payonusNubanClient");
const merchantWalletType_1 = require("../utils/merchantWalletType");
const authProfileClient_1 = require("./authProfileClient");
const money_1 = require("../utils/money");
const walletBalanceAdjust_1 = require("../utils/walletBalanceAdjust");
const treasuryBalanceAlertNotificationService_1 = require("./treasuryBalanceAlertNotificationService");
function formatContactName(firstName, lastName, fallback) {
    const full = `${firstName || ''} ${lastName || ''}`.trim();
    return full || fallback?.trim() || 'Customer';
}
exports.LOAN_DISBURSEMENT_SOURCE = 'loan-disbursement';
exports.TREASURY_DISBURSEMENT_SOURCE = 'treasury-disbursement';
exports.REPAYMENT_COLLECTION_SOURCE = 'repayment-collection';
/** @deprecated Use REPAYMENT_COLLECTION_SOURCE */
exports.SETTLEMENT_COLLECTION_SOURCE = exports.REPAYMENT_COLLECTION_SOURCE;
const DEFAULT_TX_LIMIT = 20;
const MAX_TX_LIMIT = 100;
function normalizeTransactionPagination(filterData) {
    const rawLimit = Number(filterData.limit);
    const rawSkip = Number(filterData.skip);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), MAX_TX_LIMIT)
        : DEFAULT_TX_LIMIT;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? Math.floor(rawSkip) : 0;
    return { limit, skip };
}
class WalletService {
    static async enrichWalletContact(wallet) {
        if (wallet.walletType === 'MERCHANT') {
            const [enriched] = await this.enrichMerchantWalletContacts([wallet]);
            return enriched;
        }
        const [enriched] = await this.enrichUserWalletContacts([wallet]);
        return enriched;
    }
    static async enrichMerchantWalletContacts(wallets) {
        const contactByMerchantId = new Map();
        await Promise.all([...new Set(wallets.map((wallet) => wallet.merchantId).filter(Boolean))].map(async (merchantId) => {
            contactByMerchantId.set(merchantId, await (0, authProfileClient_1.fetchWalletContact)(merchantId));
        }));
        return wallets.map((wallet) => {
            const contact = contactByMerchantId.get(wallet.merchantId);
            return contact
                ? {
                    ...wallet,
                    contactName: formatContactName(contact.firstName, contact.lastName, wallet.name),
                    email: contact.email,
                    phone: contact.phone
                }
                : wallet;
        });
    }
    static async enrichUserWalletContacts(wallets) {
        const contactByUserId = new Map();
        await Promise.all([...new Set(wallets.map((wallet) => wallet.userId).filter(Boolean))].map(async (userId) => {
            contactByUserId.set(userId, await (0, authProfileClient_1.fetchWalletContact)(userId));
        }));
        return wallets.map((wallet) => {
            const contact = contactByUserId.get(wallet.userId);
            return contact
                ? {
                    ...wallet,
                    contactName: formatContactName(contact.firstName, contact.lastName, wallet.name),
                    email: contact.email,
                    phone: contact.phone
                }
                : wallet;
        });
    }
    static async enrichTransactionContacts(transactions) {
        const identifiers = new Set();
        for (const tx of transactions) {
            const metadata = tx.metadata;
            const userId = typeof metadata?.userId === 'string' ? metadata.userId.trim() : '';
            const merchantId = typeof metadata?.merchantId === 'string'
                ? metadata.merchantId.trim()
                : typeof metadata?.offeringMerchantId === 'string'
                    ? metadata.offeringMerchantId.trim()
                    : '';
            const identifier = userId || merchantId;
            if (identifier)
                identifiers.add(identifier);
        }
        const contacts = new Map();
        await Promise.all([...identifiers].map(async (identifier) => {
            contacts.set(identifier, await (0, authProfileClient_1.fetchWalletContact)(identifier));
        }));
        return transactions.map((tx) => {
            const metadata = tx.metadata;
            const userId = typeof metadata?.userId === 'string' ? metadata.userId.trim() : '';
            const merchantId = typeof metadata?.merchantId === 'string'
                ? metadata.merchantId.trim()
                : typeof metadata?.offeringMerchantId === 'string'
                    ? metadata.offeringMerchantId.trim()
                    : '';
            const contact = contacts.get(userId || merchantId);
            return contact
                ? {
                    ...tx,
                    contactName: formatContactName(contact.firstName, contact.lastName, tx.description),
                    email: contact.email,
                    phone: contact.phone
                }
                : tx;
        });
    }
    /**
     * Create a new merchant wallet of specific type
     * When any merchant wallet is created, automatically create all three internal wallets
     */
    static async createMerchantWallet(data, skipAutoCreate = false) {
        try {
            const existing = await walletRepo.getMerchantWalletByType(data.merchantId, data.merchantWalletType, data.appId);
            if (existing) {
                return {
                    success: false,
                    error: `${data.merchantWalletType} wallet already exists for this merchant${data.appId ? ' app' : ''}`
                };
            }
            const newWallet = await walletRepo.createWallet({
                walletType: 'MERCHANT',
                merchantId: data.merchantId,
                complianceShareholderUserId: data.complianceShareholderUserId,
                appId: data.appId,
                appName: data.appName,
                payonusSubaccountCode: data.payonusSubaccountCode,
                name: data.name,
                currency: data.currency,
                merchantWalletType: data.merchantWalletType
            });
            logger_1.logger.info('Merchant wallet created', {
                walletId: newWallet.id,
                merchantId: data.merchantId,
                appId: data.appId,
                walletType: data.merchantWalletType
            });
            // Automatically create all three internal wallets when any merchant wallet is created
            // But only if this wasn't called from within the auto-create process (to avoid infinite recursion)
            if (!skipAutoCreate) {
                const existingWallets = await this.getAllMerchantWallets(data.merchantId, data.appId);
                if (existingWallets.success && existingWallets.wallets) {
                    // Check if all three wallet types exist
                    const hasBilling = (0, merchantWalletType_1.merchantWalletHasType)(existingWallets.wallets, Wallet_1.MerchantWalletType.BILLING);
                    const hasTreasury = (0, merchantWalletType_1.merchantWalletHasType)(existingWallets.wallets, Wallet_1.MerchantWalletType.TREASURY);
                    const hasRepayment = (0, merchantWalletType_1.merchantWalletHasType)(existingWallets.wallets, Wallet_1.MerchantWalletType.REPAYMENT);
                    // If not all three exist, create the missing ones
                    if (!hasBilling || !hasTreasury || !hasRepayment) {
                        const autoCreateResult = await this.createAllMerchantWallets(data.merchantId, data.currency, true, data.appId, data.appName, data.payonusSubaccountCode, data.complianceShareholderUserId);
                        if (!autoCreateResult.success) {
                            logger_1.logger.error('Failed to auto-create merchant wallets', {
                                merchantId: data.merchantId,
                                appId: data.appId,
                                error: autoCreateResult.error
                            });
                        }
                        else {
                            logger_1.logger.info('Auto-created missing merchant wallets', {
                                merchantId: data.merchantId,
                                appId: data.appId,
                                createdCount: autoCreateResult.wallets?.length
                            });
                        }
                    }
                }
            }
            const walletWithNuban = (await (0, payonusNubanProvisioning_1.provisionPayonusNubanForWallet)(newWallet));
            return {
                success: true,
                wallet: walletWithNuban
            };
        }
        catch (error) {
            logger_1.logger.error('Error creating merchant wallet', { error });
            return {
                success: false,
                error: 'Failed to create merchant wallet'
            };
        }
    }
    /**
     * Create all required merchant wallets (Billing, Treasury, Repayment)
     */
    static async createAllMerchantWallets(merchantId, currency = 'USD', skipAutoCreate = false, appId, appName, payonusSubaccountCode, complianceShareholderUserId) {
        try {
            const wallets = [];
            const walletTypes = [
                { type: Wallet_1.MerchantWalletType.BILLING, name: 'Billing Wallet' },
                { type: Wallet_1.MerchantWalletType.TREASURY, name: 'Treasury Wallet' },
                { type: Wallet_1.MerchantWalletType.REPAYMENT, name: 'Repayment Wallet' }
            ];
            for (const walletType of walletTypes) {
                // Check if this wallet type already exists
                const existingWallet = await this.getMerchantWalletByType(merchantId, walletType.type, appId);
                if (existingWallet.success && existingWallet.wallet) {
                    // Wallet already exists, add it to the list
                    wallets.push(existingWallet.wallet);
                    continue;
                }
                // Create the wallet if it doesn't exist
                const result = await this.createMerchantWallet({
                    merchantId,
                    complianceShareholderUserId,
                    appId,
                    appName,
                    payonusSubaccountCode,
                    name: walletType.name,
                    currency,
                    merchantWalletType: walletType.type
                }, skipAutoCreate); // Pass skipAutoCreate to prevent recursion
                if (!result.success) {
                    // If any wallet creation fails, we should clean up already created wallets
                    // For simplicity in this mock implementation, we'll just return the error
                    return {
                        success: false,
                        error: `Failed to create ${walletType.name}: ${result.error}`
                    };
                }
                if (result.wallet) {
                    wallets.push(result.wallet);
                }
            }
            logger_1.logger.info('All merchant wallets created successfully', { merchantId, appId, walletCount: wallets.length });
            return {
                success: true,
                wallets
            };
        }
        catch (error) {
            logger_1.logger.error('Error creating all merchant wallets', { error });
            return {
                success: false,
                error: 'Failed to create merchant wallets'
            };
        }
    }
    /**
     * Get merchant wallet by merchant ID and wallet type
     */
    static async getMerchantWalletByType(merchantId, walletType, appId) {
        try {
            const wallet = await walletRepo.getMerchantWalletByType(merchantId, walletType, appId);
            if (wallet)
                return { success: true, wallet };
            return { success: false, error: `${walletType} wallet not found for merchant${appId ? ' app' : ''}` };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving merchant wallet', { error });
            return { success: false, error: 'Failed to retrieve merchant wallet' };
        }
    }
    /** Recent completed SAVINGS_DEPOSIT credits for an app (product overview). */
    static async listRecentSavingsDepositsForApp(appId, limit = 5) {
        const rows = await transactionRepo.listRecentCreditsByAppCategory({
            appId,
            category: 'SAVINGS_DEPOSIT',
            limit
        });
        return rows.map((row) => ({ ...row, status: 'successful' }));
    }
    /** Savings product overview: deposits (with activity), monthly withdrawals, pending requests. */
    static async buildSavingsOverviewForApp(appId, recentLimit = 5) {
        const [recentDeposits, withdrawalsThisMonth, pendingWithdrawalRequests] = await Promise.all([
            transactionRepo.listSavingsDepositActivityForApp({ appId, limit: recentLimit }),
            transactionRepo.aggregateSavingsWithdrawalsThisMonth(appId),
            transactionRepo.listPendingSavingsWithdrawalRequests(appId, recentLimit)
        ]);
        return {
            recentDeposits: recentDeposits.map((row) => ({ ...row, status: 'successful' })),
            withdrawalsThisMonth,
            pendingWithdrawalRequests
        };
    }
    /** Investment product overview: deposits (with activity), pending + settled liquidations. */
    static async buildInvestmentOverviewForApp(appId, recentLimit = 5) {
        const [recentDeposits, pendingLiquidationRequests, approvedLiquidations] = await Promise.all([
            transactionRepo.listInvestmentDepositActivityForApp({ appId, limit: recentLimit }),
            transactionRepo.listPendingInvestmentLiquidationRequests(appId, recentLimit),
            transactionRepo.listRecentApprovedInvestmentLiquidations(appId, recentLimit)
        ]);
        return {
            recentDeposits: recentDeposits.map((row) => ({ ...row, status: 'successful' })),
            pendingLiquidationRequests,
            approvedLiquidations
        };
    }
    /** Recent completed INVESTMENT_DEPOSIT credits for an app (product overview). */
    static async listRecentInvestmentDepositsForApp(appId, limit = 5) {
        const rows = await transactionRepo.listRecentCreditsByAppCategory({
            appId,
            category: 'INVESTMENT_DEPOSIT',
            limit
        });
        return rows.map((row) => ({ ...row, status: 'successful' }));
    }
    /** Commodity product overview: deposits (with activity), pending + settled liquidations. */
    static async buildCommodityOverviewForApp(appId, recentLimit = 5) {
        const [recentDeposits, pendingLiquidationRequests, approvedLiquidations] = await Promise.all([
            transactionRepo.listCommodityDepositActivityForApp({ appId, limit: recentLimit }),
            transactionRepo.listPendingCommodityLiquidationRequests(appId, recentLimit),
            transactionRepo.listRecentApprovedCommodityLiquidations(appId, recentLimit)
        ]);
        return {
            recentDeposits: recentDeposits.map((row) => ({ ...row, status: 'successful' })),
            pendingLiquidationRequests,
            approvedLiquidations
        };
    }
    /** Recent completed COMMODITY_DEPOSIT credits for an app (product overview). */
    static async listRecentCommodityDepositsForApp(appId, limit = 5) {
        const rows = await transactionRepo.listRecentCreditsByAppCategory({
            appId,
            category: 'COMMODITY_DEPOSIT',
            limit
        });
        return rows.map((row) => ({ ...row, status: 'successful' }));
    }
    /**
     * Get all merchant wallets by merchant ID
     */
    static async getAllMerchantWallets(merchantId, appId) {
        try {
            const wallets = await walletRepo.getAllMerchantWallets(merchantId, appId);
            return { success: true, wallets: await this.enrichMerchantWalletContacts(wallets) };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving merchant wallets', { error });
            return { success: false, error: 'Failed to retrieve merchant wallets' };
        }
    }
    /**
     * Create a new user wallet
     */
    static async createUserWallet(data) {
        try {
            const existing = await walletRepo.getUserWalletForMerchant(data.userId, data.merchantId);
            if (existing) {
                return { success: false, error: 'User wallet already exists for this merchant' };
            }
            const newWallet = await walletRepo.createWallet({
                walletType: 'USER',
                merchantId: data.merchantId,
                complianceShareholderUserId: data.complianceShareholderUserId,
                userId: data.userId,
                name: data.name,
                currency: data.currency
            });
            logger_1.logger.info('User wallet created', { walletId: newWallet.id, userId: data.userId, merchantId: data.merchantId });
            const walletWithNuban = await (0, provisionUserNuban_1.provisionUserWalletNuban)(newWallet, {
                bvn: data.bvn,
                applicantProfile: data.applicantProfile
            });
            return { success: true, wallet: await this.enrichWalletContact(walletWithNuban) };
        }
        catch (error) {
            logger_1.logger.error('Error creating user wallet', { error });
            return { success: false, error: 'Failed to create user wallet' };
        }
    }
    /**
     * Get user wallet by user ID
     */
    static async getUserWallet(userId) {
        try {
            const wallet = await walletRepo.getUserWallet(userId);
            if (wallet) {
                return { success: true, wallet: await this.enrichWalletContact(wallet) };
            }
            return { success: false, error: 'User wallet not found' };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving user wallet', { error });
            return { success: false, error: 'Failed to retrieve user wallet' };
        }
    }
    /**
     * Get all user wallets associated with a merchant
     */
    static async getUserWalletsByMerchant(merchantId, pagination = {}) {
        try {
            const { wallets, total, limit, skip } = await walletRepo.getUserWalletsByMerchant(merchantId, pagination);
            return {
                success: true,
                wallets: await this.enrichUserWalletContacts(wallets),
                pagination: {
                    total,
                    limit,
                    skip,
                    hasMore: skip + wallets.length < total
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving user wallets by merchant', { error });
            return { success: false, error: 'Failed to retrieve user wallets' };
        }
    }
    /**
     * Update wallet balance
     */
    static async updateWalletBalance(walletId, amount, description) {
        try {
            (0, money_1.assertIntegerKobo)(amount);
            const wallet = await walletRepo.getWalletById(walletId);
            if (!wallet)
                return { success: false, error: 'Wallet not found' };
            if (wallet.status !== Wallet_1.WalletStatus.ACTIVE)
                return { success: false, error: 'Wallet is not active' };
            const adjusted = await (0, walletBalanceAdjust_1.applyWalletDelta)(walletId, amount, amount);
            if (!adjusted.ok) {
                if (adjusted.insufficientFunds) {
                    return { success: false, error: 'Insufficient balance in wallet' };
                }
                return { success: false, error: 'Wallet not found' };
            }
            const { balanceBefore, balanceAfter: newMain, wallet: updated } = adjusted;
            await transactionRepo.createTransaction({
                walletId,
                amount,
                amountUnit: 'kobo',
                type: amount >= 0 ? Wallet_1.TransactionType.CREDIT : Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description,
                balanceBefore,
                balanceAfter: newMain
            });
            logger_1.logger.info('Wallet balance updated', { walletId, newBalance: newMain });
            return { success: true, wallet: updated };
        }
        catch (error) {
            logger_1.logger.error('Error updating wallet balance', { error });
            return { success: false, error: 'Failed to update wallet balance' };
        }
    }
    /**
     * Credit a user wallet under a merchant. Idempotent when `externalReference` is supplied.
     */
    static async creditUserWalletForMerchant(data) {
        try {
            const amount = Number(data.amount);
            if (!Number.isFinite(amount) || amount <= 0) {
                return { success: false, error: 'amount must be a positive number' };
            }
            (0, money_1.assertIntegerKobo)(amount);
            const wallet = await walletRepo.getUserWalletForMerchant(data.userId, data.merchantId);
            if (!wallet) {
                return { success: false, error: 'User wallet not found for merchant' };
            }
            const source = data.source || exports.LOAN_DISBURSEMENT_SOURCE;
            const existingTx = await TransactionModel_1.TransactionModel.findOne({
                externalReference: data.externalReference,
                source
            }).lean();
            if (existingTx) {
                const existingWallet = await walletRepo.getWalletById(String(existingTx.walletId));
                return {
                    success: true,
                    wallet: existingWallet ?? wallet,
                    transaction: (0, TransactionModel_1.toTransaction)(existingTx),
                    duplicate: true
                };
            }
            const creditResult = await WalletService.updateWalletBalance(wallet.id, amount, data.description);
            if (!creditResult.success || !creditResult.wallet) {
                return { success: false, error: creditResult.error || 'Failed to credit wallet' };
            }
            const latestTx = await TransactionModel_1.TransactionModel.findOne({ walletId: wallet.id })
                .sort({ createdAt: -1 })
                .lean();
            if (!latestTx) {
                return { success: false, error: 'Wallet credited but transaction record missing' };
            }
            const taggedTx = await TransactionModel_1.TransactionModel.findByIdAndUpdate(latestTx._id, {
                $set: {
                    source,
                    category: data.category || 'LOAN_DISBURSEMENT',
                    externalReference: data.externalReference
                }
            }, { new: true, lean: true });
            return {
                success: true,
                wallet: creditResult.wallet,
                transaction: taggedTx
                    ? (0, TransactionModel_1.toTransaction)(taggedTx)
                    : (0, TransactionModel_1.toTransaction)(latestTx),
                duplicate: false
            };
        }
        catch (error) {
            logger_1.logger.error('Error crediting user wallet for merchant', { error });
            return { success: false, error: 'Failed to credit user wallet' };
        }
    }
    static buildTreasuryWalletFundingInstructions(wallet, requiredAmount) {
        const balance = wallet.mainBalance ?? wallet.balance ?? 0;
        const shortfall = Math.max(0, requiredAmount - balance);
        const nuban = wallet.virtualNuban;
        const hasActiveNuban = nuban?.provisionStatus === 'active' && Boolean(nuban.accountNumber?.trim());
        let fundingHint = 'Top up the merchant Treasury wallet via bank transfer to disburse loans and mortgages.';
        if (hasActiveNuban) {
            fundingHint = `Transfer ${wallet.currency} ${shortfall.toFixed(2)} to the Treasury wallet account ${nuban.accountNumber} (${nuban.bankName || 'bank'}).`;
        }
        return {
            walletId: wallet.id,
            balance,
            currency: wallet.currency,
            requiredAmount,
            shortfall,
            ...(nuban ? { virtualNuban: nuban } : {}),
            fundingHint
        };
    }
    /**
     * Disburse capital from the app-scoped Treasury wallet to a user's wallet under the same merchant.
     * Used for loan / mortgage approval (and similar product payouts).
     */
    static async disburseFromTreasury(data) {
        try {
            const merchantId = data.merchantId.trim();
            const appId = data.appId.trim();
            const userId = data.userId.trim();
            const referenceId = data.referenceId.trim();
            const amount = Number(data.amount);
            if (!merchantId || !appId || !userId || !referenceId) {
                return { success: false, error: 'merchantId, appId, userId, and referenceId are required' };
            }
            if (!Number.isFinite(amount) || amount <= 0) {
                return { success: false, error: 'amount must be a positive number' };
            }
            (0, money_1.assertIntegerKobo)(amount);
            const treasuryResult = await this.getTreasuryWallet(merchantId, appId);
            if (!treasuryResult.success || !treasuryResult.wallet) {
                return { success: false, error: treasuryResult.error || 'Treasury wallet not found for merchant app' };
            }
            const userWallet = await walletRepo.getUserWalletForMerchant(userId, merchantId);
            if (!userWallet) {
                return { success: false, error: 'User wallet not found for merchant' };
            }
            const treasuryWallet = treasuryResult.wallet;
            if (treasuryWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return { success: false, error: 'Treasury wallet is not active' };
            }
            if (userWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return { success: false, error: 'User wallet is not active' };
            }
            if (data.currency && treasuryWallet.currency !== data.currency.toUpperCase()) {
                return {
                    success: false,
                    error: `Treasury wallet currency ${treasuryWallet.currency} does not match ${data.currency}`
                };
            }
            if (data.currency && userWallet.currency !== data.currency.toUpperCase()) {
                return {
                    success: false,
                    error: `User wallet currency ${userWallet.currency} does not match ${data.currency}`
                };
            }
            const existingTreasuryDebit = await transactionRepo.findCompletedTransactionByReference(treasuryWallet.id, referenceId);
            if (existingTreasuryDebit) {
                const existingUserCredit = await TransactionModel_1.TransactionModel.findOne({
                    walletId: userWallet.id,
                    externalReference: referenceId,
                    source: exports.TREASURY_DISBURSEMENT_SOURCE,
                    status: Wallet_1.TransactionStatus.COMPLETED
                }).lean();
                return {
                    success: true,
                    treasuryWallet,
                    userWallet,
                    treasuryTransaction: existingTreasuryDebit,
                    userTransaction: existingUserCredit
                        ? (0, TransactionModel_1.toTransaction)(existingUserCredit)
                        : undefined,
                    duplicate: true
                };
            }
            if (treasuryWallet.mainBalance < amount) {
                void (0, treasuryBalanceAlertNotificationService_1.notifyMerchantInsufficientTreasuryForDisbursement)({
                    merchantId,
                    appId,
                    referenceId,
                    requiredAmountKobo: amount,
                    treasuryWallet,
                    applicationId: data.applicationId,
                    productId: data.productId,
                    productType: data.productType,
                    userId
                }).catch(() => undefined);
                return {
                    success: false,
                    insufficientFunds: true,
                    treasuryWallet,
                    userWallet,
                    fundingInstructions: this.buildTreasuryWalletFundingInstructions(treasuryWallet, amount),
                    error: 'Insufficient balance in Treasury wallet for disbursement'
                };
            }
            const treasuryDebitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(treasuryWallet.id, -amount, -amount);
            if (!treasuryDebitAdj.ok) {
                if (treasuryDebitAdj.insufficientFunds) {
                    void (0, treasuryBalanceAlertNotificationService_1.notifyMerchantInsufficientTreasuryForDisbursement)({
                        merchantId,
                        appId,
                        referenceId,
                        requiredAmountKobo: amount,
                        treasuryWallet,
                        applicationId: data.applicationId,
                        productId: data.productId,
                        productType: data.productType,
                        userId
                    }).catch(() => undefined);
                }
                return {
                    success: false,
                    insufficientFunds: treasuryDebitAdj.insufficientFunds,
                    treasuryWallet,
                    userWallet,
                    fundingInstructions: treasuryDebitAdj.insufficientFunds
                        ? this.buildTreasuryWalletFundingInstructions(treasuryWallet, amount)
                        : undefined,
                    error: treasuryDebitAdj.insufficientFunds
                        ? 'Insufficient balance in Treasury wallet for disbursement'
                        : 'Treasury wallet not found'
                };
            }
            const userCreditAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(userWallet.id, amount, amount);
            if (!userCreditAdj.ok) {
                await (0, walletBalanceAdjust_1.applyWalletDelta)(treasuryWallet.id, amount, amount);
                return { success: false, error: 'Failed to credit user wallet during disbursement' };
            }
            const treasuryBalanceBefore = treasuryDebitAdj.balanceBefore;
            const treasuryBalanceAfter = treasuryDebitAdj.balanceAfter;
            const userBalanceBefore = userCreditAdj.balanceBefore;
            const userBalanceAfter = userCreditAdj.balanceAfter;
            const updatedTreasury = treasuryDebitAdj.wallet;
            const updatedUser = userCreditAdj.wallet;
            const metadata = {
                merchantId,
                appId,
                userId,
                referenceId,
                ...(data.applicationId ? { applicationId: data.applicationId } : {}),
                ...(data.productId ? { productId: data.productId } : {}),
                ...(data.productType ? { productType: data.productType } : {})
            };
            const treasuryTransaction = await transactionRepo.createTransaction({
                walletId: treasuryWallet.id,
                amount: -amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: data.description,
                referenceId,
                balanceBefore: treasuryBalanceBefore,
                balanceAfter: treasuryBalanceAfter,
                category: 'TREASURY_DISBURSEMENT',
                source: exports.TREASURY_DISBURSEMENT_SOURCE,
                externalReference: referenceId,
                metadata: { ...metadata, destinationWalletId: userWallet.id },
                tags: ['treasury-disbursement', 'loan-mortgage-payout', ...(data.productType ? [data.productType.toLowerCase()] : [])]
            });
            const userTransaction = await transactionRepo.createTransaction({
                walletId: userWallet.id,
                amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.CREDIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: data.description,
                referenceId: treasuryWallet.id,
                balanceBefore: userBalanceBefore,
                balanceAfter: userBalanceAfter,
                category: data.productType === 'MORTGAGE' ? 'MORTGAGE_DISBURSEMENT' : 'LOAN_DISBURSEMENT',
                source: exports.TREASURY_DISBURSEMENT_SOURCE,
                externalReference: referenceId,
                metadata: { ...metadata, sourceWalletId: treasuryWallet.id },
                tags: ['treasury-disbursement', 'loan-mortgage-payout', ...(data.productType ? [data.productType.toLowerCase()] : [])]
            });
            logger_1.logger.info('Treasury disbursement completed', {
                treasuryWalletId: treasuryWallet.id,
                userWalletId: userWallet.id,
                merchantId,
                appId,
                userId,
                amount,
                referenceId,
                productType: data.productType
            });
            void (0, treasuryBalanceAlertNotificationService_1.notifyMerchantTreasuryLowBalance)({
                merchantId,
                appId,
                treasuryWallet: updatedTreasury,
                balanceAfterKobo: treasuryBalanceAfter,
                context: `Treasury balance dropped to ${(0, money_1.koboToNaira)(treasuryBalanceAfter).toLocaleString('en-NG', {
                    maximumFractionDigits: 2
                })} ${updatedTreasury.currency || 'NGN'} after a ${data.productType === 'MORTGAGE' ? 'mortgage' : 'loan'} disbursement.`
            }).catch(() => undefined);
            return {
                success: true,
                treasuryWallet: updatedTreasury,
                userWallet: updatedUser,
                treasuryTransaction,
                userTransaction,
                duplicate: false
            };
        }
        catch (error) {
            logger_1.logger.error('Error disbursing from Treasury wallet', { error });
            return { success: false, error: 'Failed to disburse from Treasury wallet' };
        }
    }
    /**
     * Debit app-scoped Treasury for an outbound settlement (e.g. Spring Management Fee).
     * Idempotent on referenceId. Does not credit another wallet on this ledger —
     * the counterparty credit happens on Spring wallet-ms via the loan-workflow webhook.
     */
    static async debitTreasuryForSettlement(data) {
        try {
            const merchantId = data.merchantId.trim();
            const appId = data.appId.trim();
            const referenceId = data.referenceId.trim();
            const amount = Number(data.amount);
            if (!merchantId || !appId || !referenceId) {
                return { success: false, error: 'merchantId, appId, and referenceId are required' };
            }
            if (!Number.isFinite(amount) || amount <= 0) {
                return { success: false, error: 'amount must be a positive number' };
            }
            (0, money_1.assertIntegerKobo)(amount);
            const treasuryResult = await this.getTreasuryWallet(merchantId, appId);
            if (!treasuryResult.success || !treasuryResult.wallet) {
                return { success: false, error: treasuryResult.error || 'Treasury wallet not found for merchant app' };
            }
            const treasuryWallet = treasuryResult.wallet;
            if (treasuryWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return { success: false, error: 'Treasury wallet is not active' };
            }
            if (data.currency && treasuryWallet.currency !== data.currency.toUpperCase()) {
                return {
                    success: false,
                    error: `Treasury wallet currency ${treasuryWallet.currency} does not match ${data.currency}`
                };
            }
            const existingDebit = await transactionRepo.findCompletedTransactionByReference(treasuryWallet.id, referenceId);
            if (existingDebit) {
                return {
                    success: true,
                    treasuryWallet,
                    treasuryTransaction: existingDebit,
                    duplicate: true
                };
            }
            if (treasuryWallet.mainBalance < amount) {
                return {
                    success: false,
                    insufficientFunds: true,
                    treasuryWallet,
                    fundingInstructions: this.buildTreasuryWalletFundingInstructions(treasuryWallet, amount),
                    error: 'Insufficient balance in Treasury wallet for settlement debit'
                };
            }
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(treasuryWallet.id, -amount, -amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    insufficientFunds: debitAdj.insufficientFunds,
                    treasuryWallet,
                    fundingInstructions: debitAdj.insufficientFunds
                        ? this.buildTreasuryWalletFundingInstructions(treasuryWallet, amount)
                        : undefined,
                    error: debitAdj.insufficientFunds
                        ? 'Insufficient balance in Treasury wallet for settlement debit'
                        : 'Treasury wallet not found'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const balanceAfter = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const category = (data.category || 'MANAGEMENT_FEE_SPRING').trim() || 'MANAGEMENT_FEE_SPRING';
            const treasuryTransaction = await transactionRepo.createTransaction({
                walletId: treasuryWallet.id,
                amount: -amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: data.description,
                referenceId,
                balanceBefore,
                balanceAfter,
                category,
                source: exports.TREASURY_DISBURSEMENT_SOURCE,
                externalReference: referenceId,
                metadata: {
                    merchantId,
                    appId,
                    referenceId,
                    ...(data.applicationId ? { applicationId: data.applicationId } : {}),
                    ...(data.productId ? { productId: data.productId } : {}),
                    ...(data.productType ? { productType: data.productType } : {}),
                    ...(data.offeringMerchantId ? { offeringMerchantId: data.offeringMerchantId } : {})
                },
                tags: ['treasury-settlement-debit', category.toLowerCase()]
            });
            logger_1.logger.info('Treasury settlement debit completed', {
                treasuryWalletId: treasuryWallet.id,
                merchantId,
                appId,
                amount,
                referenceId,
                category
            });
            void (0, treasuryBalanceAlertNotificationService_1.notifyMerchantTreasuryLowBalance)({
                merchantId,
                appId,
                treasuryWallet: updated,
                balanceAfterKobo: balanceAfter,
                context: `Treasury balance dropped to ${(0, money_1.koboToNaira)(balanceAfter).toLocaleString('en-NG', {
                    maximumFractionDigits: 2
                })} ${updated.currency || 'NGN'} after a Treasury debit (${category}).`
            }).catch(() => undefined);
            return {
                success: true,
                treasuryWallet: updated,
                treasuryTransaction,
                duplicate: false
            };
        }
        catch (error) {
            logger_1.logger.error('Error debiting Treasury for settlement', { error });
            return { success: false, error: 'Failed to debit Treasury wallet for settlement' };
        }
    }
    /**
     * Credit the app-scoped Repayment wallet when customer money is collected.
     * External collections (Mono, PayOnUs) credit Repayment only.
     * In-app collections optionally debit the user's wallet first.
     */
    static async collectToRepayment(data) {
        try {
            const merchantId = data.merchantId.trim();
            const appId = data.appId?.trim() || undefined;
            const referenceId = data.referenceId.trim();
            const source = data.source.trim() || exports.REPAYMENT_COLLECTION_SOURCE;
            const amount = Number(data.amount);
            const debitUserWallet = data.debitUserWallet === true;
            if (!merchantId || !referenceId) {
                return { success: false, error: 'merchantId and referenceId are required' };
            }
            if (!Number.isFinite(amount) || amount <= 0) {
                return { success: false, error: 'amount must be a positive number' };
            }
            (0, money_1.assertIntegerKobo)(amount);
            if (debitUserWallet && !data.userId?.trim()) {
                return { success: false, error: 'userId is required when debitUserWallet is true' };
            }
            const repaymentResult = await this.getRepaymentWallet(merchantId, appId);
            if (!repaymentResult.success || !repaymentResult.wallet) {
                return { success: false, error: repaymentResult.error || 'Repayment wallet not found for merchant app' };
            }
            const settlementWallet = repaymentResult.wallet;
            if (settlementWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return { success: false, error: 'Repayment wallet is not active' };
            }
            if (data.currency && settlementWallet.currency !== data.currency.toUpperCase()) {
                return {
                    success: false,
                    error: `Repayment wallet currency ${settlementWallet.currency} does not match ${data.currency}`
                };
            }
            const existingTx = await TransactionModel_1.TransactionModel.findOne({
                externalReference: referenceId,
                source
            }).lean();
            if (existingTx) {
                const existingWallet = await walletRepo.getWalletById(String(existingTx.walletId));
                const repayment = existingWallet?.merchantWalletType != null
                    ? existingWallet
                    : settlementWallet;
                const transaction = (0, TransactionModel_1.toTransaction)(existingTx);
                return {
                    success: true,
                    repaymentWallet: repayment,
                    settlementWallet: repayment,
                    wallet: repayment,
                    repaymentTransaction: transaction,
                    settlementTransaction: transaction,
                    transaction,
                    duplicate: true
                };
            }
            let userWallet;
            if (debitUserWallet) {
                const userId = data.userId.trim();
                const foundUserWallet = await walletRepo.getUserWalletForMerchant(userId, merchantId);
                if (!foundUserWallet) {
                    return { success: false, error: 'User wallet not found for merchant' };
                }
                if (foundUserWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                    return { success: false, error: 'User wallet is not active' };
                }
                if (data.currency && foundUserWallet.currency !== data.currency.toUpperCase()) {
                    return {
                        success: false,
                        error: `User wallet currency ${foundUserWallet.currency} does not match ${data.currency}`
                    };
                }
                if (foundUserWallet.mainBalance < amount) {
                    return {
                        success: false,
                        insufficientFunds: true,
                        repaymentWallet: settlementWallet,
                        settlementWallet,
                        userWallet: foundUserWallet,
                        error: 'Insufficient balance in user wallet for repayment collection'
                    };
                }
                userWallet = foundUserWallet;
            }
            const description = data.description?.trim() ||
                `Repayment collection (${data.category})`;
            if (userWallet) {
                const userDebitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(userWallet.id, -amount, -amount);
                if (!userDebitAdj.ok) {
                    return {
                        success: false,
                        insufficientFunds: userDebitAdj.insufficientFunds,
                        repaymentWallet: settlementWallet,
                        settlementWallet,
                        userWallet,
                        error: userDebitAdj.insufficientFunds
                            ? 'Insufficient balance in user wallet for repayment collection'
                            : 'User wallet not found'
                    };
                }
                const repaymentCreditAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(settlementWallet.id, amount, amount);
                if (!repaymentCreditAdj.ok) {
                    await (0, walletBalanceAdjust_1.applyWalletDelta)(userWallet.id, amount, amount);
                    return { success: false, error: 'Failed to update repayment wallet during collection' };
                }
                const userBalanceBefore = userDebitAdj.balanceBefore;
                const userBalanceAfter = userDebitAdj.balanceAfter;
                const settlementBalanceBefore = repaymentCreditAdj.balanceBefore;
                const settlementBalanceAfter = repaymentCreditAdj.balanceAfter;
                const updatedUser = userDebitAdj.wallet;
                const updatedSettlement = repaymentCreditAdj.wallet;
                const userTransaction = await transactionRepo.createTransaction({
                    walletId: userWallet.id,
                    amount: -amount,
                    amountUnit: 'kobo',
                    type: Wallet_1.TransactionType.DEBIT,
                    status: Wallet_1.TransactionStatus.COMPLETED,
                    description: `Repayment collection: ${description}`,
                    referenceId,
                    balanceBefore: userBalanceBefore,
                    balanceAfter: userBalanceAfter,
                    category: data.category,
                    source,
                    externalReference: referenceId,
                    metadata: {
                        merchantId,
                        appId,
                        applicationId: data.applicationId,
                        productId: data.productId,
                        productType: data.productType,
                        installmentNumber: data.installmentNumber,
                        repaymentWalletId: settlementWallet.id,
                        settlementWalletId: settlementWallet.id,
                        ...(data.metadata ?? {})
                    },
                    tags: ['repayment-collection', 'user-wallet-debit', data.category.toLowerCase()]
                });
                const repaymentTransaction = await transactionRepo.createTransaction({
                    walletId: settlementWallet.id,
                    amount,
                    amountUnit: 'kobo',
                    type: Wallet_1.TransactionType.CREDIT,
                    status: Wallet_1.TransactionStatus.COMPLETED,
                    description,
                    referenceId,
                    balanceBefore: settlementBalanceBefore,
                    balanceAfter: settlementBalanceAfter,
                    category: data.category,
                    source,
                    externalReference: referenceId,
                    metadata: {
                        merchantId,
                        appId,
                        userId: data.userId,
                        applicationId: data.applicationId,
                        productId: data.productId,
                        productType: data.productType,
                        installmentNumber: data.installmentNumber,
                        userWalletId: userWallet.id,
                        userTransactionId: userTransaction.id,
                        currency: data.currency ?? settlementWallet.currency,
                        ...(data.metadata ?? {})
                    },
                    tags: ['repayment-collection', 'repayment-credit', data.category.toLowerCase()]
                });
                logger_1.logger.info('Repayment collection completed with user wallet debit', {
                    merchantId,
                    appId,
                    userId: data.userId,
                    amount,
                    referenceId,
                    category: data.category
                });
                return {
                    success: true,
                    repaymentWallet: updatedSettlement,
                    settlementWallet: updatedSettlement,
                    wallet: updatedSettlement,
                    userWallet: updatedUser,
                    repaymentTransaction,
                    settlementTransaction: repaymentTransaction,
                    userTransaction,
                    transaction: repaymentTransaction,
                    duplicate: false
                };
            }
            const repaymentCreditAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(settlementWallet.id, amount, amount);
            if (!repaymentCreditAdj.ok) {
                return { success: false, error: 'Failed to update repayment wallet' };
            }
            const settlementBalanceBefore = repaymentCreditAdj.balanceBefore;
            const settlementBalanceAfter = repaymentCreditAdj.balanceAfter;
            const updated = repaymentCreditAdj.wallet;
            const repaymentTransaction = await transactionRepo.createTransaction({
                walletId: settlementWallet.id,
                amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.CREDIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description,
                referenceId,
                balanceBefore: settlementBalanceBefore,
                balanceAfter: settlementBalanceAfter,
                category: data.category,
                source,
                externalReference: referenceId,
                metadata: {
                    merchantId,
                    appId,
                    userId: data.userId,
                    applicationId: data.applicationId,
                    productId: data.productId,
                    productType: data.productType,
                    installmentNumber: data.installmentNumber,
                    currency: data.currency ?? settlementWallet.currency,
                    ...(data.metadata ?? {})
                },
                tags: ['repayment-collection', 'repayment-credit', data.category.toLowerCase()]
            });
            logger_1.logger.info('Repayment wallet credited from external collection', {
                merchantId,
                appId,
                amount,
                referenceId,
                category: data.category,
                source
            });
            return {
                success: true,
                repaymentWallet: updated,
                settlementWallet: updated,
                wallet: updated,
                repaymentTransaction,
                settlementTransaction: repaymentTransaction,
                transaction: repaymentTransaction,
                duplicate: false
            };
        }
        catch (error) {
            logger_1.logger.error('Error collecting to repayment wallet', {
                error,
                merchantId: data.merchantId,
                referenceId: data.referenceId,
                category: data.category
            });
            return { success: false, error: 'Failed to collect to repayment wallet' };
        }
    }
    /** @deprecated Use collectToRepayment */
    static async collectToSettlement(data) {
        return this.collectToRepayment(data);
    }
    static async applyLoanRepaymentCollection(data) {
        const installmentNumber = Number(data.installmentNumber);
        if (!Number.isFinite(installmentNumber) || installmentNumber <= 0) {
            return { success: false, error: 'installmentNumber must be a positive number' };
        }
        const result = await this.collectToRepayment({
            merchantId: data.merchantId,
            appId: data.appId,
            userId: data.userId,
            amount: data.amount,
            referenceId: data.referenceId,
            source: 'loan-repayment',
            category: 'LOAN_REPAYMENT',
            description: data.description || `Loan repayment collection ${installmentNumber}`,
            applicationId: data.applicationId,
            productId: data.productId,
            installmentNumber,
            currency: data.currency,
            metadata: data.metadata,
            debitUserWallet: false
        });
        return {
            success: result.success,
            wallet: result.repaymentWallet ?? result.settlementWallet ?? result.wallet,
            transaction: result.repaymentTransaction ?? result.settlementTransaction ?? result.transaction,
            duplicate: result.duplicate,
            error: result.error
        };
    }
    /**
     * Get wallet by ID
     */
    static async getWalletById(walletId) {
        try {
            const wallet = await walletRepo.getWalletById(walletId);
            if (!wallet)
                return { success: false, error: 'Wallet not found' };
            return { success: true, wallet: await this.enrichWalletContact(wallet) };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving wallet', { error });
            return { success: false, error: 'Failed to retrieve wallet' };
        }
    }
    static async getWalletByPayonusAccountNumber(accountNumber) {
        try {
            const wallet = await walletRepo.getWalletByVirtualAccountNumber(accountNumber);
            if (!wallet)
                return { success: false, error: 'Wallet not found for account number' };
            return { success: true, wallet: await this.enrichWalletContact(wallet) };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving wallet by virtual account number', { error, accountNumber });
            return { success: false, error: 'Failed to retrieve wallet by account number' };
        }
    }
    static async getWalletByVirtualAccountNumber(accountNumber) {
        return this.getWalletByPayonusAccountNumber(accountNumber);
    }
    /**
     * Filter transactions by date range and type for a specific wallet
     */
    static async filterWalletTransactions(walletId, filterData) {
        try {
            const wallet = await walletRepo.getWalletById(walletId);
            if (!wallet)
                return { success: false, error: 'Wallet not found' };
            const { limit, skip } = normalizeTransactionPagination(filterData);
            const { transactions, total } = await transactionRepo.filterTransactions(walletId, {
                ...filterData,
                limit,
                skip
            });
            return {
                success: true,
                transactions: await this.enrichTransactionContacts(transactions),
                pagination: {
                    total,
                    limit,
                    skip,
                    hasMore: skip + transactions.length < total
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error filtering wallet transactions', { error });
            return { success: false, error: 'Failed to filter wallet transactions' };
        }
    }
    /**
     * Filter User Wallet transactions by date range and type
     */
    static async filterUserTransactions(userId, filterData) {
        try {
            // Get User Wallet
            const userResult = await this.getUserWallet(userId);
            if (!userResult.success || !userResult.wallet) {
                return {
                    success: false,
                    error: 'User wallet not found'
                };
            }
            // Filter transactions
            const result = await this.filterWalletTransactions(userResult.wallet.id, filterData);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error filtering user transactions', { error });
            return {
                success: false,
                error: 'Failed to filter user transactions'
            };
        }
    }
    /**
     * Filter Billing Wallet transactions by date range and type
     */
    static async filterBillingTransactions(merchantId, filterData, appId) {
        try {
            const billingResult = await this.getBillingWallet(merchantId, appId);
            if (!billingResult.success || !billingResult.wallet) {
                return {
                    success: false,
                    error: appId
                        ? 'Billing wallet not found for merchant app'
                        : 'Billing wallet not found for merchant (pass appId when multiple apps exist)'
                };
            }
            return this.filterWalletTransactions(billingResult.wallet.id, filterData);
        }
        catch (error) {
            logger_1.logger.error('Error filtering billing transactions', { error });
            return {
                success: false,
                error: 'Failed to filter billing transactions'
            };
        }
    }
    /** @deprecated Use filterBillingTransactions */
    static async filterOperationTransactions(merchantId, filterData, appId) {
        return this.filterBillingTransactions(merchantId, filterData, appId);
    }
    /**
     * Filter Repayment Wallet transactions by date range and type
     */
    static async filterRepaymentTransactions(merchantId, filterData, appId) {
        try {
            const repaymentResult = await this.getRepaymentWallet(merchantId, appId);
            if (!repaymentResult.success || !repaymentResult.wallet) {
                return {
                    success: false,
                    error: appId
                        ? 'Repayment wallet not found for merchant app'
                        : 'Repayment wallet not found for merchant (pass appId when multiple apps exist)'
                };
            }
            return this.filterWalletTransactions(repaymentResult.wallet.id, filterData);
        }
        catch (error) {
            logger_1.logger.error('Error filtering repayment transactions', { error });
            return {
                success: false,
                error: 'Failed to filter repayment transactions'
            };
        }
    }
    /** @deprecated Use filterRepaymentTransactions */
    static async filterSettlementTransactions(merchantId, filterData, appId) {
        return this.filterRepaymentTransactions(merchantId, filterData, appId);
    }
    /**
     * Filter Treasury Wallet transactions by date range and type
     */
    static async filterTreasuryTransactions(merchantId, filterData, appId) {
        try {
            const treasuryResult = await this.getTreasuryWallet(merchantId, appId);
            if (!treasuryResult.success || !treasuryResult.wallet) {
                return {
                    success: false,
                    error: appId
                        ? 'Treasury wallet not found for merchant app'
                        : 'Treasury wallet not found for merchant (pass appId when multiple apps exist)'
                };
            }
            return this.filterWalletTransactions(treasuryResult.wallet.id, filterData);
        }
        catch (error) {
            logger_1.logger.error('Error filtering treasury transactions', { error });
            return {
                success: false,
                error: 'Failed to filter treasury transactions'
            };
        }
    }
    /** @deprecated Use filterRepaymentTransactions */
    static async filterKycTransactions(merchantId, filterData, appId) {
        try {
            return this.filterRepaymentTransactions(merchantId, filterData, appId);
        }
        catch (error) {
            logger_1.logger.error('Error filtering kyc transactions', { error });
            return {
                success: false,
                error: 'Failed to filter kyc transactions'
            };
        }
    }
    /**
     * Transfer money out from one wallet to another
     */
    static async transferOut(transferData) {
        try {
            (0, money_1.assertIntegerKobo)(transferData.amount);
            const fromWallet = await walletRepo.getWalletById(transferData.fromWalletId);
            const toWallet = await walletRepo.getWalletById(transferData.toWalletId);
            if (!fromWallet)
                return { success: false, error: 'Source wallet not found' };
            if (!toWallet)
                return { success: false, error: 'Destination wallet not found' };
            if (fromWallet.status !== Wallet_1.WalletStatus.ACTIVE)
                return { success: false, error: 'Source wallet is not active' };
            if (toWallet.status !== Wallet_1.WalletStatus.ACTIVE)
                return { success: false, error: 'Destination wallet is not active' };
            if (fromWallet.mainBalance < transferData.amount)
                return { success: false, error: 'Insufficient balance in source wallet' };
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(fromWallet.id, -transferData.amount, -transferData.amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    error: debitAdj.insufficientFunds
                        ? 'Insufficient balance in source wallet'
                        : 'Source wallet not found'
                };
            }
            const creditAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(toWallet.id, transferData.amount, transferData.amount);
            if (!creditAdj.ok) {
                await (0, walletBalanceAdjust_1.applyWalletDelta)(fromWallet.id, transferData.amount, transferData.amount);
                return { success: false, error: 'Failed to credit destination wallet' };
            }
            const fromBalanceBefore = debitAdj.balanceBefore;
            const fromNewMain = debitAdj.balanceAfter;
            const toBalanceBefore = creditAdj.balanceBefore;
            const toNewMain = creditAdj.balanceAfter;
            const updatedFrom = debitAdj.wallet;
            const updatedTo = creditAdj.wallet;
            const debitTransaction = await transactionRepo.createTransaction({
                walletId: fromWallet.id,
                amount: -transferData.amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: `Transfer out: ${transferData.description}`,
                referenceId: toWallet.id,
                balanceBefore: fromBalanceBefore,
                balanceAfter: fromNewMain
            });
            await transactionRepo.createTransaction({
                walletId: toWallet.id,
                amount: transferData.amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.CREDIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: `Transfer in: ${transferData.description}`,
                referenceId: fromWallet.id,
                balanceBefore: toBalanceBefore,
                balanceAfter: toNewMain
            });
            logger_1.logger.info('Money transferred between wallets', { fromWalletId: fromWallet.id, toWalletId: toWallet.id, amount: transferData.amount });
            return { success: true, fromWallet: updatedFrom, toWallet: updatedTo, transaction: debitTransaction };
        }
        catch (error) {
            logger_1.logger.error('Error transferring money between wallets', { error });
            return { success: false, error: 'Failed to transfer money between wallets' };
        }
    }
    /**
     * Transfer money out from user wallet to another wallet
     */
    static async transferOutFromUser(transferData) {
        try {
            // Get the user wallet
            const userResult = await this.getUserWallet(transferData.userId);
            if (!userResult.success || !userResult.wallet) {
                return {
                    success: false,
                    error: 'User wallet not found'
                };
            }
            const userWallet = userResult.wallet;
            // Use the existing transferOut function to perform the transfer
            const transferResult = await this.transferOut({
                fromWalletId: userWallet.id,
                toWalletId: transferData.toWalletId,
                amount: transferData.amount,
                description: transferData.description
            });
            // Cast the wallets to UserWallet type since we know the fromWallet is a user wallet
            if (transferResult.success && transferResult.fromWallet && transferResult.toWallet) {
                return {
                    success: true,
                    fromWallet: transferResult.fromWallet,
                    toWallet: transferResult.toWallet,
                    transaction: transferResult.transaction,
                    error: undefined
                };
            }
            else {
                return {
                    success: false,
                    fromWallet: undefined,
                    toWallet: undefined,
                    transaction: undefined,
                    error: transferResult.error
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error transferring money from user wallet', { error });
            return {
                success: false,
                error: 'Failed to transfer money from user wallet'
            };
        }
    }
    /**
     * Debit a user wallet (used for billing)
     */
    static async debitUserWallet(debitData) {
        try {
            (0, money_1.assertIntegerKobo)(debitData.amount);
            const userWallet = await walletRepo.getUserWallet(debitData.userId);
            if (!userWallet)
                return { success: false, error: 'User wallet not found' };
            if (userWallet.status !== Wallet_1.WalletStatus.ACTIVE)
                return { success: false, error: 'User wallet is not active' };
            if (userWallet.mainBalance < debitData.amount)
                return { success: false, error: 'Insufficient balance in user wallet' };
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(userWallet.id, -debitData.amount, -debitData.amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    error: debitAdj.insufficientFunds
                        ? 'Insufficient balance in user wallet'
                        : 'User wallet not found'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const newMain = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const transaction = await transactionRepo.createTransaction({
                walletId: userWallet.id,
                amount: -debitData.amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: debitData.description,
                balanceBefore,
                balanceAfter: newMain
            });
            logger_1.logger.info('User wallet debited', { walletId: userWallet.id, userId: debitData.userId, amount: debitData.amount });
            return { success: true, wallet: updated, transaction };
        }
        catch (error) {
            logger_1.logger.error('Error debiting user wallet', { error });
            return { success: false, error: 'Failed to debit user wallet' };
        }
    }
    /**
     * Transfer money from Billing Wallet to Repayment Wallet
     */
    static async transferFromBillingToRepayment(transferData) {
        try {
            const billingResult = await this.getMerchantWalletByType(transferData.merchantId, Wallet_1.MerchantWalletType.BILLING);
            if (!billingResult.success || !billingResult.wallet) {
                return {
                    success: false,
                    error: 'Billing wallet not found for merchant'
                };
            }
            const repaymentResult = await this.getMerchantWalletByType(transferData.merchantId, Wallet_1.MerchantWalletType.REPAYMENT);
            if (!repaymentResult.success || !repaymentResult.wallet) {
                return {
                    success: false,
                    error: 'Repayment wallet not found for merchant'
                };
            }
            const transferResult = await this.transferOut({
                fromWalletId: billingResult.wallet.id,
                toWalletId: repaymentResult.wallet.id,
                amount: transferData.amount,
                description: transferData.description
            });
            if (transferResult.success && transferResult.fromWallet && transferResult.toWallet) {
                return {
                    success: true,
                    fromWallet: transferResult.fromWallet,
                    toWallet: transferResult.toWallet,
                    transaction: transferResult.transaction,
                    error: undefined
                };
            }
            return {
                success: false,
                fromWallet: undefined,
                toWallet: undefined,
                transaction: undefined,
                error: transferResult.error
            };
        }
        catch (error) {
            logger_1.logger.error('Error transferring money from Billing to Repayment wallet', { error });
            return {
                success: false,
                error: 'Failed to transfer money from Billing to Repayment wallet'
            };
        }
    }
    /** @deprecated Use transferFromBillingToRepayment */
    static async transferFromBillingToSettlement(transferData) {
        return this.transferFromBillingToRepayment(transferData);
    }
    /** @deprecated Use transferFromBillingToRepayment */
    static async transferFromOperationToKyc(transferData) {
        return this.transferFromBillingToRepayment(transferData);
    }
    /**
     * Transfer money from Repayment Wallet to Billing Wallet
     */
    static async transferFromRepaymentToBilling(transferData) {
        try {
            const repaymentResult = await this.getMerchantWalletByType(transferData.merchantId, Wallet_1.MerchantWalletType.REPAYMENT);
            if (!repaymentResult.success || !repaymentResult.wallet) {
                return {
                    success: false,
                    error: 'Repayment wallet not found for merchant'
                };
            }
            const billingResult = await this.getMerchantWalletByType(transferData.merchantId, Wallet_1.MerchantWalletType.BILLING);
            if (!billingResult.success || !billingResult.wallet) {
                return {
                    success: false,
                    error: 'Billing wallet not found for merchant'
                };
            }
            const transferResult = await this.transferOut({
                fromWalletId: repaymentResult.wallet.id,
                toWalletId: billingResult.wallet.id,
                amount: transferData.amount,
                description: transferData.description
            });
            if (transferResult.success && transferResult.fromWallet && transferResult.toWallet) {
                return {
                    success: true,
                    fromWallet: transferResult.fromWallet,
                    toWallet: transferResult.toWallet,
                    transaction: transferResult.transaction,
                    error: undefined
                };
            }
            return {
                success: false,
                fromWallet: undefined,
                toWallet: undefined,
                transaction: undefined,
                error: transferResult.error
            };
        }
        catch (error) {
            logger_1.logger.error('Error transferring money from Repayment to Billing wallet', { error });
            return {
                success: false,
                error: 'Failed to transfer money from Repayment to Billing wallet'
            };
        }
    }
    /** @deprecated Use transferFromRepaymentToBilling */
    static async transferFromSettlementToBilling(transferData) {
        return this.transferFromRepaymentToBilling(transferData);
    }
    /** @deprecated Use transferFromRepaymentToBilling */
    static async transferFromKycToOperation(transferData) {
        return this.transferFromRepaymentToBilling(transferData);
    }
    /**
     * Get Billing Wallet for a merchant
     */
    static async getBillingWallet(merchantId, appId) {
        return this.getMerchantWalletByType(merchantId, Wallet_1.MerchantWalletType.BILLING, appId);
    }
    /** @deprecated Use getBillingWallet */
    static async getOperationWallet(merchantId, appId) {
        return this.getBillingWallet(merchantId, appId);
    }
    /**
     * Get Repayment Wallet for a merchant
     */
    static async getRepaymentWallet(merchantId, appId) {
        return this.getMerchantWalletByType(merchantId, Wallet_1.MerchantWalletType.REPAYMENT, appId);
    }
    /** @deprecated Use getRepaymentWallet */
    static async getSettlementWallet(merchantId, appId) {
        return this.getRepaymentWallet(merchantId, appId);
    }
    /** @deprecated Use getRepaymentWallet */
    static async getKycWallet(merchantId, appId) {
        return this.getRepaymentWallet(merchantId, appId);
    }
    /**
     * Get Treasury Wallet for a merchant
     */
    static async getTreasuryWallet(merchantId, appId) {
        return this.getMerchantWalletByType(merchantId, Wallet_1.MerchantWalletType.TREASURY, appId);
    }
    /**
     * Debit a merchant's Treasury Wallet (used for billing)
     */
    static async debitTreasuryWallet(debitData) {
        try {
            (0, money_1.assertIntegerKobo)(debitData.amount);
            // Get the Treasury Wallet for this merchant
            const treasuryResult = await this.getTreasuryWallet(debitData.merchantId);
            if (!treasuryResult.success || !treasuryResult.wallet) {
                return {
                    success: false,
                    error: 'Treasury wallet not found for merchant'
                };
            }
            const treasuryWallet = treasuryResult.wallet;
            if (treasuryWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return {
                    success: false,
                    error: 'Treasury wallet is not active'
                };
            }
            // Check if wallet has sufficient balance
            if (treasuryWallet.mainBalance < debitData.amount) {
                return {
                    success: false,
                    error: 'Insufficient balance in Treasury wallet'
                };
            }
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(treasuryWallet.id, -debitData.amount, -debitData.amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    error: debitAdj.insufficientFunds
                        ? 'Insufficient balance in Treasury wallet'
                        : 'Treasury wallet not found'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const newMain = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const transaction = await transactionRepo.createTransaction({
                walletId: treasuryWallet.id,
                amount: -debitData.amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: debitData.description,
                balanceBefore,
                balanceAfter: newMain
            });
            logger_1.logger.info('Treasury wallet debited', {
                walletId: treasuryWallet.id,
                merchantId: debitData.merchantId,
                amount: debitData.amount
            });
            return { success: true, wallet: updated, transaction };
        }
        catch (error) {
            logger_1.logger.error('Error debiting Treasury wallet', { error });
            return {
                success: false,
                error: 'Failed to debit Treasury wallet'
            };
        }
    }
    /**
     * Debit a merchant's Billing Wallet
     */
    static async debitBillingWallet(debitData) {
        try {
            (0, money_1.assertIntegerKobo)(debitData.amount);
            const billingResult = await this.getBillingWallet(debitData.merchantId);
            if (!billingResult.success || !billingResult.wallet) {
                return {
                    success: false,
                    error: 'Billing wallet not found for merchant'
                };
            }
            const billingWallet = billingResult.wallet;
            if (billingWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return {
                    success: false,
                    error: 'Billing wallet is not active'
                };
            }
            if (billingWallet.mainBalance < debitData.amount) {
                return {
                    success: false,
                    error: 'Insufficient balance in Billing wallet'
                };
            }
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(billingWallet.id, -debitData.amount, -debitData.amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    error: debitAdj.insufficientFunds
                        ? 'Insufficient balance in Billing wallet'
                        : 'Billing wallet not found'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const newMain = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const transaction = await transactionRepo.createTransaction({
                walletId: billingWallet.id,
                amount: -debitData.amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: debitData.description,
                balanceBefore,
                balanceAfter: newMain
            });
            logger_1.logger.info('Billing wallet debited', {
                walletId: billingWallet.id,
                merchantId: debitData.merchantId,
                amount: debitData.amount
            });
            return { success: true, wallet: updated, transaction };
        }
        catch (error) {
            logger_1.logger.error('Error debiting Billing wallet', { error });
            return {
                success: false,
                error: 'Failed to debit Billing wallet'
            };
        }
    }
    /** @deprecated Use debitBillingWallet */
    static async debitOperationWallet(debitData) {
        return this.debitBillingWallet(debitData);
    }
    /**
     * Debit a merchant's Repayment Wallet
     */
    static async debitRepaymentWallet(debitData) {
        try {
            (0, money_1.assertIntegerKobo)(debitData.amount);
            const repaymentResult = await this.getRepaymentWallet(debitData.merchantId);
            if (!repaymentResult.success || !repaymentResult.wallet) {
                return {
                    success: false,
                    error: 'Repayment wallet not found for merchant'
                };
            }
            const settlementWallet = repaymentResult.wallet;
            if (settlementWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return {
                    success: false,
                    error: 'Repayment wallet is not active'
                };
            }
            if (settlementWallet.mainBalance < debitData.amount) {
                return {
                    success: false,
                    error: 'Insufficient balance in Repayment wallet'
                };
            }
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(settlementWallet.id, -debitData.amount, -debitData.amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    error: debitAdj.insufficientFunds
                        ? 'Insufficient balance in Repayment wallet'
                        : 'Repayment wallet not found'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const newMain = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const transaction = await transactionRepo.createTransaction({
                walletId: settlementWallet.id,
                amount: -debitData.amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: debitData.description,
                balanceBefore,
                balanceAfter: newMain
            });
            logger_1.logger.info('Repayment wallet debited', {
                walletId: settlementWallet.id,
                merchantId: debitData.merchantId,
                amount: debitData.amount
            });
            return { success: true, wallet: updated, transaction };
        }
        catch (error) {
            logger_1.logger.error('Error debiting Repayment wallet', { error });
            return {
                success: false,
                error: 'Failed to debit Repayment wallet'
            };
        }
    }
    /** @deprecated Use debitRepaymentWallet */
    static async debitSettlementWallet(debitData) {
        return this.debitRepaymentWallet(debitData);
    }
    /** @deprecated Use debitRepaymentWallet */
    static async debitKycWallet(debitData) {
        return this.debitRepaymentWallet(debitData);
    }
    /**
     * Process KYC fee by debiting the merchant's Repayment wallet
     */
    static async processKycFee(merchantId, amount, description = 'KYC Fee') {
        try {
            (0, money_1.assertIntegerKobo)(amount);
            // Validate inputs
            if (amount <= 0) {
                return {
                    success: false,
                    error: 'KYC fee amount must be positive'
                };
            }
            // Get the Repayment Wallet for this merchant
            const settlementResult = await this.getRepaymentWallet(merchantId);
            if (!settlementResult.success || !settlementResult.wallet) {
                return {
                    success: false,
                    error: 'Repayment wallet not found for merchant'
                };
            }
            const settlementWallet = settlementResult.wallet;
            if (settlementWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return {
                    success: false,
                    error: 'Repayment wallet is not active'
                };
            }
            if (settlementWallet.mainBalance < amount) {
                return {
                    success: false,
                    error: 'Insufficient balance in Repayment wallet for KYC fee'
                };
            }
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(settlementWallet.id, -amount, -amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    error: debitAdj.insufficientFunds
                        ? 'Insufficient balance in Repayment wallet for KYC fee'
                        : 'Repayment wallet not found'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const newMain = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const transaction = await transactionRepo.createTransaction({
                walletId: settlementWallet.id,
                amount: -amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description,
                referenceId: 'KYC_FEE',
                balanceBefore,
                balanceAfter: newMain
            });
            logger_1.logger.info('KYC fee processed', {
                walletId: settlementWallet.id,
                merchantId,
                amount,
                description
            });
            return { success: true, wallet: updated, transaction };
        }
        catch (error) {
            logger_1.logger.error('Error processing KYC fee', { error });
            return {
                success: false,
                error: 'Failed to process KYC fee'
            };
        }
    }
    /**
     * Make a 3rd party API call from a user wallet
     */
    static async makeUserApiCall(apiCallData) {
        try {
            (0, money_1.assertIntegerKobo)(apiCallData.amount);
            // Get the user wallet
            const userResult = await this.getUserWallet(apiCallData.userId);
            if (!userResult.success || !userResult.wallet) {
                return {
                    success: false,
                    error: 'User wallet not found'
                };
            }
            const userWallet = userResult.wallet;
            if (userWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return {
                    success: false,
                    error: 'User wallet is not active'
                };
            }
            // Check if wallet has sufficient balance
            if (userWallet.mainBalance < apiCallData.amount) {
                return {
                    success: false,
                    error: 'Insufficient balance in user wallet'
                };
            }
            // Prepare the API call
            const axiosConfig = {
                method: apiCallData.method,
                url: apiCallData.endpoint,
                headers: {
                    'Content-Type': 'application/json',
                    ...apiCallData.headers
                },
                timeout: 10000 // 10 second timeout
            };
            // Add API key to headers if provided
            if (apiCallData.apiKey) {
                axiosConfig.headers['Authorization'] = `Bearer ${apiCallData.apiKey}`;
            }
            // Add request body for POST/PUT requests
            if ((apiCallData.method === 'POST' || apiCallData.method === 'PUT') && apiCallData.body) {
                axiosConfig.data = apiCallData.body;
            }
            logger_1.logger.info('Making 3rd party API call', {
                userId: apiCallData.userId,
                endpoint: apiCallData.endpoint,
                method: apiCallData.method
            });
            // Make the API call
            let apiResponse;
            try {
                const response = await (0, axios_1.default)(axiosConfig);
                apiResponse = response.data;
                logger_1.logger.info('3rd party API call successful', {
                    userId: apiCallData.userId,
                    endpoint: apiCallData.endpoint,
                    status: response.status
                });
            }
            catch (apiError) {
                logger_1.logger.error('3rd party API call failed', {
                    userId: apiCallData.userId,
                    endpoint: apiCallData.endpoint,
                    error: apiError.message,
                    status: apiError.response?.status
                });
                // Even if the API call fails, we still debit the wallet as the service was attempted
                // In a real implementation, you might want to handle this differently based on business rules
                return {
                    success: false,
                    error: `API call failed: ${apiError.message}`,
                    wallet: userWallet
                };
            }
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(userWallet.id, -apiCallData.amount, -apiCallData.amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    error: debitAdj.insufficientFunds
                        ? 'Insufficient balance in user wallet'
                        : 'User wallet not found'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const newMain = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const transaction = await transactionRepo.createTransaction({
                walletId: userWallet.id,
                amount: -apiCallData.amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: `API Call: ${apiCallData.description}`,
                referenceId: apiCallData.endpoint,
                balanceBefore,
                balanceAfter: newMain
            });
            logger_1.logger.info('User wallet debited for API call', {
                walletId: userWallet.id,
                userId: apiCallData.userId,
                amount: apiCallData.amount
            });
            return { success: true, wallet: updated, transaction, apiResponse };
        }
        catch (error) {
            logger_1.logger.error('Error making user API call', { error });
            return {
                success: false,
                error: 'Failed to make API call'
            };
        }
    }
    static buildBillingWalletFundingInstructions(wallet, requiredAmount) {
        const balance = wallet.mainBalance ?? wallet.balance ?? 0;
        const shortfall = Math.max(0, requiredAmount - balance);
        const nuban = wallet.virtualNuban;
        const hasActiveNuban = nuban?.provisionStatus === 'active' && Boolean(nuban.accountNumber?.trim());
        let fundingHint = 'Top up the merchant Billing wallet via bank transfer to cover platform fees.';
        if (hasActiveNuban) {
            fundingHint = `Transfer ${wallet.currency} ${shortfall.toFixed(2)} to the Billing wallet account ${nuban.accountNumber} (${nuban.bankName || 'bank'}).`;
        }
        return {
            walletId: wallet.id,
            balance,
            currency: wallet.currency,
            requiredAmount,
            shortfall,
            ...(nuban ? { virtualNuban: nuban } : {}),
            fundingHint
        };
    }
    /**
     * Debit the app-scoped Billing wallet for monthly platform fees (per customer count).
     */
    static async chargeMonthlyCustomerBilling(data) {
        try {
            const merchantId = data.merchantId.trim();
            const appId = data.appId.trim();
            const referenceId = data.referenceId.trim();
            const amount = data.amount;
            if (!merchantId || !appId || !referenceId || !data.billingPeriod.trim()) {
                return { success: false, error: 'merchantId, appId, billingPeriod, and referenceId are required' };
            }
            if (!Number.isFinite(amount) || amount < 0) {
                return { success: false, error: 'amount must be a non-negative finite number' };
            }
            (0, money_1.assertIntegerKobo)(amount);
            if (amount === 0) {
                return { success: true, skippedZeroAmount: true, duplicate: false };
            }
            const billingResult = await this.getBillingWallet(merchantId, appId);
            if (!billingResult.success || !billingResult.wallet) {
                return { success: false, error: billingResult.error || 'Billing wallet not found for merchant app' };
            }
            const billingWallet = billingResult.wallet;
            if (billingWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return { success: false, error: 'Billing wallet is not active' };
            }
            const existing = await transactionRepo.findCompletedTransactionByReference(billingWallet.id, referenceId);
            if (existing) {
                return {
                    success: true,
                    wallet: billingWallet,
                    transaction: existing,
                    duplicate: true
                };
            }
            if (billingWallet.mainBalance < amount) {
                return {
                    success: false,
                    insufficientFunds: true,
                    wallet: billingWallet,
                    fundingInstructions: this.buildBillingWalletFundingInstructions(billingWallet, amount),
                    error: 'Insufficient balance in Billing wallet for monthly customer billing'
                };
            }
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(billingWallet.id, -amount, -amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    insufficientFunds: debitAdj.insufficientFunds,
                    wallet: billingWallet,
                    fundingInstructions: debitAdj.insufficientFunds
                        ? this.buildBillingWalletFundingInstructions(billingWallet, amount)
                        : undefined,
                    error: 'Insufficient balance in Billing wallet for monthly customer billing'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const newBalance = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const transaction = await transactionRepo.createTransaction({
                walletId: billingWallet.id,
                amount: -amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: data.description,
                referenceId,
                balanceBefore,
                balanceAfter: newBalance,
                category: 'MONTHLY_CUSTOMER_BILLING',
                source: 'BILLING_MS',
                metadata: {
                    merchantId,
                    appId,
                    billingPeriod: data.billingPeriod,
                    customerCount: data.customerCount,
                    pricePerCustomer: data.pricePerCustomer,
                    ...(data.appName ? { appName: data.appName } : {})
                },
                tags: ['monthly-billing', 'merchant-billing-wallet', 'per-customer']
            });
            logger_1.logger.info('Monthly customer billing charged', {
                walletId: billingWallet.id,
                merchantId,
                appId,
                amount,
                customerCount: data.customerCount,
                billingPeriod: data.billingPeriod,
                referenceId
            });
            return {
                success: true,
                wallet: updated,
                transaction,
                duplicate: false
            };
        }
        catch (error) {
            logger_1.logger.error('Error charging monthly customer billing', { error });
            return { success: false, error: 'Failed to charge monthly customer billing' };
        }
    }
    /**
     * One-time debit of the merchant Billing wallet for business KYC (idempotent per merchant).
     */
    static async chargeBusinessKycFee(data) {
        try {
            const merchantId = data.merchantId.trim();
            const referenceId = data.referenceId.trim();
            const amount = data.amount;
            const appId = data.appId?.trim();
            if (!merchantId || !referenceId) {
                return { success: false, error: 'merchantId and referenceId are required' };
            }
            if (!Number.isFinite(amount) || amount < 0) {
                return { success: false, error: 'amount must be a non-negative finite number' };
            }
            (0, money_1.assertIntegerKobo)(amount);
            if (amount === 0) {
                return { success: true, skippedZeroAmount: true, duplicate: false };
            }
            const billingResult = await this.getBillingWallet(merchantId, appId || undefined);
            if (!billingResult.success || !billingResult.wallet) {
                return { success: false, error: billingResult.error || 'Billing wallet not found for merchant' };
            }
            const billingWallet = billingResult.wallet;
            if (billingWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return { success: false, error: 'Billing wallet is not active' };
            }
            const existing = await transactionRepo.findCompletedTransactionByReference(billingWallet.id, referenceId);
            if (existing) {
                return {
                    success: true,
                    wallet: billingWallet,
                    transaction: existing,
                    duplicate: true
                };
            }
            if (billingWallet.mainBalance < amount) {
                return {
                    success: false,
                    insufficientFunds: true,
                    wallet: billingWallet,
                    fundingInstructions: this.buildBillingWalletFundingInstructions(billingWallet, amount),
                    error: 'Insufficient balance in Billing wallet for business KYC fee'
                };
            }
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(billingWallet.id, -amount, -amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    insufficientFunds: debitAdj.insufficientFunds,
                    wallet: billingWallet,
                    fundingInstructions: debitAdj.insufficientFunds
                        ? this.buildBillingWalletFundingInstructions(billingWallet, amount)
                        : undefined,
                    error: 'Insufficient balance in Billing wallet for business KYC fee'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const newBalance = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const transaction = await transactionRepo.createTransaction({
                walletId: billingWallet.id,
                amount: -amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: data.description,
                referenceId,
                balanceBefore,
                balanceAfter: newBalance,
                category: 'BUSINESS_KYC_FEE',
                source: 'COMPLIANCE_MS',
                metadata: {
                    merchantId,
                    ...(appId ? { appId } : {}),
                    ...(data.authUserId ? { authUserId: data.authUserId } : {})
                },
                tags: ['business-kyc', 'merchant-billing-wallet', 'one-time']
            });
            logger_1.logger.info('Business KYC fee charged', {
                walletId: billingWallet.id,
                merchantId,
                appId,
                amount,
                referenceId
            });
            return {
                success: true,
                wallet: updated,
                transaction,
                duplicate: false
            };
        }
        catch (error) {
            logger_1.logger.error('Error charging business KYC fee', { error });
            return { success: false, error: 'Failed to charge business KYC fee' };
        }
    }
    /**
     * Payout from the merchant Repayment wallet to an external bank account via PayOnUs.
     */
    static async payoutRepaymentWalletToBank(payoutData) {
        try {
            const merchantId = payoutData.merchantId.trim();
            const appId = payoutData.appId?.trim() || undefined;
            const amount = Number(payoutData.amount);
            if (!merchantId) {
                return { success: false, error: 'merchantId is required' };
            }
            if (!Number.isFinite(amount) || amount <= 0) {
                return { success: false, error: 'amount must be a positive number' };
            }
            (0, money_1.assertIntegerKobo)(amount);
            const repaymentResult = await this.getRepaymentWallet(merchantId, appId);
            if (!repaymentResult.success || !repaymentResult.wallet) {
                return { success: false, error: repaymentResult.error || 'Repayment wallet not found for merchant app' };
            }
            const settlementWallet = repaymentResult.wallet;
            if (settlementWallet.status !== Wallet_1.WalletStatus.ACTIVE) {
                return { success: false, error: 'Repayment wallet is not active' };
            }
            const currency = (payoutData.currency || settlementWallet.currency).toUpperCase();
            if (currency !== settlementWallet.currency.toUpperCase()) {
                return { success: false, error: 'Payout currency must match repayment wallet currency' };
            }
            const sourceAccountNumber = settlementWallet.virtualNuban?.accountNumber;
            if (settlementWallet.virtualNuban?.provisionStatus !== 'active' || !sourceAccountNumber) {
                return { success: false, error: 'Repayment PayOnUs virtual account is not active' };
            }
            if (settlementWallet.mainBalance < amount) {
                return { success: false, error: 'Insufficient balance in Repayment wallet' };
            }
            const payoutReference = payoutData.reference?.trim() ||
                `repayment-payout:${settlementWallet.id}:${Date.now()}`;
            const existingPayout = await transactionRepo.findCompletedTransactionByReference(settlementWallet.id, payoutReference);
            if (existingPayout) {
                const wallet = await walletRepo.getWalletById(settlementWallet.id);
                return {
                    success: true,
                    wallet: wallet ?? settlementWallet,
                    transaction: existingPayout,
                    payoutReference,
                    providerReference: existingPayout.externalReference,
                    duplicate: true
                };
            }
            const narration = payoutData.narration?.trim() || 'Repayment wallet bank payout';
            const providerResult = await (0, payonusNubanClient_1.initiateBankPayout)({
                sourceAccountNumber,
                destinationAccountNumber: payoutData.accountNumber.trim(),
                destinationBankCode: payoutData.bankCode.trim(),
                destinationAccountName: payoutData.accountName.trim(),
                amount: (0, money_1.koboToNaira)(amount),
                currency,
                reference: payoutReference,
                narration
            });
            if (!providerResult.ok) {
                return {
                    success: false,
                    providerReference: providerResult.providerReference,
                    providerStatus: providerResult.providerStatus,
                    payoutReference,
                    error: providerResult.errorMessage || 'PayOnUs payout failed'
                };
            }
            const debitAdj = await (0, walletBalanceAdjust_1.applyWalletDelta)(settlementWallet.id, -amount, -amount);
            if (!debitAdj.ok) {
                return {
                    success: false,
                    error: debitAdj.insufficientFunds
                        ? 'Insufficient balance in Repayment wallet'
                        : 'Failed to update repayment wallet after payout'
                };
            }
            const balanceBefore = debitAdj.balanceBefore;
            const newBalance = debitAdj.balanceAfter;
            const updated = debitAdj.wallet;
            const transaction = await transactionRepo.createTransaction({
                walletId: settlementWallet.id,
                amount: -amount,
                amountUnit: 'kobo',
                type: Wallet_1.TransactionType.DEBIT,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: `External bank payout: ${narration}`,
                referenceId: payoutReference,
                externalReference: providerResult.providerReference || payoutReference,
                category: 'REPAYMENT_PAYOUT',
                source: 'PAYONUS',
                tags: ['payonus', 'bank-payout', 'repayment-wallet'],
                metadata: {
                    providerStatus: providerResult.providerStatus,
                    httpStatus: providerResult.httpStatus,
                    destinationBankCode: payoutData.bankCode,
                    destinationBankName: payoutData.bankName,
                    destinationAccountName: payoutData.accountName,
                    destinationAccountLast4: payoutData.accountNumber.slice(-4),
                    sourceAccountLast4: sourceAccountNumber.slice(-4),
                    merchantId,
                    appId
                },
                balanceBefore,
                balanceAfter: newBalance
            });
            logger_1.logger.info('Repayment wallet bank payout completed', {
                merchantId,
                appId,
                amount,
                payoutReference,
                providerReference: providerResult.providerReference
            });
            return {
                success: true,
                wallet: updated,
                transaction,
                payoutReference,
                providerReference: providerResult.providerReference,
                providerStatus: providerResult.providerStatus,
                duplicate: false
            };
        }
        catch (error) {
            logger_1.logger.error('Error paying out repayment wallet to bank', { error });
            return { success: false, error: 'Failed to payout repayment wallet to bank' };
        }
    }
    /** @deprecated Use payoutRepaymentWalletToBank */
    static async payoutSettlementWalletToBank(payoutData) {
        return this.payoutRepaymentWalletToBank(payoutData);
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=walletService.js.map