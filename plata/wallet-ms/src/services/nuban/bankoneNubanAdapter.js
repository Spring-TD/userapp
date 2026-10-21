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
exports.provisionBankOneNubanForUserWallet = provisionBankOneNubanForUserWallet;
exports.reprovisionIfNeeded = reprovisionIfNeeded;
const walletRepo = __importStar(require("../../repositories/walletRepository"));
const bankoneClient_1 = require("../bankone/bankoneClient");
const logger_1 = require("../../utils/logger");
function buildTrackingRef(wallet) {
    const compact = `${wallet.userId}-${wallet.id}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
    return `SPR${compact}${Date.now().toString(36)}`.slice(0, 50);
}
async function provisionBankOneNubanForUserWallet(wallet, settings, options = {}) {
    const profile = {
        ...(options.applicantProfile || {}),
        bvn: options.bvn || options.applicantProfile?.bvn,
        fullName: options.applicantProfile?.fullName || wallet.name
    };
    const trackingRef = buildTrackingRef(wallet);
    const result = await (0, bankoneClient_1.createAccountQuick)(settings, profile, trackingRef);
    if (result.ok && result.data.accountNumber) {
        const patched = await walletRepo.patchWalletVirtualNuban(wallet.id, {
            nubanProvider: 'bankone',
            payonusNubanAccountNumber: result.data.accountNumber,
            payonusNubanBankName: settings.bankName || 'BankOne',
            payonusNubanBankCode: settings.bankCode,
            payonusNubanProviderReference: result.data.providerReference || trackingRef,
            payonusNubanAccountType: 'reserved',
            payonusNubanProvisionStatus: 'active',
            payonusNubanProvisionError: null,
            payonusNubanProvisionedAt: new Date()
        });
        logger_1.logger.info('BankOne NUBAN provisioned', {
            walletId: wallet.id,
            merchantId: wallet.merchantId,
            accountNumber: result.data.accountNumber
        });
        return patched || wallet;
    }
    const errorMessage = !result.ok
        ? result.errorMessage
        : 'BankOne did not return an account number';
    const patched = await walletRepo.patchWalletVirtualNuban(wallet.id, {
        nubanProvider: 'bankone',
        payonusNubanAccountType: 'reserved',
        payonusNubanProvisionStatus: 'failed',
        payonusNubanProvisionError: errorMessage
    });
    logger_1.logger.warn('BankOne NUBAN provisioning failed', {
        walletId: wallet.id,
        merchantId: wallet.merchantId,
        error: errorMessage
    });
    return patched || wallet;
}
async function reprovisionIfNeeded(wallet, settings, options) {
    if (wallet.walletType !== 'USER')
        return wallet;
    if (wallet.virtualNuban?.provisionStatus === 'active' && wallet.virtualNuban.accountNumber) {
        return wallet;
    }
    return provisionBankOneNubanForUserWallet(wallet, settings, options);
}
//# sourceMappingURL=bankoneNubanAdapter.js.map