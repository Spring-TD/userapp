// Test setup file
import { clearMockData, seedMockData } from '../utils/mockDb';
import { clearAuditLogs } from '../utils/audit';

// Setup before each test
beforeEach(() => {
  // Clear all mock data
  clearMockData();
  clearAuditLogs();
  
  // Seed fresh test data
  seedMockData();
});

// Global test configuration
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Add a simple test to ensure the test suite has at least one test
describe('Test Setup', () => {
  it('should have a working test environment', () => {
    expect(true).toBe(true);
  });
});