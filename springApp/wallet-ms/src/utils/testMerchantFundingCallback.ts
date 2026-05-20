import { WalletService } from '../services/walletService';
import { MerchantWalletType } from '../models/Wallet';

async function testMerchantFundingCallback() {
  console.log('Testing Merchant Wallet Funding Callback functionality...');
  
  // Test merchant ID
  const merchantId = 'test-merchant-funding-001';
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
    
    // Get the Treasury wallet to check initial balance
    const treasuryWalletResult = await WalletService.getSettlementWallet(merchantId);
    if (!treasuryWalletResult.success || !treasuryWalletResult.wallet) {
      console.error('Failed to get Treasury wallet:', treasuryWalletResult.error);
      return;
    }
    
    console.log('Initial Treasury wallet balance:', treasuryWalletResult.wallet.balance);
    
    // Simulate a merchant wallet funding callback
    console.log('Simulating merchant wallet funding callback...');
    
    // This simulates what would happen when a payment provider calls our callback endpoint
    // for merchant wallet funding
    const fundingData = {
      merchantId: merchantId,
      merchantWalletType: MerchantWalletType.SETTLEMENT,
      amount: 1000,
      currency: 'USD',
      transactionId: 'txn_merchant_funding_12345',
      paymentMethod: 'BANK_TRANSFER',
      status: 'SUCCESS',
      description: 'Bank transfer funding for Treasury wallet',
      providerReference: 'bank_transfer_67890'
    };
    
    // Process the funding (this is what the callback endpoint would do)
    const result = await WalletService.updateWalletBalance(
      treasuryWalletResult.wallet!.id,
      fundingData.amount,
      fundingData.description
    );
    
    if (!result.success) {
      console.error('Failed to process merchant funding callback:', result.error);
      return;
    }
    
    console.log('Merchant wallet funding callback processed successfully');
    console.log('New Treasury wallet balance:', result.wallet?.balance);
    
    console.log('All Merchant Wallet Funding Callback tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testMerchantFundingCallback();

export { testMerchantFundingCallback };