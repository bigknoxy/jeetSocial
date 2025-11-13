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
declare global {
    interface Window {
        io: any;
    }
}
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
export type WebSocketEvent = {
    type: 'new_post';
    data: NewPostEvent;
} | {
    type: 'kindness_update';
    data: KindnessUpdateEvent;
} | {
    type: 'welcome';
    data: WelcomeEvent;
} | {
    type: 'room_joined';
    data: RoomJoinedEvent;
} | {
    type: 'room_left';
    data: RoomLeftEvent;
} | {
    type: 'error';
    data: ErrorEvent;
} | {
    type: 'pong';
    data: PongEvent;
};
export type EventCallback<T = any> = (data: T) => void;
export type NewPostCallback = EventCallback<NewPostEvent>;
export type KindnessUpdateCallback = EventCallback<KindnessUpdateEvent>;
export type WelcomeCallback = EventCallback<WelcomeEvent>;
export type RoomJoinedCallback = EventCallback<RoomJoinedEvent>;
export type RoomLeftCallback = EventCallback<RoomLeftEvent>;
export type ErrorCallback = EventCallback<ErrorEvent>;
export type PongCallback = EventCallback<PongEvent>;
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
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
export declare class WebSocketService {
    private socket;
    private config;
    private reconnectAttempts;
    private pingTimer;
    private connectionStatus;
    private connectionPromise;
    private listeners;
    constructor(config?: WebSocketConfig);
    /**
     * Get default WebSocket URL based on current location
     */
    private getDefaultUrl;
    /**
     * Connect to WebSocket server
     */
    connect(): Promise<void>;
    /**
     * Load Socket.IO client library dynamically
     */
    private loadSocketIO;
    /**
     * Setup WebSocket event handlers
     */
    private setupEventHandlers;
    /**
     * Attempt to reconnect WebSocket
     */
    private attemptReconnect;
    /**
     * Start ping timer for connection health check
     */
    private startPingTimer;
    /**
     * Stop ping timer
     */
    private stopPingTimer;
    /**
     * Set connection status and notify listeners
     */
    private setConnectionStatus;
    /**
     * Emit event to listeners
     */
    private emit;
    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void;
    /**
     * Join feed room to receive new posts
     */
    joinFeedRoom(): void;
    /**
     * Leave feed room
     */
    leaveFeedRoom(): void;
    /**
     * Join post-specific room for kindness updates
     */
    joinPostRoom(postId: number): void;
    /**
     * Leave post-specific room
     */
    leavePostRoom(postId: number): void;
    /**
     * Send ping to server
     */
    ping(): void;
    /**
     * Add event listener
     */
    on<T = any>(event: string, callback: EventCallback<T>): void;
    /**
     * Remove event listener
     */
    off<T = any>(event: string, callback?: EventCallback<T>): void;
    /**
     * Add new post event listener
     */
    onNewPost(callback: NewPostCallback): () => void;
    /**
     * Add kindness update event listener
     */
    onKindnessUpdate(callback: KindnessUpdateCallback): () => void;
    /**
     * Add welcome event listener
     */
    onWelcome(callback: WelcomeCallback): () => void;
    /**
     * Add room joined event listener
     */
    onRoomJoined(callback: RoomJoinedCallback): () => void;
    /**
     * Add room left event listener
     */
    onRoomLeft(callback: RoomLeftCallback): () => void;
    /**
     * Add error event listener
     */
    onError(callback: ErrorCallback): () => void;
    /**
     * Add pong event listener
     */
    onPong(callback: PongCallback): () => void;
    /**
     * Get current connection status
     */
    getConnectionStatus(): ConnectionStatus;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Get reconnection attempts count
     */
    getReconnectAttempts(): number;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
export declare const wsService: WebSocketService;
