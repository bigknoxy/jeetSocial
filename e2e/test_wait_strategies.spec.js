const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5000';

test.describe('Wait Strategies and Async Operations', () => {
  test('uses network idle wait for initial page load', async ({ page }) => {
    // Use networkidle to ensure all resources are loaded
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Verify page is fully loaded
    await expect(page.locator('h1')).toContainText('jeetSocial');
    await expect(page.locator('#feed')).toBeVisible();
  });

  test('waits for form submission to complete using multiple strategies', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const testMessage = 'Test message for wait strategies';

    // Fill form
    await page.fill('textarea[name="message"]', testMessage);

    // Submit and wait for network activity to complete
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.click('button[type="submit"]')
    ]);

    // Alternative: Wait for specific response
    // const responsePromise = page.waitForResponse(resp =>
    //   resp.url().includes('/api/posts') && resp.status() === 201
    // );
    // await page.click('button[type="submit"]');
    // await responsePromise;

    // Verify submission was successful
    await expect(page.locator('#error')).toHaveText('');
  });

  test('waits for dynamic content updates with retry logic', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const testMessage = `Dynamic content test ${Date.now()}`;

    // Submit post
    await page.fill('textarea[name="message"]', testMessage);
    await page.click('button[type="submit"]');
    await expect(page.locator('#error')).toHaveText('');

    // Wait for post to appear with retry logic
    await page.waitForFunction(
      (message) => {
        const posts = document.querySelectorAll('.post div');
        return Array.from(posts).some(post =>
          post.textContent && post.textContent.includes(message)
        );
      },
      testMessage,
      { timeout: 10000, polling: 500 } // Poll every 500ms
    );

    // Verify our specific post is visible (avoid strict mode violation)
    const posts = page.locator('.post');
    const postCount = await posts.count();
    let found = false;

    for (let i = 0; i < postCount; i++) {
      const postText = await posts.nth(i).textContent();
      if (postText.includes(testMessage)) {
        found = true;
        break;
      }
    }

    expect(found).toBe(true);
  });

  test('handles race conditions with proper sequencing', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Test rapid successive operations
    const message1 = `Race condition test 1 ${Date.now()}`;
    const message2 = `Race condition test 2 ${Date.now()}`;

    // First submission
    await page.fill('textarea[name="message"]', message1);
    await page.click('button[type="submit"]');
    await expect(page.locator('#error')).toHaveText('');

    // Wait for first post to be processed before second submission
    await page.waitForFunction(
      (msg) => {
        const posts = document.querySelectorAll('.post div');
        return Array.from(posts).some(post => post.textContent.includes(msg));
      },
      message1,
      { timeout: 5000 }
    );

    // Second submission
    await page.fill('textarea[name="message"]', message2);
    await page.click('button[type="submit"]');
    await expect(page.locator('#error')).toHaveText('');

    // Wait for second post
    await page.waitForFunction(
      (msg) => {
        const posts = document.querySelectorAll('.post div');
        return Array.from(posts).some(post => post.textContent.includes(msg));
      },
      message2,
      { timeout: 5000 }
    );

    // Verify both posts exist
    const postTexts = await page.locator('.post').allTextContents();
    const hasMessage1 = postTexts.some(text => text.includes(message1));
    const hasMessage2 = postTexts.some(text => text.includes(message2));

    expect(hasMessage1).toBe(true);
    expect(hasMessage2).toBe(true);
  });

  test('waits for element state changes with proper conditions', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Test character counter updates
    const textarea = page.locator('textarea[name="message"]');
    const counter = page.locator('#char-count');

    // Initially should show 0/280
    await expect(counter).toHaveText('0/280');

    // Type some text
    await textarea.fill('Hello world');
    await expect(counter).toHaveText('11/280');

    // Type more text (actual length: 48 characters)
    await textarea.fill('Hello world this is a longer message for testing');
    await expect(counter).toHaveText('48/280');

    // Clear text
    await textarea.fill('');
    await expect(counter).toHaveText('0/280');
  });

  test('handles loading states and spinners', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // The feed might show loading states during updates
    const feed = page.locator('#feed');

    // Initially feed should be visible
    await expect(feed).toBeVisible();

    // Submit a post and ensure feed remains stable
    await page.fill('textarea[name="message"]', 'Loading state test');
    await page.click('button[type="submit"]');

    // Feed should remain visible during submission
    await expect(feed).toBeVisible();

    // After submission, feed should still be visible
    await expect(page.locator('#error')).toHaveText('');
    await expect(feed).toBeVisible();
  });

  test('waits for CSS animations and transitions to complete', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Submit a post
    const testMessage = 'Animation test message';
    await page.fill('textarea[name="message"]', testMessage);
    await page.click('button[type="submit"]');
    await expect(page.locator('#error')).toHaveText('');

    // Wait for post to appear
    await page.waitForSelector('.post', { timeout: 5000 });

    // If there are CSS animations (like fadeIn), wait for them to complete
    // This is a placeholder for animation waiting logic
    await page.waitForTimeout(1000); // Wait for any animations

    // Verify post is fully visible and stable
    const post = page.locator('.post').first();
    await expect(post).toBeVisible();

    // Check that the post content is readable
    const postText = await post.textContent();
    expect(postText).toContain(testMessage);
  });

  test('handles flaky operations with retry mechanisms', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Test with retry logic for potentially flaky operations
    const maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        attempt++;

        // Clear any previous content
        await page.fill('textarea[name="message"]', '');

        const testMessage = `Retry test attempt ${attempt} - ${Date.now()}`;
        await page.fill('textarea[name="message"]', testMessage);

        // Submit with timeout
        await Promise.race([
          page.click('button[type="submit"]'),
          page.waitForTimeout(5000)
        ]);

        // Wait for success or error
        await page.waitForFunction(() => {
          const errorDiv = document.getElementById('error');
          return errorDiv && (errorDiv.textContent.trim() === '' ||
                              errorDiv.textContent.trim() !== '');
        }, { timeout: 3000 });

        const errorText = await page.locator('#error').textContent();

        if (errorText === '') {
          // Success case
          success = true;

          // Verify post appears
          await page.waitForFunction(
            (msg) => {
              const posts = document.querySelectorAll('.post div');
              return Array.from(posts).some(post => post.textContent.includes(msg));
            },
            testMessage,
            { timeout: 5000 }
          );
        } else {
          // Error case - might be worth retrying
          console.log(`Attempt ${attempt} failed with error: ${errorText}`);
          if (attempt < maxRetries) {
            await page.waitForTimeout(1000); // Wait before retry
          }
        }

      } catch (error) {
        console.log(`Attempt ${attempt} failed with exception: ${error.message}`);
        if (attempt < maxRetries) {
          await page.waitForTimeout(1000);
        }
      }
    }

    expect(success).toBe(true);
  });
});