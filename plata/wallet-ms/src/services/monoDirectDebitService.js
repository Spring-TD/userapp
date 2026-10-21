"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monoDirectDebitService = exports.MonoDirectDebitService = void 0;
const walletService_1 = require("./walletService");
const MonoDirectDebitAttemptModel_1 = require("../models/MonoDirectDebitAttemptModel");
const MonoDirectDebitMandateModel_1 = require("../models/MonoDirectDebitMandateModel");
const WebhookEventModel_1 = require("../models/WebhookEventModel");
const logger_1 = require("../utils/logger");
const monoDirectDebitClient_1 = require("./monoDirectDebitClient");
function generateReference(prefix) {
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `${prefix}-${Date.now()}-${random}`;
}
function asRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function readString(obj, keys) {
    for (const key of keys) {
        const value = obj[key];
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return undefined;
}
function readNumber(obj, keys) {
    for (const key of keys) {
        const value = obj[key];
        if (typeof value === 'number' && Number.isFinite(value))
            return value;
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number(value);
            if (Number.isFinite(parsed))
                return parsed;
        }
    }
    return undefined;
}
function mapMandateStatus(event, providerStatus) {
    const lowerEvent = event.toLowerCase();
    const lowerStatus = (providerStatus ?? '').toLowerCase();
    if (lowerEvent.includes('ready'))
        return 'ready';
    if (lowerEvent.includes('approved') || lowerStatus === 'approved')
        return 'approved';
    if (lowerEvent.includes('created'))
        return 'created';
    if (lowerEvent.includes('rejected'))
        return 'rejected';
    if (lowerEvent.includes('paused'))
        return 'paused';
    if (lowerEvent.includes('cancelled') || lowerEvent.includes('canceled'))
        return 'cancelled';
    if (lowerEvent.includes('expired'))
        return 'expired';
    if (lowerEvent.includes('failed'))
        return 'failed';
    return 'initiated';
}
function mapDebitStatus(event, providerStatus) {
    const lowerEvent = event.toLowerCase();
    const lowerStatus = (providerStatus ?? '').toLowerCase();
    if (lowerEvent.includes('success') || lowerStatus === 'successful' || lowerStatus === 'success')
        return 'successful';
    if (lowerEvent.includes('fail') || lowerStatus === 'failed')
        return 'failed';
    if (lowerEvent.includes('cancel'))
        return 'cancelled';
    if (lowerEvent.includes('processing') || lowerStatus === 'processing' || lowerStatus === 'pending')
        return 'processing';
    return 'processing';
}
class MonoDirectDebitService {
    constructor(monoClient = monoDirectDebitClient_1.monoDirectDebitClient) {
        this.monoClient = monoClient;
    }
    async createMandate(input) {
        const reference = input.reference?.trim() || generateReference('MDD-MANDATE');
        const normalized = {
            ...input,
            reference,
            mandateType: input.mandateType ?? 'emandate',
            feeBearer: input.feeBearer ?? 'business'
        };
        const providerResult = input.useHostedLink === false
            ? await this.monoClient.createMandate(normalized)
            : await this.monoClient.initiateMandate(normalized);
        const providerStatus = providerResult.status?.toLowerCase();
        const status = providerResult.readyToDebit === true
            ? 'ready'
            : providerStatus === 'approved'
                ? 'approved'
                : providerResult.monoMandateId
                    ? 'created'
                    : 'initiated';
        const doc = await MonoDirectDebitMandateModel_1.MonoDirectDebitMandateModel.create({
            applicationId: input.applicationId,
            userId: input.userId,
            merchantId: input.merchantId,
            debitType: input.debitType,
            mandateType: normalized.mandateType,
            amountKobo: input.amountKobo,
            reference,
            status,
            readyToDebit: providerResult.readyToDebit === true || status === 'ready',
            monoMandateId: providerResult.monoMandateId,
            monoUrl: providerResult.monoUrl,
            nibssCode: providerResult.nibssCode,
            accountName: providerResult.accountName ?? input.accountName,
            accountNumber: input.accountNumber,
            bankCode: input.bankCode,
            bankName: providerResult.bankName ?? input.bankName,
            customer: input.customer,
            description: input.description,
            startDate: input.startDate,
            endDate: input.endDate,
            feeBearer: normalized.feeBearer,
            redirectUrl: input.redirectUrl,
            schedule: input.schedule,
            meta: input.meta,
            rawMonoResponse: providerResult.rawResponse
        });
        return (0, MonoDirectDebitMandateModel_1.toMonoDirectDebitMandate)(doc);
    }
    async balanceInquiry(mandateId, amountKobo) {
        const mandate = await this.getMandateOrThrow(mandateId);
        if (!mandate.monoMandateId) {
            throw new Error('Mandate does not have a Mono mandate id yet');
        }
        return this.monoClient.balanceInquiry(mandate.id, mandate.monoMandateId, amountKobo);
    }
    async initiateDebit(mandateId, input) {
        const mandate = await this.getMandateOrThrow(mandateId);
        if (mandate.debitType !== 'variable') {
            throw new Error('Manual debit is only available for variable Mono mandates. Fixed mandates debit on their preset schedule.');
        }
        if (!mandate.readyToDebit || mandate.status !== 'ready') {
            throw new Error('Mandate is not ready to debit yet');
        }
        if (!mandate.monoMandateId) {
            throw new Error('Mandate does not have a Mono mandate id yet');
        }
        const reference = input.reference?.trim() || generateReference('MDD-DEBIT');
        const balanceInquiry = input.checkBalance === true
            ? await this.monoClient.balanceInquiry(mandate.id, mandate.monoMandateId, input.amountKobo)
            : undefined;
        const providerResult = await this.monoClient.debit(mandate.monoMandateId, {
            ...input,
            reference
        });
        const doc = await MonoDirectDebitAttemptModel_1.MonoDirectDebitAttemptModel.create({
            mandateId: mandate.id,
            monoMandateId: mandate.monoMandateId,
            applicationId: mandate.applicationId,
            userId: mandate.userId,
            merchantId: mandate.merchantId,
            amountKobo: input.amountKobo,
            reference,
            narration: input.narration,
            status: mapDebitStatus('', providerResult.status),
            feeBearer: input.feeBearer ?? 'business',
            beneficiary: input.beneficiary,
            balanceInquiry,
            rawMonoResponse: providerResult.rawResponse
        });
        return (0, MonoDirectDebitAttemptModel_1.toMonoDirectDebitAttempt)(doc);
    }
    async processWebhook(payload) {
        const event = payload.event ?? '';
        const eventId = payload.event_id || generateReference('MDD-WEBHOOK');
        const existing = await WebhookEventModel_1.WebhookEventModel.findOne({ provider: 'mono-direct-debit', transactionId: eventId }).lean();
        if (existing?.status === 'processed') {
            return { event, processed: true, duplicate: true };
        }
        await WebhookEventModel_1.WebhookEventModel.findOneAndUpdate({ provider: 'mono-direct-debit', transactionId: eventId }, {
            $setOnInsert: {
                provider: 'mono-direct-debit',
                transactionId: eventId,
                status: 'received',
                payload: payload
            }
        }, { upsert: true });
        try {
            if (event.startsWith('events.mandates.debit')) {
                await this.processDebitWebhook(event, payload);
            }
            else if (event.startsWith('events.mandates.')) {
                await this.processMandateWebhook(event, payload);
            }
            await WebhookEventModel_1.WebhookEventModel.updateOne({ provider: 'mono-direct-debit', transactionId: eventId }, { $set: { status: 'processed', processedAt: new Date() } });
            return { event, processed: true };
        }
        catch (error) {
            await WebhookEventModel_1.WebhookEventModel.updateOne({ provider: 'mono-direct-debit', transactionId: eventId }, { $set: { status: 'failed', error: error instanceof Error ? error.message : 'Webhook failed' } });
            throw error;
        }
    }
    async getMandateOrThrow(mandateId) {
        const doc = await MonoDirectDebitMandateModel_1.MonoDirectDebitMandateModel.findById(mandateId);
        if (!doc)
            throw new Error('Mono mandate not found');
        return (0, MonoDirectDebitMandateModel_1.toMonoDirectDebitMandate)(doc);
    }
    async processMandateWebhook(event, payload) {
        const data = asRecord(payload.data);
        const monoMandateId = readString(data, ['id', 'mandate_id']);
        const reference = readString(data, ['reference']);
        if (!monoMandateId && !reference) {
            logger_1.logger.warn('Mono mandate webhook missing mandate id/reference', { event });
            return;
        }
        const status = mapMandateStatus(event, readString(data, ['status']));
        const update = {
            status,
            readyToDebit: status === 'ready' || data.ready_to_debit === true,
            rawMonoResponse: payload
        };
        if (monoMandateId)
            update.monoMandateId = monoMandateId;
        const nibssCode = readString(data, ['nibss_code']);
        if (nibssCode)
            update.nibssCode = nibssCode;
        const monoUrl = readString(data, ['mono_url']);
        if (monoUrl)
            update.monoUrl = monoUrl;
        const accountName = readString(data, ['account_name']);
        if (accountName)
            update.accountName = accountName;
        const bankName = readString(data, ['bank', 'bank_name']);
        if (bankName)
            update.bankName = bankName;
        await MonoDirectDebitMandateModel_1.MonoDirectDebitMandateModel.findOneAndUpdate(monoMandateId ? { monoMandateId } : { reference }, { $set: update }, { new: true });
    }
    async processDebitWebhook(event, payload) {
        const data = asRecord(payload.data);
        const reference = readString(data, ['reference', 'transaction_reference']);
        const monoMandateId = readString(data, ['mandate_id', 'id']);
        if (!reference && !monoMandateId) {
            logger_1.logger.warn('Mono debit webhook missing reference/mandate id', { event });
            return;
        }
        const status = mapDebitStatus(event, readString(data, ['status']));
        const amountKobo = readNumber(data, ['amount']);
        const update = {
            status,
            rawWebhookPayload: payload
        };
        const failureReason = readString(data, ['failure_reason', 'message', 'reason']);
        if (failureReason && status === 'failed')
            update.failureReason = failureReason;
        let attempt = await MonoDirectDebitAttemptModel_1.MonoDirectDebitAttemptModel.findOneAndUpdate(reference ? { reference } : { monoMandateId }, { $set: update }, { new: true });
        if (!attempt && monoMandateId && amountKobo && reference) {
            const mandate = await MonoDirectDebitMandateModel_1.MonoDirectDebitMandateModel.findOne({ monoMandateId }).lean();
            if (mandate) {
                attempt = await MonoDirectDebitAttemptModel_1.MonoDirectDebitAttemptModel.create({
                    mandateId: String(mandate._id),
                    monoMandateId,
                    applicationId: mandate.applicationId,
                    userId: mandate.userId,
                    merchantId: mandate.merchantId,
                    amountKobo,
                    reference,
                    narration: readString(data, ['narration', 'description']) ?? 'Mono fixed mandate debit',
                    status,
                    rawWebhookPayload: payload
                });
            }
        }
        if (attempt && status === 'successful') {
            await this.creditRepaymentWallet((0, MonoDirectDebitAttemptModel_1.toMonoDirectDebitAttempt)(attempt));
        }
    }
    async creditRepaymentWallet(attempt) {
        const result = await walletService_1.WalletService.collectToRepayment({
            merchantId: attempt.merchantId,
            userId: attempt.userId,
            amount: attempt.amountKobo,
            referenceId: attempt.reference,
            source: 'mono-direct-debit',
            category: 'LOAN_REPAYMENT',
            description: `Loan repayment via Mono Direct Debit (${attempt.reference})`,
            applicationId: attempt.applicationId,
            debitUserWallet: false,
            metadata: {
                monoMandateId: attempt.monoMandateId,
                mandateId: attempt.mandateId
            }
        });
        if (!result.success) {
            logger_1.logger.error('Failed to credit repayment wallet for Mono repayment', {
                merchantId: attempt.merchantId,
                reference: attempt.reference,
                error: result.error
            });
        }
    }
    /** @deprecated Use creditRepaymentWallet */
    async creditSettlementForRepayment(attempt) {
        await this.creditRepaymentWallet(attempt);
    }
    /** @deprecated Use creditRepaymentWallet */
    async creditTreasuryForRepayment(attempt) {
        await this.creditRepaymentWallet(attempt);
    }
}
exports.MonoDirectDebitService = MonoDirectDebitService;
exports.monoDirectDebitService = new MonoDirectDebitService();
//# sourceMappingURL=monoDirectDebitService.js.map