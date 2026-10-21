import { Transaction, TransactionType } from '../models/Wallet';
export interface CreateTransactionData {
    walletId: string;
    /** Integer kobo (callers convert at HTTP boundary). */
    amount: number;
    type: TransactionType;
    description: string;
    referenceId?: string;
}
export declare class TransactionService {
    static createTransaction(data: CreateTransactionData): Promise<{
        success: boolean;
        transaction?: Transaction;
        error?: string;
    }>;
    static getTransactionHistory(walletId: string, pagination?: {
        limit?: number;
        skip?: number;
    }): Promise<{
        success: boolean;
        transactions?: Transaction[];
        pagination?: {
            total: number;
            limit: number;
            skip: number;
            hasMore: boolean;
        };
        error?: string;
    }>;
    static getTransactionById(transactionId: string): Promise<{
        success: boolean;
        transaction?: Transaction;
        error?: string;
    }>;
}
//# sourceMappingURL=transactionService.d.ts.map