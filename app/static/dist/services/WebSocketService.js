/**
 * WebSocket Service for jeetSocial
 *
 * Provides real-time communication with the server for:
 * - New post notifications
 * - Kindness point updates
 * - Connection management with reconnection logic
 *
 * Follows TypeScript best practices with proper interfaces and error handling
 */
/**
 * WebSocketService class for managing real-time communication
 */
export class WebSocketService {
    constructor(config = {}) {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.pingTimer = null;
        this.connectionStatus = 'disconnected';
        this.connectionPromise = null;
        // Event listeners
        this.listeners = new Map();
        this.config = {
            url: config.url || this.getDefaultUrl(),
            autoReconnect: config.autoReconnect !== false,
            reconnectDelay: config.reconnectDelay || 3000,
            maxReconnectAttempts: config.maxReconnectAttempts || 10,
            pingInterval: config.pingInterval || 30000,
        };
    }
    /**
     * Get default WebSocket URL based on current location
     */
    getDefaultUrl() {
        // Use the page origin (protocol + host) and let Socket.IO use its default
        // path (`/socket.io`) so the client doesn't accidentally treat that path
        // as a namespace. This avoids connect errors where the client sends
        // namespace `/socket.io/` which the server rejects.
        return window.location.origin;
    }
    /**
     * Connect to WebSocket server
     */
    connect() {
        // Return existing connection promise if connecting
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        // Return resolved promise if already connected
        if (this.isConnected()) {
            return Promise.resolve();
        }
        this.connectionPromise = new Promise((resolve, reject) => {
            this.setConnectionStatus('connecting');
            // Load socket.io client dynamically
            this.loadSocketIO()
                .then((io) => {
                // Create socket with WebSocket transport enabled for real-time functionality
                this.socket = io(this.config.url, {
                    transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
                    upgrade: true, // Allow upgrade from polling to websocket
                    rememberUpgrade: true, // Remember successful upgrades
                });
                // Setup event handlers BEFORE connecting
                this.setupEventHandlers();
                // IMPORTANT: Socket.IO connects automatically, so we need to check if already connected
                if (this.socket.connected) {
                    console.log('[WebSocketService] Socket.IO already connected, socket ID:', this.socket.id);
                    console.log('[WebSocketService] Transport:', this.socket.io.engine.transport.name);
                    this.setConnectionStatus('connected');
                    this.reconnectAttempts = 0;
                    this.startPingTimer();
                    this.connectionPromise = null; // Clear the promise
                    resolve();
                    return;
                }
                // Handle connection success
                this.socket.on('connect', () => {
                    console.log('[WebSocketService] Socket.IO connected, socket ID:', this.socket.id);
                    console.log('[WebSocketService] Transport:', this.socket.io.engine.transport.name);
                    this.setConnectionStatus('connected');
                    this.reconnectAttempts = 0;
                    this.startPingTimer();
                    this.connectionPromise = null; // Clear the promise
                    resolve();
                });
                // Handle connection error
                this.socket.on('connect_error', (error) => {
                    console.error('[WebSocketService] Connection error:', error);
                    this.setConnectionStatus('error');
                    this.connectionPromise = null; // Clear the promise
                    reject(error);
                });
            })
                .catch((error) => {
                console.error('[WebSocketService] Failed to load Socket.IO:', error);
                this.setConnectionStatus('error');
                this.connectionPromise = null; // Clear the promise
                reject(error);
            });
        });
        return this.connectionPromise;
    }
    /**
     * Load Socket.IO client library dynamically
     */
    loadSocketIO() {
        return new Promise((resolve, reject) => {
            if (typeof window.io !== 'undefined') {
                resolve(window.io);
                return;
            }
            const script = document.createElement('script');
            script.src = '/static/socket.io.min.js';
            script.onload = () => {
                if (typeof window.io !== 'undefined') {
                    resolve(window.io);
                }
                else {
                    reject(new Error('Socket.IO library failed to load'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load Socket.IO library'));
            document.head.appendChild(script);
        });
    }
    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        if (!this.socket)
            return;
        // Built-in Socket.IO events
        this.socket.on('disconnect', (reason) => {
            console.log('[WebSocketService] Disconnected:', reason);
            console.log('[WebSocketService] Disconnect - socket before null:', !!this.socket);
            console.log('[WebSocketService] Disconnect - socket.connected before null:', this.socket?.connected);
            console.log('[WebSocketService] Disconnect - socket ID before null:', this.socket?.id);
            console.log('[WebSocketService] Disconnect - connection status before:', this.connectionStatus);
            // IMPORTANT: Don't set socket to null here, let the reconnect logic handle it
            this.setConnectionStatus('disconnected');
            this.stopPingTimer();
            if (this.config.autoReconnect && reason !== 'io client disconnect') {
                this.attemptReconnect();
            }
        });
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`[WebSocketService] Reconnected after ${attemptNumber} attempts`);
            this.setConnectionStatus('connected');
            this.reconnectAttempts = 0;
            this.startPingTimer();
        });
        this.socket.on('reconnect_error', (error) => {
            console.error('[WebSocketService] Reconnection error:', error);
        });
        // Application events
        this.socket.on('new_post', (data) => {
            console.log('[WebSocketService] Received new_post:', data);
            this.emit('new_post', data);
        });
        this.socket.on('kindness_update', (data) => {
            console.log('[WebSocketService] Received kindness_update:', data);
            this.emit('kindness_update', data);
        });
        this.socket.on('welcome', (data) => {
            console.log('[WebSocketService] Received welcome:', data);
            this.emit('welcome', data);
        });
        this.socket.on('room_joined', (data) => {
            console.log('[WebSocketService] Received room_joined:', data);
            this.emit('room_joined', data);
        });
        this.socket.on('room_left', (data) => {
            console.log('[WebSocketService] Received room_left:', data);
            this.emit('room_left', data);
        });
        this.socket.on('error', (data) => {
            console.log('[WebSocketService] Received error:', data);
            this.emit('error', data);
        });
        this.socket.on('pong', (data) => {
            console.log('[WebSocketService] Received pong:', data);
            this.emit('pong', data);
        });
    }
    /**
     * Attempt to reconnect WebSocket
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.setConnectionStatus('error');
            console.error('[WebSocketService] Max reconnection attempts reached');
            return;
        }
        this.setConnectionStatus('reconnecting');
        this.reconnectAttempts++;
        console.log(`[WebSocketService] Attempting reconnection ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
        setTimeout(() => {
            this.connect().catch((error) => {
                console.error(`[WebSocketService] Reconnection attempt ${this.reconnectAttempts} failed:`, error);
                if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
                    this.attemptReconnect();
                }
            });
        }, this.config.reconnectDelay);
    }
    /**
     * Start ping timer for connection health check
     */
    startPingTimer() {
        this.stopPingTimer();
        this.pingTimer = window.setInterval(() => {
            this.ping();
        }, this.config.pingInterval);
    }
    /**
     * Stop ping timer
     */
    stopPingTimer() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }
    /**
     * Set connection status and notify listeners
     */
    setConnectionStatus(status) {
        const oldStatus = this.connectionStatus;
        this.connectionStatus = status;
        console.log(`[WebSocketService] Connection status change: ${oldStatus} -> ${status}`);
        this.emit('connection_status_change', status);
    }
    /**
     * Emit event to listeners
     */
    emit(event, data) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                }
                catch (error) {
                    console.error(`[WebSocketService] Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.config.autoReconnect = false;
        this.connectionPromise = null; // Clear any pending connection
        this.stopPingTimer();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.setConnectionStatus('disconnected');
    }
    /**
     * Join feed room to receive new posts
     */
    joinFeedRoom() {
        if (this.socket && this.socket.connected) {
            console.log('[WebSocketService] Joining feed room');
            this.socket.emit('join_feed');
        }
        else {
            console.warn('[WebSocketService] Cannot join feed room - not connected');
        }
    }
    /**
     * Leave feed room
     */
    leaveFeedRoom() {
        if (this.socket && this.socket.connected) {
            console.log('[WebSocketService] Leaving feed room');
            this.socket.emit('leave_feed');
        }
        else {
            console.warn('[WebSocketService] Cannot leave feed room - not connected');
        }
    }
    /**
     * Join post-specific room for kindness updates
     */
    joinPostRoom(postId) {
        if (this.socket && this.socket.connected) {
            console.log(`[WebSocketService] Joining post room for post ${postId}`);
            this.socket.emit('join_post', { post_id: postId });
        }
        else {
            console.warn(`[WebSocketService] Cannot join post room ${postId} - not connected`);
        }
    }
    /**
     * Leave post-specific room
     */
    leavePostRoom(postId) {
        if (this.socket && this.socket.connected) {
            console.log(`[WebSocketService] Leaving post room for post ${postId}`);
            this.socket.emit('leave_post', { post_id: postId });
        }
        else {
            console.warn(`[WebSocketService] Cannot leave post room ${postId} - not connected`);
        }
    }
    /**
     * Send ping to server
     */
    ping() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('ping');
        }
    }
    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    /**
     * Remove event listener
     */
    off(event, callback) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            if (callback) {
                listeners.delete(callback);
            }
            else {
                listeners.clear();
            }
        }
    }
    /**
     * Add new post event listener
     */
    onNewPost(callback) {
        this.on('new_post', callback);
        return () => this.off('new_post', callback);
    }
    /**
     * Add kindness update event listener
     */
    onKindnessUpdate(callback) {
        this.on('kindness_update', callback);
        return () => this.off('kindness_update', callback);
    }
    /**
     * Add welcome event listener
     */
    onWelcome(callback) {
        this.on('welcome', callback);
        return () => this.off('welcome', callback);
    }
    /**
     * Add room joined event listener
     */
    onRoomJoined(callback) {
        this.on('room_joined', callback);
        return () => this.off('room_joined', callback);
    }
    /**
     * Add room left event listener
     */
    onRoomLeft(callback) {
        this.on('room_left', callback);
        return () => this.off('room_left', callback);
    }
    /**
     * Add error event listener
     */
    onError(callback) {
        this.on('error', callback);
        return () => this.off('error', callback);
    }
    /**
     * Add pong event listener
     */
    onPong(callback) {
        this.on('pong', callback);
        return () => this.off('pong', callback);
    }
    /**
     * Get current connection status
     */
    getConnectionStatus() {
        return this.connectionStatus;
    }
    /**
     * Check if connected
     */
    isConnected() {
        // Primary check: connection status must be 'connected'
        if (this.connectionStatus !== 'connected') {
            return false;
        }
        // Secondary check: socket must exist and be connected
        if (!this.socket) {
            return false;
        }
        // Use socket.connected as the definitive check
        return this.socket.connected === true;
    }
    /**
     * Get reconnection attempts count
     */
    getReconnectAttempts() {
        return this.reconnectAttempts;
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.disconnect();
        this.listeners.clear();
    }
}
// Export singleton instance for easy usage
export const wsService = new WebSocketService();
//# sourceMappingURL=WebSocketService.js.map