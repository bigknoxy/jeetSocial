const { test, expect } = require('@playwright/test');

test('WebSocket Connection Race Condition', async ({ page }) => {
  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now()
    });
  });

  // Navigate to page
  await page.goto('http://localhost:5678');
  
  // Wait for initial load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Inject comprehensive monitoring
  await page.evaluate(() => {
    window.connectionEvents = [];
    
    // Monitor all WebSocketService activity
    const originalConnect = window.wsService.connect;
    window.wsService.connect = function() {
      window.connectionEvents.push({
        type: 'connect_called',
        timestamp: Date.now(),
        status_before: this.connectionStatus,
        socket_before: !!this.socket
      });
      
      const result = originalConnect.call(this);
      
      // Monitor the promise
      result.then(() => {
        window.connectionEvents.push({
          type: 'connect_promise_resolved',
          timestamp: Date.now(),
          status_after: this.connectionStatus,
          socket_after: !!this.socket,
          socket_connected: this.socket ? this.socket.connected : null
        });
      }).catch((error) => {
        window.connectionEvents.push({
          type: 'connect_promise_rejected',
          timestamp: Date.now(),
          error: error.message
        });
      });
      
      return result;
    };
    
    // Monitor setConnectionStatus calls
    const originalSetConnectionStatus = window.wsService.setConnectionStatus;
    window.wsService.setConnectionStatus = function(status) {
      window.connectionEvents.push({
        type: 'set_connection_status',
        timestamp: Date.now(),
        status: status,
        socket_before: !!this.socket,
        socket_connected: this.socket ? this.socket.connected : null
      });
      
      return originalSetConnectionStatus.call(this, status);
    };
    
    // Monitor socket assignment
    let lastSocket = null;
    Object.defineProperty(window.wsService, 'socket', {
      get: function() {
        return lastSocket;
      },
      set: function(newSocket) {
        window.connectionEvents.push({
          type: 'socket_changed',
          timestamp: Date.now(),
          old_socket: !!lastSocket,
          new_socket: !!newSocket,
          new_socket_connected: newSocket ? newSocket.connected : null
        });
        lastSocket = newSocket;
      }
    });
  });

  // Wait for connection activity
  await page.waitForTimeout(5000);

  // Get connection events
  const connectionEvents = await page.evaluate(() => window.connectionEvents || []);
  
  console.log('=== CONNECTION EVENTS ===');
  console.log(JSON.stringify(connectionEvents, null, 2));
  
  console.log('=== CONSOLE MESSAGES ===');
  const wsMessages = consoleMessages.filter(msg => 
    msg.text.includes('[WebSocketService]') || 
    msg.text.includes('[FeedManager] WebSocket')
  );
  
  wsMessages.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
  });

  // Get final state
  const finalState = await page.evaluate(() => {
    return {
      wsService: {
        connectionStatus: window.wsService.getConnectionStatus(),
        isConnected: window.wsService.isConnected(),
        socket: window.wsService.socket ? {
          connected: window.wsService.socket.connected,
          id: window.wsService.socket.id
        } : null
      },
      feedManager: {
        webSocketEnabled: window.feedManager.getWebSocketStatus()
      }
    };
  });

  console.log('=== FINAL STATE ===');
  console.log(JSON.stringify(finalState, null, 2));

  // Analyze the sequence
  console.log('=== ANALYSIS ===');
  
  const statusChanges = connectionEvents.filter(e => e.type === 'set_connection_status');
  const socketChanges = connectionEvents.filter(e => e.type === 'socket_changed');
  
  console.log(`Status changes: ${statusChanges.length}`);
  statusChanges.forEach(change => {
    console.log(`  ${new Date(change.timestamp).toISOString()}: ${change.status} (socket: ${change.socket_connected})`);
  });
  
  console.log(`Socket changes: ${socketChanges.length}`);
  socketChanges.forEach(change => {
    console.log(`  ${new Date(change.timestamp).toISOString()}: ${change.old_socket} -> ${change.new_socket} (connected: ${change.new_socket_connected})`);
  });
  
  // Look for specific pattern: connect -> disconnect -> socket null
  const connectEvent = connectionEvents.find(e => e.type === 'connect_promise_resolved');
  const disconnectEvent = statusChanges.find(e => e.status === 'disconnected');
  const socketNullEvent = socketChanges.find(e => e.new_socket === false);
  
  if (connectEvent && disconnectEvent && socketNullEvent) {
    console.log('PATTERN DETECTED:');
    console.log(`  Connected at: ${new Date(connectEvent.timestamp).toISOString()}`);
    console.log(`  Disconnected at: ${new Date(disconnectEvent.timestamp).toISOString()}`);
    console.log(`  Socket nulled at: ${new Date(socketNullEvent.timestamp).toISOString()}`);
    
    if (disconnectEvent.timestamp > connectEvent.timestamp && 
        socketNullEvent.timestamp > disconnectEvent.timestamp) {
      console.log('  ✓ This confirms the race condition pattern!');
    }
  }
});