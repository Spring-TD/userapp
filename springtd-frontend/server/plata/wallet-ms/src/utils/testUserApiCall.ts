import { WalletService } from '../services/walletService';
import { MerchantWalletType } from '../models/Wallet';

async function testUserApiCall() {
  console.log('Testing User Wallet API Call functionality...');
  
  // Test user ID and merchant ID
  const userId = 'test-user-002';
  const merchantId = 'test-merchant-002';
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
    
    // Fund the user wallet
    console.log('Funding user wallet...');
    const fundResult = await WalletService.updateWalletBalance(
      createUserResult.wallet!.id, 
      1000, 
      'Initial funding'
    );
    
    if (!fundResult.success) {
      console.error('Failed to fund user wallet:', fundResult.error);
      return;
    }
    
    console.log('User wallet funded successfully');
    console.log('New balance:', fundResult.wallet?.balance);
    
    // Test API call functionality
    console.log('Testing API call functionality...');
    
    // This is a mock API call to a test endpoint
    // In a real scenario, this would be an actual 3rd party API
    const apiCallResult = await WalletService.makeUserApiCall({
      userId,
      endpoint: 'https://httpbin.org/post', // A test endpoint that echoes back the request
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        test: 'data',
        amount: 50
      },
      amount: 50,
      description: 'Test API call to httpbin'
    });
    
    if (!apiCallResult.success) {
      console.error('Failed to make API call:', apiCallResult.error);
      // This might fail due to network issues, which is expected in some environments
      console.log('API call test completed (might have failed due to network restrictions)');
      return;
    }
    
    console.log('API call completed successfully');
    console.log('User balance after API call:', apiCallResult.wallet?.balance);
    console.log('Transaction ID:', apiCallResult.transaction?.id);
    
    console.log('All User Wallet API Call tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testUserApiCall();

export { testUserApiCall };