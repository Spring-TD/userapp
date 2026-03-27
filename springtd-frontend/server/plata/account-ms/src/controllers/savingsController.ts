import { Request, Response } from 'express';
import accountService, { CreateAccountInput } from '../services/accountService';

class SavingsController {
    // Create savings account
    async createSavingsAccount(req: Request, res: Response): Promise<Response> {
        try {
            const { userId, currency, email, appId, productId } = req.body;
            // Force accountType to 'savings'
            const accountType = 'savings';

            if (!userId || !currency) {
                return res.status(400).json({
                    error: 'Missing required fields: userId, currency'
                });
            }

            const account = await accountService.createAccount({
                userId,
                accountType,
                currency,
                email,
                appId,
                productId
            });

            return res.status(201).json(account);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}

export default new SavingsController();
