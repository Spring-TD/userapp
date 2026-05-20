import { WalletService } from '../services/walletService';
import { MerchantWalletType, TransactionType } from '../models/Wallet';

/**
 * Simple test script to verify Treasury Wallet functionality
 */
async function testTreasuryFunctionality() {
  console.log('Testing Treasury Wallet functionality...\n');

  try {
    // Create a merchant with all wallets
    console.log('1. Creating all merchant wallets...');
    const merchantResult = await WalletService.createAllMerchantWallets('merchant_123', 'USD');

    if (merchantResult.success) {
      console.log('✓ All merchant wallets created successfully');
      merchantResult.wallets?.forEach(wallet => {
        console.log(`  - ${wallet.merchantWalletType}: ${wallet.id}`);
      });
    } else {
      console.log('✗ Failed to create merchant wallets:', merchantResult.error);
      return;
    }

    // Get the Treasury Wallet
    const treasuryResult = await WalletService.getSettlementWallet('merchant_123');
    if (!treasuryResult.success || !treasuryResult.wallet) {
      console.log('✗ Failed to get Treasury Wallet');
      return;
    }

    console.log('\n2. Treasury Wallet ID:', treasuryResult.wallet.id);

    // Create a user wallet
    console.log('\n3. Creating user wallet...');
    const userResult = await WalletService.createUserWallet({
      userId: 'user_456',
      merchantId: 'merchant_123',
      name: 'John Doe Personal Wallet',
      currency: 'USD'
    });

    if (userResult.success) {
      console.log('✓ User wallet created successfully');
      console.log('  Wallet ID:', userResult.wallet?.id);
    } else {
      console.log('✗ Failed to create user wallet:', userResult.error);
      return;
    }

    // Add some balance to Treasury Wallet
    console.log('\n4. Adding balance to Treasury Wallet...');
    const depositResult = await WalletService.updateWalletBalance(
      treasuryResult.wallet.id,
      1000,
      'Initial deposit'
    );

    if (depositResult.success) {
      console.log('✓ Treasury Wallet balance updated successfully');
      console.log('  New balance:', depositResult.wallet?.balance);
    } else {
      console.log('✗ Failed to update Treasury Wallet balance:', depositResult.error);
      return;
    }

    // Transfer money from Treasury to User
    console.log('\n5. Transferring money from Treasury to User...');
    const transferResult = await WalletService.transferOut({
      fromWalletId: treasuryResult.wallet.id,
      toWalletId: userResult.wallet!.id,
      amount: 100,
      description: 'Transfer to user'
    });

    if (transferResult.success) {
      console.log('✓ Money transferred successfully');
      console.log('  Treasury balance:', transferResult.fromWallet?.balance);
      console.log('  User balance:', transferResult.toWallet?.balance);
    } else {
      console.log('✗ Failed to transfer money:', transferResult.error);
      return;
    }

    // Debit user wallet
    console.log('\n6. Debiting user wallet...');
    const debitResult = await WalletService.debitUserWallet({
      userId: 'user_456',
      amount: 50,
      description: 'Service charge'
    });

    if (debitResult.success) {
      console.log('✓ User wallet debited successfully');
      console.log('  User balance:', debitResult.wallet?.balance);
    } else {
      console.log('✗ Failed to debit user wallet:', debitResult.error);
      return;
    }

    // Filter Treasury transactions
    console.log('\n7. Filtering Treasury transactions...');
    const filterResult = await WalletService.filterWalletTransactions(
      treasuryResult.wallet.id,
      {
        type: TransactionType.DEBIT
      }
    );

    if (filterResult.success) {
      console.log('✓ Treasury transactions filtered successfully');
      console.log('  Debit transactions count:', filterResult.transactions?.length);
    } else {
      console.log('✗ Failed to filter Treasury transactions:', filterResult.error);
      return;
    }

    console.log('\n=== All Treasury Wallet tests completed successfully ===');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testTreasuryFunctionality();
}

export { testTreasuryFunctionality };