const { test, expect } = require('@playwright/test');

test('WebSocket Initialization Sequence Test', async ({ page }) => {
  // Capture console logs during initialization
  const logs = [];
  page.on('console', msg => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  await page.goto('http://localhost:5678');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Get the initialization sequence
  const initSequence = await page.evaluate(() => {
    return window.connectionEvents || [];
  });
  
  console.log('Console logs during initialization:');
  logs.forEach(log => {
    if (log.text.includes('WebSocket') || log.text.includes('FeedManager') || log.text.includes('connection status')) {
      console.log(`[${log.type}] ${log.text}`);
    }
  });
  
  // Check final state
  const finalState = await page.evaluate(() => {
    const wsService = window.wsService;
    const feedManager = window.feedManager;
    
    return {
      wsService: {
        exists: !!wsService,
        connectionStatus: wsService ? wsService.getConnectionStatus() : 'N/A',
        isConnected: wsService ? wsService.isConnected() : false,
        socket: wsService && wsService.socket ? {
          exists: !!wsService.socket,
          connected: wsService.socket.connected,
          id: wsService.socket.id
        } : null
      },
      feedManager: {
        exists: !!feedManager,
        webSocketEnabled: feedManager ? feedManager.getWebSocketStatus() : false
      }
    };
  });
  
  console.log('Final state:', JSON.stringify(finalState, null, 2));
  
  // The issue we're looking for:
  // 1. FeedManager thinks WebSocket is enabled
  // 2. But WebSocketService is disconnected
  if (finalState.feedManager.webSocketEnabled && !finalState.wsService.isConnected) {
    console.log('🔍 ISSUE DETECTED: FeedManager thinks WebSocket is enabled but WebSocketService is disconnected');
    
    // Let's check when the status change happened
    const statusChangeLogs = logs.filter(log => 
      log.text.includes('WebSocket connection status') && 
      log.text.includes('connected')
    );
    
    console.log('Status change logs:', statusChangeLogs.map(log => log.text));
  }
  
  // This test documents the current behavior
  // The expectation is that both should be in sync
  expect(finalState.feedManager.webSocketEnabled).toBe(finalState.wsService.isConnected);
});