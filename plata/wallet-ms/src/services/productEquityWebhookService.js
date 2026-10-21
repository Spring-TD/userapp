"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forwardExternalEquityPaymentToProductMs = forwardExternalEquityPaymentToProductMs;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
async function forwardExternalEquityPaymentToProductMs(input) {
    const baseUrl = environment_1.config.productServiceUrl.replace(/\/+$/, '');
    if (!baseUrl) {
        return { success: false, error: 'PRODUCT_SERVICE_URL is not configured' };
    }
    try {
        const response = await axios_1.default.post(`${baseUrl}/api/v1/products/applications/internal/equity-payment-webhook`, {
            applicationId: input.applicationId,
            amount: input.amount,
            currency: input.currency,
            providerReference: input.providerReference,
            merchantId: input.merchantId,
            appId: input.appId
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Token': environment_1.config.jwtSecret
            },
            timeout: 30000,
            validateStatus: () => true
        });
        if (response.status >= 200 && response.status < 300 && response.data?.success) {
            return { success: true, duplicate: response.data.duplicate === true, status: response.status };
        }
        return {
            success: false,
            error: response.data?.error || `product-ms returned HTTP ${response.status}`,
            status: response.status
        };
    }
    catch (error) {
        const message = axios_1.default.isAxiosError(error) ? error.message : 'product-ms unavailable';
        logger_1.logger.error('Failed to forward external equity payment to product-ms', { error: message, input });
        return { success: false, error: message };
    }
}
//# sourceMappingURL=productEquityWebhookService.js.map