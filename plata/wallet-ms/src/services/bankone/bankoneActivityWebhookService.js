"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractBankOneWebhookToken = extractBankOneWebhookToken;
exports.verifyBankOneWebhookToken = verifyBankOneWebhookToken;
exports.normalizeBankOneActivityEventType = normalizeBankOneActivityEventType;
exports.processBankOneActivityWebhook = processBankOneActivityWebhook;
const crypto_1 = __importDefault(require("crypto"));
const walletService_1 = require("../walletService");
const inboundFundingService_1 = require("../inboundFundingService");
const WebhookEventModel_1 = require("../../models/WebhookEventModel");
const logger_1 = require("../../utils/logger");
const money_1 = require("../../utils/money");
const walletApiMoney_1 = require("../../utils/walletApiMoney");
function asRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    return value;
}
function firstString(obj, keys) {
    for (const key of keys) {
        const v = obj[key];
        if (typeof v === 'string' && v.trim())
            return v.trim();
        if (typeof v === 'number' && Number.isFinite(v))
            return String(v);
    }
    return undefined;
}
function firstNumber(obj, keys) {
    for (const key of keys) {
        const v = obj[key];
        if (typeof v === 'number' && Number.isFinite(v))
            return v;
        if (typeof v === 'string' && v.trim()) {
            const n = Number(v.replace(/,/g, ''));
            if (Number.isFinite(n))
                return n;
        }
    }
    return undefined;
}
function timingSafeEqualString(a, b) {
    const left = Buffer.from(a, 'utf8');
    const right = Buffer.from(b, 'utf8');
    if (left.length !== right.length)
        return false;
    return crypto_1.default.timingSafeEqual(left, right);
}
function extractBankOneWebhookToken(input) {
    const header = (name) => {
        const raw = input.headers[name] ?? input.headers[name.toLowerCase()];
        if (Array.isArray(raw))
            return raw[0]?.trim() || undefined;
        return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
    };
    const direct = header('x-bankone-webhook-token') ||
        header('x-charis-webhook-token') ||
        header('x-webhook-token');
    if (direct)
        return direct;
    const auth = header('authorization');
    if (auth) {
        const match = auth.match(/^Bearer\s+(.+)$/i);
        if (match?.[1]?.trim())
            return match[1].trim();
    }
    const queryToken = input.query?.authToken ?? input.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim())
        return queryToken.trim();
    return undefined;
}
function verifyBankOneWebhookToken(expected, provided, enforce) {
    if (!expected)
        return !enforce;
    if (!provided)
        return !enforce;
    return timingSafeEqualString(expected, provided);
}
function normalizeBankOneActivityEventType(raw) {
    const value = (raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if ([
        'account.created',
        'account_created',
        'nuban.created',
        'nuban_created',
        'virtual_account.created',
        'virtual_account_created',
        'accountopening',
        'account_opening',
        'createaccount',
        'create_account'
    ].includes(value) ||
        (value.includes('account') && value.includes('creat'))) {
        return 'account.created';
    }
    if (['credit', 'inbound', 'deposit', 'funding', 'credit_alert', 'creditalert'].includes(value) ||
        value.includes('credit')) {
        return 'credit';
    }
    if (['debit', 'withdrawal', 'outbound', 'debit_alert', 'debitalert'].includes(value) ||
        value.includes('debit')) {
        return 'debit';
    }
    return 'other';
}
function resolveEventId(payload, eventType) {
    const explicit = firstString(payload, [
        'eventId',
        'EventId',
        'id',
        'Id',
        'transactionId',
        'TransactionId',
        'transactionReference',
        'TransactionReference',
        'reference',
        'Reference',
        'providerReference',
        'ProviderReference'
    ]);
    if (explicit)
        return explicit;
    const accountNumber = firstString(payload, [
        'accountNumber',
        'AccountNumber',
        'nuban',
        'NUBAN',
        'virtualAccountNumber',
        'VirtualAccountNumber'
    ]) || 'unknown';
    const stamp = firstString(payload, ['timestamp', 'Timestamp', 'transactionDate', 'TransactionDate']) ||
        new Date().toISOString();
    return `${eventType}:${accountNumber}:${stamp}`;
}
async function recordAcknowledgedEvent(input) {
    const duplicateFilter = { provider: 'bankone', transactionId: input.eventId };
    const alreadySeen = await WebhookEventModel_1.WebhookEventModel.findOne(duplicateFilter).lean();
    if (alreadySeen && alreadySeen.status === 'processed') {
        return { duplicate: true };
    }
    await WebhookEventModel_1.WebhookEventModel.findOneAndUpdate(duplicateFilter, {
        $setOnInsert: {
            provider: 'bankone',
            transactionId: input.eventId,
            status: 'received',
            payload: { eventType: input.eventType, ...input.payload }
        }
    }, { upsert: true, new: true });
    await WebhookEventModel_1.WebhookEventModel.updateOne(duplicateFilter, {
        $set: { status: 'processed', processedAt: new Date() }
    });
    return { duplicate: false };
}
async function processDebit(input) {
    const duplicateFilter = { provider: 'bankone', transactionId: input.eventId };
    const alreadySeen = await WebhookEventModel_1.WebhookEventModel.findOne(duplicateFilter).lean();
    if (alreadySeen && alreadySeen.status === 'processed') {
        return { success: true, duplicate: true, eventType: 'debit' };
    }
    await WebhookEventModel_1.WebhookEventModel.findOneAndUpdate(duplicateFilter, {
        $setOnInsert: {
            provider: 'bankone',
            transactionId: input.eventId,
            status: 'received',
            payload: input.payload
        }
    }, { upsert: true, new: true });
    const result = await walletService_1.WalletService.updateWalletBalance(input.walletId, -(0, money_1.nairaToKobo)(Math.abs(input.amount)), input.description);
    if (!result.success) {
        await WebhookEventModel_1.WebhookEventModel.updateOne(duplicateFilter, {
            $set: { status: 'failed', error: result.error || 'debit failed' }
        });
        return {
            success: false,
            eventType: 'debit',
            error: result.error || 'Failed to debit wallet',
            statusCode: 500
        };
    }
    await WebhookEventModel_1.WebhookEventModel.updateOne(duplicateFilter, {
        $set: { status: 'processed', processedAt: new Date() }
    });
    const apiWallet = result.wallet ? (0, walletApiMoney_1.walletForApi)(result.wallet) : undefined;
    return {
        success: true,
        eventType: 'debit',
        data: {
            walletId: input.walletId,
            amount: Math.abs(input.amount),
            transactionId: input.eventId,
            newMainBalance: apiWallet?.mainBalance,
            newLedgerBalance: apiWallet?.ledgerBalance
        }
    };
}
/**
 * Process Charis/BankOne activity push webhooks (account create, credit, debit, other).
 * Credits reuse the shared inbound funding path (idempotent + equity routing).
 */
async function processBankOneActivityWebhook(body) {
    const payload = asRecord(body) || {};
    const nested = asRecord(payload.data) || asRecord(payload.Data) || {};
    const merged = { ...nested, ...payload };
    const eventType = normalizeBankOneActivityEventType(firstString(merged, [
        'eventType',
        'EventType',
        'event',
        'Event',
        'type',
        'Type',
        'activityType',
        'ActivityType',
        'notificationType',
        'NotificationType'
    ]));
    const eventId = resolveEventId(merged, eventType);
    const accountNumber = firstString(merged, [
        'accountNumber',
        'AccountNumber',
        'nuban',
        'NUBAN',
        'virtualAccountNumber',
        'VirtualAccountNumber',
        'virtual_account_number'
    ]);
    const amount = firstNumber(merged, [
        'amount',
        'Amount',
        'transactionAmount',
        'TransactionAmount',
        'creditAmount',
        'CreditAmount',
        'debitAmount',
        'DebitAmount'
    ]);
    const currency = firstString(merged, ['currency', 'Currency', 'currencyCode', 'CurrencyCode']) || 'NGN';
    const narration = firstString(merged, [
        'narration',
        'Narration',
        'description',
        'Description',
        'remarks',
        'Remarks',
        'merchantReference',
        'MerchantReference'
    ]);
    logger_1.logger.info('BankOne activity webhook received', {
        eventType,
        eventId,
        accountNumber,
        amount
    });
    if (eventType === 'account.created' || eventType === 'other') {
        const ack = await recordAcknowledgedEvent({ eventId, eventType, payload: merged });
        let walletMatched = false;
        if (accountNumber) {
            const lookup = await walletService_1.WalletService.getWalletByVirtualAccountNumber(accountNumber);
            walletMatched = Boolean(lookup.success && lookup.wallet);
        }
        return {
            success: true,
            duplicate: ack.duplicate,
            acknowledged: true,
            eventType,
            data: { eventId, accountNumber, walletMatched }
        };
    }
    if (!accountNumber) {
        return {
            success: false,
            eventType,
            error: 'accountNumber is required for credit/debit events',
            statusCode: 400
        };
    }
    if (amount === undefined || !Number.isFinite(amount) || amount === 0) {
        return {
            success: false,
            eventType,
            error: 'amount must be a non-zero number for credit/debit events',
            statusCode: 400
        };
    }
    const walletLookup = await walletService_1.WalletService.getWalletByVirtualAccountNumber(accountNumber);
    if (!walletLookup.success || !walletLookup.wallet) {
        return {
            success: false,
            eventType,
            error: 'Wallet not found for account number',
            statusCode: 404
        };
    }
    const wallet = walletLookup.wallet;
    if (eventType === 'credit') {
        const credit = await (0, inboundFundingService_1.processInboundFundingCredit)({
            provider: 'bankone',
            transactionId: eventId,
            amount: Math.abs(amount),
            currency,
            walletId: wallet.id,
            userId: wallet.walletType === 'USER' ? wallet.userId : undefined,
            merchantId: wallet.merchantId,
            appId: wallet.walletType === 'MERCHANT' ? wallet.appId : undefined,
            narration,
            description: narration || `BankOne credit (${eventId})`,
            merchantReference: narration,
            accountNumber,
            payload: merged
        });
        return {
            success: credit.success,
            duplicate: credit.duplicate,
            eventType: 'credit',
            error: credit.error,
            statusCode: credit.statusCode,
            data: credit.data
        };
    }
    return processDebit({
        eventId,
        amount: Math.abs(amount),
        walletId: wallet.id,
        description: narration || `BankOne debit (${eventId})`,
        payload: merged
    });
}
//# sourceMappingURL=bankoneActivityWebhookService.js.map