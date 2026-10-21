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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalWalletController = void 0;
const walletService_1 = require("../services/walletService");
const walletRepo = __importStar(require("../repositories/walletRepository"));
const provisionUserNuban_1 = require("../services/nuban/provisionUserNuban");
const merchantWalletType_1 = require("../utils/merchantWalletType");
const money_1 = require("../utils/money");
const walletApiMoney_1 = require("../utils/walletApiMoney");
function parseApplicantProfile(body) {
    const nested = body.applicantProfile;
    const source = nested && typeof nested === 'object' && !Array.isArray(nested)
        ? nested
        : body;
    const profile = {
        fullName: typeof source.fullName === 'string' ? source.fullName : typeof source.name === 'string' ? source.name : undefined,
        firstName: typeof source.firstName === 'string' ? source.firstName : undefined,
        lastName: typeof source.lastName === 'string' ? source.lastName : undefined,
        otherNames: typeof source.otherNames === 'string' ? source.otherNames : undefined,
        email: typeof source.email === 'string' ? source.email : undefined,
        phone: typeof source.phone === 'string' ? source.phone : undefined,
        bvn: typeof source.bvn === 'string' ? source.bvn : undefined,
        gender: typeof source.gender === 'string' ? source.gender : undefined,
        dateOfBirth: typeof source.dateOfBirth === 'string' ? source.dateOfBirth : undefined,
        placeOfBirth: typeof source.placeOfBirth === 'string' ? source.placeOfBirth : undefined,
        address: typeof source.address === 'string' ? source.address : undefined,
        accountTier: typeof source.accountTier === 'string' ? source.accountTier : undefined
    };
    const hasAny = Object.values(profile).some((v) => typeof v === 'string' && v.trim());
    return hasAny ? profile : undefined;
}
class InternalWalletController {
    /**
     * POST /internal/api/v1/wallets/user/provision
     * Idempotent: returns existing user wallet or creates one and provisions NUBAN
     * (BankOne when merchant banking config enabled, else PayOnUs).
     */
    static async provisionUserWallet(req, res, next) {
        try {
            const body = req.body;
            const userId = String(body.userId || '').trim();
            const merchantId = String(body.merchantId || '').trim();
            if (!userId || !merchantId) {
                res.status(400).json({ success: false, error: 'userId and merchantId are required' });
                return;
            }
            const currency = String(body.currency || 'NGN').trim().toUpperCase();
            const name = String(body.name || 'Personal Wallet').trim();
            const applicantProfile = parseApplicantProfile(body);
            const bvnRaw = body.bvn ?? applicantProfile?.bvn;
            const bvn = typeof bvnRaw === 'string' ? bvnRaw.replace(/\D/g, '') : undefined;
            if (bvnRaw && bvn?.length !== 11) {
                res.status(400).json({ success: false, error: 'bvn must be an 11-digit number' });
                return;
            }
            const existing = await walletRepo.getUserWalletForMerchant(userId, merchantId);
            if (existing) {
                const needsReprovision = Boolean(bvn || applicantProfile) && existing.virtualNuban?.provisionStatus !== 'active';
                const wallet = needsReprovision
                    ? await (0, provisionUserNuban_1.reprovisionUserWalletNuban)(existing, {
                        bvn,
                        applicantProfile: {
                            ...applicantProfile,
                            fullName: applicantProfile?.fullName || name,
                            bvn: bvn || applicantProfile?.bvn
                        }
                    })
                    : existing;
                res.status(200).json({
                    success: true,
                    data: { wallet: (0, walletApiMoney_1.walletForApi)(wallet), created: false }
                });
                return;
            }
            const result = await walletService_1.WalletService.createUserWallet({
                userId,
                merchantId,
                complianceShareholderUserId: userId,
                bvn,
                applicantProfile: {
                    ...applicantProfile,
                    fullName: applicantProfile?.fullName || name,
                    bvn: bvn || applicantProfile?.bvn
                },
                name,
                currency
            });
            if (!result.success || !result.wallet) {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Failed to create user wallet'
                });
                return;
            }
            res.status(201).json({
                success: true,
                data: { wallet: (0, walletApiMoney_1.walletForApi)(result.wallet), created: true }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/user/credit
     * Idempotent loan disbursement credit for a user wallet under a product-creator merchant.
     */
    static async creditUserWallet(req, res, next) {
        try {
            const body = req.body;
            const userId = (body.userId || '').trim();
            const merchantId = (body.merchantId || '').trim();
            const externalReference = (body.externalReference || '').trim();
            const description = (body.description || 'Loan disbursement').trim();
            const parsed = (0, money_1.requestAmountToKobo)(body.amount, body.amountUnit);
            if (!userId || !merchantId) {
                res.status(400).json({ success: false, error: 'userId and merchantId are required' });
                return;
            }
            if (!externalReference) {
                res.status(400).json({ success: false, error: 'externalReference is required' });
                return;
            }
            if (!parsed.ok) {
                res.status(400).json({ success: false, error: parsed.error });
                return;
            }
            if (parsed.kobo <= 0) {
                res.status(400).json({ success: false, error: 'amount must be a positive number' });
                return;
            }
            const result = await walletService_1.WalletService.creditUserWalletForMerchant({
                userId,
                merchantId,
                amount: parsed.kobo,
                description,
                externalReference,
                category: body.category
            });
            if (!result.success || !result.wallet) {
                const status = result.error === 'User wallet not found for merchant' ? 404 : 400;
                res.status(status).json({ success: false, error: result.error || 'Failed to credit wallet' });
                return;
            }
            res.status(result.duplicate ? 200 : 201).json({
                success: true,
                data: {
                    wallet: (0, walletApiMoney_1.walletForApi)(result.wallet),
                    transaction: result.transaction ? (0, walletApiMoney_1.transactionForApi)(result.transaction) : undefined,
                    duplicate: Boolean(result.duplicate)
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/treasury/disburse
     * Debit app-scoped Treasury and credit the user's wallet (loan / mortgage disbursement).
     */
    static async disburseFromTreasury(req, res, next) {
        try {
            const body = req.body;
            const merchantId = (body.merchantId || '').trim();
            const appId = (body.appId || '').trim();
            const userId = (body.userId || '').trim();
            const referenceId = (body.referenceId || body.externalReference || '').trim();
            const parsed = (0, money_1.requestAmountToKobo)(body.amount, body.amountUnit);
            if (!merchantId || !appId || !userId || !referenceId) {
                res.status(400).json({
                    success: false,
                    error: 'merchantId, appId, userId, and referenceId (or externalReference) are required'
                });
                return;
            }
            if (!parsed.ok) {
                res.status(400).json({ success: false, error: parsed.error });
                return;
            }
            if (parsed.kobo <= 0) {
                res.status(400).json({ success: false, error: 'amount must be a positive number' });
                return;
            }
            const result = await walletService_1.WalletService.disburseFromTreasury({
                merchantId,
                appId,
                userId,
                amount: parsed.kobo,
                description: body.description?.trim() || 'Treasury disbursement to user wallet',
                referenceId,
                applicationId: body.applicationId?.trim() || undefined,
                productId: body.productId?.trim() || undefined,
                productType: body.productType?.trim().toUpperCase() || undefined,
                currency: body.currency?.trim().toUpperCase()
            });
            if (result.insufficientFunds) {
                res.status(402).json({
                    success: false,
                    error: result.error || 'Insufficient balance in Treasury wallet',
                    code: 'INSUFFICIENT_TREASURY_WALLET_BALANCE',
                    data: {
                        treasuryWallet: result.treasuryWallet ? (0, walletApiMoney_1.walletForApi)(result.treasuryWallet) : undefined,
                        userWallet: result.userWallet ? (0, walletApiMoney_1.walletForApi)(result.userWallet) : undefined,
                        fundingInstructions: result.fundingInstructions
                    }
                });
                return;
            }
            if (!result.success || !result.userWallet) {
                const status = result.error === 'User wallet not found for merchant' ? 404 : 400;
                res.status(status).json({ success: false, error: result.error || 'Failed to disburse from Treasury wallet' });
                return;
            }
            res.status(result.duplicate ? 200 : 201).json({
                success: true,
                duplicate: result.duplicate === true,
                message: result.duplicate
                    ? 'Treasury disbursement already applied'
                    : 'Treasury disbursement completed',
                data: {
                    treasuryWallet: result.treasuryWallet ? (0, walletApiMoney_1.walletForApi)(result.treasuryWallet) : undefined,
                    wallet: (0, walletApiMoney_1.walletForApi)(result.userWallet),
                    userWallet: (0, walletApiMoney_1.walletForApi)(result.userWallet),
                    treasuryTransaction: result.treasuryTransaction
                        ? (0, walletApiMoney_1.transactionForApi)(result.treasuryTransaction)
                        : undefined,
                    transaction: result.userTransaction ? (0, walletApiMoney_1.transactionForApi)(result.userTransaction) : undefined,
                    userTransaction: result.userTransaction ? (0, walletApiMoney_1.transactionForApi)(result.userTransaction) : undefined
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/treasury/debit-settlement
     * Debit app-scoped Treasury for outbound settlement (e.g. Spring Management Fee).
     */
    static async debitTreasuryForSettlement(req, res, next) {
        try {
            const body = req.body;
            const merchantId = (body.merchantId || '').trim();
            const appId = (body.appId || '').trim();
            const referenceId = (body.referenceId || body.externalReference || '').trim();
            const parsed = (0, money_1.requestAmountToKobo)(body.amount, body.amountUnit);
            if (!merchantId || !appId || !referenceId) {
                res.status(400).json({
                    success: false,
                    error: 'merchantId, appId, and referenceId (or externalReference) are required'
                });
                return;
            }
            if (!parsed.ok) {
                res.status(400).json({ success: false, error: parsed.error });
                return;
            }
            if (parsed.kobo <= 0) {
                res.status(400).json({ success: false, error: 'amount must be a positive number' });
                return;
            }
            const result = await walletService_1.WalletService.debitTreasuryForSettlement({
                merchantId,
                appId,
                amount: parsed.kobo,
                description: body.description?.trim() || 'Treasury settlement debit',
                referenceId,
                category: body.category?.trim() || undefined,
                applicationId: body.applicationId?.trim() || undefined,
                productId: body.productId?.trim() || undefined,
                productType: body.productType?.trim().toUpperCase() || undefined,
                offeringMerchantId: body.offeringMerchantId?.trim() || undefined,
                currency: body.currency?.trim().toUpperCase()
            });
            if (result.insufficientFunds) {
                res.status(402).json({
                    success: false,
                    error: result.error || 'Insufficient balance in Treasury wallet',
                    code: 'INSUFFICIENT_TREASURY_WALLET_BALANCE',
                    data: {
                        treasuryWallet: result.treasuryWallet ? (0, walletApiMoney_1.walletForApi)(result.treasuryWallet) : undefined,
                        fundingInstructions: result.fundingInstructions
                    }
                });
                return;
            }
            if (!result.success) {
                res.status(400).json({ success: false, error: result.error || 'Failed to debit Treasury wallet' });
                return;
            }
            res.status(result.duplicate ? 200 : 201).json({
                success: true,
                duplicate: result.duplicate === true,
                message: result.duplicate
                    ? 'Treasury settlement debit already applied'
                    : 'Treasury settlement debit completed',
                data: {
                    treasuryWallet: result.treasuryWallet ? (0, walletApiMoney_1.walletForApi)(result.treasuryWallet) : undefined,
                    treasuryTransaction: result.treasuryTransaction
                        ? (0, walletApiMoney_1.transactionForApi)(result.treasuryTransaction)
                        : undefined
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/loan-repayment/collection
     * Idempotent repayment collection credit into the merchant settlement wallet.
     */
    static async applyLoanRepaymentCollection(req, res, next) {
        try {
            const body = req.body;
            const merchantId = (body.merchantId || '').trim();
            const applicationId = (body.applicationId || '').trim();
            const userId = (body.userId || '').trim();
            const productId = (body.productId || '').trim();
            const referenceId = (body.referenceId || '').trim();
            const parsed = (0, money_1.requestAmountToKobo)(body.amount, body.amountUnit);
            const installmentNumber = Number(body.installmentNumber);
            if (!merchantId || !applicationId || !userId || !productId || !referenceId) {
                res.status(400).json({
                    success: false,
                    error: 'merchantId, applicationId, userId, productId, and referenceId are required'
                });
                return;
            }
            if (!parsed.ok) {
                res.status(400).json({ success: false, error: parsed.error });
                return;
            }
            if (parsed.kobo <= 0) {
                res.status(400).json({ success: false, error: 'amount must be a positive number' });
                return;
            }
            if (!Number.isFinite(installmentNumber) || installmentNumber <= 0) {
                res.status(400).json({ success: false, error: 'installmentNumber must be a positive number' });
                return;
            }
            const result = await walletService_1.WalletService.applyLoanRepaymentCollection({
                merchantId,
                appId: body.appId?.trim() || undefined,
                applicationId,
                userId,
                productId,
                amount: parsed.kobo,
                currency: body.currency?.trim().toUpperCase(),
                referenceId,
                installmentNumber,
                description: body.description?.trim() || undefined,
                metadata: body.metadata
            });
            if (!result.success || !result.wallet) {
                res.status(400).json({ success: false, error: result.error || 'Failed to apply repayment collection' });
                return;
            }
            res.status(result.duplicate ? 200 : 201).json({
                success: true,
                data: {
                    wallet: (0, walletApiMoney_1.walletForApi)(result.wallet),
                    transaction: result.transaction ? (0, walletApiMoney_1.transactionForApi)(result.transaction) : undefined,
                    duplicate: Boolean(result.duplicate)
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/repayment/collect
     * Credit the app-scoped Repayment wallet (optionally debit user wallet first).
     */
    static async collectToRepayment(req, res, next) {
        try {
            const body = req.body;
            const merchantId = (body.merchantId || '').trim();
            const referenceId = (body.referenceId || '').trim();
            const parsed = (0, money_1.requestAmountToKobo)(body.amount, body.amountUnit);
            if (!merchantId || !referenceId) {
                res.status(400).json({ success: false, error: 'merchantId and referenceId are required' });
                return;
            }
            if (!parsed.ok) {
                res.status(400).json({ success: false, error: parsed.error });
                return;
            }
            if (parsed.kobo <= 0) {
                res.status(400).json({ success: false, error: 'amount must be a positive number' });
                return;
            }
            if (!body.category?.trim()) {
                res.status(400).json({ success: false, error: 'category is required' });
                return;
            }
            const result = await walletService_1.WalletService.collectToRepayment({
                merchantId,
                appId: body.appId?.trim() || undefined,
                userId: body.userId?.trim() || undefined,
                amount: parsed.kobo,
                referenceId,
                source: body.source?.trim() || 'repayment-collection',
                category: body.category.trim(),
                description: body.description?.trim() || undefined,
                applicationId: body.applicationId?.trim() || undefined,
                productId: body.productId?.trim() || undefined,
                productType: body.productType?.trim().toUpperCase() || undefined,
                installmentNumber: body.installmentNumber !== undefined ? Number(body.installmentNumber) : undefined,
                currency: body.currency?.trim().toUpperCase(),
                metadata: body.metadata,
                debitUserWallet: body.debitUserWallet === true
            });
            const repaymentWallet = result.repaymentWallet ?? result.settlementWallet;
            const repaymentTransaction = result.repaymentTransaction ?? result.settlementTransaction ?? result.transaction;
            if (result.insufficientFunds) {
                res.status(402).json({
                    success: false,
                    error: result.error || 'Insufficient balance in user wallet',
                    code: 'INSUFFICIENT_USER_WALLET_BALANCE',
                    data: {
                        repaymentWallet: repaymentWallet ? (0, walletApiMoney_1.walletForApi)(repaymentWallet) : undefined,
                        settlementWallet: repaymentWallet ? (0, walletApiMoney_1.walletForApi)(repaymentWallet) : undefined,
                        userWallet: result.userWallet ? (0, walletApiMoney_1.walletForApi)(result.userWallet) : undefined
                    }
                });
                return;
            }
            if (!result.success || !repaymentWallet) {
                const status = result.error?.includes('not found') ? 404 : 400;
                res.status(status).json({ success: false, error: result.error || 'Failed to collect to repayment wallet' });
                return;
            }
            res.status(result.duplicate ? 200 : 201).json({
                success: true,
                duplicate: result.duplicate === true,
                data: {
                    wallet: (0, walletApiMoney_1.walletForApi)(repaymentWallet),
                    repaymentWallet: (0, walletApiMoney_1.walletForApi)(repaymentWallet),
                    settlementWallet: (0, walletApiMoney_1.walletForApi)(repaymentWallet),
                    userWallet: result.userWallet ? (0, walletApiMoney_1.walletForApi)(result.userWallet) : undefined,
                    transaction: repaymentTransaction ? (0, walletApiMoney_1.transactionForApi)(repaymentTransaction) : undefined,
                    repaymentTransaction: repaymentTransaction ? (0, walletApiMoney_1.transactionForApi)(repaymentTransaction) : undefined,
                    settlementTransaction: repaymentTransaction ? (0, walletApiMoney_1.transactionForApi)(repaymentTransaction) : undefined,
                    userTransaction: result.userTransaction ? (0, walletApiMoney_1.transactionForApi)(result.userTransaction) : undefined
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /** @deprecated Use collectToRepayment */
    static async collectToSettlement(req, res, next) {
        return InternalWalletController.collectToRepayment(req, res, next);
    }
    static async chargeMonthlyCustomerBilling(req, res, next) {
        try {
            const { merchantId, appId, amount, amountUnit, description, referenceId, billingPeriod, customerCount, pricePerCustomer, appName } = req.body;
            if (!merchantId?.trim() || !appId?.trim() || !referenceId?.trim() || !billingPeriod?.trim()) {
                res.status(400).json({
                    success: false,
                    error: 'merchantId, appId, referenceId, and billingPeriod are required'
                });
                return;
            }
            const parsedAmount = (0, money_1.requestAmountToKobo)(amount, amountUnit);
            if (!parsedAmount.ok) {
                res.status(400).json({ success: false, error: parsedAmount.error });
                return;
            }
            if (parsedAmount.kobo < 0) {
                res.status(400).json({ success: false, error: 'amount must be a non-negative finite number' });
                return;
            }
            if (typeof customerCount !== 'number' || !Number.isFinite(customerCount) || customerCount < 0) {
                res.status(400).json({ success: false, error: 'customerCount must be a non-negative finite number' });
                return;
            }
            const parsedPrice = (0, money_1.requestAmountToKobo)(pricePerCustomer ?? 0, amountUnit);
            if (!parsedPrice.ok) {
                res.status(400).json({ success: false, error: parsedPrice.error });
                return;
            }
            if (parsedPrice.kobo < 0) {
                res.status(400).json({ success: false, error: 'pricePerCustomer must be a non-negative finite number' });
                return;
            }
            const result = await walletService_1.WalletService.chargeMonthlyCustomerBilling({
                merchantId: merchantId.trim(),
                appId: appId.trim(),
                amount: parsedAmount.kobo,
                description: description?.trim() || 'Monthly platform billing (per customer)',
                referenceId: referenceId.trim(),
                billingPeriod: billingPeriod.trim(),
                customerCount,
                pricePerCustomer: parsedPrice.kobo,
                appName: appName?.trim() || undefined
            });
            if (result.skippedZeroAmount) {
                res.status(200).json({
                    success: true,
                    skipped: true,
                    message: 'No charge — zero customers or zero amount',
                    data: { customerCount, amount: (0, money_1.koboToNaira)(parsedAmount.kobo) }
                });
                return;
            }
            if (result.insufficientFunds) {
                res.status(402).json({
                    success: false,
                    error: result.error || 'Insufficient balance in Billing wallet',
                    code: 'INSUFFICIENT_BILLING_WALLET_BALANCE',
                    data: {
                        wallet: result.wallet ? (0, walletApiMoney_1.walletForApi)(result.wallet) : undefined,
                        fundingInstructions: result.fundingInstructions
                    }
                });
                return;
            }
            if (!result.success) {
                res.status(400).json({ success: false, error: result.error || 'Failed to charge monthly customer billing' });
                return;
            }
            res.status(result.duplicate ? 200 : 201).json({
                success: true,
                duplicate: result.duplicate === true,
                message: result.duplicate
                    ? 'Monthly customer billing already charged for this period'
                    : 'Monthly customer billing charged successfully',
                data: {
                    wallet: result.wallet ? (0, walletApiMoney_1.walletForApi)(result.wallet) : undefined,
                    transaction: result.transaction ? (0, walletApiMoney_1.transactionForApi)(result.transaction) : undefined
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async chargeBusinessKycFee(req, res, next) {
        try {
            const { merchantId, appId, amount, amountUnit, description, referenceId, authUserId } = req.body;
            if (!merchantId?.trim() || !referenceId?.trim()) {
                res.status(400).json({ success: false, error: 'merchantId and referenceId are required' });
                return;
            }
            const parsed = (0, money_1.requestAmountToKobo)(amount, amountUnit);
            if (!parsed.ok) {
                res.status(400).json({ success: false, error: parsed.error });
                return;
            }
            if (parsed.kobo < 0) {
                res.status(400).json({ success: false, error: 'amount must be a non-negative finite number' });
                return;
            }
            const result = await walletService_1.WalletService.chargeBusinessKycFee({
                merchantId: merchantId.trim(),
                appId: appId?.trim() || undefined,
                amount: parsed.kobo,
                description: description?.trim() || 'Business KYC verification fee',
                referenceId: referenceId.trim(),
                authUserId: authUserId?.trim() || undefined
            });
            if (result.skippedZeroAmount) {
                res.status(200).json({
                    success: true,
                    skipped: true,
                    message: 'Business KYC fee is zero — no charge applied'
                });
                return;
            }
            if (result.insufficientFunds) {
                res.status(402).json({
                    success: false,
                    error: result.error || 'Insufficient balance in Billing wallet',
                    code: 'INSUFFICIENT_BILLING_WALLET_BALANCE',
                    data: {
                        wallet: result.wallet ? (0, walletApiMoney_1.walletForApi)(result.wallet) : undefined,
                        fundingInstructions: result.fundingInstructions
                    }
                });
                return;
            }
            if (!result.success) {
                res.status(400).json({ success: false, error: result.error || 'Failed to charge business KYC fee' });
                return;
            }
            res.status(result.duplicate ? 200 : 201).json({
                success: true,
                duplicate: result.duplicate === true,
                message: result.duplicate ? 'Business KYC fee already charged' : 'Business KYC fee charged successfully',
                data: {
                    wallet: result.wallet ? (0, walletApiMoney_1.walletForApi)(result.wallet) : undefined,
                    transaction: result.transaction ? (0, walletApiMoney_1.transactionForApi)(result.transaction) : undefined
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /internal/api/v1/wallets/merchant/:merchantId/type/:walletType?appId=
     * Service-to-service lookup of an app-scoped merchant wallet (includes virtual NUBAN).
     */
    static async getMerchantWalletByType(req, res, next) {
        try {
            const merchantId = String(req.params.merchantId || '').trim();
            const walletTypeRaw = String(req.params.walletType || '').trim();
            const appId = typeof req.query.appId === 'string' ? req.query.appId.trim() : undefined;
            if (!merchantId || !walletTypeRaw) {
                res.status(400).json({ success: false, error: 'merchantId and walletType are required' });
                return;
            }
            const walletType = (0, merchantWalletType_1.normalizeMerchantWalletType)(walletTypeRaw);
            if (!walletType) {
                res.status(400).json({ success: false, error: 'Invalid merchant wallet type' });
                return;
            }
            const result = await walletService_1.WalletService.getMerchantWalletByType(merchantId, walletType, appId || undefined);
            if (!result.success || !result.wallet) {
                res.status(404).json({ success: false, error: result.error || 'Merchant wallet not found' });
                return;
            }
            res.status(200).json({
                success: true,
                data: { wallet: (0, walletApiMoney_1.walletForApi)(result.wallet) }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/savings/deposit-overview
     * Body: { appId: string, recentLimit?: number }
     * Recent completed SAVINGS_DEPOSIT credits for an app (REPAYMENT wallet ledger).
     */
    static async savingsDepositOverview(req, res, next) {
        try {
            const body = req.body;
            const appId = String(body.appId || '').trim();
            if (!appId) {
                res.status(400).json({ success: false, error: 'appId is required' });
                return;
            }
            const recentLimit = Number.isFinite(body.recentLimit) && body.recentLimit > 0
                ? Math.min(body.recentLimit, 20)
                : 5;
            const recentDeposits = await walletService_1.WalletService.listRecentSavingsDepositsForApp(appId, recentLimit);
            res.status(200).json({
                success: true,
                data: { recentDeposits }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/savings/overview
     * Body: { appId: string, recentLimit?: number }
     * Full savings dashboard slice: activity deposits, withdrawals this month, pending requests.
     */
    static async savingsOverview(req, res, next) {
        try {
            const body = req.body;
            const appId = String(body.appId || '').trim();
            if (!appId) {
                res.status(400).json({ success: false, error: 'appId is required' });
                return;
            }
            const recentLimit = Number.isFinite(body.recentLimit) && body.recentLimit > 0
                ? Math.min(body.recentLimit, 20)
                : 5;
            const data = await walletService_1.WalletService.buildSavingsOverviewForApp(appId, recentLimit);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/investment/deposit-overview
     * Body: { appId: string, recentLimit?: number }
     * Recent completed INVESTMENT_DEPOSIT credits for an app (REPAYMENT wallet ledger).
     */
    static async investmentDepositOverview(req, res, next) {
        try {
            const body = req.body;
            const appId = String(body.appId || '').trim();
            if (!appId) {
                res.status(400).json({ success: false, error: 'appId is required' });
                return;
            }
            const recentLimit = Number.isFinite(body.recentLimit) && body.recentLimit > 0
                ? Math.min(body.recentLimit, 20)
                : 5;
            const recentDeposits = await walletService_1.WalletService.listRecentInvestmentDepositsForApp(appId, recentLimit);
            res.status(200).json({
                success: true,
                data: {
                    recentDeposits: recentDeposits.map((d) => ({ ...d, amount: (0, money_1.koboToNaira)(d.amount) }))
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/investment/overview
     * Body: { appId: string, recentLimit?: number }
     * Full investment dashboard slice: deposit activity, pending liquidations, paid-out liquidations.
     */
    static async investmentOverview(req, res, next) {
        try {
            const body = req.body;
            const appId = String(body.appId || '').trim();
            if (!appId) {
                res.status(400).json({ success: false, error: 'appId is required' });
                return;
            }
            const recentLimit = Number.isFinite(body.recentLimit) && body.recentLimit > 0
                ? Math.min(body.recentLimit, 20)
                : 5;
            const data = await walletService_1.WalletService.buildInvestmentOverviewForApp(appId, recentLimit);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/commodity/deposit-overview
     * Body: { appId: string, recentLimit?: number }
     * Recent completed COMMODITY_DEPOSIT credits for an app (REPAYMENT wallet ledger).
     */
    static async commodityDepositOverview(req, res, next) {
        try {
            const body = req.body;
            const appId = String(body.appId || '').trim();
            if (!appId) {
                res.status(400).json({ success: false, error: 'appId is required' });
                return;
            }
            const recentLimit = Number.isFinite(body.recentLimit) && body.recentLimit > 0
                ? Math.min(body.recentLimit, 20)
                : 5;
            const recentDeposits = await walletService_1.WalletService.listRecentCommodityDepositsForApp(appId, recentLimit);
            res.status(200).json({
                success: true,
                data: {
                    recentDeposits: recentDeposits.map((d) => ({ ...d, amount: (0, money_1.koboToNaira)(d.amount) }))
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/wallets/commodity/overview
     * Body: { appId: string, recentLimit?: number }
     * Full commodity dashboard slice: deposit activity, pending liquidations, paid-out liquidations.
     */
    static async commodityOverview(req, res, next) {
        try {
            const body = req.body;
            const appId = String(body.appId || '').trim();
            if (!appId) {
                res.status(400).json({ success: false, error: 'appId is required' });
                return;
            }
            const recentLimit = Number.isFinite(body.recentLimit) && body.recentLimit > 0
                ? Math.min(body.recentLimit, 20)
                : 5;
            const data = await walletService_1.WalletService.buildCommodityOverviewForApp(appId, recentLimit);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.InternalWalletController = InternalWalletController;
//# sourceMappingURL=internalWalletController.js.map