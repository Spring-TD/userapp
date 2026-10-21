"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payonusWebhookConfig = void 0;
const Wallet_1 = require("../models/Wallet");
const merchantWalletType_1 = require("../utils/merchantWalletType");
function truthyEnv(v) {
    if (!v)
        return false;
    const s = v.trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes';
}
exports.payonusWebhookConfig = {
    enabled: truthyEnv(process.env.PAYONUS_WEBHOOK_ENABLED || 'true'),
    verificationKey: process.env.PAYONUS_WEBHOOK_VERIFICATION_KEY || '',
    enforceSignature: truthyEnv(process.env.PAYONUS_WEBHOOK_ENFORCE_SIGNATURE || 'true'),
    defaultMerchantWalletType: (0, merchantWalletType_1.normalizeMerchantWalletType)(process.env.PAYONUS_DEFAULT_MERCHANT_WALLET_TYPE) ??
        Wallet_1.MerchantWalletType.REPAYMENT
};
//# sourceMappingURL=payonusWebhook.js.map