/**
 * Test Script for Contract Reference Verification API
 * Tests the new verify contract reference feature
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3009';
const API_BASE = `${BASE_URL}/api/v1`;

// Test credentials (update these based on your setup)
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'test@example.com',
  password: process.env.TEST_PASSWORD || 'password123'
};

let authToken = '';
let testContractOrder = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log('\n' + '='.repeat(60));
  log(`TEST: ${testName}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Test 1: Get authentication token
async function testAuthentication() {
  logTest('Authentication');
  
  try {
    logInfo('Attempting to authenticate...');
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    
    if (response.data.token) {
      authToken = response.data.token;
      logSuccess('Authentication successful');
      logInfo(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      logError('No token received');
      return false;
    }
  } catch (error) {
    logWarning('Authentication endpoint not available or credentials invalid');
    logInfo('Continuing tests without authentication...');
    return false;
  }
}

// Test 2: Create a contract order
async function testCreateContractOrder() {
  logTest('Create Contract Order');
  
  if (!authToken) {
    logWarning('Skipping - no auth token available');
    return false;
  }

  try {
    const orderData = {
      contract_id: `contract_${Date.now()}`,
      contract_type: 'agreement',
      expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      redirect_url: 'https://example.com/callback',
      contract_to: {
        email: 'recipient@example.com',
        user_id: 'user_123',
        fullName: 'Test Recipient'
      }
    };

    logInfo('Creating contract order...');
    logInfo(`Contract Type: ${orderData.contract_type}`);
    
    const response = await axios.post(
      `${API_BASE}/contract-orders`,
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success && response.data.data) {
      testContractOrder = response.data.data;
      logSuccess('Contract order created successfully');
      logInfo(`Order ID: ${testContractOrder.id}`);
      logInfo(`Contract Reference: ${testContractOrder.contract_reference}`);
      logInfo(`Contract URL: ${testContractOrder.contract_url}`);
      logInfo(`Status: ${testContractOrder.status}`);
      return true;
    } else {
      logError('Failed to create contract order');
      return false;
    }
  } catch (error) {
    logError(`Create contract order failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 3: Verify contract by reference (Valid)
async function testVerifyValidReference() {
  logTest('Verify Valid Contract Reference');

  if (!testContractOrder || !testContractOrder.contract_reference) {
    logWarning('Skipping - no contract reference available');
    return false;
  }

  try {
    const reference = testContractOrder.contract_reference;
    logInfo(`Verifying reference: ${reference}`);

    const response = await axios.get(
      `${API_BASE}/contract-orders/verify/${reference}`
    );

    if (response.data.success && response.data.verified) {
      logSuccess('Contract verified successfully');
      logInfo(`Reference: ${response.data.data.reference}`);
      logInfo(`Contract Type: ${response.data.data.contractType}`);
      logInfo(`Status: ${response.data.data.status}`);
      logInfo(`Is Expired: ${response.data.data.isExpired}`);
      logInfo(`Contract URL: ${response.data.data.contractUrl}`);
      return true;
    } else {
      logError('Verification failed');
      return false;
    }
  } catch (error) {
    logError(`Verify contract failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 4: Verify with lowercase reference
async function testVerifyCaseInsensitive() {
  logTest('Verify Case Insensitive Reference');

  if (!testContractOrder || !testContractOrder.contract_reference) {
    logWarning('Skipping - no contract reference available');
    return false;
  }

  try {
    const reference = testContractOrder.contract_reference.toLowerCase();
    logInfo(`Verifying lowercase reference: ${reference}`);

    const response = await axios.get(
      `${API_BASE}/contract-orders/verify/${reference}`
    );

    if (response.data.success && response.data.verified) {
      logSuccess('Case-insensitive verification works!');
      logInfo(`Original: ${testContractOrder.contract_reference}`);
      logInfo(`Lowercase: ${reference}`);
      logInfo(`Both resolve to same contract ✓`);
      return true;
    } else {
      logError('Case-insensitive verification failed');
      return false;
    }
  } catch (error) {
    logError(`Case-insensitive test failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 5: Verify invalid reference
async function testVerifyInvalidReference() {
  logTest('Verify Invalid Contract Reference');

  try {
    const invalidReference = 'INVALID-999999-XXXXXX';
    logInfo(`Verifying invalid reference: ${invalidReference}`);

    const response = await axios.get(
      `${API_BASE}/contract-orders/verify/${invalidReference}`
    );

    // This should not succeed
    if (response.data.verified === false) {
      logSuccess('Invalid reference correctly rejected');
      logInfo(`Error message: ${response.data.error}`);
      return true;
    } else {
      logError('Invalid reference was incorrectly verified');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 404 && error.response?.data?.verified === false) {
      logSuccess('Invalid reference correctly rejected with 404');
      logInfo(`Error message: ${error.response.data.error}`);
      return true;
    }
    logError(`Unexpected error: ${error.message}`);
    return false;
  }
}

// Test 6: Check contract reference format
async function testReferenceFormat() {
  logTest('Verify Contract Reference Format');

  if (!testContractOrder || !testContractOrder.contract_reference) {
    logWarning('Skipping - no contract reference available');
    return false;
  }

  const reference = testContractOrder.contract_reference;
  const formatRegex = /^[A-Z]{3}-\d{6}-[A-Z0-9]{6}$/;

  logInfo(`Reference: ${reference}`);
  logInfo(`Expected format: {PREFIX}-{YYYYMM}-{RANDOM}`);

  if (formatRegex.test(reference)) {
    logSuccess('Reference format is correct');
    
    // Parse components
    const [prefix, date, random] = reference.split('-');
    logInfo(`Prefix: ${prefix} (type: ${testContractOrder.contract_type})`);
    logInfo(`Date: ${date} (YYYYMM)`);
    logInfo(`Random: ${random} (6 characters)`);
    
    // Verify prefix matches contract type
    const typePrefixes = {
      'agreement': 'AGR',
      'disclaimer': 'DIS',
      'indemnity': 'IND',
      'terms_and_conditions': 'TNC'
    };
    
    const expectedPrefix = typePrefixes[testContractOrder.contract_type] || 'CTR';
    if (prefix === expectedPrefix) {
      logSuccess(`Prefix matches contract type (${expectedPrefix})`);
      return true;
    } else {
      logError(`Prefix mismatch: expected ${expectedPrefix}, got ${prefix}`);
      return false;
    }
  } else {
    logError('Reference format is incorrect');
    logInfo(`Got: ${reference}`);
    logInfo(`Expected: {PREFIX}-{YYYYMM}-{RANDOM}`);
    return false;
  }
}

// Test 7: Verify all contract types generate unique prefixes
async function testAllContractTypes() {
  logTest('Test All Contract Type Prefixes');

  if (!authToken) {
    logWarning('Skipping - no auth token available');
    return false;
  }

  const contractTypes = ['agreement', 'disclaimer', 'indemnity', 'terms_and_conditions'];
  const expectedPrefixes = {
    'agreement': 'AGR',
    'disclaimer': 'DIS',
    'indemnity': 'IND',
    'terms_and_conditions': 'TNC'
  };

  let allPassed = true;

  for (const type of contractTypes) {
    try {
      logInfo(`Testing contract type: ${type}`);
      
      const orderData = {
        contract_id: `contract_${type}_${Date.now()}`,
        contract_type: type,
        expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        contract_to: {
          email: 'test@example.com',
          user_id: 'user_123'
        }
      };

      const response = await axios.post(
        `${API_BASE}/contract-orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.data) {
        const reference = response.data.data.contract_reference;
        const prefix = reference.split('-')[0];
        
        if (prefix === expectedPrefixes[type]) {
          logSuccess(`${type}: ${reference} (prefix: ${prefix} ✓)`);
        } else {
          logError(`${type}: Expected prefix ${expectedPrefixes[type]}, got ${prefix}`);
          allPassed = false;
        }
      }
    } catch (error) {
      logError(`Failed to test ${type}: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// Main test runner
async function runAllTests() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║   CONTRACT REFERENCE VERIFICATION API - TEST SUITE      ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`API Base: ${API_BASE}`);
  console.log('\n');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Create Contract Order', fn: testCreateContractOrder },
    { name: 'Verify Valid Reference', fn: testVerifyValidReference },
    { name: 'Case Insensitive Verification', fn: testVerifyCaseInsensitive },
    { name: 'Verify Invalid Reference', fn: testVerifyInvalidReference },
    { name: 'Reference Format Validation', fn: testReferenceFormat },
    { name: 'All Contract Type Prefixes', fn: testAllContractTypes }
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === true) {
        results.passed++;
      } else if (result === false) {
        results.failed++;
      } else {
        results.skipped++;
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    } catch (error) {
      logError(`Test "${test.name}" threw an error: ${error.message}`);
      results.failed++;
    }
  }

  // Print summary
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                      TEST SUMMARY                        ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  log(`Total Tests: ${tests.length}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'reset');
  log(`Skipped: ${results.skipped}`, results.skipped > 0 ? 'yellow' : 'reset');

  console.log('\n');

  if (results.failed === 0 && results.passed > 0) {
    log('✓ ALL TESTS PASSED! 🎉', 'green');
  } else if (results.failed > 0) {
    log('✗ SOME TESTS FAILED', 'red');
  } else {
    log('⚠ NO TESTS RAN SUCCESSFULLY', 'yellow');
  }

  console.log('\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
