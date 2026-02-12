/**
 * Booking Service Integration Tests
 *
 * Tests for booking creation with database interaction.
 * Verifies serializable transaction isolation and concurrent booking prevention.
 *
 * These tests require a test database and will be skipped if DATABASE_URL is not set.
 * Run with: DATABASE_URL=your_db_url npm test -- booking.integration
 */

// Skip all tests if no database URL is configured
// This prevents Prisma from being imported in jsdom environment
const skipIntegration = !process.env.DATABASE_URL;

if (skipIntegration) {
  describe('Booking Service Integration', () => {
    it.skip('requires DATABASE_URL to run integration tests', () => {
      // These tests require a real database connection
      // Set DATABASE_URL environment variable to run
    });
  });
} else {
  // Only import and run integration tests when DATABASE_URL is set
  require('./booking.integration.impl');
}

// Export for type checking
export {};
