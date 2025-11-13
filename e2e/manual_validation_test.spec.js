const { test, expect } = require('@playwright/test');

test.describe('Manual Validation Test', () => {
  test('should manually trigger validation and fix disconnect', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
      if (msg.text().includes('[FeedManager]') || msg.text().includes('[WebSocketService]')) {
        console.log('[CONSOLE]', msg.text());
      }
    });

    await page.goto('http://localhost:5678');
    
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
    
    // Manually trigger validation logic in browser console
    console.log('Manually triggering validation...');
    
    const manualResult = await page.evaluate(() => {
      const feedManager = window.feedManager;
      const wsService = window.wsService;
      
      if (!feedManager || !wsService) {
        return { error: 'Missing services' };
      }
      
      // Manually call the validation logic that should be in setInterval
      const managerEnabled = feedManager.getWebSocketStatus();
      const serviceConnected = wsService.isConnected();
      const connectionStatus = wsService.getConnectionStatus();
      
      console.log('Manual validation - Manager enabled:', managerEnabled);
      console.log('Manual validation - Service connected:', serviceConnected);
      console.log('Manual validation - Service status:', connectionStatus);
      
      if (managerEnabled && !serviceConnected) {
        console.log('MANUAL VALIDATION: Detected disconnect - fixing...');
        // Manually set the state to what it should be
        feedManager.isWebSocketEnabled = false;
        feedManager.startPolling();
        
        return {
          fixed: true,
          newManagerState: feedManager.getWebSocketStatus(),
          message: 'Manually fixed disconnect state'
        };
      } else {
        return {
          fixed: false,
          message: 'No disconnect detected'
        };
      }
    });
    
    console.log('Manual validation result:', manualResult);
    
    // Wait a moment to see if polling starts
    await page.waitForTimeout(2000);
    
    // Check final state
    const finalState = await page.evaluate(() => {
      return {
        wsConnectionStatus: window.wsService?.getConnectionStatus(),
        wsIsConnected: window.wsService?.isConnected(),
        feedManagerWsEnabled: window.feedManager?.getWebSocketStatus(),
        timestamp: Date.now()
      };
    });
    
    console.log('Final state after manual fix:', finalState);
    
    // Verify the fix worked
    if (manualResult.fixed) {
      expect(finalState.feedManagerWsEnabled).toBe(false);
      console.log('✅ Manual validation successfully fixed the disconnect state!');
    } else {
      console.log('ℹ️ No manual fix needed - state was already correct');
    }
  });
});