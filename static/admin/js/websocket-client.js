/**
 * WebSocket Client for Admin Portal
 * Handles real-time updates and notifications
 */

class WebSocketClient {
    constructor(options = {}) {
        this.url = options.url || this.getWebSocketUrl();
        this.onConnect = options.onConnect || (() => {});
        this.onDisconnect = options.onDisconnect || (() => {});
        this.onMessage = options.onMessage || (() => {});
        this.onError = options.onError || (() => {});
        
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.maxReconnectDelay = 30000; // Max 30 seconds
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
        this.isConnected = false;
        
        this.messageQueue = [];
        this.subscriptions = new Set();
    }

    getWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/admin/ws`;
    }

    connect() {
        try {
            console.log('Connecting to WebSocket:', this.url);
            this.socket = new WebSocket(this.url);
            
            this.socket.onopen = (event) => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                
                // Send queued messages
                this.flushMessageQueue();
                
                // Start heartbeat
                this.startHeartbeat();
                
                // Subscribe to default channels
                this.subscribeToDefaultChannels();
                
                this.onConnect(event);
            };

            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.isConnected = false;
                this.stopHeartbeat();
                
                this.onDisconnect(event);
                
                // Attempt reconnection if not a normal closure
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.socket.onerror = (event) => {
                console.error('WebSocket error:', event);
                this.onError(event);
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.onError(error);
        }
    }

    disconnect() {
        this.stopHeartbeat();
        
        if (this.socket) {
            this.socket.close(1000, 'Client disconnect');
            this.socket = null;
        }
        
        this.isConnected = false;
    }

    send(message) {
        if (!this.isConnected || !this.socket) {
            console.warn('WebSocket not connected, queuing message');
            this.messageQueue.push(message);
            return false;
        }

        try {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
            this.socket.send(messageStr);
            return true;
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            return false;
        }
    }

    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    handleMessage(message) {
        // Handle heartbeat responses
        if (message.type === 'pong') {
            this.handlePong();
            return;
        }

        // Handle subscription confirmations
        if (message.type === 'subscription_confirmed') {
            this.subscriptions.add(message.channel);
            console.log('Subscribed to channel:', message.channel);
            return;
        }

        // Handle subscription errors
        if (message.type === 'subscription_error') {
            console.error('Subscription error:', message.error);
            return;
        }

        // Pass message to handler
        this.onMessage(JSON.stringify(message));
    }

    subscribe(channel) {
        if (this.subscriptions.has(channel)) {
            console.log('Already subscribed to channel:', channel);
            return;
        }

        const message = {
            type: 'subscribe',
            channel: channel
        };

        this.send(message);
    }

    unsubscribe(channel) {
        if (!this.subscriptions.has(channel)) {
            console.log('Not subscribed to channel:', channel);
            return;
        }

        const message = {
            type: 'unsubscribe',
            channel: channel
        };

        this.send(message);
        this.subscriptions.delete(channel);
    }

    subscribeToDefaultChannels() {
        // Subscribe to admin-specific channels
        this.subscribe('admin:reports');
        this.subscribe('admin:activity');
        this.subscribe('admin:system');
        this.subscribe('admin:notifications');
    }

    startHeartbeat() {
        // Send ping every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping' });
                
                // Set timeout to detect connection loss
                this.heartbeatTimeout = setTimeout(() => {
                    console.warn('Heartbeat timeout, connection may be lost');
                    this.socket.close(1006, 'Heartbeat timeout');
                }, 10000); // 10 second timeout
            }
        }, 30000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    handlePong() {
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    scheduleReconnect() {
        this.reconnectAttempts++;
        
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelay
        );

        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

        setTimeout(() => {
            if (!this.isConnected) {
                console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                this.connect();
            }
        }, delay);
    }

    // Utility methods for specific message types
    sendAdminActivity(activity) {
        const message = {
            type: 'admin_activity',
            payload: activity,
            timestamp: new Date().toISOString()
        };
        
        this.send(message);
    }

    sendNotification(notification) {
        const message = {
            type: 'notification',
            payload: notification,
            timestamp: new Date().toISOString()
        };
        
        this.send(message);
    }

    requestMetrics() {
        const message = {
            type: 'request_metrics',
            timestamp: new Date().toISOString()
        };
        
        this.send(message);
    }

    // Get connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            subscriptions: Array.from(this.subscriptions)
        };
    }

    // Get statistics
    getStats() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            queuedMessages: this.messageQueue.length,
            subscriptions: this.subscriptions.size,
            url: this.url
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketClient;
} else if (typeof window !== 'undefined') {
    window.WebSocketClient = WebSocketClient;
}