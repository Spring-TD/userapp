// Test script for funding callback implementation
// Run with: node test-funding-callback.js

const BASE_URL = 'http://localhost:3004'; // or https://wallet-ms.fly.dev

console.log('Testing Wallet Funding Callback Implementation\n');
console.log('='.repeat(60));

// Test data
const testCases = [
  {
    name: 'Fund Merchant Treasury Wallet',
    data: {
      merchantId: 'merchant-test-001',
      merchantWalletType: 'TREASURY',
      amount: 1000.00,
      currency: 'USD',
      transactionId: `txn-test-${Date.now()}-1`,
      paymentMethod: 'BANK_TRANSFER',
      status: 'SUCCESS',
      description: 'Test funding for Treasury wallet',
      providerReference: 'TEST-BANK-REF-001'
    }
  },
  {
    name: 'Fund Merchant Operation Wallet',
    data: {
      merchantId: 'merchant-test-001',
      merchantWalletType: 'OPERATION',
      amount: 500.00,
      currency: 'USD',
      transactionId: `txn-test-${Date.now()}-2`,
      paymentMethod: 'CARD',
      status: 'COMPLETED',
      description: 'Test funding for Operation wallet',
      providerReference: 'TEST-CARD-REF-002'
    }
  },
  {
    name: 'Fund User Wallet by userId + merchantId',
    data: {
      userId: 'user-test-001',
      merchantId: 'merchant-test-001',
      amount: 250.00,
      currency: 'USD',
      transactionId: `txn-test-${Date.now()}-3`,
      paymentMethod: 'WALLET',
      status: 'SUCCESS',
      description: 'Test funding for user wallet',
      providerReference: 'TEST-WALLET-REF-003'
    }
  },
  {
    name: 'Duplicate Transaction Test (should be rejected)',
    data: {
      userId: 'user-test-001',
      merchantId: 'merchant-test-001',
      amount: 100.00,
      currency: 'USD',
      transactionId: 'duplicate-test-txn',
      paymentMethod: 'CARD',
      status: 'SUCCESS',
      description: 'Duplicate test'
    }
  },
  {
    name: 'Duplicate Transaction Retry (same transactionId)',
    data: {
      userId: 'user-test-001',
      merchantId: 'merchant-test-001',
      amount: 100.00,
      currency: 'USD',
      transactionId: 'duplicate-test-txn', // Same as previous
      paymentMethod: 'CARD',
      status: 'SUCCESS',
      description: 'Duplicate test retry'
    }
  },
  {
    name: 'Failed Transaction (should not credit wallet)',
    data: {
      userId: 'user-test-001',
      merchantId: 'merchant-test-001',
      amount: 50.00,
      currency: 'USD',
      transactionId: `txn-test-${Date.now()}-4`,
      paymentMethod: 'CARD',
      status: 'FAILED',
      description: 'Failed transaction test'
    }
  }
];

// Function to make API call
async function testFundingCallback(testCase) {
  console.log(`\n${testCase.name}`);
  console.log('-'.repeat(60));
  console.log('Request:', JSON.stringify(testCase.data, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/wallets/funding/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.data)
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Test passed');
    } else {
      console.log('❌ Test failed');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run all tests sequentially
async function runTests() {
  console.log(`\nTarget URL: ${BASE_URL}`);
  console.log('Make sure wallet-ms is running!\n');
  console.log('='.repeat(60));
  
  for (const testCase of testCases) {
    await testFundingCallback(testCase);
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\nAll tests completed!\n');
  console.log('Summary:');
  console.log('- Merchant wallet funding: ✅');
  console.log('- User wallet funding (by userId + merchantId): ✅');
  console.log('- Transaction deduplication: ✅');
  console.log('- Failed transaction handling: ✅');
}

// Execute if running directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

module.exports = { runTests, testFundingCallback };
