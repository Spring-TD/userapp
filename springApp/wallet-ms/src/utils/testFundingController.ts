import { WalletService } from '../services/walletService';
import { MerchantWalletType } from '../models/Wallet';

async function testFundingController() {
  console.log('Testing Funding Controller with New Balance Structure...');
  
  // Test merchant ID
  const merchantId = 'test-merchant-funding-002';
  const userId = 'test-user-funding-002';
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
    
    // Test the funding controller functionality
    console.log('Testing funding controller...');
    
    // Get initial balances
    const treasuryWalletResult = await WalletService.getSettlementWallet(merchantId);
    if (!treasuryWalletResult.success || !treasuryWalletResult.wallet) {
      console.error('Failed to get Treasury wallet:', treasuryWalletResult.error);
      return;
    }
    
    console.log('Initial Treasury wallet balances:');
    console.log('Main Balance:', treasuryWalletResult.wallet.mainBalance);
    console.log('Ledger Balance:', treasuryWalletResult.wallet.ledgerBalance);
    
    // Simulate what the funding controller would do
    const fundingResult = await WalletService.updateWalletBalance(
      treasuryWalletResult.wallet.id,
      1500,
      'Test funding via controller'
    );
    
    if (!fundingResult.success) {
      console.error('Funding failed:', fundingResult.error);
      return;
    }
    
    console.log('Funding successful');
    console.log('New Treasury wallet balances:');
    console.log('Main Balance:', fundingResult.wallet?.mainBalance);
    console.log('Ledger Balance:', fundingResult.wallet?.ledgerBalance);
    
    console.log('Funding Controller test completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testFundingController();

export { testFundingController };