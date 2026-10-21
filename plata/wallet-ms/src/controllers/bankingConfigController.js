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
exports.BankingConfigController = void 0;
const bankingConfigRepo = __importStar(require("../repositories/merchantBankingConfigRepository"));
const bankoneCreditPoller_1 = require("../services/bankone/bankoneCreditPoller");
class BankingConfigController {
    /**
     * GET /internal/api/v1/banking-config/:merchantId
     */
    static async get(req, res, next) {
        try {
            const merchantId = String(req.params.merchantId || '').trim();
            if (!merchantId) {
                res.status(400).json({ success: false, error: 'merchantId is required' });
                return;
            }
            const config = await bankingConfigRepo.getByMerchantId(merchantId);
            if (!config) {
                res.status(404).json({ success: false, error: 'Banking config not found' });
                return;
            }
            res.status(200).json({
                success: true,
                data: bankingConfigRepo.toPublicConfig(config)
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /internal/api/v1/banking-config/:merchantId
     */
    static async upsert(req, res, next) {
        try {
            const merchantId = String(req.params.merchantId || '').trim();
            if (!merchantId) {
                res.status(400).json({ success: false, error: 'merchantId is required' });
                return;
            }
            const body = req.body;
            const provider = String(body.provider || '').trim().toLowerCase();
            if (provider !== 'bankone' && provider !== 'payonus') {
                res.status(400).json({ success: false, error: 'provider must be bankone or payonus' });
                return;
            }
            const input = {
                merchantId,
                provider,
                enabled: body.enabled,
                fallbackToPayonus: body.fallbackToPayonus,
                bankone: body.bankone
                    ? {
                        coreBaseUrl: body.bankone.coreBaseUrl,
                        channelsBaseUrl: body.bankone.channelsBaseUrl,
                        authToken: body.bankone.authToken,
                        institutionCode: body.bankone.institutionCode,
                        productCode: body.bankone.productCode,
                        accountOfficerCode: body.bankone.accountOfficerCode,
                        apiVersion: body.bankone.apiVersion,
                        defaultAccountTier: body.bankone.defaultAccountTier,
                        defaultGender: body.bankone.defaultGender,
                        defaultPlaceOfBirth: body.bankone.defaultPlaceOfBirth,
                        defaultAddress: body.bankone.defaultAddress,
                        bankName: body.bankone.bankName,
                        bankCode: body.bankone.bankCode
                    }
                    : undefined
            };
            const saved = await bankingConfigRepo.upsert(input);
            res.status(200).json({
                success: true,
                data: bankingConfigRepo.toPublicConfig(saved)
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save banking config';
            if (message.includes('required')) {
                res.status(400).json({ success: false, error: message });
                return;
            }
            next(error);
        }
    }
    /**
     * POST /internal/api/v1/banking-config/:merchantId/sync-credits
     * Ops/test: run BankOne inbound credit sync for one merchant immediately.
     */
    static async syncCredits(req, res, next) {
        try {
            const merchantId = String(req.params.merchantId || '').trim();
            if (!merchantId) {
                res.status(400).json({ success: false, error: 'merchantId is required' });
                return;
            }
            const result = await (0, bankoneCreditPoller_1.syncBankOneCreditsForMerchant)(merchantId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.BankingConfigController = BankingConfigController;
//# sourceMappingURL=bankingConfigController.js.map