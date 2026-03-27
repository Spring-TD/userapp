// Test setup file
// This file is run before all tests

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test_db';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['JWT_SECRET'] = 'test-jwt-secret-key-for-testing-purposes-only';
process.env['SMTP_HOST'] = 'smtp.test.com';
process.env['SMTP_USER'] = 'test@test.com';
process.env['SMTP_PASS'] = 'test-password';
process.env['FROM_EMAIL'] = 'noreply@test.com';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test database and Redis connections
beforeAll(async () => {
  // Database setup will be implemented in task 2
});

afterAll(async () => {
  // Cleanup connections will be implemented in task 2
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});