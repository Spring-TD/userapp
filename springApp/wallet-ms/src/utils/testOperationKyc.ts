import { WalletService } from '../services/walletService';
import { MerchantWalletType } from '../models/Wallet';

async function testOperationKycTransfers() {
  console.log('Testing Operation to KYC and KYC to Operation transfers...');
  
  // Test merchant ID
  const merchantId = 'test-merchant-001';
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
    
    // Fund the Operation wallet first
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
    
    // Test transfer from Operation to KYC
    console.log('Testing transfer from Operation to KYC...');
    const transfer1Result = await WalletService.transferFromBillingToKyc({
      merchantId,
      amount: 500,
      description: 'Transfer from Operation to KYC'
    });
    
    if (!transfer1Result.success) {
      console.error('Transfer from Operation to KYC failed:', transfer1Result.error);
      return;
    }
    
    console.log('Transfer from Operation to KYC successful');
    console.log('From wallet balance:', transfer1Result.fromWallet?.balance);
    console.log('To wallet balance:', transfer1Result.toWallet?.balance);
    
    // Test transfer from KYC to Operation
    console.log('Testing transfer from KYC to Operation...');
    const transfer2Result = await WalletService.transferFromKycToBilling({
      merchantId,
      amount: 200,
      description: 'Transfer from KYC to Operation'
    });
    
    if (!transfer2Result.success) {
      console.error('Transfer from KYC to Operation failed:', transfer2Result.error);
      return;
    }
    
    console.log('Transfer from KYC to Operation successful');
    console.log('From wallet balance:', transfer2Result.fromWallet?.balance);
    console.log('To wallet balance:', transfer2Result.toWallet?.balance);
    
    // Get final wallet balances
    const finalOperationWallet = await WalletService.getBillingWallet(merchantId);
    const finalKycWallet = await WalletService.getKycWallet(merchantId);
    
    if (finalOperationWallet.success && finalOperationWallet.wallet && 
        finalKycWallet.success && finalKycWallet.wallet) {
      console.log('Final Operation wallet balance:', finalOperationWallet.wallet.balance);
      console.log('Final KYC wallet balance:', finalKycWallet.wallet.balance);
    }
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testOperationKycTransfers();