#!/usr/bin/env npx ts-node

/**
 * Account-MS Connectivity Test Script
 * 
 * Tests the connection to the Account Management Microservice.
 * Run with: npx ts-node scripts/test-account-ms.ts
 * 
 * @created 2026-01-26
 */

const ACCOUNT_API_BASE = process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL || 'https://account-ms.fly.dev';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(
  name: string,
  url: string,
  options?: RequestInit
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        name,
        passed: true,
        message: `Status: ${response.status} - ${JSON.stringify(data).slice(0, 100)}...`,
        duration,
      };
    } else {
      const error = await response.text().catch(() => 'Unknown error');
      return {
        name,
        passed: false,
        message: `Status: ${response.status} - ${error.slice(0, 100)}`,
        duration,
      };
    }
  } catch (error: any) {
    return {
      name,
      passed: false,
      message: error.message || 'Connection failed',
      duration: Date.now() - startTime,
    };
  }
}

async function runTests() {
  log('\n========================================', 'cyan');
  log('  Account-MS Connectivity Test Suite', 'cyan');
  log('========================================\n', 'cyan');
  
  log(`Target: ${ACCOUNT_API_BASE}\n`, 'blue');
  
  const results: TestResult[] = [];
  
  // Test 1: Health Check
  log('Running tests...\n', 'yellow');
  
  results.push(await testEndpoint(
    'Health Check',
    `${ACCOUNT_API_BASE}/health`
  ));
  
  // Test 2: Products endpoint (via gateway)
  results.push(await testEndpoint(
    'Products API (Gateway)',
    `${ACCOUNT_API_BASE}/api/v1/products`
  ));
  
  // Test 3: Applications endpoint
  results.push(await testEndpoint(
    'Applications API',
    `${ACCOUNT_API_BASE}/api/v1/applications/`
  ));
  
  // Test 4: Pricing endpoint
  results.push(await testEndpoint(
    'Pricing API',
    `${ACCOUNT_API_BASE}/api/v1/pricing/product/test-product-id`
  ));
  
  // Print Results
  log('\n========================================', 'cyan');
  log('  Test Results', 'cyan');
  log('========================================\n', 'cyan');
  
  let passedCount = 0;
  let failedCount = 0;
  
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const statusColor = result.passed ? 'green' : 'red';
    
    if (result.passed) passedCount++;
    else failedCount++;
    
    log(`${status} - ${result.name} (${result.duration}ms)`, statusColor);
    log(`       ${result.message}\n`, 'reset');
  }
  
  log('========================================', 'cyan');
  log(`  Summary: ${passedCount} passed, ${failedCount} failed`, passedCount === results.length ? 'green' : 'yellow');
  log('========================================\n', 'cyan');
  
  // Exit with appropriate code
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
