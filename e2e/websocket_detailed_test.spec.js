// Detailed WebSocket Connection Test
// Captures all console events and network activity
const { test, expect } = require('@playwright/test');

test.describe('Detailed WebSocket Analysis', () => {
  test('Complete WebSocket connection analysis', async ({ page }) => {
    test.setTimeout(30000);

    // Capture all console events
    const allConsoleMessages = [];
    page.on('console', msg => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: Date.now()
      };
      allConsoleMessages.push(message);
      console.log(`[${message.type.toUpperCase()}] ${message.text}`);
    });

    // Capture all network requests
    const networkRequests = [];
    page.on('request', request => {
      const req = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      };
      networkRequests.push(req);
      if (request.url().includes('socket') || request.url().includes('ws')) {
        console.log(`[REQUEST] ${req.method} ${req.url}`);
      }
    });

    page.on('response', response => {
      const resp = {
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: Date.now()
      };
      networkRequests.push(resp);
      if (response.url().includes('socket') || response.url().includes('ws')) {
        console.log(`[RESPONSE] ${resp.status} ${resp.url}`);
      }
    });

    // Navigate to page
    console.log('=== NAVIGATING TO PAGE ===');
    await page.goto('http://localhost:5678', { waitUntil: 'networkidle' });
    
    // Wait for initial setup
    await page.waitForTimeout(5000);

    // Check WebSocket service state in detail
    const detailedState = await page.evaluate(() => {
      const results = {
        timestamp: Date.now(),
        window: {
          io: typeof window.io !== 'undefined',
          ioObject: window.io ? (typeof window.io) : 'undefined'
        },
        wsService: {
          exists: typeof window.wsService !== 'undefined',
          object: window.wsService ? (typeof window.wsService) : 'undefined',
          connectionStatus: window.wsService ? window.wsService.getConnectionStatus() : 'unavailable',
          isConnected: window.wsService ? window.wsService.isConnected() : false,
          connectionPromise: window.wsService ? !!window.wsService.connectionPromise : false,
          socket: window.wsService ? {
            exists: !!window.wsService.socket,
            connected: window.wsService.socket ? window.wsService.socket.connected : false,
            id: window.wsService.socket ? window.wsService.socket.id : null,
            disconnected: window.wsService.socket ? window.wsService.socket.disconnected : null
          } : null
        },
        feedManager: {
          exists: typeof window.feedManager !== 'undefined',
          webSocketEnabled: window.feedManager ? window.feedManager.getWebSocketStatus() : false,
          isWebSocketEnabled: window.feedManager ? window.feedManager.isWebSocketEnabled : false
        }
      };

      // Try to manually check Socket.IO
      if (window.io) {
        try {
          const manualSocket = window.io(window.location.origin);
          results.manualSocketTest = {
            canCreate: true,
            type: typeof manualSocket
          };
        } catch (error) {
          results.manualSocketTest = {
            canCreate: false,
            error: error.message
          };
        }
      }

      return results;
    });

    console.log('=== DETAILED WEBSOCKET STATE ===');
    console.log(JSON.stringify(detailedState, null, 2));

    // Try to manually connect to WebSocket
    const manualConnectionResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof window.io === 'undefined') {
          resolve({ error: 'Socket.IO not available' });
          return;
        }

        console.log('Attempting manual Socket.IO connection...');
        const manualSocket = window.io(window.location.origin, {
          transports: ['websocket', 'polling']
        });

        let connected = false;
        let error = null;

        const timeout = setTimeout(() => {
          if (!connected) {
            manualSocket.disconnect();
            resolve({ 
              error: 'Connection timeout',
              connected: false,
              socketId: manualSocket.id
            });
          }
        }, 5000);

        manualSocket.on('connect', () => {
          connected = true;
          clearTimeout(timeout);
          console.log('Manual connection successful, socket ID:', manualSocket.id);
          resolve({
            connected: true,
            socketId: manualSocket.id,
            connected: manualSocket.connected
          });
        });

        manualSocket.on('connect_error', (err) => {
          error = err;
          clearTimeout(timeout);
          console.log('Manual connection error:', err);
          resolve({
            connected: false,
            error: err.message || err.toString()
          });
        });
      });
    });

    console.log('=== MANUAL CONNECTION RESULT ===');
    console.log(JSON.stringify(manualConnectionResult, null, 2));

    // Wait a bit more
    await page.waitForTimeout(3000);

    // Final state check
    const finalState = await page.evaluate(() => {
      return {
        wsService: {
          connectionStatus: window.wsService ? window.wsService.getConnectionStatus() : 'unavailable',
          isConnected: window.wsService ? window.wsService.isConnected() : false,
          socket: window.wsService ? {
            exists: !!window.wsService.socket,
            connected: window.wsService.socket ? window.wsService.socket.connected : false,
            id: window.wsService.socket ? window.wsService.socket.id : null
          } : null
        },
        feedManager: {
          webSocketEnabled: window.feedManager ? window.feedManager.getWebSocketStatus() : false
        }
      };
    });

    console.log('=== FINAL STATE ===');
    console.log(JSON.stringify(finalState, null, 2));

    // Analyze console messages
    const wsMessages = allConsoleMessages.filter(msg => 
      msg.text.includes('WebSocket') || 
      msg.text.includes('/socket.io/') || 
      msg.text.includes('FeedManager') || 
      msg.text.includes('wsService')
    );

    console.log('=== RELEVANT CONSOLE MESSAGES ===');
    wsMessages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
    });

    // Analyze network requests
    const wsNetworkRequests = networkRequests.filter(req => 
      req.url.includes('/socket.io/') || req.url.includes('websocket')
    );

    console.log('=== WEBSOCKET NETWORK REQUESTS ===');
    wsNetworkRequests.forEach((req, index) => {
      console.log(`${index + 1}. ${req.method || req.status} ${req.url}`);
    });

    // Take screenshot
    await page.screenshot({ path: 'websocket_detailed_analysis.png', fullPage: true });
  });
});