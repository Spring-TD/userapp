/**
 * Test script to simulate a merchant wallet funding webhook call
 * This simulates what a payment provider would send to our callback endpoint
 */

import axios from 'axios';

async function testMerchantFundingWebhook() {
  console.log('Testing Merchant Wallet Funding Webhook...');
  
  // Test merchant ID
  const merchantId = 'test-merchant-funding-001';
  
  // Simulate a webhook call from a payment provider
  const webhookPayload = {
    merchantId: merchantId,
    merchantWalletType: 'REPAYMENT',
    amount: 2500,
    currency: 'USD',
    transactionId: 'txn_ext_98765',
    paymentMethod: 'BANK_TRANSFER',
    status: 'SUCCESS',
    description: 'Bank transfer funding from external provider',
    providerReference: 'external_bank_ref_45678'
  };
  
  try {
    console.log('Sending webhook payload to funding callback endpoint...');
    console.log('Payload:', JSON.stringify(webhookPayload, null, 2));
    
    // In a real scenario, this would be sent to:
    // POST http://your-wallet-service.com/api/v1/wallets/funding/callback
    // For testing locally, you would need to run the service and send to localhost
    
    console.log('\nTo test this webhook in a real environment:');
    console.log('1. Start the wallet microservice');
    console.log('2. Send a POST request to /api/v1/wallets/funding/callback with the payload above');
    console.log('3. Verify the merchant Treasury wallet balance is updated');
    
    console.log('\nWebhook test preparation completed!');
  } catch (error) {
    console.error('Webhook test failed with error:', error);
  }
}

// Run the test
testMerchantFundingWebhook();

export { testMerchantFundingWebhook };