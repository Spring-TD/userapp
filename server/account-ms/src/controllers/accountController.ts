import { Request, Response } from 'express';
import accountService from '../services/accountService';
import { CreateAccountInput } from '../services/accountService';

class AccountController {
  // Create a new account
  async createAccount(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, accountType, currency, email }: CreateAccountInput = req.body;

      if (!userId || !accountType || !currency) {
        return res.status(400).json({
          error: 'Missing required fields: userId, accountType, currency'
        });
      }

      const account = await accountService.createAccount({ userId, accountType, currency, email });
      return res.status(201).json(account);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Get account by ID
  async getAccountById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const account = await accountService.getAccountById(id);

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      return res.status(200).json(account);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Get accounts by user ID
  async getAccountsByUserId(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const accounts = await accountService.getAccountsByUserId(userId);
      return res.status(200).json(accounts);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Update account balance
  async updateAccountBalance(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      if (typeof amount !== 'number') {
        return res.status(400).json({ error: 'Amount must be a number' });
      }

      const account = await accountService.updateAccountBalance(id, amount);

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      return res.status(200).json(account);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Delete account
  async deleteAccount(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const deleted = await accountService.deleteAccount(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Account not found' });
      }

      return res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Check billing status and process debits
  async checkBillingStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const result = await accountService.checkAndProcessBilling(userId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default new AccountController();