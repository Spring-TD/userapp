import { WalletStatus, TransactionType, TransactionStatus, MerchantWalletType, IWallet, ITransaction } from '../models/Wallet';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import { MockWallet as Wallet, MockTransaction as Transaction, mockMongoose as mongoose } from './mockDB';

export interface CreateMerchantWalletData {
    merchantId: string;
    name: string;
    currency: string;
    merchantWalletType: MerchantWalletType;
}

export interface CreateUserWalletData {
    userId: string;
    merchantId?: string; // Optional for user wallets depending on context
    name: string;
    currency: string;
}

export interface TransferData {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    description: string;
}

export class WalletService {

    // Create Merchant Wallet
    static async createMerchantWallet(data: CreateMerchantWalletData): Promise<{ success: boolean; wallet?: IWallet; error?: string }> {
        try {
            // Check existence
            const existing = await Wallet.findOne({
                merchantId: data.merchantId,
                merchantWalletType: data.merchantWalletType,
                walletType: 'MERCHANT'
            });

            if (existing) {
                return { success: false, error: 'Wallet already exists' };
            }

            const wallet = await Wallet.create({
                id: `wallet_${uuidv4()}`,
                merchantId: data.merchantId,
                name: data.name,
                currency: data.currency,
                walletType: 'MERCHANT',
                merchantWalletType: data.merchantWalletType,
                status: WalletStatus.ACTIVE
            });

            return { success: true, wallet };
        } catch (error: any) {
            console.error('Create Merchant Wallet Error:', error);
            return { success: false, error: 'Failed to create wallet' };
        }
    }

    // Create User Wallet
    static async createUserWallet(data: CreateUserWalletData): Promise<{ success: boolean; wallet?: IWallet; error?: string }> {
        try {
            const existing = await Wallet.findOne({ userId: data.userId });
            if (existing) {
                // Depending on requirements, users might have multiple wallets. For now, assume one main wallet per currency/user.
                // Or check unique constraint if strict 1:1.
                // return { success: false, error: 'User wallet already exists' };
            }

            const wallet = await Wallet.create({
                id: `wallet_${uuidv4()}`,
                userId: data.userId,
                merchantId: data.merchantId,
                name: data.name,
                currency: data.currency,
                walletType: 'USER',
                status: WalletStatus.ACTIVE
            });

            return { success: true, wallet };
        } catch (error: any) {
            console.error('Create User Wallet Error:', error);
            return { success: false, error: 'Failed to create wallet' };
        }
    }

    // Get Wallet by ID (Custom or Object ID)
    static async getWallet(walletId: string): Promise<IWallet | null> {
        // Try finding by custom ID first, then _id
        let wallet = await Wallet.findOne({ id: walletId });
        if (!wallet && mongoose.isValidObjectId(walletId)) {
            wallet = await Wallet.findById(walletId);
        }
        return wallet;
    }

    // Get Wallet by User
    static async getWalletByUser(userId: string): Promise<IWallet | null> {
        return Wallet.findOne({ userId });
    }

    // Process Transfer
    static async transferFunds(data: TransferData): Promise<{ success: boolean; transaction?: ITransaction; error?: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const fromWallet = await Wallet.findOne({ id: data.fromWalletId }).session(session);
            const toWallet = await Wallet.findOne({ id: data.toWalletId }).session(session);

            if (!fromWallet || !toWallet) {
                throw new Error('One or both wallets not found');
            }

            if (fromWallet.mainBalance < data.amount) {
                throw new Error('Insufficient funds');
            }

            // Debit
            fromWallet.mainBalance -= data.amount;
            fromWallet.ledgerBalance -= data.amount;
            await fromWallet.save({ session });

            // Credit
            toWallet.mainBalance += data.amount;
            toWallet.ledgerBalance += data.amount;
            await toWallet.save({ session });

            // Create Transactions
            const txId = `txn_${uuidv4()}`;

            // Debit Record
            await Transaction.create([{
                id: txId + '_dr',
                walletId: fromWallet.id,
                amount: -data.amount,
                type: TransactionType.DEBIT,
                status: TransactionStatus.COMPLETED,
                description: `Transfer to ${toWallet.name}: ${data.description}`,
                referenceId: toWallet.id,
                balanceBefore: fromWallet.mainBalance + data.amount,
                balanceAfter: fromWallet.mainBalance
            }], { session });

            // Credit Record
            const [creditTx] = await Transaction.create([{
                id: txId + '_cr',
                walletId: toWallet.id,
                amount: data.amount,
                type: TransactionType.CREDIT,
                status: TransactionStatus.COMPLETED,
                description: `Transfer from ${fromWallet.name}: ${data.description}`,
                referenceId: fromWallet.id,
                balanceBefore: toWallet.mainBalance - data.amount,
                balanceAfter: toWallet.mainBalance
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return { success: true, transaction: creditTx };

        } catch (error: any) {
            await session.abortTransaction();
            session.endSession();
            console.error('Transfer Error:', error);
            return { success: false, error: error.message || 'Transfer failed' };
        }
    }

    // Simulate Funding (Deposit) - For Testing/Admin
    static async depositFunds(walletId: string, amount: number, description: string): Promise<{ success: boolean; error?: string }> {
        try {
            const wallet = await this.getWallet(walletId);
            if (!wallet) return { success: false, error: 'Wallet not found' };

            wallet.mainBalance += amount;
            wallet.ledgerBalance += amount;
            await wallet.save();

            await Transaction.create({
                id: `txn_${uuidv4()}_dep`,
                walletId: wallet.id,
                amount: amount,
                type: TransactionType.CREDIT,
                status: TransactionStatus.COMPLETED,
                description: description || 'External Deposit',
                balanceBefore: wallet.mainBalance - amount,
                balanceAfter: wallet.mainBalance
            });

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Get Transactions
    static async getTransactions(walletId: string): Promise<ITransaction[]> {
        return Transaction.find({ walletId }).sort({ createdAt: -1 });
    }
}

// import mongoose from 'mongoose';
