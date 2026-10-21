"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTransactionDoc = normalizeTransactionDoc;
exports.createTransaction = createTransaction;
exports.getTransactionById = getTransactionById;
exports.getTransactionsByWalletId = getTransactionsByWalletId;
exports.findCompletedTransactionByReference = findCompletedTransactionByReference;
exports.filterTransactions = filterTransactions;
exports.listRecentCreditsByAppCategory = listRecentCreditsByAppCategory;
exports.listSavingsDepositActivityForApp = listSavingsDepositActivityForApp;
exports.aggregateSavingsWithdrawalsThisMonth = aggregateSavingsWithdrawalsThisMonth;
exports.listPendingSavingsWithdrawalRequests = listPendingSavingsWithdrawalRequests;
exports.listInvestmentDepositActivityForApp = listInvestmentDepositActivityForApp;
exports.listPendingInvestmentLiquidationRequests = listPendingInvestmentLiquidationRequests;
exports.listRecentApprovedInvestmentLiquidations = listRecentApprovedInvestmentLiquidations;
exports.listCommodityDepositActivityForApp = listCommodityDepositActivityForApp;
exports.listPendingCommodityLiquidationRequests = listPendingCommodityLiquidationRequests;
exports.listRecentApprovedCommodityLiquidations = listRecentApprovedCommodityLiquidations;
const Wallet_1 = require("../models/Wallet");
const TransactionModel_1 = require("../models/TransactionModel");
const money_1 = require("../utils/money");
const treasuryWithdrawalPendingNotificationService_1 = require("../services/treasuryWithdrawalPendingNotificationService");
/**
 * Lazy-migrate legacy Naira transaction amounts to integer kobo.
 * Rows already tagged `amountUnit: 'kobo'` are left unchanged.
 */
async function normalizeTransactionDoc(doc) {
    if (!doc)
        return null;
    const raw = { ...doc };
    const id = raw._id?.toString?.();
    if (raw.amountUnit !== 'kobo') {
        const amount = (0, money_1.nairaToKobo)(Number(raw.amount ?? 0));
        const balanceBefore = raw.balanceBefore !== undefined && raw.balanceBefore !== null
            ? (0, money_1.nairaToKobo)(Number(raw.balanceBefore))
            : undefined;
        const balanceAfter = raw.balanceAfter !== undefined && raw.balanceAfter !== null
            ? (0, money_1.nairaToKobo)(Number(raw.balanceAfter))
            : undefined;
        if (id) {
            await TransactionModel_1.TransactionModel.updateOne({ _id: id }, {
                $set: {
                    amount,
                    ...(balanceBefore !== undefined ? { balanceBefore } : {}),
                    ...(balanceAfter !== undefined ? { balanceAfter } : {}),
                    amountUnit: 'kobo'
                }
            });
        }
        raw.amount = amount;
        if (balanceBefore !== undefined)
            raw.balanceBefore = balanceBefore;
        if (balanceAfter !== undefined)
            raw.balanceAfter = balanceAfter;
        raw.amountUnit = 'kobo';
    }
    else {
        raw.amount = Math.trunc(Number(raw.amount ?? 0));
        if (raw.balanceBefore !== undefined && raw.balanceBefore !== null) {
            raw.balanceBefore = Math.trunc(Number(raw.balanceBefore));
        }
        if (raw.balanceAfter !== undefined && raw.balanceAfter !== null) {
            raw.balanceAfter = Math.trunc(Number(raw.balanceAfter));
        }
    }
    return (0, TransactionModel_1.toTransaction)(raw);
}
async function normalizeTransactionDocs(docs) {
    const out = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (tx)
            out.push(tx);
    }
    return out;
}
async function createTransaction(data) {
    const created = await TransactionModel_1.TransactionModel.create({
        ...data,
        amountUnit: 'kobo',
        status: data.status ?? Wallet_1.TransactionStatus.PENDING
    });
    const tx = (0, TransactionModel_1.toTransaction)(created);
    void (0, treasuryWithdrawalPendingNotificationService_1.notifyMerchantPendingTreasuryWithdrawal)(tx).catch(() => undefined);
    return tx;
}
async function getTransactionById(transactionId) {
    const doc = await TransactionModel_1.TransactionModel.findById(transactionId).lean();
    return normalizeTransactionDoc(doc);
}
async function getTransactionsByWalletId(walletId, opts = {}) {
    const rawLimit = Number(opts.limit);
    const rawSkip = Number(opts.skip);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? Math.floor(rawSkip) : 0;
    const filter = { walletId };
    const [total, docs] = await Promise.all([
        TransactionModel_1.TransactionModel.countDocuments(filter),
        TransactionModel_1.TransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);
    return {
        total,
        limit,
        skip,
        transactions: await normalizeTransactionDocs(docs)
    };
}
async function findCompletedTransactionByReference(walletId, referenceId) {
    const doc = await TransactionModel_1.TransactionModel.findOne({
        walletId,
        referenceId,
        status: Wallet_1.TransactionStatus.COMPLETED
    }).lean();
    return normalizeTransactionDoc(doc);
}
async function filterTransactions(walletId, filter) {
    const query = { walletId };
    if (filter.startDate || filter.endDate) {
        query.createdAt = {};
        if (filter.startDate)
            query.createdAt.$gte = filter.startDate;
        if (filter.endDate)
            query.createdAt.$lte = filter.endDate;
    }
    if (filter.type)
        query.type = filter.type;
    const rawLimit = Number(filter.limit);
    const rawSkip = Number(filter.skip);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? Math.floor(rawSkip) : 0;
    const [total, docs] = await Promise.all([
        TransactionModel_1.TransactionModel.countDocuments(query),
        TransactionModel_1.TransactionModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);
    return {
        total,
        transactions: await normalizeTransactionDocs(docs)
    };
}
async function listRecentCreditsByAppCategory(input) {
    const appId = input.appId.trim();
    const category = input.category.trim();
    if (!appId || !category) {
        return [];
    }
    const limit = Number.isFinite(input.limit) && input.limit > 0
        ? Math.min(input.limit, 20)
        : 5;
    const docs = await TransactionModel_1.TransactionModel.find({
        category,
        type: Wallet_1.TransactionType.CREDIT,
        status: Wallet_1.TransactionStatus.COMPLETED,
        amount: { $gt: 0 },
        'metadata.appId': appId
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select({
        referenceId: 1,
        amount: 1,
        amountUnit: 1,
        createdAt: 1,
        metadata: 1
    })
        .lean();
    const results = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
            ? tx.metadata
            : {};
        const applicationId = typeof meta.applicationId === 'string' ? meta.applicationId.trim() : '';
        const productId = typeof meta.productId === 'string' ? meta.productId.trim() : undefined;
        const createdAt = tx.createdAt instanceof Date
            ? tx.createdAt.toISOString()
            : new Date(String(tx.createdAt || Date.now())).toISOString();
        results.push({
            reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
            applicationId,
            productId: productId || undefined,
            amount: (0, money_1.koboToNaira)(tx.amount),
            at: createdAt
        });
    }
    return results;
}
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
function startOfMonthLagos(now = new Date()) {
    const lagos = new Date(now.getTime() + LAGOS_OFFSET_MS);
    const startLagosUtc = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), 1, 0, 0, 0, 0);
    return new Date(startLagosUtc - LAGOS_OFFSET_MS);
}
const SAVINGS_WITHDRAWAL_CATEGORIES = [
    'SAVINGS_WITHDRAWAL',
    'SAVINGS_PAYOUT',
    'SAVINGS_WITHDRAW'
];
/**
 * Recent SAVINGS_DEPOSIT credits with DEPOSIT vs TOP_UP (first credit per application = DEPOSIT).
 */
async function listSavingsDepositActivityForApp(input) {
    const appId = input.appId.trim();
    if (!appId)
        return [];
    const limit = Number.isFinite(input.limit) && input.limit > 0
        ? Math.min(input.limit, 20)
        : 5;
    const scanLimit = Math.min(Math.max(limit * 10, 50), 200);
    const docs = await TransactionModel_1.TransactionModel.find({
        category: 'SAVINGS_DEPOSIT',
        type: Wallet_1.TransactionType.CREDIT,
        status: Wallet_1.TransactionStatus.COMPLETED,
        amount: { $gt: 0 },
        'metadata.appId': appId
    })
        .sort({ createdAt: 1 })
        .limit(scanLimit)
        .select({
        referenceId: 1,
        amount: 1,
        amountUnit: 1,
        createdAt: 1,
        metadata: 1
    })
        .lean();
    const depositCountByApp = new Map();
    const labeled = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
            ? tx.metadata
            : {};
        const applicationId = typeof meta.applicationId === 'string' ? meta.applicationId.trim() : '';
        const productId = typeof meta.productId === 'string' ? meta.productId.trim() : undefined;
        const createdAt = tx.createdAt instanceof Date
            ? tx.createdAt.toISOString()
            : new Date(String(tx.createdAt || Date.now())).toISOString();
        const prior = applicationId ? depositCountByApp.get(applicationId) || 0 : 0;
        const activity = prior === 0 ? 'DEPOSIT' : 'TOP_UP';
        if (applicationId) {
            depositCountByApp.set(applicationId, prior + 1);
        }
        labeled.push({
            reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
            applicationId,
            productId: productId || undefined,
            amount: (0, money_1.koboToNaira)(tx.amount),
            at: createdAt,
            activity
        });
    }
    return labeled.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
/** Completed savings-related debits in the current calendar month (Africa/Lagos). */
async function aggregateSavingsWithdrawalsThisMonth(appId) {
    const id = appId.trim();
    if (!id)
        return { amount: 0, count: 0 };
    const monthStart = startOfMonthLagos();
    const docs = await TransactionModel_1.TransactionModel.find({
        type: Wallet_1.TransactionType.DEBIT,
        status: Wallet_1.TransactionStatus.COMPLETED,
        amount: { $gt: 0 },
        createdAt: { $gte: monthStart },
        'metadata.appId': id,
        $or: [
            { category: { $in: [...SAVINGS_WITHDRAWAL_CATEGORIES] } },
            { category: 'REPAYMENT_PAYOUT', 'metadata.productType': 'SAVINGS' },
            { 'metadata.productType': 'SAVINGS', 'metadata.withdrawal': true }
        ]
    })
        .select({ amount: 1, amountUnit: 1 })
        .lean();
    let count = 0;
    let amountKobo = 0;
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        count += 1;
        amountKobo += tx.amount;
    }
    return { amount: (0, money_1.koboToNaira)(amountKobo), count };
}
/** Pending savings withdrawal requests (ledger or metadata). */
async function listPendingSavingsWithdrawalRequests(appId, limit = 5) {
    const id = appId.trim();
    if (!id)
        return [];
    const cap = Math.min(Math.max(limit, 1), 20);
    const docs = await TransactionModel_1.TransactionModel.find({
        type: Wallet_1.TransactionType.DEBIT,
        status: Wallet_1.TransactionStatus.PENDING,
        amount: { $gt: 0 },
        'metadata.appId': id,
        $or: [
            { category: { $in: [...SAVINGS_WITHDRAWAL_CATEGORIES, 'SAVINGS_WITHDRAWAL_REQUEST'] } },
            { 'metadata.productType': 'SAVINGS', 'metadata.withdrawalRequest': true }
        ]
    })
        .sort({ createdAt: -1 })
        .limit(cap)
        .select({
        referenceId: 1,
        amount: 1,
        amountUnit: 1,
        createdAt: 1,
        metadata: 1
    })
        .lean();
    const results = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
            ? tx.metadata
            : {};
        const applicationId = typeof meta.applicationId === 'string' ? meta.applicationId.trim() : '';
        const requestedOn = tx.createdAt instanceof Date
            ? tx.createdAt.toISOString()
            : new Date(String(tx.createdAt || Date.now())).toISOString();
        results.push({
            reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
            applicationId,
            amount: (0, money_1.koboToNaira)(tx.amount),
            requestedOn,
            status: 'pending'
        });
    }
    return results;
}
const INVESTMENT_LIQUIDATION_CATEGORIES = [
    'INVESTMENT_WITHDRAWAL',
    'INVESTMENT_LIQUIDATION',
    'INVESTMENT_PAYOUT',
    'INVESTMENT_LIQUIDATION_PAYOUT'
];
/**
 * Recent INVESTMENT_DEPOSIT credits with NEW_INVESTMENT vs TOP_UP (first credit per application = NEW_INVESTMENT).
 */
async function listInvestmentDepositActivityForApp(input) {
    const appId = input.appId.trim();
    if (!appId)
        return [];
    const limit = Number.isFinite(input.limit) && input.limit > 0
        ? Math.min(input.limit, 20)
        : 5;
    const scanLimit = Math.min(Math.max(limit * 10, 50), 200);
    const docs = await TransactionModel_1.TransactionModel.find({
        category: 'INVESTMENT_DEPOSIT',
        type: Wallet_1.TransactionType.CREDIT,
        status: Wallet_1.TransactionStatus.COMPLETED,
        amount: { $gt: 0 },
        'metadata.appId': appId
    })
        .sort({ createdAt: 1 })
        .limit(scanLimit)
        .select({
        referenceId: 1,
        amount: 1,
        amountUnit: 1,
        createdAt: 1,
        metadata: 1
    })
        .lean();
    const depositCountByApp = new Map();
    const labeled = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
            ? tx.metadata
            : {};
        const applicationId = typeof meta.applicationId === 'string' ? meta.applicationId.trim() : '';
        const productId = typeof meta.productId === 'string' ? meta.productId.trim() : undefined;
        const createdAt = tx.createdAt instanceof Date
            ? tx.createdAt.toISOString()
            : new Date(String(tx.createdAt || Date.now())).toISOString();
        const prior = applicationId ? depositCountByApp.get(applicationId) || 0 : 0;
        const activity = prior === 0 ? 'NEW_INVESTMENT' : 'TOP_UP';
        if (applicationId) {
            depositCountByApp.set(applicationId, prior + 1);
        }
        labeled.push({
            reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
            applicationId,
            productId: productId || undefined,
            amount: (0, money_1.koboToNaira)(tx.amount),
            at: createdAt,
            activity
        });
    }
    return labeled.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
/** Pending investment liquidation / early withdrawal requests. */
async function listPendingInvestmentLiquidationRequests(appId, limit = 5) {
    const id = appId.trim();
    if (!id)
        return [];
    const cap = Math.min(Math.max(limit, 1), 20);
    const docs = await TransactionModel_1.TransactionModel.find({
        type: Wallet_1.TransactionType.DEBIT,
        status: Wallet_1.TransactionStatus.PENDING,
        amount: { $gt: 0 },
        'metadata.appId': id,
        $or: [
            { category: { $in: [...INVESTMENT_LIQUIDATION_CATEGORIES, 'INVESTMENT_LIQUIDATION_REQUEST'] } },
            { 'metadata.productType': 'INVESTMENT', 'metadata.liquidationRequest': true }
        ]
    })
        .sort({ createdAt: -1 })
        .limit(cap)
        .select({
        referenceId: 1,
        amount: 1,
        amountUnit: 1,
        createdAt: 1,
        metadata: 1
    })
        .lean();
    const results = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
            ? tx.metadata
            : {};
        const applicationId = typeof meta.applicationId === 'string' ? meta.applicationId.trim() : '';
        const requestedOn = tx.createdAt instanceof Date
            ? tx.createdAt.toISOString()
            : new Date(String(tx.createdAt || Date.now())).toISOString();
        results.push({
            reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
            applicationId,
            amount: (0, money_1.koboToNaira)(tx.amount),
            requestedOn,
            status: 'pending'
        });
    }
    return results;
}
/** Recently completed investment liquidations (paid out). */
async function listRecentApprovedInvestmentLiquidations(appId, limit = 5) {
    const id = appId.trim();
    if (!id)
        return [];
    const cap = Math.min(Math.max(limit, 1), 20);
    const docs = await TransactionModel_1.TransactionModel.find({
        type: Wallet_1.TransactionType.DEBIT,
        status: Wallet_1.TransactionStatus.COMPLETED,
        amount: { $gt: 0 },
        'metadata.appId': id,
        $or: [
            { category: { $in: [...INVESTMENT_LIQUIDATION_CATEGORIES] } },
            { category: 'REPAYMENT_PAYOUT', 'metadata.productType': 'INVESTMENT' },
            { 'metadata.productType': 'INVESTMENT', 'metadata.liquidation': true }
        ]
    })
        .sort({ createdAt: -1 })
        .limit(cap)
        .select({
        referenceId: 1,
        amount: 1,
        amountUnit: 1,
        createdAt: 1,
        metadata: 1
    })
        .lean();
    const results = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
            ? tx.metadata
            : {};
        const applicationId = typeof meta.applicationId === 'string' ? meta.applicationId.trim() : '';
        const settledOn = tx.createdAt instanceof Date
            ? tx.createdAt.toISOString()
            : new Date(String(tx.createdAt || Date.now())).toISOString();
        results.push({
            reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
            applicationId,
            amount: (0, money_1.koboToNaira)(tx.amount),
            settledOn,
            status: 'paid_out'
        });
    }
    return results;
}
const COMMODITY_LIQUIDATION_CATEGORIES = [
    'COMMODITY_WITHDRAWAL',
    'COMMODITY_LIQUIDATION',
    'COMMODITY_PAYOUT',
    'COMMODITY_LIQUIDATION_PAYOUT'
];
/**
 * Recent COMMODITY_DEPOSIT credits with NEW_INVESTMENT vs TOP_UP (first credit per application = NEW_INVESTMENT).
 */
async function listCommodityDepositActivityForApp(input) {
    const appId = input.appId.trim();
    if (!appId)
        return [];
    const limit = Number.isFinite(input.limit) && input.limit > 0
        ? Math.min(input.limit, 20)
        : 5;
    const scanLimit = Math.min(Math.max(limit * 10, 50), 200);
    const docs = await TransactionModel_1.TransactionModel.find({
        category: 'COMMODITY_DEPOSIT',
        type: Wallet_1.TransactionType.CREDIT,
        status: Wallet_1.TransactionStatus.COMPLETED,
        amount: { $gt: 0 },
        'metadata.appId': appId
    })
        .sort({ createdAt: 1 })
        .limit(scanLimit)
        .select({
        referenceId: 1,
        amount: 1,
        amountUnit: 1,
        createdAt: 1,
        metadata: 1
    })
        .lean();
    const depositCountByApp = new Map();
    const labeled = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
            ? tx.metadata
            : {};
        const applicationId = typeof meta.applicationId === 'string' ? meta.applicationId.trim() : '';
        const productId = typeof meta.productId === 'string' ? meta.productId.trim() : undefined;
        const createdAt = tx.createdAt instanceof Date
            ? tx.createdAt.toISOString()
            : new Date(String(tx.createdAt || Date.now())).toISOString();
        const prior = applicationId ? depositCountByApp.get(applicationId) || 0 : 0;
        const activity = prior === 0 ? 'NEW_INVESTMENT' : 'TOP_UP';
        if (applicationId) {
            depositCountByApp.set(applicationId, prior + 1);
        }
        labeled.push({
            reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
            applicationId,
            productId: productId || undefined,
            amount: (0, money_1.koboToNaira)(tx.amount),
            at: createdAt,
            activity
        });
    }
    return labeled.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
/** Pending commodity liquidation / cash-out requests. */
async function listPendingCommodityLiquidationRequests(appId, limit = 5) {
    const id = appId.trim();
    if (!id)
        return [];
    const cap = Math.min(Math.max(limit, 1), 20);
    const docs = await TransactionModel_1.TransactionModel.find({
        type: Wallet_1.TransactionType.DEBIT,
        status: Wallet_1.TransactionStatus.PENDING,
        amount: { $gt: 0 },
        'metadata.appId': id,
        $or: [
            { category: { $in: [...COMMODITY_LIQUIDATION_CATEGORIES, 'COMMODITY_LIQUIDATION_REQUEST'] } },
            { 'metadata.productType': 'COMMODITY', 'metadata.liquidationRequest': true }
        ]
    })
        .sort({ createdAt: -1 })
        .limit(cap)
        .select({
        referenceId: 1,
        amount: 1,
        amountUnit: 1,
        createdAt: 1,
        metadata: 1
    })
        .lean();
    const results = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
            ? tx.metadata
            : {};
        const applicationId = typeof meta.applicationId === 'string' ? meta.applicationId.trim() : '';
        const requestedOn = tx.createdAt instanceof Date
            ? tx.createdAt.toISOString()
            : new Date(String(tx.createdAt || Date.now())).toISOString();
        results.push({
            reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
            applicationId,
            amount: (0, money_1.koboToNaira)(tx.amount),
            requestedOn,
            status: 'pending'
        });
    }
    return results;
}
/** Recently completed commodity liquidations (paid out). */
async function listRecentApprovedCommodityLiquidations(appId, limit = 5) {
    const id = appId.trim();
    if (!id)
        return [];
    const cap = Math.min(Math.max(limit, 1), 20);
    const docs = await TransactionModel_1.TransactionModel.find({
        type: Wallet_1.TransactionType.DEBIT,
        status: Wallet_1.TransactionStatus.COMPLETED,
        amount: { $gt: 0 },
        'metadata.appId': id,
        $or: [
            { category: { $in: [...COMMODITY_LIQUIDATION_CATEGORIES] } },
            { category: 'REPAYMENT_PAYOUT', 'metadata.productType': 'COMMODITY' },
            { 'metadata.productType': 'COMMODITY', 'metadata.liquidation': true }
        ]
    })
        .sort({ createdAt: -1 })
        .limit(cap)
        .select({
        referenceId: 1,
        amount: 1,
        amountUnit: 1,
        createdAt: 1,
        metadata: 1
    })
        .lean();
    const results = [];
    for (const doc of docs) {
        const tx = await normalizeTransactionDoc(doc);
        if (!tx)
            continue;
        const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
            ? tx.metadata
            : {};
        const applicationId = typeof meta.applicationId === 'string' ? meta.applicationId.trim() : '';
        const settledOn = tx.createdAt instanceof Date
            ? tx.createdAt.toISOString()
            : new Date(String(tx.createdAt || Date.now())).toISOString();
        results.push({
            reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
            applicationId,
            amount: (0, money_1.koboToNaira)(tx.amount),
            settledOn,
            status: 'paid_out'
        });
    }
    return results;
}
//# sourceMappingURL=transactionRepository.js.map