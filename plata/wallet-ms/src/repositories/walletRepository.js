"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWallet = createWallet;
exports.getWalletById = getWalletById;
exports.getWalletByPayonusAccountNumber = getWalletByPayonusAccountNumber;
exports.getMerchantWalletByType = getMerchantWalletByType;
exports.getAllMerchantWallets = getAllMerchantWallets;
exports.getUserWallet = getUserWallet;
exports.getUserWalletForMerchant = getUserWalletForMerchant;
exports.getUserWalletsByMerchant = getUserWalletsByMerchant;
exports.updateWallet = updateWallet;
exports.adjustWalletBalance = adjustWalletBalance;
exports.findAllWallets = findAllWallets;
exports.patchWalletVirtualNuban = patchWalletVirtualNuban;
exports.patchWalletPayonusNuban = patchWalletPayonusNuban;
exports.getWalletByVirtualAccountNumber = getWalletByVirtualAccountNumber;
const Wallet_1 = require("../models/Wallet");
const WalletModel_1 = require("../models/WalletModel");
const merchantWalletType_1 = require("../utils/merchantWalletType");
const money_1 = require("../utils/money");
/**
 * Lazy-migrate legacy Naira balances to integer kobo and return domain wallet.
 */
async function normalizeWalletDoc(doc) {
    if (!doc)
        return null;
    const raw = { ...doc };
    const id = raw._id?.toString?.();
    if (raw.balanceUnit !== 'kobo') {
        const main = (0, money_1.nairaToKobo)(Number(raw.mainBalance ?? 0));
        const ledger = (0, money_1.nairaToKobo)(Number(raw.ledgerBalance ?? 0));
        if (id) {
            await WalletModel_1.WalletModel.updateOne({ _id: id }, { $set: { mainBalance: main, ledgerBalance: ledger, balanceUnit: 'kobo' } });
        }
        raw.mainBalance = main;
        raw.ledgerBalance = ledger;
        raw.balanceUnit = 'kobo';
    }
    else {
        raw.mainBalance = Math.trunc(Number(raw.mainBalance ?? 0));
        raw.ledgerBalance = Math.trunc(Number(raw.ledgerBalance ?? 0));
    }
    return (0, WalletModel_1.toWallet)(raw);
}
async function createWallet(doc) {
    const created = await WalletModel_1.WalletModel.create({
        walletType: doc.walletType,
        merchantId: doc.merchantId,
        ...(doc.complianceShareholderUserId ? { complianceShareholderUserId: doc.complianceShareholderUserId } : {}),
        ...(doc.walletType === 'MERCHANT' && doc.appId ? { appId: doc.appId } : {}),
        ...(doc.walletType === 'MERCHANT' && doc.appName ? { appName: doc.appName } : {}),
        ...(doc.walletType === 'MERCHANT' && doc.payonusSubaccountCode
            ? { payonusSubaccountCode: doc.payonusSubaccountCode }
            : {}),
        name: doc.name,
        currency: doc.currency,
        mainBalance: 0,
        ledgerBalance: 0,
        balanceUnit: 'kobo',
        ...(doc.walletType === 'MERCHANT' && { merchantWalletType: doc.merchantWalletType }),
        ...(doc.walletType === 'USER' && { userId: doc.userId })
    });
    return (await normalizeWalletDoc(created));
}
async function getWalletById(walletId) {
    const doc = await WalletModel_1.WalletModel.findById(walletId).lean();
    return normalizeWalletDoc(doc);
}
async function getWalletByPayonusAccountNumber(accountNumber) {
    const doc = await WalletModel_1.WalletModel.findOne({ payonusNubanAccountNumber: accountNumber }).lean();
    return normalizeWalletDoc(doc);
}
async function getMerchantWalletByType(merchantId, walletType, appId) {
    const query = {
        walletType: 'MERCHANT',
        merchantId,
        merchantWalletType: { $in: (0, merchantWalletType_1.merchantWalletTypesForLookup)(walletType) }
    };
    const maybeMigrateType = async (doc) => {
        if (!doc)
            return null;
        const raw = doc;
        const stored = String(raw.merchantWalletType ?? '');
        if (walletType === Wallet_1.MerchantWalletType.REPAYMENT &&
            (stored === 'SETTLEMENT' || stored === 'KYC')) {
            const id = raw._id?.toString?.();
            if (id) {
                void WalletModel_1.WalletModel.updateOne({ _id: id }, { $set: { merchantWalletType: Wallet_1.MerchantWalletType.REPAYMENT } }).catch(() => undefined);
                raw.merchantWalletType = Wallet_1.MerchantWalletType.REPAYMENT;
            }
        }
        if (walletType === Wallet_1.MerchantWalletType.BILLING && stored === 'OPERATION') {
            const id = raw._id?.toString?.();
            if (id) {
                void WalletModel_1.WalletModel.updateOne({ _id: id }, { $set: { merchantWalletType: Wallet_1.MerchantWalletType.BILLING } }).catch(() => undefined);
                raw.merchantWalletType = Wallet_1.MerchantWalletType.BILLING;
            }
        }
        return (await normalizeWalletDoc(raw));
    };
    if (appId) {
        query.appId = appId;
        const doc = await WalletModel_1.WalletModel.findOne(query).lean();
        if (doc)
            return maybeMigrateType(doc);
        const legacyQuery = {
            walletType: 'MERCHANT',
            merchantId,
            merchantWalletType: { $in: (0, merchantWalletType_1.merchantWalletTypesForLookup)(walletType) },
            $or: [{ appId: { $exists: false } }, { appId: null }, { appId: '' }]
        };
        const legacyDocs = await WalletModel_1.WalletModel.find(legacyQuery).lean();
        if (legacyDocs.length === 1) {
            return maybeMigrateType(legacyDocs[0]);
        }
        return null;
    }
    const docs = await WalletModel_1.WalletModel.find(query).lean();
    if (docs.length === 0)
        return null;
    if (docs.length === 1) {
        return maybeMigrateType(docs[0]);
    }
    const legacyWallets = docs.filter((d) => !d.appId);
    if (legacyWallets.length === 1) {
        return maybeMigrateType(legacyWallets[0]);
    }
    return null;
}
async function getAllMerchantWallets(merchantId, appId) {
    const query = { walletType: 'MERCHANT', merchantId };
    if (appId) {
        query.appId = appId;
    }
    const docs = await WalletModel_1.WalletModel.find(query).lean();
    const wallets = [];
    for (const d of docs) {
        const w = await normalizeWalletDoc(d);
        if (w)
            wallets.push(w);
    }
    return wallets;
}
async function getUserWallet(userId) {
    const doc = await WalletModel_1.WalletModel.findOne({ walletType: 'USER', userId }).lean();
    return (await normalizeWalletDoc(doc));
}
async function getUserWalletForMerchant(userId, merchantId) {
    const doc = await WalletModel_1.WalletModel.findOne({ walletType: 'USER', userId, merchantId }).lean();
    return (await normalizeWalletDoc(doc));
}
async function getUserWalletsByMerchant(merchantId, opts = {}) {
    const rawLimit = Number(opts.limit);
    const rawSkip = Number(opts.skip);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? Math.floor(rawSkip) : 0;
    const filter = { walletType: 'USER', merchantId };
    const [total, docs] = await Promise.all([
        WalletModel_1.WalletModel.countDocuments(filter),
        WalletModel_1.WalletModel.find(filter).skip(skip).limit(limit).lean()
    ]);
    const wallets = [];
    for (const d of docs) {
        const w = await normalizeWalletDoc(d);
        if (w)
            wallets.push(w);
    }
    return { wallets, total, limit, skip };
}
async function updateWallet(walletId, updates) {
    const doc = await WalletModel_1.WalletModel.findByIdAndUpdate(walletId, {
        $set: {
            ...updates,
            ...(updates.mainBalance !== undefined || updates.ledgerBalance !== undefined
                ? { balanceUnit: updates.balanceUnit ?? 'kobo' }
                : {})
        }
    }, { new: true }).lean();
    return normalizeWalletDoc(doc);
}
/**
 * Atomic balance adjustment ($inc). Prefer this over updateWallet for credits/debits.
 */
async function adjustWalletBalance(walletId, deltas) {
    const mainDelta = Math.trunc(deltas.mainDelta);
    const ledgerDelta = Math.trunc(deltas.ledgerDelta ?? mainDelta);
    if (!Number.isFinite(mainDelta) || !Number.isFinite(ledgerDelta)) {
        throw new Error('adjustWalletBalance: delta must be a finite integer kobo value');
    }
    await getWalletById(walletId);
    const filter = { _id: walletId };
    if (mainDelta < 0) {
        filter.mainBalance = { $gte: -mainDelta };
    }
    if (ledgerDelta < 0) {
        filter.ledgerBalance = { $gte: -ledgerDelta };
    }
    const beforeDoc = await WalletModel_1.WalletModel.findOneAndUpdate(filter, {
        $inc: {
            mainBalance: mainDelta,
            ledgerBalance: ledgerDelta
        },
        $set: { balanceUnit: 'kobo', updatedAt: new Date() }
    }, { new: false });
    if (!beforeDoc) {
        const exists = await WalletModel_1.WalletModel.exists({ _id: walletId });
        if (!exists)
            return null;
        return { insufficientFunds: true };
    }
    const balanceBefore = Math.trunc(Number(beforeDoc.get('mainBalance') ?? 0));
    const balanceAfter = balanceBefore + mainDelta;
    const afterDoc = await WalletModel_1.WalletModel.findById(walletId).lean();
    const wallet = await normalizeWalletDoc(afterDoc);
    if (!wallet)
        return null;
    return { wallet, balanceBefore, balanceAfter };
}
async function findAllWallets() {
    const docs = await WalletModel_1.WalletModel.find({}).lean();
    const wallets = [];
    for (const d of docs) {
        const w = await normalizeWalletDoc(d);
        if (w)
            wallets.push(w);
    }
    return wallets;
}
async function patchWalletVirtualNuban(walletId, patch) {
    const $set = {};
    const $unset = {};
    Object.entries(patch).forEach(([key, val]) => {
        if (val === null) {
            $unset[String(key)] = '';
        }
        else if (val !== undefined) {
            $set[String(key)] = val;
        }
    });
    const op = {};
    if (Object.keys($set).length)
        op.$set = $set;
    if (Object.keys($unset).length)
        op.$unset = $unset;
    if (!Object.keys(op).length) {
        const doc = await WalletModel_1.WalletModel.findById(walletId).lean();
        return normalizeWalletDoc(doc);
    }
    const doc = await WalletModel_1.WalletModel.findByIdAndUpdate(walletId, op, { new: true }).lean();
    return normalizeWalletDoc(doc);
}
/** @deprecated Prefer patchWalletVirtualNuban */
async function patchWalletPayonusNuban(walletId, patch) {
    return patchWalletVirtualNuban(walletId, { ...patch, nubanProvider: 'payonus' });
}
async function getWalletByVirtualAccountNumber(accountNumber) {
    return getWalletByPayonusAccountNumber(accountNumber);
}
//# sourceMappingURL=walletRepository.js.map