const { test, expect } = require('@playwright/test');

test('WebSocket Service Direct Connection Test', async ({ page }) => {
  await page.goto('http://localhost:5678');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Get direct access to WebSocketService
  const wsServiceState = await page.evaluate(() => {
    const wsService = window.wsService;
    if (!wsService) {
      return { error: 'WebSocketService not found' };
    }
    
    return {
      connectionStatus: wsService.getConnectionStatus(),
      isConnected: wsService.isConnected(),
      socket: wsService.socket ? {
        exists: !!wsService.socket,
        connected: wsService.socket.connected,
        id: wsService.socket.id
      } : null
    };
  });
  
  console.log('Initial WebSocketService state:', JSON.stringify(wsServiceState, null, 2));
  
  // Try to connect manually
  const connectResult = await page.evaluate(async () => {
    const wsService = window.wsService;
    if (!wsService) {
      return { error: 'WebSocketService not found' };
    }
    
    try {
      await wsService.connect();
      return {
        success: true,
        connectionStatus: wsService.getConnectionStatus(),
        isConnected: wsService.isConnected(),
        socket: wsService.socket ? {
          exists: !!wsService.socket,
          connected: wsService.socket.connected,
          id: wsService.socket.id
        } : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        connectionStatus: wsService.getConnectionStatus(),
        isConnected: wsService.isConnected(),
        socket: wsService.socket ? {
          exists: !!wsService.socket,
          connected: wsService.socket.connected,
          id: wsService.socket.id
        } : null
      };
    }
  });
  
  console.log('After manual connect:', JSON.stringify(connectResult, null, 2));
  
  // Wait a bit and check again
  await page.waitForTimeout(2000);
  
  const finalState = await page.evaluate(() => {
    const wsService = window.wsService;
    return {
      connectionStatus: wsService.getConnectionStatus(),
      isConnected: wsService.isConnected(),
      socket: wsService.socket ? {
        exists: !!wsService.socket,
        connected: wsService.socket.connected,
        id: wsService.socket.id
      } : null
    };
  });
  
  console.log('Final state after 2 seconds:', JSON.stringify(finalState, null, 2));
  
  // Check if the connection is stable
  expect(finalState.isConnected).toBe(true);
  expect(finalState.socket).not.toBeNull();
  expect(finalState.socket.connected).toBe(true);
});