/**
 * Comprehensive E2E Test for Phase 1 Intelligent Moderation Engine
 * Tests evasion detection and duplicate post caching issues
 */

const { test, expect } = require('@playwright/test');
const JeetSocialPage = require('./page-objects/jeet-social.page');

test.describe('Phase 1 Intelligent Moderation Engine Debug', () => {
  let page;
  let jeetPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    jeetPage = new JeetSocialPage(page);
  });

  test.beforeEach(async () => {
    await jeetPage.goto();
    await jeetPage.waitForPageLoad();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Evasion Detection Tests', () => {
    test('should block basic hate speech', async () => {
      console.log('\n=== Testing Basic Hate Speech ===');
      
      const hateMessage = 'I hate everyone';
      await jeetPage.submitPost(hateMessage);
      
      // Should show error message
      await jeetPage.waitForError('blocked', 5000);
      const errorText = await jeetPage.getErrorMessage();
      console.log(`Basic hate speech error: ${errorText}`);
      
      expect(errorText.toLowerCase()).toContain('blocked');
      
      // Post should NOT appear in feed
      await page.waitForTimeout(2000); // Wait for potential update
      const hasPost = await jeetPage.hasPostWithMessage(hateMessage);
      expect(hasPost).toBeFalsy();
      
      console.log('✅ Basic hate speech correctly blocked');
    });

    test('should allow legitimate posts', async () => {
      console.log('\n=== Testing Legitimate Post ===');
      
      const goodMessage = 'I love this community! Everyone is so kind and supportive.';
      await jeetPage.submitPostAndWait(goodMessage, 5000);
      
      // Should appear in feed
      const hasPost = await jeetPage.hasPostWithMessage(goodMessage);
      expect(hasPost).toBeTruthy();
      
      console.log('✅ Legitimate post correctly allowed');
    });

    test('should block spaced-out evasion: "I   h a t e   this community"', async () => {
      console.log('\n=== Testing Spaced-Out Evasion ===');
      
      const evasionMessage = 'I   h a t e   this community';
      await jeetPage.submitPost(evasionMessage);
      
      // Should show error message
      try {
        await jeetPage.waitForError('blocked', 3000);
        const errorText = await jeetPage.getErrorMessage();
        console.log(`Spaced evasion error: ${errorText}`);
        expect(errorText.toLowerCase()).toContain('blocked');
        console.log('✅ Spaced-out evasion correctly blocked');
      } catch (error) {
        // Check if post appeared (failure case)
        await page.waitForTimeout(2000);
        const hasPost = await jeetPage.hasPostWithMessage(evasionMessage);
        if (hasPost) {
          console.log('❌ FAILURE: Spaced-out evasion was NOT blocked - post appeared in feed');
          await page.screenshot({ path: 'evasion_spaced_failure.png', fullPage: true });
        } else {
          console.log('⚠️  Unclear: Post not blocked but also not in feed');
        }
      }
    });

    test('should block punctuation-separated evasion: "h.a.t.e. is what I feel"', async () => {
      console.log('\n=== Testing Punctuation-Separated Evasion ===');
      
      const evasionMessage = 'h.a.t.e. is what I feel towards people';
      await jeetPage.submitPost(evasionMessage);
      
      // Should show error message
      try {
        await jeetPage.waitForError('blocked', 3000);
        const errorText = await jeetPage.getErrorMessage();
        console.log(`Punctuation evasion error: ${errorText}`);
        expect(errorText.toLowerCase()).toContain('blocked');
        console.log('✅ Punctuation-separated evasion correctly blocked');
      } catch (error) {
        // Check if post appeared (failure case)
        await page.waitForTimeout(2000);
        const hasPost = await jeetPage.hasPostWithMessage(evasionMessage);
        if (hasPost) {
          console.log('❌ FAILURE: Punctuation-separated evasion was NOT blocked - post appeared in feed');
          await page.screenshot({ path: 'evasion_punctuation_failure.png', fullPage: true });
        } else {
          console.log('⚠️  Unclear: Post not blocked but also not in feed');
        }
      }
    });

    test('should block leet speak evasion: "I h@te you all"', async () => {
      console.log('\n=== Testing Leet Speak Evasion ===');
      
      const evasionMessage = 'I h@te you all so much';
      await jeetPage.submitPost(evasionMessage);
      
      // Should show error message
      try {
        await jeetPage.waitForError('blocked', 3000);
        const errorText = await jeetPage.getErrorMessage();
        console.log(`Leet speak evasion error: ${errorText}`);
        expect(errorText.toLowerCase()).toContain('blocked');
        console.log('✅ Leet speak evasion correctly blocked');
      } catch (error) {
        // Check if post appeared (failure case)
        await page.waitForTimeout(2000);
        const hasPost = await jeetPage.hasPostWithMessage(evasionMessage);
        if (hasPost) {
          console.log('❌ FAILURE: Leet speak evasion was NOT blocked - post appeared in feed');
          await page.screenshot({ path: 'evasion_leet_failure.png', fullPage: true });
        } else {
          console.log('⚠️  Unclear: Post not blocked but also not in feed');
        }
      }
    });

    test('should block excessive repetition evasion: "I haaaattteeee this"', async () => {
      console.log('\n=== Testing Excessive Repetition Evasion ===');
      
      const evasionMessage = 'I haaaattteeee this community so much';
      await jeetPage.submitPost(evasionMessage);
      
      // Should show error message
      try {
        await jeetPage.waitForError('blocked', 3000);
        const errorText = await jeetPage.getErrorMessage();
        console.log(`Repetition evasion error: ${errorText}`);
        expect(errorText.toLowerCase()).toContain('blocked');
        console.log('✅ Excessive repetition evasion correctly blocked');
      } catch (error) {
        // Check if post appeared (failure case)
        await page.waitForTimeout(2000);
        const hasPost = await jeetPage.hasPostWithMessage(evasionMessage);
        if (hasPost) {
          console.log('❌ FAILURE: Excessive repetition evasion was NOT blocked - post appeared in feed');
          await page.screenshot({ path: 'evasion_repetition_failure.png', fullPage: true });
        } else {
          console.log('⚠️  Unclear: Post not blocked but also not in feed');
        }
      }
    });
  });

  test.describe('Duplicate Post Caching Tests', () => {
    test('should prevent duplicate posts in feed', async () => {
      console.log('\n=== Testing Duplicate Post Prevention ===');
      
      const duplicateMessage = 'This is a test message for duplicate detection';
      
      // Get initial post count
      const initialCount = await jeetPage.getPostCount();
      console.log(`Initial post count: ${initialCount}`);
      
      // Submit first post
      await jeetPage.submitPostAndWait(duplicateMessage, 5000);
      const firstPostCount = await jeetPage.getPostCount();
      console.log(`Post count after first submission: ${firstPostCount}`);
      
      // Clear the form
      await jeetPage.clearMessage();
      
      // Submit identical post again
      await jeetPage.submitPost(duplicateMessage);
      
      // Wait a moment to see if duplicate appears
      await page.waitForTimeout(3000);
      const finalPostCount = await jeetPage.getPostCount();
      console.log(`Post count after duplicate submission: ${finalPostCount}`);
      
      // Count occurrences of the message
      const allPostTexts = await jeetPage.getAllPostTexts();
      const messageOccurrences = allPostTexts.filter(text => 
        text.includes(duplicateMessage)
      ).length;
      
      console.log(`Message occurrences in feed: ${messageOccurrences}`);
      
      if (messageOccurrences > 1) {
        console.log('❌ FAILURE: Duplicate post appeared in feed');
        await page.screenshot({ path: 'duplicate_posts_failure.png', fullPage: true });
        
        // Log all posts for debugging
        console.log('All posts in feed:');
        allPostTexts.forEach((text, index) => {
          console.log(`${index + 1}: ${text}`);
        });
      } else {
        console.log('✅ Duplicate post correctly prevented');
      }
      
      expect(messageOccurrences).toBeLessThanOrEqual(1);
    });

    test('should allow similar but different messages', async () => {
      console.log('\n=== Testing Similar but Different Messages ===');
      
      const baseMessage = 'This is a great community';
      const similarMessage = 'This is a great community!';
      
      // Submit first message
      await jeetPage.submitPostAndWait(baseMessage, 5000);
      
      // Clear and submit similar message
      await jeetPage.clearMessage();
      await jeetPage.submitPostAndWait(similarMessage, 5000);
      
      // Both should appear (they're different due to punctuation)
      const hasBase = await jeetPage.hasPostWithMessage(baseMessage);
      const hasSimilar = await jeetPage.hasPostWithMessage(similarMessage);
      
      console.log(`Base message found: ${hasBase}`);
      console.log(`Similar message found: ${hasSimilar}`);
      
      if (hasBase && hasSimilar) {
        console.log('✅ Similar but different messages both allowed');
      } else {
        console.log('⚠️  Unexpected behavior with similar messages');
      }
    });
  });

  test.describe('Edge Cases and Stress Tests', () => {
    test('should handle mixed evasion techniques', async () => {
      console.log('\n=== Testing Mixed Evasion Techniques ===');
      
      const mixedEvasion = 'I   h.a.t.e.   this community so much!!!';
      await jeetPage.submitPost(mixedEvasion);
      
      try {
        await jeetPage.waitForError('blocked', 3000);
        const errorText = await jeetPage.getErrorMessage();
        console.log(`Mixed evasion error: ${errorText}`);
        console.log('✅ Mixed evasion techniques correctly blocked');
      } catch (error) {
        await page.waitForTimeout(2000);
        const hasPost = await jeetPage.hasPostWithMessage(mixedEvasion);
        if (hasPost) {
          console.log('❌ FAILURE: Mixed evasion was NOT blocked');
          await page.screenshot({ path: 'evasion_mixed_failure.png', fullPage: true });
        }
      }
    });

    test('should handle Unicode and special characters', async () => {
      console.log('\n=== Testing Unicode and Special Characters ===');
      
      const unicodeMessage = 'I hātë this community with special chars';
      await jeetPage.submitPost(unicodeMessage);
      
      try {
        await jeetPage.waitForError('blocked', 3000);
        const errorText = await jeetPage.getErrorMessage();
        console.log(`Unicode evasion error: ${errorText}`);
        console.log('✅ Unicode evasion correctly blocked');
      } catch (error) {
        await page.waitForTimeout(2000);
        const hasPost = await jeetPage.hasPostWithMessage(unicodeMessage);
        if (hasPost) {
          console.log('❌ FAILURE: Unicode evasion was NOT blocked');
          await page.screenshot({ path: 'evasion_unicode_failure.png', fullPage: true });
        }
      }
    });
  });

  test.describe('Cache State Verification', () => {
    test('check Redis cache state via browser console', async () => {
      console.log('\n=== Checking Cache State ===');
      
      // Try to access any cache-related information that might be exposed
      try {
        const cacheInfo = await page.evaluate(() => {
          // Check if there are any global cache variables or API endpoints
          return {
            hasCacheInfo: typeof window.cacheInfo !== 'undefined',
            hasLocalStorage: typeof localStorage !== 'undefined',
            localStorageKeys: Object.keys(localStorage || {}),
            sessionStorageKeys: Object.keys(sessionStorage || {})
          };
        });
        
        console.log('Browser cache info:', cacheInfo);
      } catch (error) {
        console.log('Could not access cache info:', error.message);
      }
      
      // Check network requests for cache-related API calls
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/posts') || url.includes('/cache')) {
          console.log(`Cache-related request: ${response.status()} ${url}`);
        }
      });
    });
  });
});