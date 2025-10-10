import { Wallet, MerchantWallet, UserWallet, WalletStatus, Transaction, TransactionType, TransactionStatus, MerchantWalletType } from '../models/Wallet';
import { logger } from '../utils/logger';

// Mock database storage
interface MockDB {
  wallets: Map<string, Wallet>;
  transactions: Map<string, Transaction>;
}

const mockDB: MockDB = {
  wallets: new Map(),
  transactions: new Map()
};

export interface CreateMerchantWalletData {
  merchantId: string;
  name: string;
  currency: string;
  merchantWalletType: MerchantWalletType;
}

export interface CreateUserWalletData {
  userId: string;
  merchantId: string;
  name: string;
  currency: string;
}

export interface UpdateWalletBalanceData {
  walletId: string;
  amount: number;
  description: string;
}

export interface FilterTransactionData {
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
}

export interface TransferOutData {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  description: string;
}

export interface DebitWalletData {
  userId: string;
  amount: number;
  description: string;
}

export class WalletService {
  /**
   * Create a new merchant wallet of specific type
   * When any merchant wallet is created, automatically create all three internal wallets
   */
  static async createMerchantWallet(data: CreateMerchantWalletData, skipAutoCreate: boolean = false): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    error?: string 
  }> {
    try {
      // Check if merchant wallet of this type already exists
      for (const wallet of mockDB.wallets.values()) {
        if (wallet.walletType === 'MERCHANT' && 
            (wallet as MerchantWallet).merchantId === data.merchantId &&
            (wallet as MerchantWallet).merchantWalletType === data.merchantWalletType) {
          return {
            success: false,
            error: `${data.merchantWalletType} wallet already exists for this merchant`
          };
        }
      }

      // Create new merchant wallet
      const newWallet: MerchantWallet = {
        id: `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        merchantId: data.merchantId,
        walletType: 'MERCHANT',
        merchantWalletType: data.merchantWalletType,
        name: data.name,
        balance: 0,
        currency: data.currency,
        status: WalletStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.wallets.set(newWallet.id, newWallet);
      logger.info('Merchant wallet created', { 
        walletId: newWallet.id, 
        merchantId: data.merchantId,
        walletType: data.merchantWalletType
      });

      // Automatically create all three internal wallets when any merchant wallet is created
      // But only if this wasn't called from within the auto-create process (to avoid infinite recursion)
      if (!skipAutoCreate) {
        const existingWallets = await this.getAllMerchantWallets(data.merchantId);
        if (existingWallets.success && existingWallets.wallets) {
          // Check if all three wallet types exist
          const hasTreasury = existingWallets.wallets.some(w => w.merchantWalletType === MerchantWalletType.TREASURY);
          const hasOperation = existingWallets.wallets.some(w => w.merchantWalletType === MerchantWalletType.OPERATION);
          const hasKYC = existingWallets.wallets.some(w => w.merchantWalletType === MerchantWalletType.KYC);

          // If not all three exist, create the missing ones
          if (!hasTreasury || !hasOperation || !hasKYC) {
            const autoCreateResult = await this.createAllMerchantWallets(data.merchantId, data.currency, true);
            if (!autoCreateResult.success) {
              logger.error('Failed to auto-create merchant wallets', { 
                merchantId: data.merchantId, 
                error: autoCreateResult.error 
              });
            } else {
              logger.info('Auto-created missing merchant wallets', { 
                merchantId: data.merchantId, 
                createdCount: autoCreateResult.wallets?.length 
              });
            }
          }
        }
      }

      return {
        success: true,
        wallet: newWallet
      };
    } catch (error) {
      logger.error('Error creating merchant wallet', { error });
      return {
        success: false,
        error: 'Failed to create merchant wallet'
      };
    }
  }

  /**
   * Create all required merchant wallets (Treasury, Operation, KYC)
   */
  static async createAllMerchantWallets(merchantId: string, currency: string = 'USD', skipAutoCreate: boolean = false): Promise<{ 
    success: boolean; 
    wallets?: MerchantWallet[]; 
    error?: string 
  }> {
    try {
      const wallets: MerchantWallet[] = [];
      const walletTypes = [
        { type: MerchantWalletType.TREASURY, name: 'Treasury Wallet' },
        { type: MerchantWalletType.OPERATION, name: 'Operation Wallet' },
        { type: MerchantWalletType.KYC, name: 'KYC Wallet' }
      ];

      for (const walletType of walletTypes) {
        // Check if this wallet type already exists
        const existingWallet = await this.getMerchantWalletByType(merchantId, walletType.type);
        if (existingWallet.success && existingWallet.wallet) {
          // Wallet already exists, add it to the list
          wallets.push(existingWallet.wallet);
          continue;
        }

        // Create the wallet if it doesn't exist
        const result = await this.createMerchantWallet({
          merchantId,
          name: walletType.name,
          currency,
          merchantWalletType: walletType.type
        }, skipAutoCreate); // Pass skipAutoCreate to prevent recursion

        if (!result.success) {
          // If any wallet creation fails, we should clean up already created wallets
          // For simplicity in this mock implementation, we'll just return the error
          return {
            success: false,
            error: `Failed to create ${walletType.name}: ${result.error}`
          };
        }

        if (result.wallet) {
          wallets.push(result.wallet);
        }
      }

      logger.info('All merchant wallets created successfully', { merchantId, walletCount: wallets.length });
      return {
        success: true,
        wallets
      };
    } catch (error) {
      logger.error('Error creating all merchant wallets', { error });
      return {
        success: false,
        error: 'Failed to create merchant wallets'
      };
    }
  }

  /**
   * Get merchant wallet by merchant ID and wallet type
   */
  static async getMerchantWalletByType(merchantId: string, walletType: MerchantWalletType): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    error?: string 
  }> {
    try {
      // Find merchant wallet of specific type
      for (const wallet of mockDB.wallets.values()) {
        if (wallet.walletType === 'MERCHANT' && 
            (wallet as MerchantWallet).merchantId === merchantId &&
            (wallet as MerchantWallet).merchantWalletType === walletType) {
          return {
            success: true,
            wallet: wallet as MerchantWallet
          };
        }
      }

      return {
        success: false,
        error: `${walletType} wallet not found for merchant`
      };
    } catch (error) {
      logger.error('Error retrieving merchant wallet', { error });
      return {
        success: false,
        error: 'Failed to retrieve merchant wallet'
      };
    }
  }

  /**
   * Get all merchant wallets by merchant ID
   */
  static async getAllMerchantWallets(merchantId: string): Promise<{ 
    success: boolean; 
    wallets?: MerchantWallet[]; 
    error?: string 
  }> {
    try {
      const merchantWallets: MerchantWallet[] = [];

      // Find all merchant wallets for this merchant
      for (const wallet of mockDB.wallets.values()) {
        if (wallet.walletType === 'MERCHANT' && 
            (wallet as MerchantWallet).merchantId === merchantId) {
          merchantWallets.push(wallet as MerchantWallet);
        }
      }

      return {
        success: true,
        wallets: merchantWallets
      };
    } catch (error) {
      logger.error('Error retrieving merchant wallets', { error });
      return {
        success: false,
        error: 'Failed to retrieve merchant wallets'
      };
    }
  }

  /**
   * Create a new user wallet
   */
  static async createUserWallet(data: CreateUserWalletData): Promise<{ 
    success: boolean; 
    wallet?: UserWallet; 
    error?: string 
  }> {
    try {
      // Check if user wallet already exists
      for (const wallet of mockDB.wallets.values()) {
        if (wallet.walletType === 'USER' && (wallet as UserWallet).userId === data.userId) {
          return {
            success: false,
            error: 'User wallet already exists'
          };
        }
      }

      // Create new user wallet
      const newWallet: UserWallet = {
        id: `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: data.userId,
        merchantId: data.merchantId,
        walletType: 'USER',
        name: data.name,
        balance: 0,
        currency: data.currency,
        status: WalletStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.wallets.set(newWallet.id, newWallet);
      logger.info('User wallet created', { walletId: newWallet.id, userId: data.userId, merchantId: data.merchantId });

      return {
        success: true,
        wallet: newWallet
      };
    } catch (error) {
      logger.error('Error creating user wallet', { error });
      return {
        success: false,
        error: 'Failed to create user wallet'
      };
    }
  }

  /**
   * Get user wallet by user ID
   */
  static async getUserWallet(userId: string): Promise<{ 
    success: boolean; 
    wallet?: UserWallet; 
    error?: string 
  }> {
    try {
      // Find user wallet
      for (const wallet of mockDB.wallets.values()) {
        if (wallet.walletType === 'USER' && (wallet as UserWallet).userId === userId) {
          return {
            success: true,
            wallet: wallet as UserWallet
          };
        }
      }

      return {
        success: false,
        error: 'User wallet not found'
      };
    } catch (error) {
      logger.error('Error retrieving user wallet', { error });
      return {
        success: false,
        error: 'Failed to retrieve user wallet'
      };
    }
  }

  /**
   * Get all user wallets associated with a merchant
   */
  static async getUserWalletsByMerchant(merchantId: string): Promise<{ 
    success: boolean; 
    wallets?: UserWallet[]; 
    error?: string 
  }> {
    try {
      const userWallets: UserWallet[] = [];

      // Find all user wallets for this merchant
      for (const wallet of mockDB.wallets.values()) {
        if (wallet.walletType === 'USER' && (wallet as UserWallet).merchantId === merchantId) {
          userWallets.push(wallet as UserWallet);
        }
      }

      return {
        success: true,
        wallets: userWallets
      };
    } catch (error) {
      logger.error('Error retrieving user wallets by merchant', { error });
      return {
        success: false,
        error: 'Failed to retrieve user wallets'
      };
    }
  }

  /**
   * Update wallet balance
   */
  static async updateWalletBalance(walletId: string, amount: number, description: string): Promise<{ 
    success: boolean; 
    wallet?: Wallet; 
    error?: string 
  }> {
    try {
      const wallet = mockDB.wallets.get(walletId);

      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found'
        };
      }

      if (wallet.status !== WalletStatus.ACTIVE) {
        return {
          success: false,
          error: 'Wallet is not active'
        };
      }

      // Update balance
      wallet.balance += amount;
      wallet.updatedAt = new Date();

      // Create transaction record
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        walletId: wallet.id,
        amount: amount,
        type: amount >= 0 ? TransactionType.CREDIT : TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: description,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.transactions.set(transaction.id, transaction);
      mockDB.wallets.set(wallet.id, wallet);

      logger.info('Wallet balance updated', { walletId, newBalance: wallet.balance });

      return {
        success: true,
        wallet: wallet
      };
    } catch (error) {
      logger.error('Error updating wallet balance', { error });
      return {
        success: false,
        error: 'Failed to update wallet balance'
      };
    }
  }

  /**
   * Get wallet by ID
   */
  static async getWalletById(walletId: string): Promise<{ 
    success: boolean; 
    wallet?: Wallet; 
    error?: string 
  }> {
    try {
      const wallet = mockDB.wallets.get(walletId);

      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found'
        };
      }

      return {
        success: true,
        wallet: wallet
      };
    } catch (error) {
      logger.error('Error retrieving wallet', { error });
      return {
        success: false,
        error: 'Failed to retrieve wallet'
      };
    }
  }

  /**
   * Filter transactions by date range and type for a specific wallet
   */
  static async filterWalletTransactions(walletId: string, filterData: FilterTransactionData): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      const wallet = mockDB.wallets.get(walletId);
      
      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found'
        };
      }

      const filteredTransactions: Transaction[] = [];

      // Filter transactions based on criteria
      for (const transaction of mockDB.transactions.values()) {
        if (transaction.walletId === walletId) {
          // Check date range
          const transactionDate = new Date(transaction.createdAt);
          const startDate = filterData.startDate ? new Date(filterData.startDate) : null;
          const endDate = filterData.endDate ? new Date(filterData.endDate) : null;

          if (startDate && transactionDate < startDate) continue;
          if (endDate && transactionDate > endDate) continue;

          // Check transaction type
          if (filterData.type && transaction.type !== filterData.type) continue;

          filteredTransactions.push(transaction);
        }
      }

      // Sort by date (newest first)
      filteredTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        success: true,
        transactions: filteredTransactions
      };
    } catch (error) {
      logger.error('Error filtering wallet transactions', { error });
      return {
        success: false,
        error: 'Failed to filter wallet transactions'
      };
    }
  }

  /**
   * Filter Operation Wallet transactions by date range and type
   */
  static async filterOperationTransactions(merchantId: string, filterData: FilterTransactionData): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      // Get Operation Wallet for the merchant
      const operationResult = await this.getOperationWallet(merchantId);
      if (!operationResult.success || !operationResult.wallet) {
        return {
          success: false,
          error: 'Operation wallet not found for merchant'
        };
      }

      // Filter transactions
      const result = await this.filterWalletTransactions(operationResult.wallet.id, filterData);

      return result;
    } catch (error) {
      logger.error('Error filtering operation transactions', { error });
      return {
        success: false,
        error: 'Failed to filter operation transactions'
      };
    }
  }

  /**
   * Filter KYC Wallet transactions by date range and type
   */
  static async filterKycTransactions(merchantId: string, filterData: FilterTransactionData): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      // Get KYC Wallet for the merchant
      const kycResult = await this.getKycWallet(merchantId);
      if (!kycResult.success || !kycResult.wallet) {
        return {
          success: false,
          error: 'KYC wallet not found for merchant'
        };
      }

      // Filter transactions
      const result = await this.filterWalletTransactions(kycResult.wallet.id, filterData);

      return result;
    } catch (error) {
      logger.error('Error filtering kyc transactions', { error });
      return {
        success: false,
        error: 'Failed to filter kyc transactions'
      };
    }
  }

  /**
   * Transfer money out from one wallet to another
   */
  static async transferOut(transferData: TransferOutData): Promise<{ 
    success: boolean; 
    fromWallet?: Wallet; 
    toWallet?: Wallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const fromWallet = mockDB.wallets.get(transferData.fromWalletId);
      const toWallet = mockDB.wallets.get(transferData.toWalletId);

      if (!fromWallet) {
        return {
          success: false,
          error: 'Source wallet not found'
        };
      }

      if (!toWallet) {
        return {
          success: false,
          error: 'Destination wallet not found'
        };
      }

      if (fromWallet.status !== WalletStatus.ACTIVE) {
        return {
          success: false,
          error: 'Source wallet is not active'
        };
      }

      if (toWallet.status !== WalletStatus.ACTIVE) {
        return {
          success: false,
          error: 'Destination wallet is not active'
        };
      }

      // Check if source wallet has sufficient balance
      if (fromWallet.balance < transferData.amount) {
        return {
          success: false,
          error: 'Insufficient balance in source wallet'
        };
      }

      // Update balances
      fromWallet.balance -= transferData.amount;
      toWallet.balance += transferData.amount;
      fromWallet.updatedAt = new Date();
      toWallet.updatedAt = new Date();

      // Create transaction record for source wallet (debit)
      const debitTransaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        walletId: fromWallet.id,
        amount: -transferData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `Transfer out: ${transferData.description}`,
        referenceId: toWallet.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create transaction record for destination wallet (credit)
      const creditTransaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_credit`,
        walletId: toWallet.id,
        amount: transferData.amount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: `Transfer in: ${transferData.description}`,
        referenceId: fromWallet.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.transactions.set(debitTransaction.id, debitTransaction);
      mockDB.transactions.set(creditTransaction.id, creditTransaction);
      mockDB.wallets.set(fromWallet.id, fromWallet);
      mockDB.wallets.set(toWallet.id, toWallet);

      logger.info('Money transferred between wallets', { 
        fromWalletId: fromWallet.id, 
        toWalletId: toWallet.id, 
        amount: transferData.amount 
      });

      return {
        success: true,
        fromWallet,
        toWallet,
        transaction: debitTransaction
      };
    } catch (error) {
      logger.error('Error transferring money between wallets', { error });
      return {
        success: false,
        error: 'Failed to transfer money between wallets'
      };
    }
  }

  /**
   * Debit a user wallet (used for billing)
   */
  static async debitUserWallet(debitData: DebitWalletData): Promise<{ 
    success: boolean; 
    wallet?: Wallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Find the user wallet
      let userWallet: UserWallet | undefined;
      for (const wallet of mockDB.wallets.values()) {
        if (wallet.walletType === 'USER' && (wallet as UserWallet).userId === debitData.userId) {
          userWallet = wallet as UserWallet;
          break;
        }
      }

      if (!userWallet) {
        return {
          success: false,
          error: 'User wallet not found'
        };
      }

      if (userWallet.status !== WalletStatus.ACTIVE) {
        return {
          success: false,
          error: 'User wallet is not active'
        };
      }

      // Check if wallet has sufficient balance
      if (userWallet.balance < debitData.amount) {
        return {
          success: false,
          error: 'Insufficient balance in user wallet'
        };
      }

      // Update balance
      userWallet.balance -= debitData.amount;
      userWallet.updatedAt = new Date();

      // Create transaction record
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        walletId: userWallet.id,
        amount: -debitData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: debitData.description,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.transactions.set(transaction.id, transaction);
      mockDB.wallets.set(userWallet.id, userWallet);

      logger.info('User wallet debited', { 
        walletId: userWallet.id, 
        userId: debitData.userId, 
        amount: debitData.amount 
      });

      return {
        success: true,
        wallet: userWallet,
        transaction
      };
    } catch (error) {
      logger.error('Error debiting user wallet', { error });
      return {
        success: false,
        error: 'Failed to debit user wallet'
      };
    }
  }

  /**
   * Transfer money from Operation Wallet to KYC Wallet
   */
  static async transferFromOperationToKyc(transferData: { 
    merchantId: string, 
    amount: number, 
    description: string 
  }): Promise<{ 
    success: boolean; 
    fromWallet?: MerchantWallet; 
    toWallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Get the Operation Wallet for this merchant
      const operationResult = await this.getMerchantWalletByType(transferData.merchantId, MerchantWalletType.OPERATION);
      if (!operationResult.success || !operationResult.wallet) {
        return {
          success: false,
          error: 'Operation wallet not found for merchant'
        };
      }

      // Get the KYC Wallet for this merchant
      const kycResult = await this.getMerchantWalletByType(transferData.merchantId, MerchantWalletType.KYC);
      if (!kycResult.success || !kycResult.wallet) {
        return {
          success: false,
          error: 'KYC wallet not found for merchant'
        };
      }

      // Use the existing transferOut function to perform the transfer
      const transferResult = await this.transferOut({
        fromWalletId: operationResult.wallet.id,
        toWalletId: kycResult.wallet.id,
        amount: transferData.amount,
        description: transferData.description
      });

      // Cast the wallets to MerchantWallet type since we know they are merchant wallets
      if (transferResult.success && transferResult.fromWallet && transferResult.toWallet) {
        return {
          success: true,
          fromWallet: transferResult.fromWallet as MerchantWallet,
          toWallet: transferResult.toWallet as MerchantWallet,
          transaction: transferResult.transaction,
          error: undefined
        };
      } else {
        return {
          success: false,
          fromWallet: undefined,
          toWallet: undefined,
          transaction: undefined,
          error: transferResult.error
        };
      }
    } catch (error) {
      logger.error('Error transferring money from Operation to KYC wallet', { error });
      return {
        success: false,
        error: 'Failed to transfer money from Operation to KYC wallet'
      };
    }
  }

  /**
   * Transfer money from KYC Wallet to Operation Wallet
   */
  static async transferFromKycToOperation(transferData: { 
    merchantId: string, 
    amount: number, 
    description: string 
  }): Promise<{ 
    success: boolean; 
    fromWallet?: MerchantWallet; 
    toWallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Get the KYC Wallet for this merchant
      const kycResult = await this.getMerchantWalletByType(transferData.merchantId, MerchantWalletType.KYC);
      if (!kycResult.success || !kycResult.wallet) {
        return {
          success: false,
          error: 'KYC wallet not found for merchant'
        };
      }

      // Get the Operation Wallet for this merchant
      const operationResult = await this.getMerchantWalletByType(transferData.merchantId, MerchantWalletType.OPERATION);
      if (!operationResult.success || !operationResult.wallet) {
        return {
          success: false,
          error: 'Operation wallet not found for merchant'
        };
      }

      // Use the existing transferOut function to perform the transfer
      const transferResult = await this.transferOut({
        fromWalletId: kycResult.wallet.id,
        toWalletId: operationResult.wallet.id,
        amount: transferData.amount,
        description: transferData.description
      });

      // Cast the wallets to MerchantWallet type since we know they are merchant wallets
      if (transferResult.success && transferResult.fromWallet && transferResult.toWallet) {
        return {
          success: true,
          fromWallet: transferResult.fromWallet as MerchantWallet,
          toWallet: transferResult.toWallet as MerchantWallet,
          transaction: transferResult.transaction,
          error: undefined
        };
      } else {
        return {
          success: false,
          fromWallet: undefined,
          toWallet: undefined,
          transaction: undefined,
          error: transferResult.error
        };
      }
    } catch (error) {
      logger.error('Error transferring money from KYC to Operation wallet', { error });
      return {
        success: false,
        error: 'Failed to transfer money from KYC to Operation wallet'
      };
    }
  }

  /**
   * Get Operation Wallet for a merchant
   */
  static async getOperationWallet(merchantId: string): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    error?: string 
  }> {
    return this.getMerchantWalletByType(merchantId, MerchantWalletType.OPERATION);
  }

  /**
   * Get KYC Wallet for a merchant
   */
  static async getKycWallet(merchantId: string): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    error?: string 
  }> {
    return this.getMerchantWalletByType(merchantId, MerchantWalletType.KYC);
  }

  /**
   * Get Treasury Wallet for a merchant
   */
  static async getTreasuryWallet(merchantId: string): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    error?: string 
  }> {
    return this.getMerchantWalletByType(merchantId, MerchantWalletType.TREASURY);
  }

  /**
   * Debit a merchant's Treasury Wallet (used for billing)
   */
  static async debitTreasuryWallet(debitData: { merchantId: string, amount: number, description: string }): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Get the Treasury Wallet for this merchant
      const treasuryResult = await this.getTreasuryWallet(debitData.merchantId);
      if (!treasuryResult.success || !treasuryResult.wallet) {
        return {
          success: false,
          error: 'Treasury wallet not found for merchant'
        };
      }

      const treasuryWallet = treasuryResult.wallet;

      if (treasuryWallet.status !== WalletStatus.ACTIVE) {
        return {
          success: false,
          error: 'Treasury wallet is not active'
        };
      }

      // Check if wallet has sufficient balance
      if (treasuryWallet.balance < debitData.amount) {
        return {
          success: false,
          error: 'Insufficient balance in Treasury wallet'
        };
      }

      // Update balance
      treasuryWallet.balance -= debitData.amount;
      treasuryWallet.updatedAt = new Date();

      // Create transaction record
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        walletId: treasuryWallet.id,
        amount: -debitData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: debitData.description,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.transactions.set(transaction.id, transaction);
      mockDB.wallets.set(treasuryWallet.id, treasuryWallet);

      logger.info('Treasury wallet debited', { 
        walletId: treasuryWallet.id, 
        merchantId: debitData.merchantId, 
        amount: debitData.amount 
      });

      return {
        success: true,
        wallet: treasuryWallet,
        transaction
      };
    } catch (error) {
      logger.error('Error debiting Treasury wallet', { error });
      return {
        success: false,
        error: 'Failed to debit Treasury wallet'
      };
    }
  }

  /**
   * Debit a merchant's Operation Wallet (used for billing)
   */
  static async debitOperationWallet(debitData: { merchantId: string, amount: number, description: string }): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Get the Operation Wallet for this merchant
      const operationResult = await this.getOperationWallet(debitData.merchantId);
      if (!operationResult.success || !operationResult.wallet) {
        return {
          success: false,
          error: 'Operation wallet not found for merchant'
        };
      }

      const operationWallet = operationResult.wallet;

      if (operationWallet.status !== WalletStatus.ACTIVE) {
        return {
          success: false,
          error: 'Operation wallet is not active'
        };
      }

      // Check if wallet has sufficient balance
      if (operationWallet.balance < debitData.amount) {
        return {
          success: false,
          error: 'Insufficient balance in Operation wallet'
        };
      }

      // Update balance
      operationWallet.balance -= debitData.amount;
      operationWallet.updatedAt = new Date();

      // Create transaction record
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        walletId: operationWallet.id,
        amount: -debitData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: debitData.description,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.transactions.set(transaction.id, transaction);
      mockDB.wallets.set(operationWallet.id, operationWallet);

      logger.info('Operation wallet debited', { 
        walletId: operationWallet.id, 
        merchantId: debitData.merchantId, 
        amount: debitData.amount 
      });

      return {
        success: true,
        wallet: operationWallet,
        transaction
      };
    } catch (error) {
      logger.error('Error debiting Operation wallet', { error });
      return {
        success: false,
        error: 'Failed to debit Operation wallet'
      };
    }
  }

  /**
   * Debit a merchant's KYC Wallet (used for billing)
   */
  static async debitKycWallet(debitData: { merchantId: string, amount: number, description: string }): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Get the KYC Wallet for this merchant
      const kycResult = await this.getKycWallet(debitData.merchantId);
      if (!kycResult.success || !kycResult.wallet) {
        return {
          success: false,
          error: 'KYC wallet not found for merchant'
        };
      }

      const kycWallet = kycResult.wallet;

      if (kycWallet.status !== WalletStatus.ACTIVE) {
        return {
          success: false,
          error: 'KYC wallet is not active'
        };
      }

      // Check if wallet has sufficient balance
      if (kycWallet.balance < debitData.amount) {
        return {
          success: false,
          error: 'Insufficient balance in KYC wallet'
        };
      }

      // Update balance
      kycWallet.balance -= debitData.amount;
      kycWallet.updatedAt = new Date();

      // Create transaction record
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        walletId: kycWallet.id,
        amount: -debitData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: debitData.description,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.transactions.set(transaction.id, transaction);
      mockDB.wallets.set(kycWallet.id, kycWallet);

      logger.info('KYC wallet debited', { 
        walletId: kycWallet.id, 
        merchantId: debitData.merchantId, 
        amount: debitData.amount 
      });

      return {
        success: true,
        wallet: kycWallet,
        transaction
      };
    } catch (error) {
      logger.error('Error debiting KYC wallet', { error });
      return {
        success: false,
        error: 'Failed to debit KYC wallet'
      };
    }
  }

  /**
   * Process KYC fee by debiting the merchant's KYC wallet
   * This method is specifically for handling KYC-related fees
   */
  static async processKycFee(merchantId: string, amount: number, description: string = 'KYC Fee'): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Validate inputs
      if (amount <= 0) {
        return {
          success: false,
          error: 'KYC fee amount must be positive'
        };
      }

      // Get the KYC Wallet for this merchant
      const kycResult = await this.getKycWallet(merchantId);
      if (!kycResult.success || !kycResult.wallet) {
        return {
          success: false,
          error: 'KYC wallet not found for merchant'
        };
      }

      const kycWallet = kycResult.wallet;

      if (kycWallet.status !== WalletStatus.ACTIVE) {
        return {
          success: false,
          error: 'KYC wallet is not active'
        };
      }

      // Check if wallet has sufficient balance
      if (kycWallet.balance < amount) {
        return {
          success: false,
          error: 'Insufficient balance in KYC wallet for KYC fee'
        };
      }

      // Update balance
      kycWallet.balance -= amount;
      kycWallet.updatedAt = new Date();

      // Create transaction record specifically for KYC fee
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        walletId: kycWallet.id,
        amount: -amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: description,
        referenceId: 'KYC_FEE', // Special identifier for KYC fees
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.transactions.set(transaction.id, transaction);
      mockDB.wallets.set(kycWallet.id, kycWallet);

      logger.info('KYC fee processed', { 
        walletId: kycWallet.id, 
        merchantId, 
        amount,
        description
      });

      return {
        success: true,
        wallet: kycWallet,
        transaction
      };
    } catch (error) {
      logger.error('Error processing KYC fee', { error });
      return {
        success: false,
        error: 'Failed to process KYC fee'
      };
    }
  }
}
