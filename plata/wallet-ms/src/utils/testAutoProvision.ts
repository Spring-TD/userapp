import { WalletService } from '../services/walletService';
import { MerchantWalletType } from '../models/Wallet';

/**
 * Test script to verify automatic provisioning of merchant wallets
 */
async function testAutoProvisioning() {
  console.log('Testing automatic provisioning of merchant wallets...\n');

  try {
    // Create just one merchant wallet type
    console.log('1. Creating a single Treasury wallet for merchant...');
    const result = await WalletService.createMerchantWallet({
      merchantId: 'merchant_123',
      name: 'Test Treasury Wallet',
      currency: 'USD',
      merchantWalletType: MerchantWalletType.TREASURY
    });

    if (result.success) {
      console.log('✓ Treasury wallet created successfully');
      console.log('  Wallet ID:', result.wallet?.id);
    } else {
      console.log('✗ Failed to create Treasury wallet:', result.error);
      return;
    }

    // Check if all three wallet types were automatically created
    console.log('\n2. Checking if all wallet types were automatically created...');
    const allWalletsResult = await WalletService.getAllMerchantWallets('merchant_123');
    
    if (allWalletsResult.success && allWalletsResult.wallets) {
      console.log('✓ All merchant wallets retrieved successfully');
      console.log('  Total wallets found:', allWalletsResult.wallets.length);
      
      const walletTypes = allWalletsResult.wallets.map(wallet => wallet.merchantWalletType);
      console.log('  Wallet types:', walletTypes.join(', '));
      
      // Verify all three types exist
      const hasTreasury = walletTypes.includes(MerchantWalletType.TREASURY);
      const hasOperation = walletTypes.includes(MerchantWalletType.OPERATION);
      const hasKYC = walletTypes.includes(MerchantWalletType.KYC);
      
      if (hasTreasury && hasOperation && hasKYC) {
        console.log('✓ All three wallet types (Treasury, Operation, KYC) were automatically created!');
      } else {
        console.log('✗ Missing wallet types:');
        if (!hasTreasury) console.log('  - Treasury');
        if (!hasOperation) console.log('  - Operation');
        if (!hasKYC) console.log('  - KYC');
      }
    } else {
      console.log('✗ Failed to retrieve merchant wallets:', allWalletsResult.error);
    }

    console.log('\n=== Test completed ===');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAutoProvisioning();
}

export { testAutoProvisioning };