const { test, expect } = require('@playwright/test');

test.describe('WebSocket Cross-Device Final Test', () => {
  test('should work after removing competing WebSocket management', async ({ page, context }) => {
    // Enable detailed logging
    page.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('FeedManager') || msg.text().includes('new_post')) {
        console.log(`[DESKTOP] ${msg.type()}: ${msg.text()}`);
      }
    });

    // Navigate to homepage and wait for full load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Allow WebSocket initialization and validation

    // Check WebSocket connection status
    const wsStatus = await page.evaluate(() => {
      return {
        feedManagerExists: typeof window.feedManager !== 'undefined',
        feedManagerWsStatus: window.feedManager ? window.feedManager.getWebSocketStatus() : null,
        wsServiceExists: typeof window.wsService !== 'undefined',
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : null,
        wsConnectionStatus: window.wsService ? window.wsService.getConnectionStatus() : null
      };
    });

    console.log('[TEST] Desktop WebSocket status:', wsStatus);
    expect(wsStatus.feedManagerExists).toBe(true);
    expect(wsStatus.wsServiceExists).toBe(true);

    // Create mobile context
    const mobileContext = await page.context().browser().newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });

    const mobilePage = await mobileContext.newPage();
    
    // Enable logging for mobile page too
    mobilePage.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('FeedManager') || msg.text().includes('new_post')) {
        console.log(`[MOBILE] ${msg.type()}: ${msg.text()}`);
      }
    });

    // Navigate mobile page to same site
    await mobilePage.goto('/');
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.waitForTimeout(5000);

    // Check mobile WebSocket status
    const mobileStatus = await mobilePage.evaluate(() => {
      return {
        feedManagerExists: typeof window.feedManager !== 'undefined',
        feedManagerWsStatus: window.feedManager ? window.feedManager.getWebSocketStatus() : null,
        wsServiceExists: typeof window.wsService !== 'undefined',
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : null,
        wsConnectionStatus: window.wsService ? window.wsService.getConnectionStatus() : null
      };
    });

    console.log('[TEST] Mobile WebSocket status:', mobileStatus);
    expect(mobileStatus.feedManagerExists).toBe(true);
    expect(mobileStatus.wsServiceExists).toBe(true);

    // Test cross-device communication
    console.log('[TEST] Testing cross-device communication...');
    
    // Post from mobile
    const testMessage = `Cross-device test after architecture fix 🎉 ${Date.now()}`;
    await mobilePage.fill('#message', testMessage);
    await mobilePage.click('#post-btn');
    
    // Wait for post to appear on mobile
    await mobilePage.waitForSelector('.post:has-text("' + testMessage + '")', { timeout: 10000 });
    console.log('[TEST] ✅ Post appeared on mobile device');

    // Check if post appears on desktop (this is the key test)
    try {
      await page.waitForSelector('.post:has-text("' + testMessage + '")', { timeout: 8000 });
      console.log('[TEST] ✅ SUCCESS: Post appeared on desktop via WebSocket!');
      
      // Test reverse direction
      const reverseMessage = `Desktop to mobile test 🚀 ${Date.now()}`;
      await page.fill('#message', reverseMessage);
      await page.click('#post-btn');
      
      await page.waitForSelector('.post:has-text("' + reverseMessage + '")', { timeout: 10000 });
      console.log('[TEST] ✅ Post appeared on desktop');
      
      // Check if reverse post appears on mobile
      await mobilePage.waitForSelector('.post:has-text("' + reverseMessage + '")', { timeout: 8000 });
      console.log('[TEST] ✅ SUCCESS: Desktop post appeared on mobile via WebSocket!');
      
      console.log('[TEST] 🎉 CROSS-DEVICE WEBSOCKET COMMUNICATION WORKING!');
      
    } catch (error) {
      console.log('[TEST] ❌ FAILED: Cross-device communication not working');
      console.log('[TEST] Error:', error.message);
      
      // Debug: check current posts on both pages
      const desktopPosts = await page.evaluate(() => {
        const posts = document.querySelectorAll('.post .post-content');
        return Array.from(posts).map(p => p.textContent);
      });
      console.log('[TEST] Current desktop posts:', desktopPosts);
      
      const mobilePosts = await mobilePage.evaluate(() => {
        const posts = document.querySelectorAll('.post .post-content');
        return Array.from(posts).map(p => p.textContent);
      });
      console.log('[TEST] Current mobile posts:', mobilePosts);
    }

    await mobileContext.close();
  });
});