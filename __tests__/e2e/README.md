# E2E Tests

End-to-end tests using Playwright to test critical user flows in the application.

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (recommended for development)
npm run test:e2e:ui

# Run in headed mode (see the browser)
npm run test:e2e:headed

# Debug tests (opens inspector)
npm run test:e2e:debug

# View HTML report
npm run test:e2e:report
```

## Test Structure

- `auth.setup.ts` - Authenticates as admin before tests run
- `admin-calendar.spec.ts` - Tests admin calendar functionality
- `booking-flow.spec.ts` - Tests user booking journey

## Environment Setup

The tests use your local development server (`npm run dev`) which is automatically started by Playwright.

Make sure you have:
1. Database running and seeded with test data
2. Environment variables configured (`.env`)
3. Admin credentials set in `.env`:
   ```
   ADMIN_USERNAME=your-admin-username
   ADMIN_PASSWORD=your-admin-password
   ADMIN_SESSION_SECRET=your-secret-key
   ```

## Writing New Tests

See [Playwright documentation](https://playwright.dev/docs/writing-tests) for detailed guidance.

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page')
  })

  test('should do something', async ({ page }) => {
    // Arrange
    await page.click('[data-testid="button"]')

    // Act
    await page.fill('input[name="field"]', 'value')
    await page.click('[type="submit"]')

    // Assert
    await expect(page.getByText('Success')).toBeVisible()
  })
})
```

## Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByText`, `getByLabel` over CSS selectors
2. **Add data-testid**: For elements that need stable selectors
3. **Wait for state**: Use `waitForLoadState('networkidle')` when needed
4. **Test critical paths**: Focus on user journeys, not implementation details
5. **Keep tests independent**: Each test should be runnable in isolation

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```
