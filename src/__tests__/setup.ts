import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6379';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  console.log('Setting up test environment...');
});

// Global teardown
afterAll(async () => {
  console.log('Tearing down test environment...');
});

// Reset between tests
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});
