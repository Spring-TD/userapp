"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEquityPaymentApplicationId = parseEquityPaymentApplicationId;
const EQUITY_PAYMENT_REF_PREFIX = 'equity-payment:';
function parseEquityPaymentApplicationId(merchantReference) {
    if (!merchantReference)
        return undefined;
    const trimmed = merchantReference.trim();
    const lower = trimmed.toLowerCase();
    if (!lower.startsWith(EQUITY_PAYMENT_REF_PREFIX)) {
        return undefined;
    }
    const applicationId = trimmed.slice(EQUITY_PAYMENT_REF_PREFIX.length).trim();
    return applicationId || undefined;
}
//# sourceMappingURL=equityPaymentReference.js.map