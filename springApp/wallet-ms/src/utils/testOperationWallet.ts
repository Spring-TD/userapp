import { WalletService } from '../services/walletService';
import { MerchantWalletType, TransactionType } from '../models/Wallet';

async function testOperationWalletFeatures() {
  console.log('Testing Operation Wallet features...');
  
  // Test merchant ID
  const merchantId = 'test-merchant-002';
  const currency = 'USD';
  
  try {
    // Create all merchant wallets
    console.log('Creating merchant wallets...');
    const createResult = await WalletService.createAllMerchantWallets(merchantId, currency);
    if (!createResult.success) {
      console.error('Failed to create merchant wallets:', createResult.error);
      return;
    }
    
    console.log('Merchant wallets created successfully');
    
    // Fund the Operation wallet
    console.log('Funding Operation wallet...');
    const operationWallet = await WalletService.getBillingWallet(merchantId);
    if (operationWallet.success && operationWallet.wallet) {
      const fundResult = await WalletService.updateWalletBalance(
        operationWallet.wallet.id, 
        1000, 
        'Initial funding'
      );
      if (!fundResult.success) {
        console.error('Failed to fund Operation wallet:', fundResult.error);
        return;
      }
      console.log('Operation wallet funded successfully');
    }
    
    // Test filtering transactions by type (before any transactions)
    console.log('Testing transaction filtering by type (CREDIT)...');
    const filterResult1 = await WalletService.filterBillingTransactions(merchantId, {
      type: TransactionType.CREDIT
    });
    
    if (!filterResult1.success) {
      console.error('Failed to filter transactions by CREDIT type:', filterResult1.error);
      return;
    }
    
    console.log('CREDIT transactions count:', filterResult1.transactions?.length);
    
    // Test filtering transactions by type (DEBIT)
    console.log('Testing transaction filtering by type (DEBIT)...');
    const filterResult2 = await WalletService.filterBillingTransactions(merchantId, {
      type: TransactionType.DEBIT
    });
    
    if (!filterResult2.success) {
      console.error('Failed to filter transactions by DEBIT type:', filterResult2.error);
      return;
    }
    
    console.log('DEBIT transactions count:', filterResult2.transactions?.length);
    
    // Test debiting the Operation wallet
    console.log('Testing debit functionality...');
    const debitResult = await WalletService.debitBillingWallet({
      merchantId,
      amount: 100,
      description: 'Test debit'
    });
    
    if (!debitResult.success) {
      console.error('Failed to debit Operation wallet:', debitResult.error);
      return;
    }
    
    console.log('Operation wallet debited successfully');
    console.log('New balance:', debitResult.wallet?.balance);
    
    // Test filtering transactions by type (DEBIT) after debit
    console.log('Testing transaction filtering by type (DEBIT) after debit...');
    const filterResult3 = await WalletService.filterBillingTransactions(merchantId, {
      type: TransactionType.DEBIT
    });
    
    if (!filterResult3.success) {
      console.error('Failed to filter transactions by DEBIT type:', filterResult3.error);
      return;
    }
    
    console.log('DEBIT transactions count after debit:', filterResult3.transactions?.length);
    
    // Test date range filtering (get all transactions)
    console.log('Testing date range filtering...');
    const now = new Date();
    const filterResult4 = await WalletService.filterBillingTransactions(merchantId, {
      startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
      endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
    });
    
    if (!filterResult4.success) {
      console.error('Failed to filter transactions by date range:', filterResult4.error);
      return;
    }
    
    console.log('Transactions in date range:', filterResult4.transactions?.length);
    
    console.log('All Operation Wallet tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testOperationWalletFeatures();