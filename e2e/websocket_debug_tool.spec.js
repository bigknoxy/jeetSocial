// WebSocket Debugging and Analysis Tool
// Helps diagnose WebSocket connection issues and cross-device communication
const { test, expect } = require('@playwright/test');

class WebSocketDebugger {
  constructor(page) {
    this.page = page;
    this.events = [];
    this.connectionStates = [];
    this.networkRequests = [];
    this.consoleMessages = [];
  }

  async initialize() {
    // Setup comprehensive monitoring
    await this.page.evaluate(() => {
      window.wsDebug = {
        events: [],
        connectionStates: [],
        originalConsole: { ...console },
        
        logEvent(type, data) {
          const event = {
            type,
            data,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            sessionId: Array.from(crypto.getRandomValues(new Uint8Array(9)))
              .map(b => b.toString(36)).join('')
          };
          this.events.push(event);
          console.log(`[WS Debug] ${type}:`, data);
        },

        logConnectionState(state) {
          const stateInfo = {
            state,
            timestamp: Date.now(),
            connected: window.wsService ? window.wsService.isConnected() : false
          };
          this.connectionStates.push(stateInfo);
          console.log(`[WS Debug] Connection state:`, stateInfo);
        },

        patchWebSocketService() {
          if (typeof window.wsService !== 'undefined') {
            const originalConnect = window.wsService.connect;
            const originalEmit = window.wsService.emit;
            const originalOn = window.wsService.on;

            window.wsService.connect = function(...args) {
              window.wsDebug.logEvent('connect_attempt', { args });
              return originalConnect.apply(this, args);
            };

            window.wsService.emit = function(event, data) {
              window.wsDebug.logEvent('emit', { event, data });
              return originalEmit.call(this, event, data);
            };

            window.wsService.on = function(event, callback) {
              window.wsDebug.logEvent('listener_added', { event });
              return originalOn.call(this, event, callback);
            };

            // Monitor connection status changes
            window.wsService.on('connection_status_change', (status) => {
              window.wsDebug.logConnectionState(status);
            });

            // Monitor key events
            window.wsService.on('new_post', (data) => {
              window.wsDebug.logEvent('new_post_received', data);
            });

            window.wsService.on('welcome', (data) => {
              window.wsDebug.logEvent('welcome_received', data);
            });

            window.wsService.on('error', (data) => {
              window.wsDebug.logEvent('error_received', data);
            });

            return true;
          }
          return false;
        },

        patchFeedManager() {
          if (typeof window.feedManager !== 'undefined') {
            const originalSetupWebSocket = window.feedManager.setupWebSocket;
            
            window.feedManager.setupWebSocket = function(...args) {
              window.wsDebug.logEvent('feed_manager_setup_attempt', { args });
              const result = originalSetupWebSocket.apply(this, args);
              
              // Check WebSocket status after setup
              setTimeout(() => {
                const status = window.feedManager.getWebSocketStatus();
                window.wsDebug.logConnectionState('feed_manager_status_check');
                window.wsDebug.logEvent('feed_manager_websocket_status', { status });
              }, 1000);
              
              return result;
            };

            return true;
          }
          return false;
        },

        getDebugInfo() {
          return {
            events: this.events,
            connectionStates: this.connectionStates,
            userAgent: navigator.userAgent,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            webSocketService: typeof window.wsService !== 'undefined' ? {
              connected: window.wsService.isConnected(),
              status: window.wsService.getConnectionStatus(),
              reconnectAttempts: window.wsService.getReconnectAttempts()
            } : null,
            feedManager: typeof window.feedManager !== 'undefined' ? {
              webSocketEnabled: window.feedManager.getWebSocketStatus()
            } : null
          };
        }
      };
    });

    // Monitor console messages
    this.page.on('console', msg => {
      const text = msg.text();
      this.consoleMessages.push({
        type: msg.type(),
        text,
        timestamp: Date.now()
      });
      
      if (text.includes('WebSocket') || 
          text.includes('socket.io') || 
          text.includes('FeedManager') || 
          text.includes('wsService')) {
        console.log(`[Console Monitor] ${msg.type()}: ${text}`);
      }
    });

    // Monitor network requests
    this.page.on('request', request => {
      try {
        const url = new URL(request.url());
        if (url.pathname.includes('socket.io') || url.pathname.includes('websocket')) {
          this.networkRequests.push({
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

    this.page.on('response', response => {
      try {
        const url = new URL(response.url());
        if (url.pathname.includes('socket.io') || url.pathname.includes('websocket')) {
          this.networkRequests.push({
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

    // Initialize patches
    await this.page.evaluate(() => {
      const patched = {
        webSocketService: window.wsDebug.patchWebSocketService(),
        feedManager: window.wsDebug.patchFeedManager()
      };
      console.log('[WS Debug] Patches applied:', patched);
      return patched;
    });
  }

  async getDebugInfo() {
    return await this.page.evaluate(() => window.wsDebug.getDebugInfo());
  }

  async waitForConnection(timeout = 15000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const debugInfo = await this.getDebugInfo();
      
      if (debugInfo.webSocketService && debugInfo.webSocketService.connected) {
        console.log('[WS Debug] Connection established after', Date.now() - startTime, 'ms');
        return debugInfo;
      }
      
      await this.page.waitForTimeout(500);
    }
    
    // Timeout reached, return current state for analysis
    const finalDebugInfo = await this.getDebugInfo();
    console.log('[WS Debug] Connection timeout after', timeout, 'ms');
    return finalDebugInfo;
  }

  async createTestPost(message) {
    const testMessage = message || `Debug test post ${Date.now()}`;
    
    // Monitor for WebSocket events during post creation
    const prePostEvents = (await this.getDebugInfo()).events.length;
    
    await this.page.fill('#message', testMessage);
    await this.page.click('#post-btn');
    
    // Wait for HTTP response
    await this.page.waitForResponse(resp => resp.url().includes('/api/posts'), { timeout: 10000 });
    
    // Wait a bit for WebSocket processing
    await this.page.waitForTimeout(2000);
    
    const postDebugInfo = await this.getDebugInfo();
    const newEvents = postDebugInfo.events.slice(prePostEvents);
    
    return {
      message: testMessage,
      events: newEvents,
      debugInfo: postDebugInfo
    };
  }

  printDebugReport(debugInfo, label = 'WebSocket Debug Report') {
    console.log(`\n=== ${label} ===`);
    console.log('User Agent:', debugInfo.userAgent);
    console.log('Viewport:', debugInfo.viewport);
    
    if (debugInfo.webSocketService) {
      console.log('WebSocket Service:');
      console.log('  Connected:', debugInfo.webSocketService.connected);
      console.log('  Status:', debugInfo.webSocketService.status);
      console.log('  Reconnect Attempts:', debugInfo.webSocketService.reconnectAttempts);
    } else {
      console.log('WebSocket Service: NOT AVAILABLE');
    }
    
    if (debugInfo.feedManager) {
      console.log('Feed Manager:');
      console.log('  WebSocket Enabled:', debugInfo.feedManager.webSocketEnabled);
    } else {
      console.log('Feed Manager: NOT AVAILABLE');
    }
    
    console.log('\nConnection States:');
    debugInfo.connectionStates.forEach((state, index) => {
      console.log(`  ${index + 1}. ${new Date(state.timestamp).toISOString()} - ${state.state} (connected: ${state.connected})`);
    });
    
    console.log('\nRecent Events (last 10):');
    debugInfo.events.slice(-10).forEach((event, index) => {
      console.log(`  ${index + 1}. ${new Date(event.timestamp).toISOString()} - ${event.type}:`, event.data);
    });
    
    console.log('=== End Report ===\n');
  }
}

// Test cases using the debugger
test.describe('WebSocket Debug Analysis', () => {
  test('Comprehensive WebSocket connection analysis', async ({ browser }) => {
    test.setTimeout(30000);

    // Test different device types
    const deviceConfigs = [
      { name: 'Desktop', viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      { name: 'Mobile', viewport: { width: 375, height: 667 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15' },
      { name: 'Tablet', viewport: { width: 768, height: 1024 }, userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15' }
    ];

    for (const config of deviceConfigs) {
      console.log(`\n🔍 Testing ${config.name} device...`);
      
      const context = await browser.newContext({
        viewport: config.viewport,
        userAgent: config.userAgent
      });
      
      const page = await context.newPage();
      const wsDebugger = new WebSocketDebugger(page);
      
      try {
        await wsDebugger.initialize();
        await page.goto('http://localhost:5678');
        
        const debugInfo = await wsDebugger.waitForConnection(15000);
        wsDebugger.printDebugReport(debugInfo, `${config.name} WebSocket Analysis`);
        
        // Test post creation
        console.log(`📝 Creating test post on ${config.name}...`);
        const postResult = await wsDebugger.createTestPost(`${config.name} debug post ${Date.now()}`);
        
        console.log(`Post creation events on ${config.name}:`, postResult.events.length);
        postResult.events.forEach(event => {
          console.log(`  - ${event.type}:`, event.data);
        });
        
        // Verify post appears in DOM
        const newPost = await page.locator('#feed .post.new-post').first();
        if (await newPost.isVisible()) {
          const content = await newPost.locator('.post-content').textContent();
          console.log(`✅ Post successfully created and visible on ${config.name}:`, content);
        } else {
          console.log(`❌ Post not visible on ${config.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error testing ${config.name}:`, error.message);
      } finally {
        await context.close();
      }
    }
  });

  test('Cross-device WebSocket communication analysis', async ({ browser }) => {
    test.setTimeout(60000);

    // Create two different device contexts
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
    
    const mobileWsDebugger = new WebSocketDebugger(mobilePage);
    const desktopWsDebugger = new WebSocketDebugger(desktopPage);

    try {
      // Initialize both debuggers
      await mobileWsDebugger.initialize();
      await desktopWsDebugger.initialize();
      
      // Navigate both pages
      await mobilePage.goto('http://localhost:5678');
      await desktopPage.goto('http://localhost:5678');
      
      // Wait for connections
      console.log('⏳ Waiting for WebSocket connections...');
      const mobileDebug = await mobileWsDebugger.waitForConnection(15000);
      const desktopDebug = await desktopWsDebugger.waitForConnection(15000);
      
      mobileWsDebugger.printDebugReport(mobileDebug, 'Mobile Connection Analysis');
      desktopWsDebugger.printDebugReport(desktopDebug, 'Desktop Connection Analysis');
      
      // Test mobile -> desktop communication
      console.log('📱 Testing Mobile -> Desktop communication...');
      const mobilePostResult = await mobileWsDebugger.createTestPost(`Mobile to desktop test ${Date.now()}`);
      
      // Wait for desktop to receive the post
      try {
        await desktopPage.waitForSelector('#feed .post.new-post', { timeout: 10000 });
        const desktopPostContent = await desktopPage.locator('#feed .post.new-post .post-content').first().textContent();
        console.log('✅ Desktop received mobile post:', desktopPostContent);
        
        // Check desktop debug info for WebSocket events
        const desktopPostDebug = await desktopWsDebugger.getDebugInfo();
        const newPostEvents = desktopPostDebug.events.filter(e => e.type === 'new_post_received');
        console.log('Desktop new_post events:', newPostEvents.length);
        
      } catch (error) {
        console.log('❌ Desktop did not receive mobile post within timeout');
        
        // Analyze why
        const finalDesktopDebug = await desktopWsDebugger.getDebugInfo();
        desktopWsDebugger.printDebugReport(finalDesktopDebug, 'Desktop Debug (After Mobile Post)');
      }
      
      // Test desktop -> mobile communication
      console.log('🖥️ Testing Desktop -> Mobile communication...');
      const desktopPostResult = await desktopWsDebugger.createTestPost(`Desktop to mobile test ${Date.now()}`);
      
      try {
        await mobilePage.waitForSelector('#feed .post.new-post', { timeout: 10000 });
        const mobilePostContent = await mobilePage.locator('#feed .post.new-post .post-content').first().textContent();
        console.log('✅ Mobile received desktop post:', mobilePostContent);
        
        // Check mobile debug info for WebSocket events
        const mobilePostDebug = await mobileWsDebugger.getDebugInfo();
        const mobileNewPostEvents = mobilePostDebug.events.filter(e => e.type === 'new_post_received');
        console.log('Mobile new_post events:', mobileNewPostEvents.length);
        
      } catch (error) {
        console.log('❌ Mobile did not receive desktop post within timeout');
        
        // Analyze why
        const finalMobileDebug = await mobileWsDebugger.getDebugInfo();
        mobileWsDebugger.printDebugReport(finalMobileDebug, 'Mobile Debug (After Desktop Post)');
      }
      
    } finally {
      await mobileContext.close();
      await desktopContext.close();
    }
  });

  test('WebSocket room subscription analysis', async ({ browser }) => {
    test.setTimeout(30000);

    const context = await browser.newContext();
    const page = await context.newPage();
    const wsDebugger = new WebSocketDebugger(page);

    try {
      await wsDebugger.initialize();
      await page.goto('http://localhost:5678');
      
      const debugInfo = await wsDebugger.waitForConnection();
      
      // Check room subscriptions
      const roomInfo = await page.evaluate(() => {
        if (typeof window.wsService !== 'undefined') {
          return {
            connected: window.wsService.isConnected(),
            canJoinFeed: typeof window.wsService.joinFeedRoom === 'function',
            canLeaveFeed: typeof window.wsService.leaveFeedRoom === 'function',
            canJoinPost: typeof window.wsService.joinPostRoom === 'function',
            canLeavePost: typeof window.wsService.leavePostRoom === 'function'
          };
        }
        return null;
      });
      
      console.log('Room subscription capabilities:', roomInfo);
      
      // Test feed room operations
      if (roomInfo && roomInfo.connected) {
        console.log('Testing feed room operations...');
        
        // Join feed room
        await page.evaluate(() => {
          if (window.wsService && window.wsService.joinFeedRoom) {
            window.wsService.joinFeedRoom();
          }
        });
        
        await page.waitForTimeout(1000);
        
        // Create a post and see if it's received
        const postResult = await wsDebugger.createTestPost(`Room subscription test ${Date.now()}`);
        
        // Check for new_post events
        const finalDebugInfo = await wsDebugger.getDebugInfo();
        const newPostEvents = finalDebugInfo.events.filter(e => e.type === 'new_post_received');
        
        console.log('New post events after room subscription:', newPostEvents.length);
        newPostEvents.forEach(event => {
          console.log('  Event data:', event.data);
        });
      }
      
    } finally {
      await context.close();
    }
  });
});

module.exports = { WebSocketDebugger };