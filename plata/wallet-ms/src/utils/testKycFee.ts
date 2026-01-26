import { WalletService } from '../services/walletService';
import { MerchantWalletType } from '../models/Wallet';

async function testKycFeeProcessing() {
  console.log('Testing KYC Fee Processing...');
  
  // Test merchant ID
  const merchantId = 'test-merchant-004';
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
    
    // Fund the KYC wallet
    console.log('Funding KYC wallet...');
    const kycWallet = await WalletService.getKycWallet(merchantId);
    if (kycWallet.success && kycWallet.wallet) {
      const fundResult = await WalletService.updateWalletBalance(
        kycWallet.wallet.id, 
        1000, 
        'Initial funding for KYC operations'
      );
      if (!fundResult.success) {
        console.error('Failed to fund KYC wallet:', fundResult.error);
        return;
      }
      console.log('KYC wallet funded successfully');
    }
    
    // Test processing a KYC fee
    console.log('Processing KYC fee...');
    const feeResult = await WalletService.processKycFee(
      merchantId,
      50,
      'Business KYC Verification Fee'
    );
    
    if (!feeResult.success) {
      console.error('Failed to process KYC fee:', feeResult.error);
      return;
    }
    
    console.log('KYC fee processed successfully');
    console.log('New KYC wallet balance:', feeResult.wallet?.balance);
    
    // Verify the transaction was recorded correctly
    if (feeResult.transaction) {
      console.log('Transaction details:');
      console.log('  Amount:', feeResult.transaction.amount);
      console.log('  Type:', feeResult.transaction.type);
      console.log('  Description:', feeResult.transaction.description);
      console.log('  Reference ID:', feeResult.transaction.referenceId);
    }
    
    // Test processing another fee
    console.log('Processing second KYC fee...');
    const feeResult2 = await WalletService.processKycFee(
      merchantId,
      25,
      'Individual KYC Verification Fee'
    );
    
    if (!feeResult2.success) {
      console.error('Failed to process second KYC fee:', feeResult2.error);
      return;
    }
    
    console.log('Second KYC fee processed successfully');
    console.log('Final KYC wallet balance:', feeResult2.wallet?.balance);
    
    // Test with insufficient funds
    console.log('Testing with insufficient funds...');
    const feeResult3 = await WalletService.processKycFee(
      merchantId,
      10000,
      'Large fee test'
    );
    
    if (feeResult3.success) {
      console.error('Should have failed with insufficient funds');
      return;
    }
    
    console.log('Correctly rejected transaction with insufficient funds:', feeResult3.error);
    
    // Test with invalid amount
    console.log('Testing with invalid amount...');
    const feeResult4 = await WalletService.processKycFee(
      merchantId,
      -10,
      'Invalid fee test'
    );
    
    if (feeResult4.success) {
      console.error('Should have failed with invalid amount');
      return;
    }
    
    console.log('Correctly rejected transaction with invalid amount:', feeResult4.error);
    
    console.log('All KYC Fee Processing tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testKycFeeProcessing();