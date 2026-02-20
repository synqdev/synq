/**
 * Jest Configuration for SYNQ
 *
 * Uses next/jest for Next.js 15 compatibility with:
 * - TypeScript support via SWC
 * - Path alias resolution (@/*)
 * - jsdom test environment for React components
 *
 * Global thresholds relaxed; critical business logic files require 100%.
 * Integration tests excluded by default (require DATABASE_URL).
 */

import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

const config: Config = {
  // Use v8 for faster coverage collection
  coverageProvider: 'v8',

  // jsdom for React component testing
  testEnvironment: 'jsdom',

  // Setup file for jest-dom matchers and global mocks
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Path alias mapping — specific patterns must come before the catch-all
  moduleNameMapper: {
    '^@/emails/(.*)$': '<rootDir>/emails/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Patterns to ignore during test collection
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    // Skip integration tests by default (require DATABASE_URL and node environment)
    // Run with: npm test -- --testPathIgnorePatterns=''
    '<rootDir>/__tests__/integration/',
  ],

  // Files to collect coverage from (focused on critical business logic)
  collectCoverageFrom: [
    // Core business logic - must be well tested
    'src/lib/services/**/*.ts',
    'src/lib/utils/**/*.ts',
    'src/lib/validations/**/*.ts',
    // Exclude type definitions and index files
    '!**/*.d.ts',
    '!**/index.ts',
  ],

  // Coverage thresholds for MVP
  // Focus on critical business logic - UI components tested via E2E later
  coverageThreshold: {
    // Global: relaxed for MVP phase
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    // Critical business logic must be 100% covered
    'src/lib/services/availability.service.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/lib/utils/time.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/lib/validations/booking.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output for debugging
  verbose: true,
};

export default createJestConfig(config);
