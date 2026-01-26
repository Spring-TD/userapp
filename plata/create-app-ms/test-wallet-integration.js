const { WalletService } = require('./dist/services/walletService');

async function testWalletIntegration() {
  console.log('Testing wallet integration...');
  
  try {
    // Test creating a single merchant wallet
    console.log('\n1. Testing single merchant wallet creation...');
    const singleWalletResult = await WalletService.createMerchantWallet('test-app-123', 'TREASURY');
    console.log('Single wallet result:', JSON.stringify(singleWalletResult, null, 2));
    
    // Test creating all merchant wallets
    console.log('\n2. Testing all merchant wallets creation...');
    const allWalletsResult = await WalletService.createAllMerchantWallets('test-app-456');
    console.log('All wallets result:', JSON.stringify(allWalletsResult, null, 2));
    
    console.log('\n✅ Wallet integration tests completed!');
  } catch (error) {
    console.error('❌ Error in wallet integration tests:', error);
  }
}

testWalletIntegration();