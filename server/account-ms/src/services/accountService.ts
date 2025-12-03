import { IAccount } from '../models/Account';
import mockDb, { Account } from '../utils/mockDb';
import complianceService from './complianceService';
import billingService from './billingService';
import walletService from './walletService';
import serviceAuthService from './serviceAuthService';
import createAppService from './createAppService';

export interface CreateAccountInput {
  userId: string;
  accountType: string;
  currency: string;
  email?: string;
  appId?: string; // Optional: to associate account with an app
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

    // If appId is provided, record the account-app association
    if (input.appId) {
      await this.recordAccountForApp(createdAccount.id, input.appId, input.userId);
    }

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

  // Get app ownership information for a user
  // This helps understand which apps a user owns and their associated accounts
  async getAppOwnership(userId: string): Promise<any> {
    try {
      const ownershipRecords = await createAppService.getOwnershipRecords(userId);
      const userAccounts = await this.getAccountsByUserId(userId);

      return {
        userId,
        apps: ownershipRecords,
        accounts: userAccounts,
        totalApps: ownershipRecords.length,
        totalAccounts: userAccounts.length
      };
    } catch (error: any) {
      console.error('Error getting app ownership:', error);
      throw error;
    }
  }

  // Record that an account belongs to a specific app
  // This maintains the memory of account-app relationships
  async recordAccountForApp(accountId: string, appId: string, userId: string): Promise<void> {
    try {
      // Verify the user owns the app
      const ownsApp = await createAppService.userOwnsApp(userId, appId);

      if (!ownsApp) {
        console.warn(`User ${userId} does not own app ${appId}`);
        return;
      }

      // Record the association
      await createAppService.recordAccountForApp(appId, accountId, userId);

      console.log(`Account ${accountId} successfully associated with app ${appId}`);
    } catch (error) {
      console.error('Failed to record account for app:', error);
    }
  }
}

export default new AccountService();