"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processInboundFundingCredit = processInboundFundingCredit;
const walletService_1 = require("./walletService");
const WebhookEventModel_1 = require("../models/WebhookEventModel");
const equityPaymentReference_1 = require("../utils/equityPaymentReference");
const productEquityWebhookService_1 = require("./productEquityWebhookService");
const logger_1 = require("../utils/logger");
const money_1 = require("../utils/money");
const walletApiMoney_1 = require("../utils/walletApiMoney");
/**
 * Shared inbound credit path for PayOnUs webhooks and BankOne poller.
 * Idempotent on (provider, transactionId) via WebhookEventModel.
 */
async function processInboundFundingCredit(input) {
    const transactionId = input.transactionId.trim();
    const amountMajor = Number(input.amount);
    if (!transactionId) {
        return { success: false, error: 'transactionId is required', statusCode: 400 };
    }
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
        return { success: false, error: 'amount must be a positive number', statusCode: 400 };
    }
    if (!input.walletId?.trim()) {
        return { success: false, error: 'walletId is required', statusCode: 400 };
    }
    const amountKobo = input.amountUnit === 'kobo' ? Math.trunc(amountMajor) : (0, money_1.nairaToKobo)(amountMajor);
    if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
        return { success: false, error: 'amount must resolve to a positive integer kobo', statusCode: 400 };
    }
    const duplicateFilter = { provider: input.provider, transactionId };
    const alreadySeen = await WebhookEventModel_1.WebhookEventModel.findOne(duplicateFilter).lean();
    if (alreadySeen && alreadySeen.status === 'processed') {
        return { success: true, duplicate: true };
    }
    await WebhookEventModel_1.WebhookEventModel.findOneAndUpdate(duplicateFilter, {
        $setOnInsert: {
            provider: input.provider,
            transactionId,
            status: 'received',
            payload: input.payload || {
                amount: amountMajor,
                walletId: input.walletId,
                accountNumber: input.accountNumber,
                narration: input.narration
            }
        }
    }, { upsert: true, new: true });
    const equityApplicationId = (0, equityPaymentReference_1.parseEquityPaymentApplicationId)(input.merchantReference || input.narration || input.description);
    if (equityApplicationId) {
        const equityResult = await (0, productEquityWebhookService_1.forwardExternalEquityPaymentToProductMs)({
            applicationId: equityApplicationId,
            amount: amountMajor,
            currency: input.currency || 'NGN',
            providerReference: transactionId,
            merchantId: input.merchantId,
            appId: input.appId
        });
        if (!equityResult.success) {
            await WebhookEventModel_1.WebhookEventModel.updateOne(duplicateFilter, {
                $set: { status: 'failed', error: equityResult.error || 'equity forward failed' }
            });
            return {
                success: false,
                error: equityResult.error || 'Failed to record external equity payment',
                statusCode: equityResult.status && equityResult.status >= 400 && equityResult.status < 600
                    ? equityResult.status
                    : 502
            };
        }
        await WebhookEventModel_1.WebhookEventModel.updateOne(duplicateFilter, {
            $set: { status: 'processed', processedAt: new Date() }
        });
        return {
            success: true,
            duplicate: equityResult.duplicate === true,
            data: { applicationId: equityApplicationId, amount: amountMajor, transactionId }
        };
    }
    const description = input.description ||
        input.narration ||
        `Inbound credit via ${input.provider} (${transactionId})`;
    const result = await walletService_1.WalletService.updateWalletBalance(input.walletId, amountKobo, description);
    if (!result.success) {
        logger_1.logger.error('Inbound funding credit failed', {
            provider: input.provider,
            walletId: input.walletId,
            transactionId,
            error: result.error
        });
        await WebhookEventModel_1.WebhookEventModel.updateOne(duplicateFilter, {
            $set: { status: 'failed', error: result.error || 'credit failed' }
        });
        return { success: false, error: result.error || 'Failed to credit wallet', statusCode: 500 };
    }
    await WebhookEventModel_1.WebhookEventModel.updateOne(duplicateFilter, {
        $set: { status: 'processed', processedAt: new Date() }
    });
    logger_1.logger.info('Inbound funding credit applied', {
        provider: input.provider,
        walletId: input.walletId,
        transactionId,
        amountKobo
    });
    const apiWallet = result.wallet ? (0, walletApiMoney_1.walletForApi)(result.wallet) : undefined;
    return {
        success: true,
        data: {
            walletId: input.walletId,
            amount: amountMajor,
            amountKobo,
            transactionId,
            newMainBalance: apiWallet?.mainBalance,
            newLedgerBalance: apiWallet?.ledgerBalance
        }
    };
}
//# sourceMappingURL=inboundFundingService.js.map