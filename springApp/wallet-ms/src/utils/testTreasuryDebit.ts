import { WalletService } from '../services/walletService';
import { MerchantWalletType } from '../models/Wallet';

/**
 * Test script to verify Treasury Wallet debit functionality
 */
async function testTreasuryDebit() {
  console.log('Testing Treasury Wallet debit functionality...\n');

  try {
    // Create all merchant wallets
    console.log('1. Creating all merchant wallets...');
    const createResult = await WalletService.createAllMerchantWallets('merchant_123', 'USD');
    
    if (!createResult.success) {
      console.log('✗ Failed to create merchant wallets:', createResult.error);
      return;
    }
    
    console.log('✓ All merchant wallets created successfully');

    // Add some balance to Treasury Wallet
    console.log('\n2. Adding balance to Treasury Wallet...');
    const treasuryResult = await WalletService.getSettlementWallet('merchant_123');
    if (!treasuryResult.success || !treasuryResult.wallet) {
      console.log('✗ Failed to get Treasury wallet');
      return;
    }

    const depositResult = await WalletService.updateWalletBalance(
      treasuryResult.wallet.id,
      1000,
      'Initial deposit'
    );

    if (!depositResult.success) {
      console.log('✗ Failed to add balance to Treasury wallet:', depositResult.error);
      return;
    }

    console.log('✓ Treasury Wallet balance updated successfully');
    console.log('  New balance:', depositResult.wallet?.balance);

    // Debit the Treasury Wallet
    console.log('\n3. Debiting Treasury Wallet...');
    const debitResult = await WalletService.debitSettlementWallet({
      merchantId: 'merchant_123',
      amount: 100,
      description: 'Service fee'
    });

    if (!debitResult.success) {
      console.log('✗ Failed to debit Treasury wallet:', debitResult.error);
      return;
    }

    console.log('✓ Treasury Wallet debited successfully');
    console.log('  New balance:', debitResult.wallet?.balance);

    console.log('\n=== Treasury Wallet debit test completed successfully ===');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}



// Run the test if this file is executed directly
if (require.main === module) {
  testTreasuryDebit();
}

export { testTreasuryDebit };