const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5000'; // Updated to match Docker Compose port

test.describe('HuggingFace Moderation', () => {
  test('blocks hate speech and accepts positive posts', async ({ page }) => {
    // Go to jeetSocial frontend (word-list moderation only)
    await page.goto(BASE_URL);

    // Test hate speech post (word-list filter)
    await page.fill('textarea[name="message"]', 'I hate [group], they should all disappear.');
    await page.click('button[type="submit"]');
    await expect(page.locator('#error')).toHaveText(/Hateful content not allowed/i);
    await page.screenshot({ path: 'hate_speech_blocked.png' });

    // Test positive post
    await page.fill('textarea[name="message"]', 'I hope everyone has a wonderful day!');
    await page.click('button[type="submit"]');
    // Success case: error div should be empty and feed should update
    await expect(page.locator('#error')).toHaveText('');
    // Wait for feed to update with new post
    await page.waitForSelector('.post', { timeout: 5000 });
    await expect(page.locator('.post').first()).toContainText('I hope everyone has a wonderful day!');
    await page.screenshot({ path: 'positive_post_accepted.png' });
  });
});
