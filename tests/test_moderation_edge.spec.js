const { test, expect } = require('@playwright/test');
const BASE_URL = 'http://localhost:5000';

test.describe('Edge Case Moderation', () => {
  test('blocks obfuscated hate speech', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('textarea[name="message"]', 'b\u0069got'); // Obfuscated 'bigot'
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toHaveText(/blocked/i);
  });

  test('accepts long positive post', async ({ page }) => {
    await page.goto(BASE_URL);
    const longMessage = 'a'.repeat(10000);
    await page.fill('textarea[name="message"]', longMessage);
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toHaveText(/shared/i);
  });

  test('handles empty post', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('textarea[name="message"]', '');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toHaveText(/error/i);
  });
});
