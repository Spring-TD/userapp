import { WalletService } from '../services/walletService';
import { TransactionType, TransactionStatus } from '../models/Wallet';

async function testTransactionFields() {
  console.log('Testing Transaction Fields...');
  
  // Test merchant ID
  const merchantId = 'test-merchant-txn-001';
  const userId = 'test-user-txn-001';
  const currency = 'USD';
  
  try {
    // Create merchant wallets
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
    
    // Test funding with additional transaction fields
    console.log('Testing transaction with additional fields...');
    
    const treasuryWalletResult = await WalletService.getTreasuryWallet(merchantId);
    if (!treasuryWalletResult.success || !treasuryWalletResult.wallet) {
      console.error('Failed to get Treasury wallet:', treasuryWalletResult.error);
      return;
    }
    
    // Update wallet balance with additional metadata
    const result = await WalletService.updateWalletBalance(
      treasuryWalletResult.wallet.id,
      1000,
      'Test funding with metadata'
    );
    
    if (!result.success) {
      console.error('Failed to update wallet balance:', result.error);
      return;
    }
    
    console.log('Wallet balance updated successfully');
    console.log('New balance:', result.wallet?.balance);
    
    console.log('Transaction Fields test completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testTransactionFields();

export { testTransactionFields };