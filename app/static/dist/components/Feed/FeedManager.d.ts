/**
 * FeedManager.ts
 *
 * Manages feed functionality including:
 * - Live feed polling and updates
 * - Paging controls
 * - Post rendering and updates
 * - New post notifications
 */
import type { AppState } from '../../types/index.js';
declare global {
    interface Window {
        Store: any;
        store: any;
        feedManager?: FeedManager;
    }
}
/**
 * Feed manager for handling post display and real-time updates
 */
declare class FeedManager {
    private store;
    private accentColors;
    private unsubscribeFunctions;
    private isWebSocketEnabled;
    constructor(store?: any);
    /**
     * Setup state subscriptions
     */
    private setupSubscriptions;
    /**
     * Setup WebSocket for real-time updates with polling fallback
     */
    private setupWebSocket;
    /**
     * Join feed room for new post updates
     */
    private joinFeedRoom;
    /**
     * Handle new post from WebSocket
     */
    private handleNewPost;
    /**
     * Insert new post in DOM with animation
     */
    private insertNewPostInDOM;
    /**
     * Handle page changes
     */
    private handlePageChange;
    /**
     * Show "New posts available" banner
     */
    private showNewPostsBanner;
    /**
     * Fetch a specific page of posts
     */
    fetchFeedPage(page: number): Promise<void>;
    /**
     * Render paging controls
     */
    private renderPagingControls;
    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml;
    /**
     * Set the current view (latest or top)
     */
    setView(view: 'latest' | 'top'): void;
    /**
     * Get current state
     */
    getState(): AppState;
    /**
     * Cleanup subscriptions
     */
    destroy(): void;
    /**
     * Get accent colors for posts
     */
    getAccentColors(): string[];
    /**
     * Get WebSocket connection status
     */
    getWebSocketStatus(): boolean;
    /**
     * Start periodic connection validation to catch silent disconnects
     */
    private startConnectionValidation;
    /**
     * Manual validation check for connection state
     */
    private validateConnectionManually;
    /**
     * Initialize WebSocket connection and setup polling fallback
     * This should be called after all modules are loaded
     */
    initializeRealTime(): void;
    /**
     * Set accent colors for posts
     */
    setAccentColors(colors: string[]): void;
    /**
     * Start HTTP polling for new posts when WebSocket is unavailable
     */
    private startPolling;
    /**
     * Stop HTTP polling
     */
    private stopPolling;
    /**
     * Poll for new posts via HTTP
     */
    private pollForNewPosts;
}
export default FeedManager;
export { FeedManager };
