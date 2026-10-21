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
exports.TransactionService = void 0;
const Wallet_1 = require("../models/Wallet");
const logger_1 = require("../utils/logger");
const transactionRepo = __importStar(require("../repositories/transactionRepository"));
const money_1 = require("../utils/money");
class TransactionService {
    static async createTransaction(data) {
        try {
            (0, money_1.assertIntegerKobo)(data.amount);
            const newTransaction = await transactionRepo.createTransaction({
                walletId: data.walletId,
                amount: data.amount,
                amountUnit: 'kobo',
                type: data.type,
                status: Wallet_1.TransactionStatus.COMPLETED,
                description: data.description,
                referenceId: data.referenceId
            });
            logger_1.logger.info('Transaction created', { transactionId: newTransaction.id, walletId: data.walletId });
            return { success: true, transaction: newTransaction };
        }
        catch (error) {
            logger_1.logger.error('Error creating transaction', { error });
            return { success: false, error: 'Failed to create transaction' };
        }
    }
    static async getTransactionHistory(walletId, pagination = {}) {
        try {
            const { transactions, total, limit, skip } = await transactionRepo.getTransactionsByWalletId(walletId, pagination);
            return {
                success: true,
                transactions,
                pagination: {
                    total,
                    limit,
                    skip,
                    hasMore: skip + transactions.length < total
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving transaction history', { error });
            return { success: false, error: 'Failed to retrieve transaction history' };
        }
    }
    static async getTransactionById(transactionId) {
        try {
            const transaction = await transactionRepo.getTransactionById(transactionId);
            if (!transaction)
                return { success: false, error: 'Transaction not found' };
            return { success: true, transaction };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving transaction', { error });
            return { success: false, error: 'Failed to retrieve transaction' };
        }
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=transactionService.js.map