const { test, expect } = require('@playwright/test');

test.describe('WebSocket Validation Debug', () => {
  test('should debug periodic validation', async ({ page }) => {
    // Capture console logs
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
      if (msg.text().includes('[FeedManager]') || msg.text().includes('[WebSocketService]')) {
        console.log('[CONSOLE]', msg.text());
      }
    });

    await page.goto('http://localhost:5678', { waitUntil: 'networkidle' });
    
    // Wait for everything to load
    await page.waitForTimeout(3000);
    
    // Get initial connection state
    const initialState = await page.evaluate(() => {
      return {
        wsServiceExists: typeof window.wsService !== 'undefined',
        wsConnectionStatus: window.wsService?.getConnectionStatus(),
        wsIsConnected: window.wsService?.isConnected(),
        feedManagerExists: typeof window.feedManager !== 'undefined',
        feedManagerWsEnabled: window.feedManager?.getWebSocketStatus(),
        timestamp: Date.now()
      };
    });
    
    console.log('Initial state:', initialState);
    
    // Wait for periodic validation to run (every 5 seconds)
    console.log('Waiting 7 seconds for periodic validation...');
    await page.waitForTimeout(7000);
    
    // Check state after validation should have run
    const afterValidationState = await page.evaluate(() => {
      return {
        wsServiceExists: typeof window.wsService !== 'undefined',
        wsConnectionStatus: window.wsService?.getConnectionStatus(),
        wsIsConnected: window.wsService?.isConnected(),
        feedManagerExists: typeof window.feedManager !== 'undefined',
        feedManagerWsEnabled: window.feedManager?.getWebSocketStatus(),
        timestamp: Date.now()
      };
    });
    
    console.log('After validation state:', afterValidationState);
    
    // Manually trigger validation check
    console.log('Manually checking validation logic...');
    const manualCheck = await page.evaluate(() => {
      const feedManager = window.feedManager;
      const wsService = window.wsService;
      
      if (!feedManager || !wsService) {
        return { error: 'Missing services' };
      }
      
      const isManagerEnabled = feedManager.getWebSocketStatus();
      const isServiceConnected = wsService.isConnected();
      const connectionStatus = wsService.getConnectionStatus();
      
      console.log('Manual check - Manager enabled:', isManagerEnabled);
      console.log('Manual check - Service connected:', isServiceConnected);
      console.log('Manual check - Service status:', connectionStatus);
      
      // This is the same logic as in startConnectionValidation
      const shouldDetectDisconnect = isManagerEnabled && !isServiceConnected;
      
      return {
        isManagerEnabled,
        isServiceConnected,
        connectionStatus,
        shouldDetectDisconnect,
        needsCorrection: shouldDetectDisconnect
      };
    });
    
    console.log('Manual check result:', manualCheck);
    
    // If validation should have caught the disconnect, test if it does
    if (manualCheck.shouldDetectDisconnect) {
      console.log('Validation should have caught disconnect - testing if it works...');
      
      // Wait a bit more to see if validation catches it
      await page.waitForTimeout(6000);
      
      const finalState = await page.evaluate(() => {
        return {
          wsConnectionStatus: window.wsService?.getConnectionStatus(),
          wsIsConnected: window.wsService?.isConnected(),
          feedManagerWsEnabled: window.feedManager?.getWebSocketStatus(),
          timestamp: Date.now()
        };
      });
      
      console.log('Final state after waiting:', finalState);
      
      // The validation should have corrected the state by now
      expect(finalState.feedManagerWsEnabled).toBe(false);
    } else {
      console.log('No disconnect detected, validation not needed');
    }
  });
});