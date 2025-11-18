// Simple WebSocket Connection Test
// Focuses on basic connection establishment and event handling
const { test, expect } = require('@playwright/test');

test.describe('WebSocket Simple Connection Test', () => {
  test('Basic WebSocket connection analysis', async ({ page }) => {
    test.setTimeout(30000);

    // Setup console monitoring
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({
        type: msg.type(),
        text,
        timestamp: Date.now()
      });
      
      if (text.includes('WebSocket') || text.includes('/socket.io/') || 
          text.includes('FeedManager') || text.includes('wsService')) {
        console.log(`[Console] ${msg.type()}: ${text}`);
      }
    });

    // Monitor network requests
    const networkRequests = [];
    page.on('request', request => {
      try {
        const url = new URL(request.url());
        if (url.pathname.includes('/socket.io/')) {
          networkRequests.push({
            type: 'request',
            url: request.url(),
            method: request.method(),
            timestamp: Date.now()
          });
          console.log(`[Network] Request: ${request.method()} ${request.url()}`);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    });

    page.on('response', response => {
      try {
        const url = new URL(response.url());
        if (url.pathname.includes('/socket.io/')) {
          networkRequests.push({
            type: 'response',
            url: response.url(),
            status: response.status(),
            timestamp: Date.now()
          });
          console.log(`[Network] Response: ${response.status()} ${response.url()}`);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    });

    // Navigate to the page
    await page.goto('http://localhost:5678');
    
    // Wait for initial page load
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket initialization
    await page.waitForTimeout(3000);

    // Check WebSocket connection status
    const wsStatus = await page.evaluate(() => {
      return {
        wsServiceExists: typeof window.wsService !== 'undefined',
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : false,
        wsServiceStatus: window.wsService ? window.wsService.getConnectionStatus() : 'not_available',
        feedManagerExists: typeof window.feedManager !== 'undefined',
        feedManagerWebSocketEnabled: window.feedManager ? window.feedManager.getWebSocketStatus() : false,
        socketIOExists: typeof window.io !== 'undefined'
      };
    });

    console.log('WebSocket Status:', wsStatus);

    // Analyze console messages for WebSocket events
    const wsConsoleMessages = consoleMessages.filter(msg => 
      msg.text.includes('WebSocket') || 
      msg.text.includes('/socket.io/') || 
      msg.text.includes('FeedManager') || 
      msg.text.includes('wsService')
    );

    console.log('\n=== WebSocket Console Messages ===');
    wsConsoleMessages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
    });

    console.log('\n=== Network Requests ===');
    networkRequests.forEach((req, index) => {
      console.log(`${index + 1}. ${req.type}: ${req.method || req.status} ${req.url}`);
    });

    // Try to create a test post and see what happens
    console.log('\n=== Creating Test Post ===');
    const testMessage = `Simple debug test ${Date.now()}`;
    
    await page.fill('#message', testMessage);
    await page.click('#post-btn');
    
    // Wait for HTTP response
    await page.waitForResponse(resp => resp.url().includes('/api/posts'), { timeout: 10000 });
    
    // Wait a bit for WebSocket processing
    await page.waitForTimeout(3000);

    // Check if new post appears in feed
    const newPost = await page.locator('#feed .post.new-post').first();
    const postVisible = await newPost.isVisible();
    
    console.log('New post visible:', postVisible);
    
    if (postVisible) {
      const postContent = await newPost.locator('.post-content').textContent();
      console.log('Post content:', postContent);
    }

    // Final WebSocket status check
    const finalWsStatus = await page.evaluate(() => {
      return {
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : false,
        wsServiceStatus: window.wsService ? window.wsService.getConnectionStatus() : 'not_available',
        feedManagerWebSocketEnabled: window.feedManager ? window.feedManager.getWebSocketStatus() : false
      };
    });

    console.log('Final WebSocket Status:', finalWsStatus);

    // Take screenshot for visual analysis
    await page.screenshot({ path: 'websocket_simple_debug.png', fullPage: true });
  });

  test('Cross-device connection comparison', async ({ browser }) => {
    test.setTimeout(45000);

    // Create two contexts with different user agents
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const mobilePage = await mobileContext.newPage();
    const desktopPage = await desktopContext.newPage();

    try {
      // Setup monitoring for both pages
      const setupMonitoring = (page, name) => {
        const messages = [];
        page.on('console', msg => {
          const text = msg.text();
          if (text.includes('WebSocket') || text.includes('FeedManager')) {
            messages.push({ text, timestamp: Date.now() });
            console.log(`[${name}] ${msg.type()}: ${text}`);
          }
        });
        return messages;
      };

      const mobileMessages = setupMonitoring(mobilePage, 'Mobile');
      const desktopMessages = setupMonitoring(desktopPage, 'Desktop');

      // Navigate both pages
      console.log('Navigating both pages...');
      await Promise.all([
        mobilePage.goto('http://localhost:5678'),
        desktopPage.goto('http://localhost:5678')
      ]);

      // Wait for initialization
      await page.waitForTimeout(3000);

      // Check connection status on both
      const mobileStatus = await mobilePage.evaluate(() => ({
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : false,
        wsServiceStatus: window.wsService ? window.wsService.getConnectionStatus() : 'not_available',
        feedManagerWebSocketEnabled: window.feedManager ? window.feedManager.getWebSocketStatus() : false
      }));

      const desktopStatus = await desktopPage.evaluate(() => ({
        wsServiceConnected: window.wsService ? window.wsService.isConnected() : false,
        wsServiceStatus: window.wsService ? window.wsService.getConnectionStatus() : 'not_available',
        feedManagerWebSocketEnabled: window.feedManager ? window.feedManager.getWebSocketStatus() : false
      }));

      console.log('Mobile Status:', mobileStatus);
      console.log('Desktop Status:', desktopStatus);

      // Test mobile -> desktop communication
      console.log('Testing Mobile -> Desktop...');
      const mobileTestMessage = `Mobile to desktop test ${Date.now()}`;
      
      await mobilePage.fill('#message', mobileTestMessage);
      await mobilePage.click('#post-btn');
      
      // Wait for mobile post to be processed
      await mobilePage.waitForResponse(resp => resp.url().includes('/api/posts'), { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Check if desktop receives the post
      try {
        await desktopPage.waitForSelector('#feed .post.new-post', { timeout: 8000 });
        const desktopPostContent = await desktopPage.locator('#feed .post.new-post .post-content').first().textContent();
        console.log('✅ Desktop received mobile post:', desktopPostContent);
      } catch (error) {
        console.log('❌ Desktop did not receive mobile post');
      }

      // Test desktop -> mobile communication
      console.log('Testing Desktop -> Mobile...');
      const desktopTestMessage = `Desktop to mobile test ${Date.now()}`;
      
      await desktopPage.fill('#message', desktopTestMessage);
      await desktopPage.click('#post-btn');
      
      // Wait for desktop post to be processed
      await desktopPage.waitForResponse(resp => resp.url().includes('/api/posts'), { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Check if mobile receives the post
      try {
        await mobilePage.waitForSelector('#feed .post.new-post', { timeout: 8000 });
        const mobilePostContent = await mobilePage.locator('#feed .post.new-post .post-content').first().textContent();
        console.log('✅ Mobile received desktop post:', mobilePostContent);
      } catch (error) {
        console.log('❌ Mobile did not receive desktop post');
      }

      // Take screenshots for analysis
      await mobilePage.screenshot({ path: 'mobile_websocket_test.png', fullPage: true });
      await desktopPage.screenshot({ path: 'desktop_websocket_test.png', fullPage: true });

    } finally {
      await mobileContext.close();
      await desktopContext.close();
    }
  });
});