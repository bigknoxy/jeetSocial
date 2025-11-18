// E2E: WebSocket Cross-Device Live Update Testing
// Tests real-time WebSocket functionality between different devices/browsers
const { test, expect } = require('@playwright/test');

// Helper to create a post via API
async function createPost(apiContext, message) {
  const resp = await apiContext.post('http://localhost:5678/api/posts', {
    data: JSON.stringify({ message }),
    headers: { 'Content-Type': 'application/json' }
  });
  const body = await resp.json();
  return body.id || (body.post && body.post.id) || null;
}

// Helper to get WebSocket connection status
async function getWebSocketStatus(page) {
  return await page.evaluate(() => {
    if (typeof window.wsService !== 'undefined') {
      return {
        connected: window.wsService.isConnected(),
        status: window.wsService.getConnectionStatus(),
        reconnectAttempts: window.wsService.getReconnectAttempts(),
        wsServiceAvailable: true
      };
    }
    if (typeof window.feedManager !== 'undefined') {
      return {
        connected: window.feedManager.getWebSocketStatus(),
        feedManagerAvailable: true
      };
    }
    return { connected: false, error: 'WebSocket service not available' };
  });
}

// Helper to wait for WebSocket connection
async function waitForWebSocketConnection(page, timeout = 15000) {
  const startTime = Date.now();
  let lastStatus = null;
  let manualConnectionAttempted = false;
  
  while (Date.now() - startTime < timeout) {
    lastStatus = await getWebSocketStatus(page);
    // Use actual WebSocket service status if available, fallback to FeedManager
    const isConnected = lastStatus.wsServiceAvailable ? lastStatus.connected : lastStatus.connected;
    
    if (isConnected) {
      return lastStatus;
    }
    
    // Try manual connection after 5 seconds if not connected and wsService is available
    if (!manualConnectionAttempted && lastStatus.wsServiceAvailable && (Date.now() - startTime > 5000)) {
      console.log('Attempting manual WebSocket connection...');
      await page.evaluate(() => {
        if (window.wsService) {
          return window.wsService.connect();
        }
      });
      manualConnectionAttempted = true;
    }
    
    await page.waitForTimeout(500);
  }
  throw new Error(`WebSocket connection not established within ${timeout}ms. Final status: ${JSON.stringify(lastStatus)}`);
}

// Helper to capture WebSocket events
async function captureWebSocketEvents(page) {
  return await page.evaluate(() => {
    const events = [];
    
    // Capture WebSocket events if wsService is available
    if (typeof window.wsService !== 'undefined') {
      const originalEmit = window.wsService.emit;
      window.wsService.emit = function(event, data) {
        events.push({ type: event, data: data, timestamp: Date.now() });
        return originalEmit.call(this, event, data);
      };
      
      // Listen for connection status changes
      window.wsService.on('connection_status_change', (status) => {
        events.push({ type: 'connection_status_change', data: status, timestamp: Date.now() });
      });
      
      // Listen for new posts
      window.wsService.on('new_post', (data) => {
        events.push({ type: 'new_post', data: data, timestamp: Date.now() });
      });
    }
    
    return events;
  });
}

// Helper to get captured events
async function getCapturedEvents(page) {
  return await page.evaluate(() => {
    if (typeof window.capturedWebSocketEvents !== 'undefined') {
      return window.capturedWebSocketEvents;
    }
    return [];
  });
}

test.describe('WebSocket Cross-Device Live Updates', () => {
  test.beforeEach(async ({ context }) => {
    // Enable detailed logging for WebSocket debugging
    context.on('webconsole', msg => {
      if (msg.type() === 'error' || msg.text().includes('WebSocket') || msg.text().includes('/socket.io/')) {
        console.log('[WebSocket Console]', msg.text());
      }
    });
  });

  test('Mobile post appears live on desktop browser', async ({ browser }) => {
    test.setTimeout(60000);

    // Create two contexts: one simulating mobile, one desktop
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone dimensions
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const mobilePage = await mobileContext.newPage();
    const desktopPage = await desktopContext.newPage();

    try {
      // Navigate both pages to the app
      await mobilePage.goto('http://localhost:5678');
      await desktopPage.goto('http://localhost:5678');

      // Wait for initial page load and module initialization
      await mobilePage.waitForTimeout(3000);
      await desktopPage.waitForTimeout(3000);

      // Wait for initial page load and module initialization
      await mobilePage.waitForTimeout(3000);
      await desktopPage.waitForTimeout(3000);

      // Manually trigger WebSocket connections if needed
      console.log('Checking WebSocket connections...');
      const mobileInitialStatus = await getWebSocketStatus(mobilePage);
      const desktopInitialStatus = await getWebSocketStatus(desktopPage);
      
      console.log('Mobile initial status:', mobileInitialStatus);
      console.log('Desktop initial status:', desktopInitialStatus);

      // Manually connect if not connected
      if (!mobileInitialStatus.connected) {
        console.log('Manually connecting mobile WebSocket...');
        await mobilePage.evaluate(() => {
          if (window.wsService) {
            return window.wsService.connect();
          }
        });
        await mobilePage.waitForTimeout(3000);
      }

      if (!desktopInitialStatus.connected) {
        console.log('Manually connecting desktop WebSocket...');
        await desktopPage.evaluate(() => {
          if (window.wsService) {
            return window.wsService.connect();
          }
        });
        await desktopPage.waitForTimeout(3000);
      }

      // Check final status
      const mobileStatus = await getWebSocketStatus(mobilePage);
      const desktopStatus = await getWebSocketStatus(desktopPage);
      
      console.log('Mobile final WebSocket status:', mobileStatus);
      console.log('Desktop final WebSocket status:', desktopStatus);

      // Check actual WebSocket service connection if available
      const mobileConnected = mobileStatus.wsServiceAvailable ? mobileStatus.connected : mobileStatus.connected;
      const desktopConnected = desktopStatus.wsServiceAvailable ? desktopStatus.connected : desktopStatus.connected;

      expect(mobileConnected).toBeTruthy();
      expect(desktopConnected).toBeTruthy();

      // Get initial post count on desktop
      const initialDesktopPosts = await desktopPage.locator('#feed .post').count();
      console.log('Initial desktop post count:', initialDesktopPosts);

      // Create a post from mobile device
      const testMessage = `Mobile test post ${Date.now()}`;
      console.log('Creating post from mobile:', testMessage);

      await mobilePage.fill('#message', testMessage);
      await mobilePage.click('#post-btn');

      // Wait for post creation response
      await mobilePage.waitForResponse(resp => resp.url().includes('/api/posts') && resp.status() === 201, { timeout: 10000 });

      // Wait for new post to appear on desktop via WebSocket (DOM change)
      console.log('Waiting for new post to appear on desktop...');
      await desktopPage.waitForSelector('#feed .post.new-post', { timeout: 15000 });

      // Verify the new post contains our test message
      const newPostElement = await desktopPage.locator('#feed .post.new-post').first();
      const postContent = await newPostElement.locator('.post-content').textContent();
      expect(postContent).toContain(testMessage);

      // Verify post count increased
      const finalDesktopPosts = await desktopPage.locator('#feed .post').count();
      expect(finalDesktopPosts).toBe(initialDesktopPosts + 1);

      console.log('✅ Mobile post successfully appeared on desktop via WebSocket');

    } finally {
      await mobileContext.close();
      await desktopContext.close();
    }
  });

  test('Desktop post appears live on mobile browser', async ({ browser }) => {
    test.setTimeout(60000);

    // Create contexts for desktop and mobile
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });

    const desktopPage = await desktopContext.newPage();
    const mobilePage = await mobileContext.newPage();

    try {
      // Navigate both pages
      await desktopPage.goto('http://localhost:5678');
      await mobilePage.goto('http://localhost:5678');

      // Wait for WebSocket connections
      await waitForWebSocketConnection(desktopPage);
      await waitForWebSocketConnection(mobilePage);



      // Get initial mobile post count
      const initialMobilePosts = await mobilePage.locator('#feed .post').count();

      // Create post from desktop
      const testMessage = `Desktop test post ${Date.now()}`;
      console.log('Creating post from desktop:', testMessage);

      await desktopPage.fill('#message', testMessage);
      await desktopPage.click('#post-btn');

      // Wait for post creation
      await desktopPage.waitForResponse(resp => resp.url().includes('/api/posts') && resp.status() === 201, { timeout: 10000 });

      // Wait for new post to appear on mobile
      console.log('Waiting for new post to appear on mobile...');
      await mobilePage.waitForSelector('#feed .post.new-post', { timeout: 15000 });

      // Verify content
      const newPostContent = await mobilePage.locator('#feed .post.new-post .post-content').first().textContent();
      expect(newPostContent).toBe(testMessage);

      // Verify post count increased
      const finalMobilePosts = await mobilePage.locator('#feed .post').count();
      expect(finalMobilePosts).toBe(initialMobilePosts + 1);

      console.log('✅ Desktop post successfully appeared on mobile via WebSocket');

    } finally {
      await desktopContext.close();
      await mobileContext.close();
    }
  });

  test('Same device receives its own post via WebSocket', async ({ browser }) => {
    test.setTimeout(30000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:5678');
      await waitForWebSocketConnection(page);



      const testMessage = `Same device test post ${Date.now()}`;
      
      // Create post
      await page.fill('#message', testMessage);
      await page.click('#post-btn');

      // Wait for post creation
      await page.waitForResponse(resp => resp.url().includes('/api/posts') && resp.status() === 201, { timeout: 10000 });

      // Wait for new post to appear
      await page.waitForSelector('#feed .post.new-post', { timeout: 15000 });

      // Verify content
      const newPostContent = await page.locator('#feed .post.new-post .post-content').first().textContent();
      expect(newPostContent).toBe(testMessage);

      console.log('✅ Same device successfully received its own post via WebSocket');

    } finally {
      await context.close();
    }
  });

  test('WebSocket connection status monitoring', async ({ browser }) => {
    test.setTimeout(30000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Monitor console for WebSocket events
      const consoleMessages = [];
      page.on('console', msg => {
        if (msg.text().includes('WebSocket') || 
            msg.text().includes('/socket.io/') || 
            msg.text().includes('FeedManager')) {
          consoleMessages.push(msg.text());
        }
      });

      await page.goto('http://localhost:5678');

      // Wait for initial connection
      const status = await waitForWebSocketConnection(page);
      expect(status.connected).toBeTruthy();

      // Check for connection status messages
      const connectionMessages = consoleMessages.filter(msg => 
        msg.includes('connection status') || msg.includes('connected')
      );
      expect(connectionMessages.length).toBeGreaterThan(0);

      console.log('✅ WebSocket connection status monitoring working correctly');

    } finally {
      await context.close();
    }
  });

  test('Multiple simultaneous connections receive broadcasts', async ({ browser }) => {
    test.setTimeout(60000);

    // Create three different contexts
    const contexts = [];
    const pages = [];
    
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext({
        viewport: { width: 800 + (i * 100), height: 600 }
      });
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    try {
      // Setup all pages
      for (const page of pages) {
        await page.goto('http://localhost:5678');
        await waitForWebSocketConnection(page);
      }

      // Create post from first page
      const testMessage = `Multi-connection test post ${Date.now()}`;
      await pages[0].fill('#message', testMessage);
      await pages[0].click('#post-btn');

      // Wait for post creation
      await pages[0].waitForResponse(resp => resp.url().includes('/api/posts') && resp.status() === 201, { timeout: 10000 });

      // Verify all pages receive the new post via DOM updates
      for (let i = 0; i < pages.length; i++) {
        console.log(`Checking page ${i + 1} for new post...`);
        
        // Wait for new post to appear in DOM
        await pages[i].waitForSelector('#feed .post.new-post', { timeout: 15000 });
        
        // Verify content
        const newPostContent = await pages[i].locator('#feed .post.new-post .post-content').first().textContent();
        expect(newPostContent).toBe(testMessage);
      }

      console.log('✅ All connections successfully received the broadcast');

    } finally {
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('WebSocket reconnection handling', async ({ browser }) => {
    test.setTimeout(45000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:5678');
      await waitForWebSocketConnection(page);

      // Monitor reconnection attempts
      const consoleMessages = [];
      page.on('console', msg => {
        if (msg.text().includes('reconnect') || msg.text().includes('disconnect')) {
          consoleMessages.push(msg.text());
        }
      });

      // Simulate network disconnection by going offline
      await page.context().setOffline(true);
      
      // Wait a bit for disconnection to be detected
      await page.waitForTimeout(5000);

      // Go back online
      await page.context().setOffline(false);

      // Wait for reconnection
      await page.waitForTimeout(10000);

      // Verify reconnection happened
      const finalStatus = await getWebSocketStatus(page);
      expect(finalStatus.connected).toBeTruthy();

      // Test that WebSocket still works after reconnection
      const testMessage = `Reconnection test post ${Date.now()}`;
      await page.fill('#message', testMessage);
      await page.click('#post-btn');

      await page.waitForResponse(resp => resp.url().includes('/api/posts') && resp.status() === 201, { timeout: 10000 });
      await page.waitForSelector('#feed .post.new-post', { timeout: 15000 });

      const newPostContent = await page.locator('#feed .post.new-post .post-content').first().textContent();
      expect(newPostContent).toBe(testMessage);

      console.log('✅ WebSocket reconnection handling working correctly');

    } finally {
      await context.close();
    }
  });
});