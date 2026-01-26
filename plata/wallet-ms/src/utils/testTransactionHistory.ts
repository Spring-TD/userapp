import { WalletService } from '../services/walletService';
import { TransactionService } from '../services/transactionService';
import { MerchantWalletType } from '../models/Wallet';

async function testTransactionHistory() {
  console.log('Testing Transaction History API...');
  
  const merchantId = 'test-merchant-txn-history';
  const currency = 'USD';
  
  try {
    // Create merchant wallets
    console.log('1. Creating merchant wallets...');
    const createResult = await WalletService.createAllMerchantWallets(merchantId, currency);
    if (!createResult.success) {
      console.error('Failed to create merchant wallets:', createResult.error);
      return;
    }
    console.log('✓ Merchant wallets created');
    
    // Get Treasury wallet
    const treasuryResult = await WalletService.getTreasuryWallet(merchantId);
    if (!treasuryResult.success || !treasuryResult.wallet) {
      console.error('Failed to get Treasury wallet');
      return;
    }
    const treasuryWalletId = treasuryResult.wallet.id;
    console.log('✓ Treasury wallet ID:', treasuryWalletId);
    
    // Perform several transactions to create history
    console.log('\n2. Creating transaction history...');
    
    // Transaction 1: Fund wallet
    await WalletService.updateWalletBalance(
      treasuryWalletId,
      1000,
      'Initial funding'
    );
    console.log('✓ Transaction 1: Funded with 1000');
    
    // Transaction 2: Add more funds
    await WalletService.updateWalletBalance(
      treasuryWalletId,
      500,
      'Additional funding'
    );
    console.log('✓ Transaction 2: Added 500');
    
    // Transaction 3: Debit some amount
    await WalletService.debitTreasuryWallet({
      merchantId,
      amount: 200,
      description: 'Treasury debit test'
    });
    console.log('✓ Transaction 3: Debited 200');
    
    // Get transaction history using the service
    console.log('\n3. Fetching transaction history...');
    const historyResult = await TransactionService.getTransactionHistory(treasuryWalletId);
    
    if (!historyResult.success) {
      console.error('Failed to get transaction history:', historyResult.error);
      return;
    }
    
    console.log('✓ Transaction history retrieved successfully');
    console.log('  Total transactions:', historyResult.transactions?.length);
    
    if (historyResult.transactions && historyResult.transactions.length > 0) {
      console.log('\n  Transaction Details:');
      historyResult.transactions.forEach((txn, index) => {
        console.log(`  ${index + 1}. ${txn.type} - ${txn.amount} ${txn.description}`);
        console.log(`     Balance: ${txn.balanceBefore} → ${txn.balanceAfter}`);
        console.log(`     Status: ${txn.status}`);
      });
    }
    
    // Get final wallet balance
    const finalWalletResult = await WalletService.getTreasuryWallet(merchantId);
    if (finalWalletResult.success && finalWalletResult.wallet) {
      console.log('\n4. Final Treasury wallet balance:', finalWalletResult.wallet.balance);
    }
    
    console.log('\n✓ All Transaction History tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Execute the test
testTransactionHistory().catch(console.error);
