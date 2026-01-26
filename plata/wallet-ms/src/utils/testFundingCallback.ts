import { WalletService } from '../services/walletService';
import { MerchantWalletType, TransactionType } from '../models/Wallet';

async function testFundingCallback() {
  console.log('Testing Funding Callback functionality...');
  
  // Test user ID and merchant ID
  const userId = 'test-user-003';
  const merchantId = 'test-merchant-003';
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
    console.log('Initial user wallet balance:', createUserResult.wallet?.balance);
    
    // Get the Treasury wallet to check initial balance
    const treasuryWalletResult = await WalletService.getTreasuryWallet(merchantId);
    if (!treasuryWalletResult.success || !treasuryWalletResult.wallet) {
      console.error('Failed to get Treasury wallet:', treasuryWalletResult.error);
      return;
    }
    
    console.log('Initial Treasury wallet balance:', treasuryWalletResult.wallet.balance);
    
    // Simulate a user wallet funding callback
    console.log('Simulating user wallet funding callback...');
    
    // This simulates what would happen when a payment provider calls our callback endpoint
    // In a real scenario, this would be an HTTP POST request to /api/v1/wallets/funding/callback
    const userFundingData = {
      walletId: createUserResult.wallet!.id,
      amount: 500,
      currency: 'USD',
      transactionId: 'txn_user_funding_12345',
      paymentMethod: 'CARD',
      status: 'SUCCESS',
      description: 'Credit card funding for user wallet',
      providerReference: 'stripe_payment_67890'
    };
    
    // Process the user wallet funding (this is what the callback endpoint would do)
    const userResult = await WalletService.updateWalletBalance(
      userFundingData.walletId,
      userFundingData.amount,
      userFundingData.description
    );
    
    if (!userResult.success) {
      console.error('Failed to process user funding callback:', userResult.error);
      return;
    }
    
    console.log('User wallet funding callback processed successfully');
    console.log('New user wallet balance:', userResult.wallet?.balance);
    
    // Simulate a merchant wallet funding callback
    console.log('Simulating merchant wallet funding callback...');
    
    // This simulates what would happen when a payment provider calls our callback endpoint
    // for merchant wallet funding
    const merchantFundingData = {
      merchantId: merchantId,
      merchantWalletType: MerchantWalletType.TREASURY,
      amount: 1000,
      currency: 'USD',
      transactionId: 'txn_merchant_funding_12345',
      paymentMethod: 'BANK_TRANSFER',
      status: 'SUCCESS',
      description: 'Bank transfer funding for Treasury wallet',
      providerReference: 'bank_transfer_67890'
    };
    
    // Process the merchant wallet funding (this is what the callback endpoint would do)
    const merchantResult = await WalletService.updateWalletBalance(
      treasuryWalletResult.wallet!.id,
      merchantFundingData.amount,
      merchantFundingData.description
    );
    
    if (!merchantResult.success) {
      console.error('Failed to process merchant funding callback:', merchantResult.error);
      return;
    }
    
    console.log('Merchant wallet funding callback processed successfully');
    console.log('New Treasury wallet balance:', merchantResult.wallet?.balance);
    
    // Test filtering transactions to see the credit transactions
    console.log('Testing transaction filtering to see credit transactions...');
    const userFilterResult = await WalletService.filterUserTransactions(userId, {
      type: TransactionType.CREDIT
    });
    
    if (!userFilterResult.success) {
      console.error('Failed to filter user transactions:', userFilterResult.error);
      return;
    }
    
    console.log('User credit transactions count:', userFilterResult.transactions?.length);
    if (userFilterResult.transactions && userFilterResult.transactions.length > 0) {
      console.log('Latest user credit transaction:', userFilterResult.transactions[0]);
    }
    
    console.log('All Funding Callback tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testFundingCallback();

export { testFundingCallback };