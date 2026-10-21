"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env before reading process.env so config gets values from .env (imports run before index.ts body)
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3004', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wallet_ms',
    // Merchant/user bearer tokens come from client-auth-ms.
    authServiceUrl: process.env.CLIENT_AUTH_SERVICE_URL ||
        process.env.AUTH_SERVICE_URL ||
        'http://localhost:3001',
    complianceServiceUrl: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3003',
    jwtSecret: process.env.JWT_SECRET || 'wallet-service-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    monoBaseUrl: process.env.MONO_BASE_URL || 'https://api.withmono.com',
    monoSecretKey: process.env.MONO_SECRET_KEY || '',
    monoWebhookSecret: process.env.MONO_WEBHOOK_SECRET || process.env.MONO_WEBHOOK_SECRET_KEY || '',
    productServiceUrl: process.env.PRODUCT_SERVICE_URL ||
        (process.env.NODE_ENV === 'production' ? 'https://product-ms-plata.fly.dev' : 'http://localhost:3005'),
    notificationsServiceUrl: process.env.NOTIFICATIONS_SERVICE_URL ||
        (process.env.NODE_ENV === 'production' ? 'https://notifications-ms.fly.dev' : 'http://localhost:4009'),
    treasuryLowBalanceThresholdKobo: (() => {
        const raw = process.env.TREASURY_LOW_BALANCE_THRESHOLD_KOBO;
        if (raw != null && String(raw).trim() !== '') {
            const n = Number(raw);
            if (Number.isFinite(n) && n >= 0)
                return Math.trunc(n);
        }
        // ₦1,000
        return 100000;
    })(),
    treasuryLowBalanceCooldownMs: (() => {
        const raw = process.env.TREASURY_LOW_BALANCE_COOLDOWN_MS;
        if (raw != null && String(raw).trim() !== '') {
            const n = Number(raw);
            if (Number.isFinite(n) && n >= 0)
                return Math.trunc(n);
        }
        return 24 * 60 * 60 * 1000;
    })()
};
//# sourceMappingURL=environment.js.map