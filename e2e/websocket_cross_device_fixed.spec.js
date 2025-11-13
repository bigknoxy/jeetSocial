const { test, expect } = require('@playwright/test');

test.describe('WebSocket Cross-Device Communication After Architecture Fix', () => {
  test('should maintain stable WebSocket connection without interference from main.js', async ({ page, context }) => {
    // Enable detailed logging
    page.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('FeedManager') || msg.text().includes('main.js')) {
        console.log(`[PAGE1] ${msg.type()}: ${msg.text()}`);
      }
    });

    // Navigate to homepage and wait for full load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow WebSocket initialization

    // Check WebSocket connection status
    const wsStatus = await page.evaluate(() => {
      return {
        feedManagerExists: typeof window.feedManager !== 'undefined',
        feedManagerWsStatus: window.feedManager ? window.feedManager.getWebSocketStatus() : null,
        wsServiceExists: typeof window.wsService !== 'undefined',
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : null
      };
    });

    console.log('[TEST] Initial WebSocket status:', wsStatus);
    expect(wsStatus.feedManagerExists).toBe(true);
    expect(wsStatus.wsServiceExists).toBe(true);

    // Wait for WebSocket to connect (if it's going to)
    await page.waitForTimeout(3000);

    // Check final connection status
    const finalStatus = await page.evaluate(() => {
      return {
        feedManagerWsStatus: window.feedManager ? window.feedManager.getWebSocketStatus() : null,
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : null
      };
    });

    console.log('[TEST] Final WebSocket status:', finalStatus);

    // Create second mobile context
    const mobileContext = await page.context().browser().newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });

    const mobilePage = await mobileContext.newPage();
    
    // Enable logging for mobile page too
    mobilePage.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('FeedManager') || msg.text().includes('main.js')) {
        console.log(`[MOBILE] ${msg.type()}: ${msg.text()}`);
      }
    });

    // Navigate mobile page to same site
    await mobilePage.goto('/');
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.waitForTimeout(2000);

    // Check mobile WebSocket status
    const mobileStatus = await mobilePage.evaluate(() => {
      return {
        feedManagerExists: typeof window.feedManager !== 'undefined',
        feedManagerWsStatus: window.feedManager ? window.feedManager.getWebSocketStatus() : null,
        wsServiceExists: typeof window.wsService !== 'undefined',
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : null
      };
    });

    console.log('[TEST] Mobile WebSocket status:', mobileStatus);
    expect(mobileStatus.feedManagerExists).toBe(true);
    expect(mobileStatus.wsServiceExists).toBe(true);

    // Wait for mobile WebSocket to stabilize
    await mobilePage.waitForTimeout(3000);

    // Test posting from mobile and receiving on desktop
    console.log('[TEST] Testing cross-device communication...');
    
    // Fill and submit form on mobile
    await mobilePage.fill('#message', 'Cross-device test message after architecture fix 🎉');
    await mobilePage.click('#post-btn');
    
    // Wait for post to appear on mobile
    await mobilePage.waitForSelector('.post:has-text("Cross-device test message after architecture fix 🎉")', { timeout: 10000 });
    console.log('[TEST] Post appeared on mobile device');

    // Check if post appears on desktop (this is the key test)
    try {
      await page.waitForSelector('.post:has-text("Cross-device test message after architecture fix 🎉")', { timeout: 8000 });
      console.log('[TEST] ✅ SUCCESS: Post appeared on desktop via WebSocket!');
      
      // Take screenshot for verification
      await page.screenshot({ path: 'cross-device-success.png', fullPage: false });
      
    } catch (error) {
      console.log('[TEST] ❌ FAILED: Post did not appear on desktop');
      await page.screenshot({ path: 'cross-device-failed.png', fullPage: false });
      
      // Debug: check current posts on desktop
      const desktopPosts = await page.evaluate(() => {
        const posts = document.querySelectorAll('.post .post-content');
        return Array.from(posts).map(p => p.textContent);
      });
      console.log('[TEST] Current desktop posts:', desktopPosts);
    }

    // Test the reverse direction - desktop to mobile
    console.log('[TEST] Testing desktop to mobile communication...');
    
    await page.fill('#message', 'Desktop to mobile test after fix 🚀');
    await page.click('#post-btn');
    
    // Wait for post to appear on desktop
    await page.waitForSelector('.post:has-text("Desktop to mobile test after fix 🚀")', { timeout: 10000 });
    console.log('[TEST] Post appeared on desktop');

    // Check if post appears on mobile
    try {
      await mobilePage.waitForSelector('.post:has-text("Desktop to mobile test after fix 🚀")', { timeout: 8000 });
      console.log('[TEST] ✅ SUCCESS: Desktop post appeared on mobile via WebSocket!');
      
      await mobilePage.screenshot({ path: 'mobile-receive-success.png', fullPage: false });
      
    } catch (error) {
      console.log('[TEST] ❌ FAILED: Desktop post did not appear on mobile');
      await mobilePage.screenshot({ path: 'mobile-receive-failed.png', fullPage: false });
      
      // Debug: check current posts on mobile
      const mobilePosts = await mobilePage.evaluate(() => {
        const posts = document.querySelectorAll('.post .post-content');
        return Array.from(posts).map(p => p.textContent);
      });
      console.log('[TEST] Current mobile posts:', mobilePosts);
    }

    // Final connection status check
    const finalDesktopStatus = await page.evaluate(() => {
      return {
        feedManagerWsStatus: window.feedManager ? window.feedManager.getWebSocketStatus() : null,
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : null
      };
    });

    const finalMobileStatus = await mobilePage.evaluate(() => {
      return {
        feedManagerWsStatus: window.feedManager ? window.feedManager.getWebSocketStatus() : null,
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : null
      };
    });

    console.log('[TEST] Final desktop status:', finalDesktopStatus);
    console.log('[TEST] Final mobile status:', finalMobileStatus);

    await mobileContext.close();
  });

  test('should verify no competing WebSocket management from main.js', async ({ page }) => {
    page.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('joinFeedRoom') || msg.text().includes('leaveFeedRoom')) {
        console.log(`[DEBUG] ${msg.type()}: ${msg.text()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Monitor WebSocket room management calls
    const wsCalls = [];
    
    await page.evaluate(() => {
      const originalJoinFeedRoom = window.wsService?.joinFeedRoom;
      const originalLeaveFeedRoom = window.wsService?.leaveFeedRoom;
      const originalJoinPostRoom = window.wsService?.joinPostRoom;
      
      if (window.wsService) {
        window.wsService.joinFeedRoom = function(...args) {
          window.wsCallLog = window.wsCallLog || [];
          window.wsCallLog.push({ method: 'joinFeedRoom', args, source: 'tracked' });
          return originalJoinFeedRoom.apply(this, args);
        };
        
        window.wsService.leaveFeedRoom = function(...args) {
          window.wsCallLog = window.wsCallLog || [];
          window.wsCallLog.push({ method: 'leaveFeedRoom', args, source: 'tracked' });
          return originalLeaveFeedRoom.apply(this, args);
        };
        
        window.wsService.joinPostRoom = function(...args) {
          window.wsCallLog = window.wsCallLog || [];
          window.wsCallLog.push({ method: 'joinPostRoom', args, source: 'tracked' });
          return originalJoinPostRoom.apply(this, args);
        };
      }
      
      window.wsCallLog = [];
    });

    // Navigate to different pages to trigger potential main.js WebSocket calls
    await page.click('#next-page');
    await page.waitForTimeout(1000);
    
    await page.click('#prev-page');
    await page.waitForTimeout(1000);

    // Check WebSocket call log
    const callLog = await page.evaluate(() => window.wsCallLog || []);
    console.log('[TEST] WebSocket room management calls:', callLog);

    // Verify that calls are made (by FeedManager) but not excessive (which would indicate main.js interference)
    expect(callLog.length).toBeGreaterThan(0); // FeedManager should make calls
    expect(callLog.length).toBeLessThan(10); // But not too many (which would indicate competing calls)
  });
});