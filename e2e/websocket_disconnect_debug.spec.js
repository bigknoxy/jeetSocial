const { test, expect } = require('@playwright/test');

test('WebSocket Disconnect Debug', async ({ page }) => {
  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // Navigate to the page
  await page.goto('http://localhost:5678');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Inject debugging script to track WebSocket events
  await page.evaluate(() => {
    window.wsDebugEvents = [];
    
    // Hook into WebSocketService if available
    if (window.wsService) {
      const originalSetConnectionStatus = window.wsService.setConnectionStatus;
      window.wsService.setConnectionStatus = function(status) {
        window.wsDebugEvents.push({
          type: 'connection_status_change',
          status: status,
          timestamp: Date.now(),
          stack: new Error().stack
        });
        return originalSetConnectionStatus.call(this, status);
      };
      
      // Hook disconnect event
      window.wsService.on('connection_status_change', (status) => {
        window.wsDebugEvents.push({
          type: 'status_listener',
          status: status,
          timestamp: Date.now()
        });
      });
    }
    
    // Monitor socket events directly
    if (window.io) {
      const originalEmit = window.io.prototype.emit;
      window.io.prototype.emit = function(event, ...args) {
        if (event === 'disconnect' || event === 'connect' || event === 'connect_error') {
          window.wsDebugEvents.push({
            type: 'socket_event',
            event: event,
            args: args,
            timestamp: Date.now()
          });
        }
        return originalEmit.apply(this, [event, ...args]);
      };
    }
  });

  // Wait for WebSocket connection attempts
  await page.waitForTimeout(3000);

  // Get debug events
  const debugEvents = await page.evaluate(() => window.wsDebugEvents || []);
  
  console.log('=== WEBSOCKET DEBUG EVENTS ===');
  console.log(JSON.stringify(debugEvents, null, 2));
  
  console.log('=== CONSOLE MESSAGES (WebSocket related) ===');
  const wsMessages = consoleMessages.filter(msg => 
    msg.text.includes('WebSocket') || 
    msg.text.includes('socket') || 
    msg.text.includes('connected') ||
    msg.text.includes('disconnected')
  );
  
  wsMessages.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
    if (msg.location) {
      console.log(`   Location: ${msg.location.url}:${msg.location.lineNumber}`);
    }
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
        } : null
      } : null,
      feedManager: window.feedManager ? {
        webSocketEnabled: window.feedManager.getWebSocketStatus()
      } : null
    };
  });

  console.log('=== FINAL STATE ===');
  console.log(JSON.stringify(finalState, null, 2));

  // Look for specific disconnect patterns
  const disconnectEvents = debugEvents.filter(event => 
    event.type === 'socket_event' && event.event === 'disconnect'
  );
  
  const statusChanges = debugEvents.filter(event => 
    event.type === 'connection_status_change'
  );

  console.log('=== DISCONNECT ANALYSIS ===');
  console.log(`Disconnect events: ${disconnectEvents.length}`);
  console.log(`Status changes: ${statusChanges.length}`);
  
  if (disconnectEvents.length > 0) {
    disconnectEvents.forEach((event, index) => {
      console.log(`Disconnect ${index + 1}:`);
      console.log(`  Reason: ${event.args[0]}`);
      console.log(`  Timestamp: ${new Date(event.timestamp).toISOString()}`);
    });
  }

  if (statusChanges.length > 0) {
    statusChanges.forEach((change, index) => {
      console.log(`Status change ${index + 1}: ${change.status}`);
      console.log(`  Timestamp: ${new Date(change.timestamp).toISOString()}`);
    });
  }
});