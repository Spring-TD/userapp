import { Request, Response } from 'express';
import { WalletService, CreateMerchantWalletData, CreateUserWalletData, TransferData } from '../services/walletService';

export class WalletController {

    static async createMerchantWallet(req: Request, res: Response) {
        try {
            const result = await WalletService.createMerchantWallet(req.body as CreateMerchantWalletData);
            if (result.success) {
                res.status(201).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async createUserWallet(req: Request, res: Response) {
        try {
            const result = await WalletService.createUserWallet(req.body as CreateUserWalletData);
            if (result.success) {
                res.status(201).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async getWallet(req: Request, res: Response) {
        try {
            const wallet = await WalletService.getWallet(req.params['id'] as string);
            if (wallet) {
                res.status(200).json({ success: true, wallet });
            } else {
                res.status(404).json({ success: false, error: 'Wallet not found' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async transferFunds(req: Request, res: Response) {
        try {
            const result = await WalletService.transferFunds(req.body as TransferData);
            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async getTransactions(req: Request, res: Response) {
        try {
            const transactions = await WalletService.getTransactions(req.params['id'] as string);
            res.status(200).json({ success: true, transactions });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // Admin/Test Endpoint
    static async deposit(req: Request, res: Response) {
        try {
            const { walletId, amount, description } = req.body;
            const result = await WalletService.depositFunds(walletId, amount, description);
            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
