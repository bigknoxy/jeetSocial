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

// Type declarations for socket.io client
declare global {
  interface Window {
    io: any;
  }
}

// WebSocket event types
export interface NewPostEvent {
    id: number;
    content: string;
    username: string;
    kindness_points: number;
    created_at: string;
}

export interface KindnessUpdateEvent {
    post_id: number;
    kindness_points: number;
    action: 'increment' | 'decrement';
}

export interface WelcomeEvent {
    message: string;
    client_id: string;
}

export interface RoomJoinedEvent {
    room: string;
    post_id?: number;
    message: string;
}

export interface RoomLeftEvent {
    room: string;
    post_id?: number;
    message: string;
}

export interface ErrorEvent {
    message: string;
}

export interface PongEvent {
    timestamp: string;
}

// Union type for all possible WebSocket events
export type WebSocketEvent = 
    | { type: 'new_post'; data: NewPostEvent }
    | { type: 'kindness_update'; data: KindnessUpdateEvent }
    | { type: 'welcome'; data: WelcomeEvent }
    | { type: 'room_joined'; data: RoomJoinedEvent }
    | { type: 'room_left'; data: RoomLeftEvent }
    | { type: 'error'; data: ErrorEvent }
    | { type: 'pong'; data: PongEvent };

// Event listener callbacks
export type EventCallback<T = any> = (data: T) => void;
export type NewPostCallback = EventCallback<NewPostEvent>;
export type KindnessUpdateCallback = EventCallback<KindnessUpdateEvent>;
export type WelcomeCallback = EventCallback<WelcomeEvent>;
export type RoomJoinedCallback = EventCallback<RoomJoinedEvent>;
export type RoomLeftCallback = EventCallback<RoomLeftEvent>;
export type ErrorCallback = EventCallback<ErrorEvent>;
export type PongCallback = EventCallback<PongEvent>;

// Connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

// Configuration options
export interface WebSocketConfig {
    url?: string;
    autoReconnect?: boolean;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    pingInterval?: number;
}

/**
 * WebSocketService class for managing real-time communication
 */
export class WebSocketService {
    private socket: any = null;
    private config: Required<WebSocketConfig>;
    private reconnectAttempts: number = 0;
    private pingTimer: number | null = null;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private connectionPromise: Promise<void> | null = null;
    
    // Event listeners
    private listeners: Map<string, Set<EventCallback>> = new Map();
    
    constructor(config: WebSocketConfig = {}) {
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
    private getDefaultUrl(): string {
        // Use the page origin (protocol + host) and let Socket.IO use its default
        // path (`/socket.io`) so the client doesn't accidentally treat that path
        // as a namespace. This avoids connect errors where the client sends
        // namespace `/socket.io/` which the server rejects.
        return window.location.origin;
    }

    /**
     * Connect to WebSocket server
     */
    connect(): Promise<void> {
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
                    this.socket.on('connect_error', (error: any) => {
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
    private loadSocketIO(): Promise<any> {
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
                } else {
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
    private setupEventHandlers(): void {
        if (!this.socket) return;

        // Built-in Socket.IO events
        this.socket.on('disconnect', (reason: string) => {
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

        this.socket.on('reconnect', (attemptNumber: number) => {
            console.log(`[WebSocketService] Reconnected after ${attemptNumber} attempts`);
            this.setConnectionStatus('connected');
            this.reconnectAttempts = 0;
            this.startPingTimer();
        });

        this.socket.on('reconnect_error', (error: any) => {
            console.error('[WebSocketService] Reconnection error:', error);
        });

        // Application events
        this.socket.on('new_post', (data: NewPostEvent) => {
            console.log('[WebSocketService] Received new_post:', data);
            this.emit('new_post', data);
        });

        this.socket.on('kindness_update', (data: KindnessUpdateEvent) => {
            console.log('[WebSocketService] Received kindness_update:', data);
            this.emit('kindness_update', data);
        });

        this.socket.on('welcome', (data: WelcomeEvent) => {
            console.log('[WebSocketService] Received welcome:', data);
            this.emit('welcome', data);
        });

        this.socket.on('room_joined', (data: RoomJoinedEvent) => {
            console.log('[WebSocketService] Received room_joined:', data);
            this.emit('room_joined', data);
        });

        this.socket.on('room_left', (data: RoomLeftEvent) => {
            console.log('[WebSocketService] Received room_left:', data);
            this.emit('room_left', data);
        });

        this.socket.on('error', (data: ErrorEvent) => {
            console.log('[WebSocketService] Received error:', data);
            this.emit('error', data);
        });

        this.socket.on('pong', (data: PongEvent) => {
            console.log('[WebSocketService] Received pong:', data);
            this.emit('pong', data);
        });
    }

    /**
     * Attempt to reconnect WebSocket
     */
    private attemptReconnect(): void {
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
    private startPingTimer(): void {
        this.stopPingTimer();
        this.pingTimer = window.setInterval(() => {
            this.ping();
        }, this.config.pingInterval);
    }

    /**
     * Stop ping timer
     */
    private stopPingTimer(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    /**
     * Set connection status and notify listeners
     */
    private setConnectionStatus(status: ConnectionStatus): void {
        const oldStatus = this.connectionStatus;
        this.connectionStatus = status;
        console.log(`[WebSocketService] Connection status change: ${oldStatus} -> ${status}`);
        this.emit('connection_status_change', status);
    }

    /**
     * Emit event to listeners
     */
    private emit(event: string, data: any): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[WebSocketService] Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
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
    joinFeedRoom(): void {
        if (this.socket && this.socket.connected) {
            console.log('[WebSocketService] Joining feed room');
            this.socket.emit('join_feed');
        } else {
            console.warn('[WebSocketService] Cannot join feed room - not connected');
        }
    }

    /**
     * Leave feed room
     */
    leaveFeedRoom(): void {
        if (this.socket && this.socket.connected) {
            console.log('[WebSocketService] Leaving feed room');
            this.socket.emit('leave_feed');
        } else {
            console.warn('[WebSocketService] Cannot leave feed room - not connected');
        }
    }

    /**
     * Join post-specific room for kindness updates
     */
    joinPostRoom(postId: number): void {
        if (this.socket && this.socket.connected) {
            console.log(`[WebSocketService] Joining post room for post ${postId}`);
            this.socket.emit('join_post', { post_id: postId });
        } else {
            console.warn(`[WebSocketService] Cannot join post room ${postId} - not connected`);
        }
    }

    /**
     * Leave post-specific room
     */
    leavePostRoom(postId: number): void {
        if (this.socket && this.socket.connected) {
            console.log(`[WebSocketService] Leaving post room for post ${postId}`);
            this.socket.emit('leave_post', { post_id: postId });
        } else {
            console.warn(`[WebSocketService] Cannot leave post room ${postId} - not connected`);
        }
    }

    /**
     * Send ping to server
     */
    ping(): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('ping');
        }
    }

    /**
     * Add event listener
     */
    on<T = any>(event: string, callback: EventCallback<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    /**
     * Remove event listener
     */
    off<T = any>(event: string, callback?: EventCallback<T>): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            if (callback) {
                listeners.delete(callback);
            } else {
                listeners.clear();
            }
        }
    }

    /**
     * Add new post event listener
     */
    onNewPost(callback: NewPostCallback): () => void {
        this.on('new_post', callback);
        return () => this.off('new_post', callback);
    }

    /**
     * Add kindness update event listener
     */
    onKindnessUpdate(callback: KindnessUpdateCallback): () => void {
        this.on('kindness_update', callback);
        return () => this.off('kindness_update', callback);
    }

    /**
     * Add welcome event listener
     */
    onWelcome(callback: WelcomeCallback): () => void {
        this.on('welcome', callback);
        return () => this.off('welcome', callback);
    }

    /**
     * Add room joined event listener
     */
    onRoomJoined(callback: RoomJoinedCallback): () => void {
        this.on('room_joined', callback);
        return () => this.off('room_joined', callback);
    }

    /**
     * Add room left event listener
     */
    onRoomLeft(callback: RoomLeftCallback): () => void {
        this.on('room_left', callback);
        return () => this.off('room_left', callback);
    }

    /**
     * Add error event listener
     */
    onError(callback: ErrorCallback): () => void {
        this.on('error', callback);
        return () => this.off('error', callback);
    }

    /**
     * Add pong event listener
     */
    onPong(callback: PongCallback): () => void {
        this.on('pong', callback);
        return () => this.off('pong', callback);
    }

    /**
     * Get current connection status
     */
    getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
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
    getReconnectAttempts(): number {
        return this.reconnectAttempts;
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.disconnect();
        this.listeners.clear();
    }
}

// Export singleton instance for easy usage
export const wsService = new WebSocketService();