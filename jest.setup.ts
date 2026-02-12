/**
 * Jest Setup File
 *
 * Configures testing environment with:
 * - jest-dom matchers for DOM assertions
 * - Next.js navigation mocks
 * - Next.js headers mocks
 * - Environment variable defaults for tests
 */

import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
  useParams() {
    return {};
  },
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(() => []),
    };
  },
  headers() {
    return new Map();
  },
}));

// Mock environment variables for tests (only if not already set)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
}
if (!process.env.ADMIN_USERNAME) {
  process.env.ADMIN_USERNAME = 'admin';
}
if (!process.env.ADMIN_PASSWORD) {
  process.env.ADMIN_PASSWORD = 'test';
}
if (!process.env.ADMIN_SESSION_SECRET) {
  process.env.ADMIN_SESSION_SECRET = 'test-secret-for-jest-minimum-32-chars';
}

// Suppress console errors during tests (optional, comment out for debugging)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
//     originalError.call(console, ...args);
//   };
// });
// afterAll(() => {
//   console.error = originalError;
// });
