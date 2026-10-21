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
exports.provisionUserWalletNuban = provisionUserWalletNuban;
exports.reprovisionUserWalletNuban = reprovisionUserWalletNuban;
exports.provisionMerchantWalletNuban = provisionMerchantWalletNuban;
const bankingConfigRepo = __importStar(require("../../repositories/merchantBankingConfigRepository"));
const payonusNubanProvisioning_1 = require("../payonusNubanProvisioning");
const bankoneNubanAdapter_1 = require("./bankoneNubanAdapter");
const virtualNubanProvisioning_1 = require("../virtualNubanProvisioning");
const logger_1 = require("../../utils/logger");
/**
 * Opt-in BankOne for user wallets when MerchantBankingConfig is enabled;
 * otherwise route via provisionVirtualNubanForWallet (LegerBlock / PayOnUs from NUBAN_PROVIDER_DEFAULT).
 */
async function provisionUserWalletNuban(wallet, options = {}) {
    const config = await bankingConfigRepo.getDecryptedBankOneConfig(wallet.merchantId);
    if (bankingConfigRepo.isBankOneEnabledForMerchant(config) && config?.bankone) {
        const bankoneWallet = await (0, bankoneNubanAdapter_1.provisionBankOneNubanForUserWallet)(wallet, config.bankone, options);
        if (bankoneWallet.virtualNuban?.provisionStatus === 'active') {
            return bankoneWallet;
        }
        if (config.fallbackToPayonus !== false) {
            logger_1.logger.warn('BankOne provision failed; falling back to virtual NUBAN provider', {
                walletId: wallet.id,
                merchantId: wallet.merchantId,
                error: bankoneWallet.virtualNuban?.provisionError
            });
            return (await (0, virtualNubanProvisioning_1.provisionVirtualNubanForWallet)(bankoneWallet));
        }
        return bankoneWallet;
    }
    return (await (0, virtualNubanProvisioning_1.provisionVirtualNubanForWallet)(wallet));
}
async function reprovisionUserWalletNuban(wallet, options = {}) {
    if (wallet.virtualNuban?.provisionStatus === 'active' && wallet.virtualNuban.accountNumber) {
        return wallet;
    }
    return provisionUserWalletNuban(wallet, options);
}
/** Merchant wallets use NUBAN_PROVIDER_DEFAULT (LegerBlock / PayOnUs). BankOne is applicant/user only. */
async function provisionMerchantWalletNuban(wallet) {
    return (await (0, virtualNubanProvisioning_1.provisionVirtualNubanForWallet)(wallet));
}
//# sourceMappingURL=provisionUserNuban.js.map