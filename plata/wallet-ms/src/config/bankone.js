"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankoneConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function parseBool(value, defaultValue) {
    if (value === undefined || value === '')
        return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized))
        return true;
    if (['0', 'false', 'no', 'off'].includes(normalized))
        return false;
    return defaultValue;
}
function parsePositiveInt(value, defaultValue) {
    const n = Number.parseInt(value || '', 10);
    return Number.isFinite(n) && n > 0 ? n : defaultValue;
}
exports.bankoneConfig = {
    /** Background GetTransactions poller for bankone-provisioned user wallets. */
    creditPollerEnabled: parseBool(process.env.BANKONE_CREDIT_POLLER_ENABLED, true),
    creditPollerIntervalMs: parsePositiveInt(process.env.BANKONE_CREDIT_POLLER_INTERVAL_MS, 60000),
    /** Rolling lookback window for GetTransactions. */
    creditPollerLookbackDays: parsePositiveInt(process.env.BANKONE_CREDIT_POLLER_LOOKBACK_DAYS, 3),
    creditPollerBatchSize: parsePositiveInt(process.env.BANKONE_CREDIT_POLLER_BATCH_SIZE, 50),
    httpTimeoutMs: parsePositiveInt(process.env.BANKONE_HTTP_TIMEOUT_MS, 30000),
    /**
     * Shared secret Charis/BankOne must send on activity webhooks
     * (`X-BankOne-Webhook-Token`, `Authorization: Bearer`, or `?authToken=`).
     * Alias: CHARIS_WEBHOOK_TOKEN.
     */
    webhookToken: (process.env.BANKONE_WEBHOOK_TOKEN ||
        process.env.CHARIS_WEBHOOK_TOKEN ||
        '').trim(),
    /** Reject webhooks when token is missing/invalid (default true when token is set). */
    webhookEnforceToken: parseBool(process.env.BANKONE_WEBHOOK_ENFORCE_TOKEN, true)
};
//# sourceMappingURL=bankone.js.map