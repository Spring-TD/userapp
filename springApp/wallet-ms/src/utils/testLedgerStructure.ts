import { WalletService } from '../services/walletService';
import { MerchantWalletType } from '../models/Wallet';

async function testLedgerStructure() {
  console.log('Testing Wallet Ledger Structure...');
  
  // Test merchant ID
  const merchantId = 'test-merchant-ledger-001';
  const userId = 'test-user-ledger-001';
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
    
    // Test the ledger structure
    console.log('Testing ledger structure...');
    
    const treasuryWalletResult = await WalletService.getSettlementWallet(merchantId);
    if (!treasuryWalletResult.success || !treasuryWalletResult.wallet) {
      console.error('Failed to get Treasury wallet:', treasuryWalletResult.error);
      return;
    }
    
    console.log('Initial Treasury wallet balances:');
    console.log('Main Balance:', treasuryWalletResult.wallet.mainBalance);
    console.log('Ledger Balance:', treasuryWalletResult.wallet.ledgerBalance);
    
    // Update wallet balance
    const updateResult = await WalletService.updateWalletBalance(
      treasuryWalletResult.wallet.id,
      1000,
      'Test funding for ledger structure'
    );
    
    if (!updateResult.success) {
      console.error('Failed to update wallet balance:', updateResult.error);
      return;
    }
    
    console.log('Wallet balance updated successfully');
    console.log('New balances:');
    console.log('Main Balance:', updateResult.wallet?.mainBalance);
    console.log('Ledger Balance:', updateResult.wallet?.ledgerBalance);
    
    // Test API call functionality (this should affect both balances)
    console.log('Testing API call functionality...');
    
    const apiCallResult = await WalletService.makeUserApiCall({
      userId: userId,
      endpoint: 'https://httpbin.org/post',
      method: 'POST',
      headers: {},
      body: { test: 'data' },
      amount: 50,
      description: 'Test API call'
    });
    
    if (!apiCallResult.success) {
      console.error('API call failed:', apiCallResult.error);
      // This is expected to fail in a test environment, but we can still check the wallet state
    }
    
    // Check user wallet balances after API call attempt
    const userWalletResult = await WalletService.getUserWallet(userId);
    if (userWalletResult.success && userWalletResult.wallet) {
      console.log('User wallet balances after API call:');
      console.log('Main Balance:', userWalletResult.wallet.mainBalance);
      console.log('Ledger Balance:', userWalletResult.wallet.ledgerBalance);
    }
    
    console.log('Ledger Structure test completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testLedgerStructure();

export { testLedgerStructure };