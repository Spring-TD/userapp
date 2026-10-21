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
exports.syncBankOneCreditsForMerchant = syncBankOneCreditsForMerchant;
exports.runBankOneCreditPollerTick = runBankOneCreditPollerTick;
exports.startBankOneCreditPoller = startBankOneCreditPoller;
exports.stopBankOneCreditPoller = stopBankOneCreditPoller;
const bankone_1 = require("../../config/bankone");
const WalletModel_1 = require("../../models/WalletModel");
const bankingConfigRepo = __importStar(require("../../repositories/merchantBankingConfigRepository"));
const bankoneClient_1 = require("./bankoneClient");
const inboundFundingService_1 = require("../inboundFundingService");
const logger_1 = require("../../utils/logger");
async function listActiveBankOneUserWallets(merchantId) {
    const query = {
        walletType: 'USER',
        nubanProvider: 'bankone',
        payonusNubanProvisionStatus: 'active',
        payonusNubanAccountNumber: { $exists: true, $nin: [null, ''] }
    };
    if (merchantId) {
        query.merchantId = merchantId;
    }
    const docs = await WalletModel_1.WalletModel.find(query)
        .limit(bankone_1.bankoneConfig.creditPollerBatchSize)
        .lean();
    return docs.map((d) => (0, WalletModel_1.toWallet)(d));
}
async function syncWalletCredits(wallet, errors) {
    const config = await bankingConfigRepo.getDecryptedBankOneConfig(wallet.merchantId);
    if (!bankingConfigRepo.isBankOneEnabledForMerchant(config) || !config?.bankone) {
        return { applied: 0, duplicates: 0 };
    }
    const accountNumber = wallet.virtualNuban?.accountNumber?.trim();
    if (!accountNumber) {
        return { applied: 0, duplicates: 0 };
    }
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - bankone_1.bankoneConfig.creditPollerLookbackDays);
    const txResult = await (0, bankoneClient_1.getTransactions)(config.bankone, accountNumber, fromDate, toDate, bankone_1.bankoneConfig.creditPollerBatchSize);
    if (!txResult.ok) {
        errors.push(`${wallet.id}: ${txResult.errorMessage}`);
        return { applied: 0, duplicates: 0 };
    }
    let applied = 0;
    let duplicates = 0;
    for (const tx of txResult.data) {
        if (!tx.isCredit || tx.amount <= 0)
            continue;
        const credit = await (0, inboundFundingService_1.processInboundFundingCredit)({
            provider: 'bankone',
            transactionId: tx.transactionReference,
            amount: tx.amount,
            currency: wallet.currency || 'NGN',
            walletId: wallet.id,
            userId: wallet.userId,
            merchantId: wallet.merchantId,
            narration: tx.narration,
            description: tx.narration,
            merchantReference: tx.narration,
            accountNumber,
            payload: tx.raw
        });
        if (credit.duplicate) {
            duplicates += 1;
        }
        else if (credit.success) {
            applied += 1;
        }
        else if (credit.error) {
            errors.push(`${wallet.id}/${tx.transactionReference}: ${credit.error}`);
        }
    }
    return { applied, duplicates };
}
async function syncBankOneCreditsForMerchant(merchantId) {
    const errors = [];
    const wallets = await listActiveBankOneUserWallets(merchantId.trim());
    let creditsApplied = 0;
    let duplicates = 0;
    for (const wallet of wallets) {
        const result = await syncWalletCredits(wallet, errors);
        creditsApplied += result.applied;
        duplicates += result.duplicates;
    }
    return {
        merchantId: merchantId.trim(),
        walletsScanned: wallets.length,
        creditsApplied,
        duplicates,
        errors
    };
}
async function runBankOneCreditPollerTick() {
    const configs = await bankingConfigRepo.listEnabledBankOneConfigs();
    for (const config of configs) {
        try {
            const result = await syncBankOneCreditsForMerchant(config.merchantId);
            if (result.creditsApplied > 0 || result.errors.length > 0) {
                logger_1.logger.info('BankOne credit poller tick', result);
            }
        }
        catch (error) {
            logger_1.logger.error('BankOne credit poller merchant failed', {
                merchantId: config.merchantId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}
let pollerTimer = null;
function startBankOneCreditPoller() {
    if (!bankone_1.bankoneConfig.creditPollerEnabled) {
        logger_1.logger.info('BankOne credit poller disabled');
        return;
    }
    if (pollerTimer)
        return;
    logger_1.logger.info('Starting BankOne credit poller', {
        intervalMs: bankone_1.bankoneConfig.creditPollerIntervalMs
    });
    const tick = () => {
        void runBankOneCreditPollerTick().catch((error) => {
            logger_1.logger.error('BankOne credit poller tick failed', {
                error: error instanceof Error ? error.message : String(error)
            });
        });
    };
    tick();
    pollerTimer = setInterval(tick, bankone_1.bankoneConfig.creditPollerIntervalMs);
    if (typeof pollerTimer.unref === 'function') {
        pollerTimer.unref();
    }
}
function stopBankOneCreditPoller() {
    if (pollerTimer) {
        clearInterval(pollerTimer);
        pollerTimer = null;
    }
}
//# sourceMappingURL=bankoneCreditPoller.js.map