"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantBankingConfigModel = void 0;
exports.toMerchantBankingConfig = toMerchantBankingConfig;
const mongoose_1 = __importStar(require("mongoose"));
const BankOneSettingsSchema = new mongoose_1.Schema({
    coreBaseUrl: { type: String, required: true },
    channelsBaseUrl: { type: String, required: false },
    authToken: { type: String, required: true },
    institutionCode: { type: String, required: true },
    productCode: { type: String, required: true },
    accountOfficerCode: { type: String, required: true },
    apiVersion: { type: String, required: true, default: '2' },
    defaultAccountTier: { type: String, required: false },
    defaultGender: { type: String, required: false },
    defaultPlaceOfBirth: { type: String, required: false },
    defaultAddress: { type: String, required: false },
    bankName: { type: String, required: false },
    bankCode: { type: String, required: false }
}, { _id: false });
const MerchantBankingConfigSchema = new mongoose_1.Schema({
    merchantId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, enum: ['bankone', 'payonus'], required: true },
    enabled: { type: Boolean, required: true, default: false },
    fallbackToPayonus: { type: Boolean, required: true, default: true },
    bankone: { type: BankOneSettingsSchema, required: false }
}, { timestamps: true });
exports.MerchantBankingConfigModel = mongoose_1.default.models.MerchantBankingConfig ??
    mongoose_1.default.model('MerchantBankingConfig', MerchantBankingConfigSchema);
function toMerchantBankingConfig(doc) {
    const raw = typeof doc.toObject === 'function'
        ? doc.toObject()
        : { ...doc };
    const id = raw._id?.toString?.() ??
        String(doc._id ?? raw.id ?? '');
    return {
        id,
        merchantId: String(raw.merchantId),
        provider: raw.provider,
        enabled: Boolean(raw.enabled),
        fallbackToPayonus: raw.fallbackToPayonus !== false,
        bankone: raw.bankone,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };
}
//# sourceMappingURL=MerchantBankingConfigModel.js.map