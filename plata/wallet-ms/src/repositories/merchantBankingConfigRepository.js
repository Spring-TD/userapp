"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getByMerchantId = getByMerchantId;
exports.listEnabledBankOneConfigs = listEnabledBankOneConfigs;
exports.toPublicConfig = toPublicConfig;
exports.getDecryptedBankOneConfig = getDecryptedBankOneConfig;
exports.upsert = upsert;
exports.isBankOneEnabledForMerchant = isBankOneEnabledForMerchant;
const MerchantBankingConfigModel_1 = require("../models/MerchantBankingConfigModel");
const bankingConfigCrypto_1 = require("../utils/bankingConfigCrypto");
async function getByMerchantId(merchantId) {
    const doc = await MerchantBankingConfigModel_1.MerchantBankingConfigModel.findOne({ merchantId: merchantId.trim() }).lean();
    if (!doc)
        return null;
    return (0, MerchantBankingConfigModel_1.toMerchantBankingConfig)(doc);
}
async function listEnabledBankOneConfigs() {
    const docs = await MerchantBankingConfigModel_1.MerchantBankingConfigModel.find({
        enabled: true,
        provider: 'bankone'
    }).lean();
    return docs.map((d) => (0, MerchantBankingConfigModel_1.toMerchantBankingConfig)(d));
}
function toPublicConfig(config) {
    const { bankone, ...rest } = config;
    if (!bankone) {
        return rest;
    }
    const { authToken, ...bankoneRest } = bankone;
    return {
        ...rest,
        bankone: {
            ...bankoneRest,
            authTokenMasked: (0, bankingConfigCrypto_1.maskSecret)(authToken)
        }
    };
}
/** Returns config with decrypted BankOne authToken for outbound API calls. */
async function getDecryptedBankOneConfig(merchantId) {
    const config = await getByMerchantId(merchantId);
    if (!config?.bankone?.authToken)
        return config;
    return {
        ...config,
        bankone: {
            ...config.bankone,
            authToken: (0, bankingConfigCrypto_1.decryptSecret)(config.bankone.authToken)
        }
    };
}
async function upsert(input) {
    const merchantId = input.merchantId.trim();
    const existing = await getByMerchantId(merchantId);
    let bankone = existing?.bankone;
    if (input.bankone) {
        const nextToken = input.bankone.authToken?.trim();
        bankone = {
            coreBaseUrl: (input.bankone.coreBaseUrl || bankone?.coreBaseUrl || '').trim().replace(/\/+$/, '') ||
                'https://staging.mybankone.com/BankOneWebAPI',
            channelsBaseUrl: (input.bankone.channelsBaseUrl || bankone?.channelsBaseUrl)?.trim(),
            authToken: nextToken && !nextToken.startsWith('enc:v1:')
                ? (0, bankingConfigCrypto_1.encryptSecret)(nextToken)
                : nextToken || bankone?.authToken || '',
            institutionCode: String(input.bankone.institutionCode ?? bankone?.institutionCode ?? '').trim(),
            productCode: String(input.bankone.productCode ?? bankone?.productCode ?? '').trim(),
            accountOfficerCode: String(input.bankone.accountOfficerCode ?? bankone?.accountOfficerCode ?? '').trim(),
            apiVersion: String(input.bankone.apiVersion ?? bankone?.apiVersion ?? '2').trim() || '2',
            defaultAccountTier: input.bankone.defaultAccountTier ?? bankone?.defaultAccountTier,
            defaultGender: input.bankone.defaultGender ?? bankone?.defaultGender,
            defaultPlaceOfBirth: input.bankone.defaultPlaceOfBirth ?? bankone?.defaultPlaceOfBirth,
            defaultAddress: input.bankone.defaultAddress ?? bankone?.defaultAddress,
            bankName: input.bankone.bankName ?? bankone?.bankName,
            bankCode: input.bankone.bankCode ?? bankone?.bankCode
        };
    }
    if (input.provider === 'bankone') {
        if (!bankone?.authToken || !bankone.institutionCode || !bankone.productCode || !bankone.accountOfficerCode) {
            throw new Error('bankone.authToken, institutionCode, productCode, and accountOfficerCode are required when provider is bankone');
        }
    }
    const doc = await MerchantBankingConfigModel_1.MerchantBankingConfigModel.findOneAndUpdate({ merchantId }, {
        $set: {
            merchantId,
            provider: input.provider,
            enabled: input.enabled ?? existing?.enabled ?? false,
            fallbackToPayonus: input.fallbackToPayonus ?? existing?.fallbackToPayonus ?? true,
            ...(bankone ? { bankone } : {})
        }
    }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    return (0, MerchantBankingConfigModel_1.toMerchantBankingConfig)(doc);
}
function isBankOneEnabledForMerchant(config) {
    return Boolean(config &&
        config.enabled &&
        config.provider === 'bankone' &&
        config.bankone?.authToken &&
        config.bankone.coreBaseUrl);
}
//# sourceMappingURL=merchantBankingConfigRepository.js.map