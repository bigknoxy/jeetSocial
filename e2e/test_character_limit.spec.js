const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5000';

test.describe('Character Limit Enforcement', () => {
  test('enforces 280 character limit in textarea', async ({ page }) => {
    await page.goto(BASE_URL);

    // Test that textarea maxlength prevents typing beyond 280 chars
    const longText = 'a'.repeat(300);

    // Use type() instead of fill() to simulate user typing, which respects maxlength
    await page.locator('#message').fill('');
    await page.type('#message', longText, { delay: 1 });

    // Check that only 280 characters are actually in the textarea
    const textareaValue = await page.locator('#message').inputValue();
    expect(textareaValue.length).toBe(280);

    // Check character counter shows correct count
    await expect(page.locator('#char-count')).toHaveText('280/280');
  });

  test('character counter updates as user types', async ({ page }) => {
    await page.goto(BASE_URL);

    // Type some text and check counter
    await page.fill('#message', 'Hello world!');
    await expect(page.locator('#char-count')).toHaveText('12/280');

    // Type more text
    await page.fill('#message', 'a'.repeat(100));
    await expect(page.locator('#char-count')).toHaveText('100/280');

    // Clear and check counter resets
    await page.fill('#message', '');
    await expect(page.locator('#char-count')).toHaveText('0/280');
  });

  test('backend rejects posts exceeding 280 characters', async ({ page }) => {
    await page.goto(BASE_URL);

    // Bypass frontend maxlength by setting value directly via JavaScript
    const longText = 'a'.repeat(281);
    await page.evaluate((text) => {
      const textarea = document.getElementById('message');
      textarea.value = text;
      // Trigger input event to update character counter
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }, longText);

    // Enable post button manually to bypass frontend block
await page.evaluate(() => { document.getElementById('post-btn').disabled = false; });
await page.click('#post-btn');

    await expect(page.locator('form#post-form #error')).toHaveText(/Message exceeds 280 character limit/i);
  });

  test('accepts posts with exactly 280 characters', async ({ page }) => {
    await page.goto(BASE_URL);

    // Create a post with exactly 280 characters
    const exactText = 'a'.repeat(280);
    await page.fill('#message', exactText);
    await page.click('#post-btn');

    // Should succeed - error div should be empty
    await expect(page.locator('form#post-form #error')).toHaveText('');
    // Feed should update with new post
    await page.waitForSelector('.post', { timeout: 5000 });
    await expect(page.locator('.post').first()).toContainText(exactText);
  });

  test('character counter turns red when over limit', async ({ page }) => {
    await page.goto(BASE_URL);

    // Bypass maxlength by setting textarea value to 281 via JS
    const overLimitText = 'a'.repeat(281);
    await page.evaluate((text) => {
      const textarea = document.getElementById('message');
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }, overLimitText);

    // Wait for DOM to update
    await page.waitForTimeout(100);

    // Counter should be red
    const counterColor = await page.locator('#char-count').evaluate(el => getComputedStyle(el).color);
    expect(counterColor).toBe('rgb(255, 75, 92)'); // #ff4b5c
    await expect(page.locator('#char-count')).toHaveText('281/280');
  });
});