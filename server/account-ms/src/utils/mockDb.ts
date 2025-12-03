// Mock database utility for development purposes
// This will be replaced with actual MongoDB implementation later

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

class MockDatabase {
  private accounts: Account[] = [];
  private nextId: number = 1;

  // Create a new account
  async createAccount(accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const newAccount: Account = {
      id: `acc_${this.nextId++}`,
      ...accountData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.accounts.push(newAccount);
    return newAccount;
  }

  // Get account by ID
  async getAccountById(id: string): Promise<Account | null> {
    const account = this.accounts.find(acc => acc.id === id);
    return account || null;
  }

  // Get accounts by user ID
  async getAccountsByUserId(userId: string): Promise<Account[]> {
    return this.accounts.filter(acc => acc.userId === userId);
  }

  // Update account balance
  async updateAccountBalance(id: string, amount: number): Promise<Account | null> {
    const accountIndex = this.accounts.findIndex(acc => acc.id === id);
    if (accountIndex === -1) return null;
    
    this.accounts[accountIndex].balance += amount;
    this.accounts[accountIndex].updatedAt = new Date();
    
    return this.accounts[accountIndex];
  }

  // Delete account
  async deleteAccount(id: string): Promise<boolean> {
    const initialLength = this.accounts.length;
    this.accounts = this.accounts.filter(acc => acc.id !== id);
    return this.accounts.length < initialLength;
  }

  // Get all accounts (for testing purposes)
  async getAllAccounts(): Promise<Account[]> {
    return this.accounts;
  }
}

export default new MockDatabase();