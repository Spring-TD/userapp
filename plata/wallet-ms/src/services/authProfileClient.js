"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWalletContact = fetchWalletContact;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
function internalHeaders() {
    return { 'X-Internal-Token': (environment_1.config.jwtSecret || '').trim() };
}
async function fetchWalletContact(identifier) {
    const base = environment_1.config.authServiceUrl.trim();
    const token = (environment_1.config.jwtSecret || '').trim();
    if (!base || !token || !identifier.trim())
        return undefined;
    try {
        const res = await axios_1.default.get(`${base}/internal/api/v1/users/${encodeURIComponent(identifier.trim())}/contact`, { headers: internalHeaders(), timeout: 10000, validateStatus: () => true });
        if (res.status >= 200 && res.status < 300 && res.data?.success && res.data.data) {
            return res.data.data;
        }
    }
    catch (error) {
        logger_1.logger.warn('Wallet contact lookup failed', {
            identifier,
            message: error instanceof Error ? error.message : String(error)
        });
    }
    return undefined;
}
//# sourceMappingURL=authProfileClient.js.map