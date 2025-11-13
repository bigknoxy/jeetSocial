// Direct WebSocket Connection Test
// Tests the actual WebSocket connection without complex debugging
const { test, expect } = require('@playwright/test');

test.describe('WebSocket Connection Status Test', () => {
  test('Direct WebSocket connection verification', async ({ page }) => {
    test.setTimeout(20000);

    // Navigate to page
    await page.goto('http://localhost:5678');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check WebSocket connection status directly
    const connectionInfo = await page.evaluate(() => {
      // Get detailed connection information
      const wsService = window.wsService;
      const feedManager = window.feedManager;
      
      let socketDetails = null;
      if (wsService && wsService.socket) {
        socketDetails = {
          exists: !!wsService.socket,
          connected: wsService.socket.connected,
          id: wsService.socket.id,
          disconnected: wsService.socket.disconnected,
          io: typeof window.io !== 'undefined'
        };
      }
      
      return {
        wsServiceExists: !!wsService,
        wsServiceStatus: wsService ? wsService.getConnectionStatus() : 'not_available',
        wsServiceConnected: wsService ? wsService.isConnected() : false,
        wsServiceConnectionStatus: wsService ? wsService.connectionStatus : 'not_available',
        socketDetails,
        feedManagerExists: !!feedManager,
        feedManagerWebSocketEnabled: feedManager ? feedManager.getWebSocketStatus() : false,
        socketIOExists: typeof window.io !== 'undefined'
      };
    });

    console.log('Connection Info:', JSON.stringify(connectionInfo, null, 2));

    // Test manual connection check
    const manualCheck = await page.evaluate(() => {
      if (window.wsService && window.wsService.socket) {
        return {
          socketConnected: window.wsService.socket.connected,
          socketId: window.wsService.socket.id,
          connectionStatus: window.wsService.connectionStatus,
          isConnectedMethod: window.wsService.isConnected()
        };
      }
      return null;
    });

    console.log('Manual Check:', JSON.stringify(manualCheck, null, 2));

    // Wait a bit more and check again
    await page.waitForTimeout(2000);
    
    const finalCheck = await page.evaluate(() => {
      if (window.wsService) {
        return {
          status: window.wsService.getConnectionStatus(),
          connected: window.wsService.isConnected(),
          socketConnected: window.wsService.socket ? window.wsService.socket.connected : false,
          socketId: window.wsService.socket ? window.wsService.socket.id : null
        };
      }
      return null;
    });

    console.log('Final Check:', JSON.stringify(finalCheck, null, 2));

    // Create a test post to see if WebSocket events fire
    console.log('Creating test post...');
    const testMessage = `Connection test post ${Date.now()}`;
    
    await page.fill('#message', testMessage);
    await page.click('#post-btn');
    
    // Wait for HTTP response
    await page.waitForResponse(resp => resp.url().includes('/api/posts'), { timeout: 10000 });
    
    // Wait for potential WebSocket processing
    await page.waitForTimeout(3000);

    // Check if new post appears
    const newPostExists = await page.locator('#feed .post.new-post').first().isVisible();
    console.log('New post visible after creation:', newPostExists);

    if (newPostExists) {
      const postContent = await page.locator('#feed .post.new-post .post-content').first().textContent();
      console.log('Post content:', postContent);
    }

    // Take screenshot for visual verification
    await page.screenshot({ path: 'websocket_connection_test.png', fullPage: true });
  });
});