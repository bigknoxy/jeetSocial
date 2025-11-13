const { test, expect } = require('@playwright/test');

test('WebSocket Socket Tracking', async ({ page }) => {
  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // Navigate to page
  await page.goto('http://localhost:5678');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Inject socket tracking code
  await page.evaluate(() => {
    window.socketTracking = [];
    
    // Monitor WebSocketService socket property
    if (window.wsService) {
      let lastSocket = window.wsService.socket;
      let lastStatus = window.wsService.connectionStatus;
      
      // Track changes every 100ms
      const trackingInterval = setInterval(() => {
        const currentSocket = window.wsService.socket;
        const currentStatus = window.wsService.connectionStatus;
        const isConnected = window.wsService.isConnected();
        
        if (currentSocket !== lastSocket || currentStatus !== lastStatus) {
          window.socketTracking.push({
            timestamp: Date.now(),
            socket: currentSocket ? {
              exists: !!currentSocket,
              connected: currentSocket.connected,
              id: currentSocket.id
            } : null,
            status: currentStatus,
            isConnected: isConnected
          });
          
          lastSocket = currentSocket;
          lastStatus = currentStatus;
        }
      }, 100);
      
      // Stop tracking after 5 seconds
      setTimeout(() => {
        clearInterval(trackingInterval);
      }, 5000);
    }
  });

  // Wait for tracking
  await page.waitForTimeout(4000);

  // Get tracking data
  const trackingData = await page.evaluate(() => window.socketTracking || []);
  
  console.log('=== SOCKET TRACKING DATA ===');
  console.log(JSON.stringify(trackingData, null, 2));
  
  console.log('=== CONSOLE MESSAGES (WebSocket Service) ===');
  const wsMessages = consoleMessages.filter(msg => 
    msg.text.includes('[WebSocketService]')
  );
  
  wsMessages.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
  });

  // Get final state
  const finalState = await page.evaluate(() => {
    return {
      wsService: window.wsService ? {
        connectionStatus: window.wsService.getConnectionStatus(),
        isConnected: window.wsService.isConnected(),
        socket: window.wsService.socket ? {
          connected: window.wsService.socket.connected,
          id: window.wsService.socket.id
        } : null,
        config: window.wsService.config
      } : null,
      feedManager: window.feedManager ? {
        webSocketEnabled: window.feedManager.getWebSocketStatus()
      } : null
    };
  });

  console.log('=== FINAL STATE ===');
  console.log(JSON.stringify(finalState, null, 2));

  // Analyze tracking data
  if (trackingData.length > 0) {
    console.log('=== TRACKING ANALYSIS ===');
    
    const statusChanges = trackingData.filter((item, index) => 
      index === 0 || item.status !== trackingData[index - 1].status
    );
    
    const socketChanges = trackingData.filter((item, index) => 
      index === 0 || (item.socket ? item.socket.exists : false) !== 
      (trackingData[index - 1].socket ? trackingData[index - 1].socket.exists : false)
    );
    
    console.log(`Status changes: ${statusChanges.length}`);
    statusChanges.forEach(change => {
      console.log(`  ${new Date(change.timestamp).toISOString()}: ${change.status}`);
    });
    
    console.log(`Socket existence changes: ${socketChanges.length}`);
    socketChanges.forEach(change => {
      console.log(`  ${new Date(change.timestamp).toISOString()}: socket ${change.socket ? 'exists' : 'null'}`);
    });
    
    // Look for pattern where socket becomes null
    const nullSocketEvents = trackingData.filter(item => item.socket === null);
    if (nullSocketEvents.length > 0) {
      console.log(`Socket became null ${nullSocketEvents.length} times`);
      nullSocketEvents.forEach(event => {
        console.log(`  ${new Date(event.timestamp).toISOString()}: status=${event.status}, connected=${event.isConnected}`);
      });
    }
  }
});