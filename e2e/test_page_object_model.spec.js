const { test, expect } = require('@playwright/test');
const JeetSocialPage = require('./page-objects/jeet-social.page');

test.describe('Page Object Model Usage Examples', () => {
  let jeetPage;

  test.beforeEach(async ({ page }) => {
    jeetPage = new JeetSocialPage(page);
    await jeetPage.goto();
  });

  test('demonstrates basic page object usage', async () => {
    // Using page object methods instead of direct selectors
    expect(await jeetPage.isOnMainPage()).toBe(true);

    // Submit a post using page object
    const testMessage = 'Page object model test';
    await jeetPage.submitPost(testMessage);

    // Check for errors using page object
    expect(await jeetPage.hasError()).toBe(false);

    // Wait for post using page object
    await jeetPage.waitForPostInFeed(testMessage);

    // Verify post exists using page object
    expect(await jeetPage.hasPostWithMessage(testMessage)).toBe(true);
  });

  test('shows improved readability with page objects', async () => {
    // Compare with direct selectors vs page object methods
    const testMessage = 'Readability improvement test';

    // Old way (scattered selectors):
    // await page.fill('textarea[name="message"]', testMessage);
    // await page.click('button[type="submit"]');
    // await expect(page.locator('#error')).toHaveText('');

    // New way (clean, readable):
    await jeetPage.submitPostAndWait(testMessage);
    expect(await jeetPage.hasError()).toBe(false);

    // Verify the post count increased
    const postCount = await jeetPage.getPostCount();
    expect(postCount).toBeGreaterThan(0);
  });

  test('demonstrates username and post content retrieval', async () => {
    const testMessage = 'Username and content test';

    await jeetPage.submitPostAndWait(testMessage);

    // Get username using page object
    const latestUsername = await jeetPage.getLatestUsername();
    expect(latestUsername).toMatch(/^[A-Z][a-z]+[A-Z][a-zA-Z]+\d{2}$/);

    // Get post content using page object
    const latestMessage = await jeetPage.getLatestPostMessage();
    expect(latestMessage).toContain(testMessage);

    // Verify username is anonymous (doesn't contain personal info)
    expect(latestUsername).not.toMatch(/admin|user|test/i);
  });

  test('shows character counter functionality with page objects', async () => {
    // Test character counter updates
    expect(await jeetPage.getCharacterCount()).toBe('0/280');

    await jeetPage.messageTextarea.fill('Hello world');
    expect(await jeetPage.getCharacterCount()).toBe('11/280');

    await jeetPage.clearMessage();
    expect(await jeetPage.getCharacterCount()).toBe('0/280');
  });

  test('demonstrates error handling with page objects', async () => {
    // Test empty message error
    await jeetPage.submitPost('');
    await jeetPage.waitForError('Message required');
    expect(await jeetPage.getErrorMessage()).toContain('Message required');

    // Test successful post after error
    await jeetPage.clearMessage();
    await jeetPage.submitPostAndWait('Valid message after error');
    expect(await jeetPage.hasError()).toBe(false);
  });

  test('shows multiple post handling with page objects', async () => {
    const messages = [
      'First post with page object',
      'Second post with page object',
      'Third post with page object'
    ];

    // Submit multiple posts
    for (const message of messages) {
      await jeetPage.submitPostAndWait(message);
      expect(await jeetPage.hasError()).toBe(false);
    }

    // Verify all posts exist
    for (const message of messages) {
      expect(await jeetPage.hasPostWithMessage(message)).toBe(true);
    }

    // Check total post count
    const postCount = await jeetPage.getPostCount();
    expect(postCount).toBeGreaterThanOrEqual(3);
  });

  test('demonstrates page object maintainability benefits', async () => {
    // This test shows how page objects make tests more maintainable
    // If the HTML structure changes, only the page object needs updating

    const testMessage = 'Maintainability test';

    // All interactions go through the page object
    await jeetPage.submitPost(testMessage);
    await jeetPage.waitForPostInFeed(testMessage);

    // Get data through page object methods
    const username = await jeetPage.getLatestUsername();
    const postCount = await jeetPage.getPostCount();

    // Assertions remain clean and focused on behavior
    expect(username.length).toBeGreaterThan(0);
    expect(postCount).toBeGreaterThan(0);
    expect(await jeetPage.hasPostWithMessage(testMessage)).toBe(true);
  });

  test('shows page object reusability across different test scenarios', async () => {
    // Test various scenarios using the same page object methods

    // Scenario 1: Normal post
    await jeetPage.submitPostAndWait('Normal post');
    expect(await jeetPage.hasError()).toBe(false);

    // Scenario 2: Check username generation
    const username = await jeetPage.getLatestUsername();
    expect(username).toMatch(/^[A-Z][a-z]+[A-Z][a-zA-Z]+\d{2}$/);

    // Scenario 3: Multiple posts
    await jeetPage.submitPostAndWait('Another post');
    const postCount = await jeetPage.getPostCount();
    expect(postCount).toBeGreaterThanOrEqual(2);

    // All using the same page object interface
  });
});