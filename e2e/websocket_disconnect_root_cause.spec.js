const { test, expect } = require('@playwright/test');

test('WebSocket Disconnect Root Cause Analysis', async ({ page }) => {
  // Capture all console logs with timestamps
  const logs = [];
  page.on('console', msg => {
    logs.push({
      timestamp: Date.now(),
      type: msg.type(),
      text: msg.text()
    });
  });

  await page.goto('http://localhost:5678');
  await page.waitForLoadState('networkidle');
  
  // Wait for initialization and capture the sequence
  await page.waitForTimeout(3000);
  
  // Get detailed connection state
  const connectionState = await page.evaluate(() => {
    const wsService = window.wsService;
    const feedManager = window.feedManager;
    
    return {
      timestamp: Date.now(),
      wsService: {
        connectionStatus: wsService ? wsService.getConnectionStatus() : 'N/A',
        isConnected: wsService ? wsService.isConnected() : false,
        socket: wsService && wsService.socket ? {
          exists: !!wsService.socket,
          connected: wsService.socket.connected,
          id: wsService.socket.id,
          disconnected: wsService.socket.disconnected
        } : null
      },
      feedManager: {
        exists: !!feedManager,
        webSocketEnabled: feedManager ? feedManager.getWebSocketStatus() : false,
        isWebSocketEnabled: feedManager ? feedManager.isWebSocketEnabled : false
      }
    };
  });
  
  console.log('Final connection state:', JSON.stringify(connectionState, null, 2));
  
  // Analyze the logs for disconnect patterns
  const wsLogs = logs.filter(log => 
    log.text.includes('[WebSocketService]') || 
    log.text.includes('[FeedManager] WebSocket connection status')
  );
  
  console.log('\n=== WebSocket Connection Sequence ===');
  wsLogs.forEach(log => {
    console.log(`[${log.timestamp}] [${log.type}] ${log.text}`);
  });
  
  // Look for the specific issue
  const connectedLog = wsLogs.find(log => log.text.includes('connection status: connected'));
  const finalDisconnectedState = connectionState.wsService.connectionStatus === 'disconnected';
  const feedManagerThinksConnected = connectionState.feedManager.webSocketEnabled;
  
  console.log('\n=== Analysis ===');
  console.log('FeedManager thinks connected:', feedManagerThinksConnected);
  console.log('WebSocketService actually disconnected:', finalDisconnectedState);
  
  if (connectedLog && finalDisconnectedState && feedManagerThinksConnected) {
    console.log('🔍 CONFIRMED: FeedManager received "connected" but WebSocketService is now disconnected');
    
    // Find what happened after the connection
    const connectedIndex = wsLogs.findIndex(log => log.text.includes('connection status: connected'));
    const logsAfterConnection = wsLogs.slice(connectedIndex + 1);
    
    console.log('\n=== Logs After Connection ===');
    logsAfterConnection.forEach(log => {
      console.log(`[${log.timestamp}] [${log.type}] ${log.text}`);
    });
    
    // Look for disconnect patterns
    const disconnectLog = logsAfterConnection.find(log => 
      log.text.includes('Disconnected:') || 
      log.text.includes('connection status: disconnected')
    );
    
    if (disconnectLog) {
      console.log('\n🎯 FOUND DISCONNECT LOG:', disconnectLog.text);
    }
  }
  
  // This test documents the issue - the expectation is that states should match
  expect(connectionState.feedManager.webSocketEnabled).toBe(connectionState.wsService.isConnected);
});