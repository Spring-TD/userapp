"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonoDirectDebitController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const environment_1 = require("../config/environment");
const monoDirectDebitService_1 = require("../services/monoDirectDebitService");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const MONO_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
function timingSafeCompareHex(left, right) {
    if (!left || !right || left.length !== right.length)
        return false;
    return crypto_1.default.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}
function parseMonoSignature(header) {
    return header.split(',').reduce((acc, part) => {
        const [key, value] = part.split('=');
        if (key === 't' && value)
            acc.timestamp = value;
        if (key === 'v1' && value)
            acc.signature = value;
        return acc;
    }, {});
}
function verifyMonoWebhook(req) {
    const configured = environment_1.config.monoWebhookSecret.trim();
    if (!configured)
        return true;
    const headerSecret = req.header('mono-webhook-secret')?.trim();
    if (headerSecret) {
        if (headerSecret.length !== configured.length)
            return false;
        if (!crypto_1.default.timingSafeEqual(Buffer.from(headerSecret), Buffer.from(configured)))
            return false;
    }
    const signatureHeader = req.header('Mono-Signature') || req.header('mono-signature');
    if (!signatureHeader || !req.rawBody)
        return false;
    const { timestamp, signature } = parseMonoSignature(signatureHeader);
    if (!timestamp || !signature)
        return false;
    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds))
        return false;
    const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
    if (ageSeconds > MONO_SIGNATURE_TOLERANCE_SECONDS)
        return false;
    const signedPayload = Buffer.concat([
        Buffer.from(`${timestamp}.`, 'utf8'),
        req.rawBody
    ]);
    const expected = crypto_1.default
        .createHmac('sha256', configured)
        .update(signedPayload)
        .digest('hex');
    return timingSafeCompareHex(expected, signature);
}
function ensureMerchantScope(req, merchantId) {
    const tokenMerchantId = req.user?.merchantId;
    return !tokenMerchantId || tokenMerchantId === merchantId;
}
class MonoDirectDebitController {
    static async createMandate(req, res, next) {
        try {
            const { error, value } = (0, validation_1.validateInput)(validation_1.createMonoDirectDebitMandateSchema, req.body);
            if (error || !value) {
                res.status(400).json({ success: false, error: error || 'Validation failed' });
                return;
            }
            if (!ensureMerchantScope(req, value.merchantId)) {
                res.status(403).json({ success: false, error: 'Cannot create mandate for another merchant' });
                return;
            }
            const mandate = await monoDirectDebitService_1.monoDirectDebitService.createMandate(value);
            res.status(201).json({
                success: true,
                message: 'Mono Direct Debit mandate initiated',
                data: mandate
            });
        }
        catch (error) {
            logger_1.logger.error('Mono Direct Debit mandate creation failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            next(error);
        }
    }
    static async balanceInquiry(req, res, next) {
        try {
            const { error, value } = (0, validation_1.validateInput)(validation_1.monoBalanceInquirySchema, req.query);
            if (error || !value) {
                res.status(400).json({ success: false, error: error || 'Validation failed' });
                return;
            }
            const result = await monoDirectDebitService_1.monoDirectDebitService.balanceInquiry(req.params.mandateId, value.amountKobo);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async initiateDebit(req, res, next) {
        try {
            const { error, value } = (0, validation_1.validateInput)(validation_1.initiateMonoDirectDebitSchema, req.body);
            if (error || !value) {
                res.status(400).json({ success: false, error: error || 'Validation failed' });
                return;
            }
            const attempt = await monoDirectDebitService_1.monoDirectDebitService.initiateDebit(req.params.mandateId, value);
            res.status(201).json({
                success: true,
                message: 'Mono Direct Debit initiated',
                data: attempt
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async webhook(req, res, next) {
        try {
            if (!verifyMonoWebhook(req)) {
                res.status(401).json({ success: false, error: 'Invalid Mono webhook signature' });
                return;
            }
            const result = await monoDirectDebitService_1.monoDirectDebitService.processWebhook(req.body);
            res.status(200).json({
                success: true,
                ...result
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.MonoDirectDebitController = MonoDirectDebitController;
//# sourceMappingURL=monoDirectDebitController.js.map