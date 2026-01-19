/**
 * Test runner script for billing-ms
 * This script sets up the environment and runs the Jest tests
 */

const { exec } = require('child_process');
const path = require('path');

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.WALLET_SERVICE_URL = 'http://localhost:3004';

console.log('Starting billing-ms tests...');

// Run Jest tests
const testProcess = exec('npx jest --verbose', {
  cwd: path.join(__dirname),
  env: process.env
});

testProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

testProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

testProcess.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});