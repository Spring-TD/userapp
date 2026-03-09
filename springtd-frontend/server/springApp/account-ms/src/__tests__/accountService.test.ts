import accountService from '../services/accountService';
import mockDb from '../utils/mockDb';

describe('Account Service', () => {
  beforeEach(async () => {
    // Clear the mock database before each test
    const accounts = await mockDb.getAllAccounts();
    for (const account of accounts) {
      await mockDb.deleteAccount(account.id);
    }
  });

  it('should create a new account', async () => {
    const input = {
      userId: 'user123',
      accountType: 'checking',
      currency: 'USD'
    };

    const account = await accountService.createAccount(input);
    
    expect(account).toBeDefined();
    expect(account.userId).toBe(input.userId);
    expect(account.accountType).toBe(input.accountType);
    expect(account.currency).toBe(input.currency);
    expect(account.balance).toBe(0);
    expect(account.status).toBe('active');
  });

  it('should get an account by ID', async () => {
    const input = {
      userId: 'user123',
      accountType: 'checking',
      currency: 'USD'
    };

    const createdAccount = await accountService.createAccount(input);
    const fetchedAccount = await accountService.getAccountById(createdAccount.id);
    
    expect(fetchedAccount).toBeDefined();
    expect(fetchedAccount?.id).toBe(createdAccount.id);
    expect(fetchedAccount?.accountNumber).toBe(createdAccount.accountNumber);
  });

  it('should get accounts by user ID', async () => {
    const input1 = {
      userId: 'user123',
      accountType: 'checking',
      currency: 'USD'
    };

    const input2 = {
      userId: 'user123',
      accountType: 'savings',
      currency: 'USD'
    };

    await accountService.createAccount(input1);
    await accountService.createAccount(input2);
    
    const accounts = await accountService.getAccountsByUserId('user123');
    
    expect(accounts).toHaveLength(2);
    expect(accounts[0].userId).toBe('user123');
    expect(accounts[1].userId).toBe('user123');
  });

  it('should update account balance', async () => {
    const input = {
      userId: 'user123',
      accountType: 'checking',
      currency: 'USD'
    };

    const createdAccount = await accountService.createAccount(input);
    const updatedAccount = await accountService.updateAccountBalance(createdAccount.id, 100);
    
    expect(updatedAccount).toBeDefined();
    expect(updatedAccount?.balance).toBe(100);
  });

  it('should delete an account', async () => {
    const input = {
      userId: 'user123',
      accountType: 'checking',
      currency: 'USD'
    };

    const createdAccount = await accountService.createAccount(input);
    const deleted = await accountService.deleteAccount(createdAccount.id);
    
    expect(deleted).toBe(true);
    
    const fetchedAccount = await accountService.getAccountById(createdAccount.id);
    expect(fetchedAccount).toBeNull();
  });
});