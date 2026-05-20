import { WalletService } from '../services/walletService';
import { MerchantWalletType } from '../models/Wallet';

/**
 * Simple test script to verify wallet functionality
 */
async function testWalletFunctionality() {
  console.log('Testing Wallet Microservice functionality...\n');

  try {
    // Test 1: Create a merchant wallet
    console.log('1. Creating merchant wallet...');
    const merchantResult = await WalletService.createMerchantWallet({
      merchantId: 'merchant_123',
      name: 'ACME Business Wallet',
      currency: 'USD',
      merchantWalletType: MerchantWalletType.SETTLEMENT
    });

    if (merchantResult.success) {
      console.log('✓ Merchant wallet created successfully');
      console.log('  Wallet ID:', merchantResult.wallet?.id);
      console.log('  Balance:', merchantResult.wallet?.balance);
    } else {
      console.log('✗ Failed to create merchant wallet:', merchantResult.error);
    }

    // Test 2: Create a user wallet
    console.log('\n2. Creating user wallet...');
    const userResult = await WalletService.createUserWallet({
      userId: 'user_456',
      merchantId: 'merchant_123',
      name: 'John Doe Personal Wallet',
      currency: 'USD'
    });

    if (userResult.success) {
      console.log('✓ User wallet created successfully');
      console.log('  Wallet ID:', userResult.wallet?.id);
      console.log('  Balance:', userResult.wallet?.balance);
    } else {
      console.log('✗ Failed to create user wallet:', userResult.error);
    }

    // Test 3: Update merchant wallet balance
    console.log('\n3. Updating merchant wallet balance...');
    if (merchantResult.success && merchantResult.wallet) {
      const updateResult = await WalletService.updateWalletBalance(
        merchantResult.wallet.id,
        1000,
        'Initial deposit'
      );

      if (updateResult.success) {
        console.log('✓ Merchant wallet balance updated successfully');
        console.log('  New balance:', updateResult.wallet?.balance);
      } else {
        console.log('✗ Failed to update merchant wallet balance:', updateResult.error);
      }
    }

    // Test 4: Retrieve merchant wallet by type
    console.log('\n4. Retrieving merchant wallet by type...');
    if (merchantResult.success && merchantResult.wallet) {
      const getResult = await WalletService.getMerchantWalletByType('merchant_123', MerchantWalletType.SETTLEMENT);
      
      if (getResult.success) {
        console.log('✓ Merchant wallet retrieved successfully');
        console.log('  Balance:', getResult.wallet?.balance);
      } else {
        console.log('✗ Failed to retrieve merchant wallet:', getResult.error);
      }
    }

    console.log('\n=== Test completed ===');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testWalletFunctionality();
}

export { testWalletFunctionality };