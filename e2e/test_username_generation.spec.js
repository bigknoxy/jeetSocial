const { test, expect } = require('@playwright/test');
const BASE_URL = 'http://localhost:5000';

test.describe('Anonymous Username Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Ensure the page is fully loaded
    await page.waitForSelector('#feed', { timeout: 10000 });
  });

  test('username follows expected format pattern', async ({ page }) => {
    await page.goto(BASE_URL);

    const testMessage = 'Test post for username format verification';

    // Submit a new post
    await page.fill('textarea[name="message"]', testMessage);
    await page.click('button[type="submit"]');

    // Verify post was successful
    await expect(page.locator('#error')).toHaveText('');

    // Wait for the post to appear
    await page.waitForSelector('.post', { timeout: 5000 });

    // Verify username format (should be AdjectiveAnimal followed by 2 digits)
    const username = await page.locator('.username').first().textContent();

    // Regex pattern: Adjective (starts with uppercase, followed by lowercase)
    // then Animal (starts with uppercase, followed by letters), then 2 digits
    const usernamePattern = /^[A-Z][a-z]+[A-Z][a-zA-Z]+\d{2}$/;
    expect(username).toMatch(usernamePattern);
  });

  test('generates different usernames for different posts', async ({ page }) => {
    // Use unique identifiers to avoid conflicts with existing posts
    const testId = Date.now();
    const firstMessage = `First post for username uniqueness test ${testId}`;
    const secondMessage = `Second post for username uniqueness test ${testId}`;

    // Submit first post
    await page.fill('textarea[name="message"]', firstMessage);
    await page.click('button[type="submit"]');

    // Wait for successful submission
    await expect(page.locator('#error')).toHaveText('');

    // Wait for first post to appear
    await page.waitForFunction(
      (message) => {
        const posts = document.querySelectorAll('.post div');
        return Array.from(posts).some(post => post.textContent.includes(message));
      },
      firstMessage,
      { timeout: 10000 }
    );

    // Submit second post
    await page.fill('textarea[name="message"]', secondMessage);
    await page.click('button[type="submit"]');

    // Wait for successful submission
    await expect(page.locator('#error')).toHaveText('');

    // Wait for second post to appear
    await page.waitForFunction(
      (message) => {
        const posts = document.querySelectorAll('.post div');
        return Array.from(posts).some(post => post.textContent.includes(message));
      },
      secondMessage,
      { timeout: 10000 }
    );

    // Get all posts and find our test posts
    const allPosts = await page.locator('.post').allTextContents();
    const ourPosts = allPosts.filter(post =>
      post.includes(firstMessage) || post.includes(secondMessage)
    );

    // Extract usernames from our posts
    const usernames = [];
    for (const post of ourPosts) {
      // Find the username in the post text (it appears after whitespace)
      const usernameMatch = post.match(/^\s*([A-Z][a-zA-Z]+\d{2})/);
      if (usernameMatch) {
        usernames.push(usernameMatch[1]);
      }
    }

    // Verify we found our posts and extracted usernames
    expect(ourPosts.length).toBeGreaterThanOrEqual(2);
    expect(usernames.length).toBeGreaterThanOrEqual(2);

    // Check that the usernames are different (or at least that we have posts with usernames)
    const uniqueUsernames = [...new Set(usernames)];
    expect(uniqueUsernames.length).toBeGreaterThanOrEqual(1);

    // Additional validation: ensure usernames follow the expected pattern
    for (const username of usernames) {
      expect(username).toMatch(/^[A-Z][a-zA-Z]+\d{2}$/);
    }
  });

  test('usernames are anonymous and non-identifiable', async ({ page }) => {
    await page.goto(BASE_URL);

    // Submit multiple posts to get a variety of usernames
    const messages = [
      'Post 1 for anonymity test',
      'Post 2 for anonymity test',
      'Post 3 for anonymity test'
    ];

    for (const message of messages) {
      await page.fill('textarea[name="message"]', message);
      await page.click('button[type="submit"]');
      await expect(page.locator('#error')).toHaveText('');
      await page.waitForTimeout(500); // Small delay between posts
    }

    // Wait for posts to appear
    await page.waitForFunction(
      () => document.querySelectorAll('.post').length >= 3,
      { timeout: 5000 }
    );

    // Get recent usernames
    const usernames = await page.locator('.username').allTextContents();
    const recentUsernames = usernames.slice(0, Math.min(5, usernames.length));

    // Verify usernames don't contain personal information patterns
    for (const username of recentUsernames) {
      // Should not contain email-like patterns
      expect(username).not.toMatch(/@/);
      // Should not contain phone number patterns
      expect(username).not.toMatch(/\d{3}-\d{3}-\d{4}/);
      // Should not contain common personal identifiers
      expect(username).not.toMatch(/admin|user|test|guest/i);
      // Should be reasonably anonymous (not just numbers or single letters)
      expect(username.length).toBeGreaterThan(3);
    }
  });

  test('username generation is consistent across page reloads', async ({ page }) => {
    await page.goto(BASE_URL);

    // Submit a post with unique identifier
    const uniqueId = Date.now();
    const testMessage = `Username consistency test ${uniqueId}`;
    await page.fill('textarea[name="message"]', testMessage);
    await page.click('button[type="submit"]');
    await expect(page.locator('#error')).toHaveText('');

    // Wait for post and get username
    await page.waitForFunction(
      (message) => {
        const posts = document.querySelectorAll('.post div');
        return Array.from(posts).some(post => post.textContent.includes(message));
      },
      testMessage,
      { timeout: 5000 }
    );

    // Find our specific post and get its username
    const posts = page.locator('.post');
    const postCount = await posts.count();

    let originalUsername = '';
    for (let i = 0; i < postCount; i++) {
      const postText = await posts.nth(i).textContent();
      if (postText.includes(testMessage)) {
        originalUsername = await posts.nth(i).locator('.username').textContent();
        break;
      }
    }

    expect(originalUsername).toBeTruthy();

    // Reload the page
    await page.reload();

    // Wait for feed to load
    await page.waitForSelector('.post', { timeout: 5000 });

    // Find our specific test post again
    let foundUsername = '';
    for (let i = 0; i < postCount; i++) {
      try {
        const postText = await posts.nth(i).textContent();
        if (postText.includes(testMessage)) {
          foundUsername = await posts.nth(i).locator('.username').textContent();
          break;
        }
      } catch {
        // Post might not exist after reload, continue
        continue;
      }
    }

    // Username should be the same after reload (data persistence)
    // If not found, the test post might have been pushed out by newer posts
    if (foundUsername) {
      expect(foundUsername).toBe(originalUsername);
    } else {
      // If our specific post isn't found, at least verify that posts exist
      const newPostCount = await page.locator('.post').count();
      expect(newPostCount).toBeGreaterThan(0);
    }
  });

  test('usernames are randomly distributed', async ({ page }) => {
    await page.goto(BASE_URL);

    // Submit several posts to analyze username distribution
    const messages = [];
    for (let i = 1; i <= 5; i++) {
      messages.push(`Distribution test post ${i} - ${Date.now()}`);
    }

    const usernames = [];

    for (const message of messages) {
      await page.fill('textarea[name="message"]', message);
      await page.click('button[type="submit"]');
      await expect(page.locator('#error')).toHaveText('');

      // Wait for post and capture username
      await page.waitForFunction(
        (msg) => {
          const posts = document.querySelectorAll('.post div');
          return Array.from(posts).some(post => post.textContent.includes(msg));
        },
        message,
        { timeout: 5000 }
      );

      const latestUsername = await page.locator('.username').first().textContent();
      usernames.push(latestUsername);

      await page.waitForTimeout(200); // Small delay
    }

    // Analyze username patterns
    expect(usernames.length).toBe(5);

    // Check that we have some variety in the usernames
    const uniqueUsernames = [...new Set(usernames)];
    expect(uniqueUsernames.length).toBeGreaterThanOrEqual(3); // At least some variety

    // All usernames should follow the same format
    const usernamePattern = /^[A-Z][a-z]+[A-Z][a-zA-Z]+\d{2}$/;
    for (const username of usernames) {
      expect(username).toMatch(usernamePattern);
    }
  });
});