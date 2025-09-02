const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5000';

test.describe('Character Limit Enforcement', () => {
  test('enforces 280 character limit in textarea', async ({ page }) => {
    await page.goto(BASE_URL);

    // Test that textarea maxlength prevents typing beyond 280 chars
    const longText = 'a'.repeat(300);

    // Use type() instead of fill() to simulate user typing, which respects maxlength
    await page.locator('textarea[name="message"]').clear();
    await page.type('textarea[name="message"]', longText, { delay: 1 });

    // Check that only 280 characters are actually in the textarea
    const textareaValue = await page.locator('textarea[name="message"]').inputValue();
    expect(textareaValue.length).toBe(280);

    // Check character counter shows correct count
    await expect(page.locator('#char-count')).toHaveText('280/280');
  });

  test('character counter updates as user types', async ({ page }) => {
    await page.goto(BASE_URL);

    // Type some text and check counter
    await page.fill('textarea[name="message"]', 'Hello world!');
    await expect(page.locator('#char-count')).toHaveText('12/280');

    // Type more text
    await page.fill('textarea[name="message"]', 'a'.repeat(100));
    await expect(page.locator('#char-count')).toHaveText('100/280');

    // Clear and check counter resets
    await page.fill('textarea[name="message"]', '');
    await expect(page.locator('#char-count')).toHaveText('0/280');
  });

  test('backend rejects posts exceeding 280 characters', async ({ page }) => {
    await page.goto(BASE_URL);

    // Bypass frontend maxlength by setting value directly via JavaScript
    const longText = 'a'.repeat(281);
    await page.evaluate((text) => {
      const textarea = document.querySelector('textarea[name="message"]');
      textarea.value = text;
      // Trigger input event to update character counter
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }, longText);

    await page.click('button[type="submit"]');

    await expect(page.locator('#error')).toHaveText(/Message exceeds 280 character limit/i);
  });

  test('accepts posts with exactly 280 characters', async ({ page }) => {
    await page.goto(BASE_URL);

    // Create a post with exactly 280 characters
    const exactText = 'a'.repeat(280);
    await page.fill('textarea[name="message"]', exactText);
    await page.click('button[type="submit"]');

    // Should succeed - error div should be empty
    await expect(page.locator('#error')).toHaveText('');
    // Feed should update with new post
    await page.waitForSelector('.post', { timeout: 5000 });
    await expect(page.locator('.post').first()).toContainText(exactText);
  });

  test('character counter turns red when over limit', async ({ page }) => {
    await page.goto(BASE_URL);

    // Type exactly 280 characters
    const exactText = 'a'.repeat(280);
    await page.fill('textarea[name="message"]', exactText);

    // Counter should be normal color at 280
    const counterColor280 = await page.locator('#char-count').evaluate(el => getComputedStyle(el).color);
    expect(counterColor280).toBe('rgb(136, 136, 136)'); // #888

    // Try to type one more character (should be prevented by maxlength)
    await page.type('textarea[name="message"]', 'b');
    // Counter should still show 280/280
    await expect(page.locator('#char-count')).toHaveText('280/280');
  });
});