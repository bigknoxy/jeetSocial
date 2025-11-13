const { test, expect } = require('@playwright/test');

test.describe('WebSocket Connection State Debug', () => {
  test('should debug connection state mismatch', async ({ page }) => {
    page.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('FeedManager') || msg.text().includes('connection_status_change')) {
        console.log(`[DEBUG] ${msg.type()}: ${msg.text()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Allow full initialization

    // Get detailed connection state
    const connectionState = await page.evaluate(() => {
      const wsService = window.wsService;
      const feedManager = window.feedManager;
      
      return {
        // WebSocketService state
        wsServiceExists: !!wsService,
        wsConnectionStatus: wsService ? wsService.getConnectionStatus() : 'N/A',
        wsIsConnected: wsService ? wsService.isConnected() : false,
        wsSocketExists: wsService ? !!wsService.socket : false,
        wsSocketConnected: wsService && wsService.socket ? wsService.socket.connected : 'N/A',
        wsSocketId: wsService && wsService.socket ? wsService.socket.id : 'N/A',
        
        // FeedManager state
        feedManagerExists: !!feedManager,
        feedManagerWsEnabled: feedManager ? feedManager.getWebSocketStatus() : false,
        
        // Socket.IO global state
        ioGlobalExists: typeof window.io !== 'undefined',
        
        // Raw socket state for debugging
        rawSocketState: wsService && wsService.socket ? {
          connected: wsService.socket.connected,
          disconnected: wsService.socket.disconnected,
          id: wsService.socket.id
        } : null
      };
    });

    console.log('[TEST] Connection state:', JSON.stringify(connectionState, null, 2));

    // Test manual connection
    console.log('[TEST] Testing manual WebSocket connection...');
    
    const manualConnectResult = await page.evaluate(async () => {
      if (!window.wsService) return { error: 'wsService not available' };
      
      try {
        // Disconnect first
        window.wsService.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check state after disconnect
        const afterDisconnect = {
          connectionStatus: window.wsService.getConnectionStatus(),
          isConnected: window.wsService.isConnected(),
          socketExists: !!window.wsService.socket
        };
        
        // Connect manually
        await window.wsService.connect();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check state after connect
        const afterConnect = {
          connectionStatus: window.wsService.getConnectionStatus(),
          isConnected: window.wsService.isConnected(),
          socketExists: !!window.wsService.socket,
          socketConnected: window.wsService.socket ? window.wsService.socket.connected : false,
          socketId: window.wsService.socket ? window.wsService.socket.id : null
        };
        
        return {
          success: true,
          afterDisconnect,
          afterConnect
        };
      } catch (error) {
        return { error: error.message, stack: error.stack };
      }
    });

    console.log('[TEST] Manual connect result:', JSON.stringify(manualConnectResult, null, 2));

    // Test room joining
    const roomTestResult = await page.evaluate(() => {
      if (!window.wsService) return { error: 'wsService not available' };
      
      try {
        console.log('[TEST] Attempting to join feed room...');
        window.wsService.joinFeedRoom();
        
        // Wait a bit and check if any events were received
        return { success: true, message: 'Room join attempted' };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('[TEST] Room test result:', roomTestResult);
  });
});