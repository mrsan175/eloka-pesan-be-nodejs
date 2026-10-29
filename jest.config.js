module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^../config/database$': '<rootDir>/src/__tests__/mocks/prisma.mock.ts',
    '^../../config/database$': '<rootDir>/src/__tests__/mocks/prisma.mock.ts',
    '^../config/redis$': '<rootDir>/src/__tests__/mocks/redis.mock.ts',
    '^../../config/redis$': '<rootDir>/src/__tests__/mocks/redis.mock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000,
};
