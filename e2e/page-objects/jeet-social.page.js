/**
 * Page Object Model for jeetSocial application
 * Encapsulates selectors and actions for better test maintainability
 */

class JeetSocialPage {
  constructor(page) {
    this.page = page;

    // Page elements
    this.mainHeading = page.locator('h1');
    this.feed = page.locator('#feed');
    this.posts = page.locator('.post');
    this.errorDiv = page.locator('form#post-form #error');

    // Form elements
    this.messageTextarea = page.locator('#message');
    this.submitButton = page.locator('#post-btn');
    this.charCount = page.locator('#char-count');

    // Navigation and UI elements
    this.aboutLink = page.locator('a[href*="about"]');
    this.emojiButton = page.locator('#emoji-btn');
    this.emojiPicker = page.locator('#emoji-picker');
    this.enterToPostToggle = page.locator('#enter-to-post');

    // Post sub-elements (more specific selectors to avoid ambiguity with kindness-row and other divs)
    this.postContentSelector = '.post-content';
    this.usernameSelector = '.username';
    this.timestampSelector = '.timestamp';
    this.kindnessCountSelector = '.kindness-count';
    this.kindnessButtonSelector = '.kindness-btn';
  }

  /**
   * Navigate to the jeetSocial homepage
   */
  async goto() {
    await this.page.goto('http://localhost:5000', { waitUntil: 'networkidle' });
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.feed.waitFor({ state: 'visible' });
  }

  /**
   * Submit a new post
   * @param {string} message - The message to post
   */
  async submitPost(message) {
    await this.messageTextarea.fill(message);
    await this.submitButton.click();
  }

  /**
   * Submit a post and wait for it to appear in the feed
   * @param {string} message - The message to post
   * @param {number} timeout - Timeout in milliseconds
   */
  async submitPostAndWait(message, timeout = 5000) {
    await this.messageTextarea.fill(message);
    await this.submitButton.click();

    // Wait for the post to appear in the feed
    await this.waitForPostInFeed(message, timeout);
  }

  /**
   * Wait for a specific post to appear in the feed
   * @param {string} message - The message content to wait for
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForPostInFeed(message, timeout = 5000) {
    await this.page.waitForFunction(
      (msg) => {
        const posts = document.querySelectorAll('.post .post-content');
        return Array.from(posts).some(post =>
          post.textContent && post.textContent.includes(msg)
        );
      },
      message,
      { timeout }
    );
  }

  /**
   * Get the current error message
   * @returns {string} The error message text
   */
  async getErrorMessage() {
    return await this.errorDiv.textContent();
  }

  /**
   * Check if there's an error message
   * @returns {boolean} True if there's an error
   */
  async hasError() {
    const errorText = await this.getErrorMessage();
    return errorText.trim() !== '';
  }

  /**
   * Wait for error message to appear
   * @param {string} expectedError - Expected error message
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForError(expectedError, timeout = 5000) {
    await this.errorDiv.waitFor({ state: 'visible', timeout });
    await this.page.waitForFunction(
      (expected) => {
        const errorDiv = document.getElementById('error');
        return errorDiv && errorDiv.textContent.includes(expected);
      },
      expectedError,
      { timeout }
    );
  }

  /**
   * Clear the message textarea
   */
  async clearMessage() {
    await this.messageTextarea.fill('');
  }

  /**
   * Get the current character count
   * @returns {string} Character count text (e.g., "15/280")
   */
  async getCharacterCount() {
    return await this.charCount.textContent();
  }

  /**
   * Get the number of posts currently visible
   * @returns {number} Number of posts
   */
  async getPostCount() {
    return await this.posts.count();
  }

  /**
   * Get all post texts
   * @returns {Array<string>} Array of post text contents
   */
  async getAllPostTexts() {
    return await this.posts.allTextContents();
  }

  /**
   * Check if a specific message exists in any post
   * @param {string} message - Message to search for
   * @returns {boolean} True if message is found
   */
  async hasPostWithMessage(message) {
    const postTexts = await this.getAllPostTexts();
    return postTexts.some(text => text.includes(message));
  }

  /**
   * Get all usernames from posts
   * @returns {Array<string>} Array of usernames
   */
  async getAllUsernames() {
    const usernames = await this.page.locator(this.usernameSelector).allTextContents();
    return usernames;
  }

  /**
   * Get the latest post's username
   * @returns {string} Latest post username
   */
  async getLatestUsername() {
    return await this.page.locator(this.usernameSelector).first().textContent();
  }

  /**
   * Get the latest post's message content
   * @returns {string} Latest post message
   */
  async getLatestPostMessage() {
    return await this.page.locator(this.postContentSelector).first().textContent();
  }

  /**
   * Get kindness count Locator for a post
   * @param {number|string} postId - Post id
   * @returns {Locator} Playwright locator for kindness count element
   */
  kindnessCount(postId) {
    return this.page.locator(`${this.kindnessCountSelector}[data-kindness-count="${postId}"]`);
  }

  /**
   * Get kindness count numeric value for a post
   * @param {number|string} postId - Post id
   * @returns {number} kindness count (numeric)
   */
  async kindnessCountValue(postId) {
    const locator = this.kindnessCount(postId).first();
    const text = (await locator.textContent()) || '';
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get kindness button for a post
   * @param {number|string} postId
   * @returns {Locator} Playwright locator for kindness button
   */
  kindnessButton(postId) {
    return this.page.locator(`${this.kindnessButtonSelector}[data-post-id="${postId}"]`);
  }

  /**
   * Toggle the "Post on Enter" feature
   * @param {boolean} enabled - Whether to enable or disable
   */
  async setEnterToPost(enabled) {
    const isChecked = await this.enterToPostToggle.isChecked();
    if (isChecked !== enabled) {
      await this.enterToPostToggle.click();
    }
  }

  /**
   * Open emoji picker
   */
  async openEmojiPicker() {
    await this.emojiButton.click();
    await this.emojiPicker.waitFor({ state: 'visible' });
  }

  /**
   * Close emoji picker
   */
  async closeEmojiPicker() {
    // Click outside the picker to close it
    await this.page.click('body');
    await this.emojiPicker.waitFor({ state: 'hidden' });
  }

  /**
   * Add emoji to message
   * @param {string} emoji - Emoji to add
   */
  async addEmoji(emoji) {
    await this.openEmojiPicker();

    // Click on the emoji (this is a simplified approach)
    // In a real implementation, you might need to interact with the emoji picker library
    await this.page.keyboard.type(emoji);
    await this.closeEmojiPicker();
  }

  /**
   * Navigate to about page
   */
  async goToAboutPage() {
    await this.aboutLink.click();
    await this.page.waitForURL('**/about.html');
  }

  /**
   * Check if page is displaying the main feed
   * @returns {boolean} True if on main page
   */
  async isOnMainPage() {
    return await this.mainHeading.isVisible();
  }

  /**
   * Wait for feed to have at least N posts
   * @param {number} count - Minimum number of posts
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForPostCount(count, timeout = 5000) {
    await this.page.waitForFunction(
      (expectedCount) => document.querySelectorAll('.post').length >= expectedCount,
      count,
      { timeout }
    );
  }

  /**
   * Reload the page and wait for it to load
   */
  async reload() {
    await this.page.reload({ waitUntil: 'networkidle' });
    await this.waitForPageLoad();
  }
}

module.exports = JeetSocialPage;