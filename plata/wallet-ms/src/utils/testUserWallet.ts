import { WalletService } from '../services/walletService';
import { MerchantWalletType, TransactionType } from '../models/Wallet';

async function testUserWalletFeatures() {
  console.log('Testing User Wallet features...');
  
  // Test user ID and merchant ID
  const userId = 'test-user-001';
  const merchantId = 'test-merchant-001';
  const currency = 'USD';
  
  try {
    // Create merchant wallets first
    console.log('Creating merchant wallets...');
    const createMerchantResult = await WalletService.createAllMerchantWallets(merchantId, currency);
    if (!createMerchantResult.success) {
      console.error('Failed to create merchant wallets:', createMerchantResult.error);
      return;
    }
    
    console.log('Merchant wallets created successfully');
    
    // Create user wallet
    console.log('Creating user wallet...');
    const createUserResult = await WalletService.createUserWallet({
      userId,
      merchantId,
      name: 'Test User Wallet',
      currency
    });
    
    if (!createUserResult.success) {
      console.error('Failed to create user wallet:', createUserResult.error);
      return;
    }
    
    console.log('User wallet created successfully');
    console.log('User wallet ID:', createUserResult.wallet?.id);
    
    // Fund the user wallet
    console.log('Funding user wallet...');
    const fundResult = await WalletService.updateWalletBalance(
      createUserResult.wallet!.id, 
      1000, 
      'Initial funding'
    );
    
    if (!fundResult.success) {
      console.error('Failed to fund user wallet:', fundResult.error);
      return;
    }
    
    console.log('User wallet funded successfully');
    console.log('New balance:', fundResult.wallet?.balance);
    
    // Test filtering transactions by type (before any transactions)
    console.log('Testing transaction filtering by type (CREDIT)...');
    const filterResult1 = await WalletService.filterUserTransactions(userId, {
      type: TransactionType.CREDIT
    });
    
    if (!filterResult1.success) {
      console.error('Failed to filter transactions by CREDIT type:', filterResult1.error);
      return;
    }
    
    console.log('CREDIT transactions count:', filterResult1.transactions?.length);
    
    // Test filtering transactions by type (DEBIT)
    console.log('Testing transaction filtering by type (DEBIT)...');
    const filterResult2 = await WalletService.filterUserTransactions(userId, {
      type: TransactionType.DEBIT
    });
    
    if (!filterResult2.success) {
      console.error('Failed to filter transactions by DEBIT type:', filterResult2.error);
      return;
    }
    
    console.log('DEBIT transactions count:', filterResult2.transactions?.length);
    
    // Transfer money out from user wallet to merchant's treasury wallet
    console.log('Testing transfer out functionality...');
    const treasuryResult = await WalletService.getTreasuryWallet(merchantId);
    if (!treasuryResult.success || !treasuryResult.wallet) {
      console.error('Failed to get Treasury wallet:', treasuryResult.error);
      return;
    }
    
    const transferResult = await WalletService.transferOutFromUser({
      userId,
      toWalletId: treasuryResult.wallet.id,
      amount: 100,
      description: 'Transfer to treasury'
    });
    
    if (!transferResult.success) {
      console.error('Failed to transfer money from user wallet:', transferResult.error);
      return;
    }
    
    console.log('Money transferred successfully');
    console.log('User balance:', transferResult.fromWallet?.balance);
    console.log('Treasury balance:', transferResult.toWallet?.balance);
    
    // Test filtering transactions by type (DEBIT) after transfer
    console.log('Testing transaction filtering by type (DEBIT) after transfer...');
    const filterResult3 = await WalletService.filterUserTransactions(userId, {
      type: TransactionType.DEBIT
    });
    
    if (!filterResult3.success) {
      console.error('Failed to filter transactions by DEBIT type:', filterResult3.error);
      return;
    }
    
    console.log('DEBIT transactions count after transfer:', filterResult3.transactions?.length);
    
    // Test date range filtering (get all transactions)
    console.log('Testing date range filtering...');
    const now = new Date();
    const filterResult4 = await WalletService.filterUserTransactions(userId, {
      startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
      endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
    });
    
    if (!filterResult4.success) {
      console.error('Failed to filter transactions by date range:', filterResult4.error);
      return;
    }
    
    console.log('Transactions in date range:', filterResult4.transactions?.length);
    
    console.log('All User Wallet tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testUserWalletFeatures();

export { testUserWalletFeatures };