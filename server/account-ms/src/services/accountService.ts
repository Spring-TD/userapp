import { IAccount } from '../models/Account';
import mockDb, { Account } from '../utils/mockDb';
import complianceService from './complianceService';
import billingService from './billingService';
import walletService from './walletService';
import serviceAuthService from './serviceAuthService';

export interface CreateAccountInput {
  userId: string;
  accountType: string;
  currency: string;
  email?: string;
}

class AccountService {
  // Create a new account
  async createAccount(input: CreateAccountInput): Promise<Account> {
    // Check KYC status
    let accountStatus = 'active';
    try {
      const kycStatus = await complianceService.checkKycStatus(input.userId);

      if (kycStatus.status !== 'verified') {
        console.log(`User ${input.userId} is not KYC verified. Initiating KYC...`);
        try {
          await complianceService.initiateKyc(input.userId, input.email);
          accountStatus = 'pending_kyc';

          // Update user state in service-auth-ms
          await serviceAuthService.updateKycStatus(input.userId, 'pending');
        } catch (error) {
          console.error('Failed to initiate KYC:', error);
          accountStatus = 'pending_kyc';
        }
      } else {
        // Update user state to reflect verified KYC
        await serviceAuthService.updateKycStatus(input.userId, 'verified');
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
      accountStatus = 'pending_kyc';
    }

    // Generate a random account number
    const accountNumber = `ACC${Math.floor(100000000 + Math.random() * 900000000)}`;

    const accountData = {
      userId: input.userId,
      accountNumber,
      accountType: input.accountType,
      balance: 0,
      currency: input.currency,
      status: accountStatus
    };

    // Create account in DB
    const createdAccount = await mockDb.createAccount(accountData);

    // Record account creation in service-auth-ms to maintain user state
    await serviceAuthService.recordAccountCreation(
      input.userId,
      createdAccount.id,
      input.accountType
    );

    // Orchestrate Wallet Creation
    // We create a wallet if the account is for a specific product type (savings, loan, mortgage)
    if (['savings', 'loan', 'mortgage'].includes(input.accountType.toLowerCase())) {
      try {
        console.log(`Creating wallet for user ${input.userId} for ${input.accountType} account...`);
        const wallet = await walletService.createWallet(
          input.userId,
          input.currency,
          `${input.accountType} Wallet - ${accountNumber}`
        );
        console.log('Wallet created successfully.');

        // Record wallet creation in service-auth-ms
        await serviceAuthService.recordWalletCreation(
          input.userId,
          wallet.id,
          input.accountType
        );
      } catch (error) {
        console.error('Failed to create wallet:', error);
      }
    }

    return createdAccount;
  }

  // Get account by ID
  async getAccountById(id: string): Promise<Account | null> {
    return await mockDb.getAccountById(id);
  }

  // Get accounts by user ID
  async getAccountsByUserId(userId: string): Promise<Account[]> {
    return await mockDb.getAccountsByUserId(userId);
  }

  // Update account balance
  async updateAccountBalance(id: string, amount: number): Promise<Account | null> {
    return await mockDb.updateAccountBalance(id, amount);
  }

  // Delete account
  async deleteAccount(id: string): Promise<boolean> {
    return await mockDb.deleteAccount(id);
  }

  // Check and process billing for a user
  // This orchestrates the billing process: checks status -> debits if needed
  async checkAndProcessBilling(userId: string): Promise<{ status: string, message: string }> {
    try {
      const billingStatus = await billingService.checkBillingStatus(userId);

      if (billingStatus.hasDueBills) {
        // Logic to decide "at what point/time should they be debited"
        // For now, we assume if it's due, we try to debit immediately

        console.log(`User ${userId} has due bills of ${billingStatus.totalDueAmount} ${billingStatus.currency}. Initiating debit...`);

        // Check if user has enough balance in Account MS (this service)
        const accounts = await this.getAccountsByUserId(userId);
        // Simple matching: find first account with matching currency
        const mainAccount = accounts.find(acc => acc.currency === billingStatus.currency);

        if (mainAccount && mainAccount.balance >= billingStatus.totalDueAmount) {
          const success = await billingService.triggerDebit(userId, billingStatus.totalDueAmount, billingStatus.currency);

          if (success) {
            // Deduct from local balance
            await this.updateAccountBalance(mainAccount.id, -billingStatus.totalDueAmount);
            return { status: 'success', message: 'Debit successful' };
          } else {
            return { status: 'failed', message: 'Debit processing failed' };
          }
        } else {
          return { status: 'failed', message: 'Insufficient funds or no matching account' };
        }
      }

      return { status: 'skipped', message: 'No due bills or not time to debit' };
    } catch (error: any) {
      console.error('Error processing billing:', error);
      return { status: 'error', message: error.message };
    }
  }
}

export default new AccountService();