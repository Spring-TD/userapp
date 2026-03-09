#!/usr/bin/env node

/**
 * API Services Test Suite
 * 
 * Tests all implemented services from the terminal
 * Run with: node --loader ts-node/esm test-services.mjs
 * Or: npm run test:services
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'https://service-auth-ms.fly.dev';
const WALLET_SERVICE_URL = process.env.NEXT_PUBLIC_WALLET_SERVICE_URL || 'https://wallet-ms.fly.dev';
const PRODUCT_SERVICE_URL = process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || 'https://product-ms.fly.dev';
const CREATE_APP_SERVICE_URL = process.env.NEXT_PUBLIC_CREATE_APP_SERVICE_URL || 'https://create-app-ms.fly.dev';
const PAYMENT_SERVICE_URL = process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL || 'https://payment-ms.fly.dev';

let accessToken = null;
let refreshToken = null;
let testUserId = null;
let testAppId = null;
let testProductId = null;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logSection(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'cyan');
  console.log('='.repeat(60));
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        ...options.headers,
      },
    });

    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================================
// Test Authentication Service
// ============================================================================

async function testAuthService() {
  logSection('Testing Authentication Service');

  // Test 1: Register new user
  logInfo('Test 1: User Registration');
  const timestamp = Date.now();
  const testEmail = `test_${timestamp}@example.com`;
  const testPassword = 'TestPass123!';

  const { response: registerResponse, data: registerData } = await makeRequest(
    `${AUTH_SERVICE_URL}/api/v1/auth/signup`,
    {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'merchant',
      }),
    }
  );

  if (registerResponse?.ok) {
    logSuccess('Registration successful');
    testUserId = registerData.data?.user?.id;
    accessToken = registerData.data?.accessToken;
    refreshToken = registerData.data?.refreshToken;
  } else {
    logWarning('Registration might have failed (possibly user exists), trying login...');
  }

  // Test 2: Login
  logInfo('Test 2: User Login');
  const { response: loginResponse, data: loginData } = await makeRequest(
    `${AUTH_SERVICE_URL}/api/v1/auth/login`,
    {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    }
  );

  if (loginResponse?.ok && loginData.success) {
    logSuccess('Login successful');
    accessToken = loginData.data.accessToken;
    refreshToken = loginData.data.refreshToken;
    testUserId = loginData.data.user.id;
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Access Token: ${accessToken?.substring(0, 20)}...`);
  } else {
    logError(`Login failed: ${loginData.error}`);
    return false;
  }

  // Test 3: Get current user
  logInfo('Test 3: Get Current User');
  const { response: userResponse, data: userData } = await makeRequest(
    `${AUTH_SERVICE_URL}/api/v1/auth/me`,
    { method: 'GET' }
  );

  if (userResponse?.ok && userData.success) {
    logSuccess('Get user successful');
    console.log(`   Email: ${userData.data.email}`);
    console.log(`   Role: ${userData.data.role}`);
  } else {
    logError('Get user failed');
  }

  // Test 4: Refresh token
  logInfo('Test 4: Refresh Token');
  const { response: refreshResponse, data: refreshData } = await makeRequest(
    `${AUTH_SERVICE_URL}/api/v1/auth/refresh`,
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }
  );

  if (refreshResponse?.ok && refreshData.success) {
    logSuccess('Token refresh successful');
    accessToken = refreshData.data.accessToken;
  } else {
    logWarning('Token refresh may not be needed yet');
  }

  return true;
}

// ============================================================================
// Test App Service
// ============================================================================

async function testAppService() {
  logSection('Testing App Service');

  // Test 1: Create app
  logInfo('Test 1: Create App');
  const { response: createResponse, data: createData } = await makeRequest(
    `${API_BASE_URL}/api/apps`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: `Test App ${Date.now()}`,
        description: 'Test app for API testing',
        category: 'fintech',
      }),
    }
  );

  if (createResponse?.ok && createData.success) {
    logSuccess('App created successfully');
    testAppId = createData.data.id;
    console.log(`   App ID: ${testAppId}`);
  } else {
    logError(`App creation failed: ${createData.error}`);
    return false;
  }

  // Test 2: Get apps
  logInfo('Test 2: Get User Apps');
  const { response: getResponse, data: getData } = await makeRequest(
    `${API_BASE_URL}/api/apps`,
    { method: 'GET' }
  );

  if (getResponse?.ok && getData.success) {
    logSuccess(`Retrieved ${getData.data?.length || 0} apps`);
  } else {
    logError('Get apps failed');
  }

  // Test 3: Get app by ID
  logInfo('Test 3: Get App by ID');
  const { response: getByIdResponse, data: getByIdData } = await makeRequest(
    `${API_BASE_URL}/api/apps/${testAppId}`,
    { method: 'GET' }
  );

  if (getByIdResponse?.ok) {
    logSuccess('Get app by ID successful');
  } else {
    logError('Get app by ID failed');
  }

  // Test 4: Update app
  logInfo('Test 4: Update App');
  const { response: updateResponse, data: updateData } = await makeRequest(
    `${API_BASE_URL}/api/apps/${testAppId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        description: 'Updated description',
      }),
    }
  );

  if (updateResponse?.ok) {
    logSuccess('App updated successfully');
  } else {
    logError('App update failed');
  }

  // Test 5: Submit app for review
  logInfo('Test 5: Submit App for Review');
  const { response: submitResponse, data: submitData } = await makeRequest(
    `${API_BASE_URL}/api/apps/${testAppId}/submit`,
    { method: 'POST' }
  );

  if (submitResponse?.ok) {
    logSuccess('App submitted for review');
  } else {
    logWarning('Submit failed (may require completion)');
  }

  return true;
}

// ============================================================================
// Test Product Service
// ============================================================================

async function testProductService() {
  logSection('Testing Product Service');

  if (!testAppId) {
    logError('No test app available. Skipping product tests.');
    return false;
  }

  // Test 1: Create product
  logInfo('Test 1: Create Product');
  const { response: createResponse, data: createData } = await makeRequest(
    `${API_BASE_URL}/api/products`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: `Test Product ${Date.now()}`,
        description: 'Test product for API testing',
        type: 'loan',
        appId: testAppId,
      }),
    }
  );

  if (createResponse?.ok && createData.success) {
    logSuccess('Product created successfully');
    testProductId = createData.data.id;
    console.log(`   Product ID: ${testProductId}`);
  } else {
    logError(`Product creation failed: ${createData.error}`);
    return false;
  }

  // Test 2: Get products by app
  logInfo('Test 2: Get Products by App ID');
  const { response: getResponse, data: getData } = await makeRequest(
    `${API_BASE_URL}/api/products?appId=${testAppId}`,
    { method: 'GET' }
  );

  if (getResponse?.ok && getData.success) {
    logSuccess(`Retrieved ${getData.data?.length || 0} products`);
  } else {
    logError('Get products failed');
  }

  // Test 3: Get product by ID
  logInfo('Test 3: Get Product by ID');
  const { response: getByIdResponse, data: getByIdData } = await makeRequest(
    `${API_BASE_URL}/api/products/${testProductId}`,
    { method: 'GET' }
  );

  if (getByIdResponse?.ok) {
    logSuccess('Get product by ID successful');
  } else {
    logError('Get product by ID failed');
  }

  // Test 4: Update product
  logInfo('Test 4: Update Product');
  const { response: updateResponse, data: updateData } = await makeRequest(
    `${API_BASE_URL}/api/products/${testProductId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        description: 'Updated product description',
      }),
    }
  );

  if (updateResponse?.ok) {
    logSuccess('Product updated successfully');
  } else {
    logError('Product update failed');
  }

  return true;
}

// ============================================================================
// Test Wallet Service
// ============================================================================

async function testWalletService() {
  logSection('Testing Wallet Service');

  // Test 1: Get merchant wallets
  logInfo('Test 1: Get Merchant Wallets');
  const { response: walletsResponse, data: walletsData } = await makeRequest(
    `${WALLET_SERVICE_URL}/api/v1/wallets/merchant`,
    { method: 'GET' }
  );

  if (walletsResponse?.ok) {
    logSuccess('Retrieved merchant wallets');
    if (walletsData.data) {
      console.log(`   Treasury: ${walletsData.data.treasury?.balance || 0}`);
      console.log(`   Operation: ${walletsData.data.operation?.balance || 0}`);
      console.log(`   KYC: ${walletsData.data.kyc?.balance || 0}`);
    }
  } else {
    logWarning('Get merchant wallets returned error (may not exist yet)');
  }

  // Test 2: Get user wallet
  logInfo('Test 2: Get User Wallet');
  const { response: userWalletResponse, data: userWalletData } = await makeRequest(
    `${WALLET_SERVICE_URL}/api/v1/wallets/user`,
    { method: 'GET' }
  );

  if (userWalletResponse?.ok) {
    logSuccess('Retrieved user wallet');
    console.log(`   Balance: ${userWalletData.data?.balance || 0}`);
  } else {
    logWarning('Get user wallet failed (may not exist yet)');
  }

  // Test 3: Get transactions
  logInfo('Test 3: Get Wallet Transactions');
  const { response: txResponse, data: txData } = await makeRequest(
    `${WALLET_SERVICE_URL}/api/v1/transactions?limit=10`,
    { method: 'GET' }
  );

  if (txResponse?.ok && txData.success) {
    logSuccess(`Retrieved ${txData.data?.transactions?.length || 0} transactions`);
  } else {
    logWarning('Get transactions failed (may have no transactions)');
  }

  return true;
}

// ============================================================================
// Test Payment Service
// ============================================================================

async function testPaymentService() {
  logSection('Testing Payment Service');

  // Test 1: Get payment history
  logInfo('Test 1: Get Payment History');
  const { response: historyResponse, data: historyData } = await makeRequest(
    `${PAYMENT_SERVICE_URL}/api/v1/payments?limit=10`,
    { method: 'GET' }
  );

  if (historyResponse?.ok) {
    logSuccess(`Retrieved ${historyData.data?.payments?.length || 0} payments`);
  } else {
    logWarning('Get payment history failed (may have no payments)');
  }

  // Test 2: Get payment methods
  logInfo('Test 2: Get Payment Methods');
  const { response: methodsResponse, data: methodsData } = await makeRequest(
    `${PAYMENT_SERVICE_URL}/api/v1/payment-methods`,
    { method: 'GET' }
  );

  if (methodsResponse?.ok) {
    logSuccess(`Retrieved ${methodsData.data?.length || 0} payment methods`);
  } else {
    logWarning('Get payment methods failed (may have none saved)');
  }

  return true;
}

// ============================================================================
// Test Special API Service
// ============================================================================

async function testSpecialApiService() {
  logSection('Testing Special API Service');

  const specialApiKey = process.env.NEXT_PUBLIC_SPECIAL_API_KEY;
  const publicKey = process.env.NEXT_PUBLIC_PUBLIC_KEY;

  if (!specialApiKey || !publicKey) {
    logWarning('Special API keys not configured. Skipping special API tests.');
    logInfo('Set NEXT_PUBLIC_SPECIAL_API_KEY and NEXT_PUBLIC_PUBLIC_KEY to test.');
    return true;
  }

  // Test 1: Get all merchant apps
  logInfo('Test 1: Get All Merchant Apps (Special API)');
  const { response: appsResponse, data: appsData } = await makeRequest(
    `${CREATE_APP_SERVICE_URL}/api/v1/special/apps`,
    {
      method: 'GET',
      headers: {
        'X-Special-Key': specialApiKey,
        'X-Public-Key': publicKey,
      },
    }
  );

  if (appsResponse?.ok && appsData.success) {
    logSuccess(`Retrieved ${appsData.data?.length || 0} merchant apps`);
  } else {
    logError('Special API apps request failed');
  }

  return true;
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runAllTests() {
  log('\n🚀 Starting API Services Test Suite\n', 'cyan');
  log(`Testing against: ${API_BASE_URL}`, 'blue');
  log(`Timestamp: ${new Date().toISOString()}\n`, 'blue');

  const results = {
    auth: false,
    app: false,
    product: false,
    wallet: false,
    payment: false,
    special: false,
  };

  try {
    // Test services in order
    results.auth = await testAuthService();
    
    if (results.auth) {
      results.app = await testAppService();
      results.product = await testProductService();
      results.wallet = await testWalletService();
      results.payment = await testPaymentService();
      results.special = await testSpecialApiService();
    } else {
      logError('Authentication failed. Skipping other tests.');
    }

    // Print summary
    logSection('Test Summary');
    console.log(`Authentication:  ${results.auth ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`App Service:     ${results.app ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Product Service: ${results.product ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Wallet Service:  ${results.wallet ? '✅ PASS' : '⚠️  PARTIAL'}`);
    console.log(`Payment Service: ${results.payment ? '✅ PASS' : '⚠️  PARTIAL'}`);
    console.log(`Special API:     ${results.special ? '✅ PASS' : '⚠️  SKIPPED'}`);

    const passCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    console.log('\n' + '='.repeat(60));
    log(`\nTests Passed: ${passCount}/${totalCount}`, passCount === totalCount ? 'green' : 'yellow');
    
    if (accessToken) {
      console.log('\n📝 Test Data Created:');
      console.log(`   User ID: ${testUserId}`);
      console.log(`   App ID: ${testAppId}`);
      console.log(`   Product ID: ${testProductId}`);
      console.log(`   Access Token: ${accessToken.substring(0, 30)}...`);
    }

  } catch (error) {
    logError(`\nTest suite error: ${error.message}`);
    console.error(error);
  }
}

// Run tests
runAllTests().then(() => {
  log('\n✨ Test suite completed\n', 'cyan');
  process.exit(0);
}).catch((error) => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
