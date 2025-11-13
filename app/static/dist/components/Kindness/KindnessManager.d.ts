/**
 * KindnessManager.ts
 *
 * Manages kindness point functionality including:
 * - Token management and validation
 * - Cross-tab synchronization via localStorage and BroadcastChannel
 * - Optimistic UI updates for kindness awards
 * - Accessibility features and screen reader support
 */
import type { SessionState } from '../../types/index.js';
declare global {
    interface Window {
        Store: any;
        store: any;
        KindnessManager: any;
        showToast?: (message: string, type: string) => void;
    }
}
/**
 * Kindness manager for handling token-based kindness point system
 */
declare class KindnessManager {
    private store;
    private _lastAppliedKindnessTs;
    private _bc;
    private token;
    private tokenExpiry;
    private unsubscribeFunctions;
    constructor(store?: any);
    /**
     * Initialize token from storage
     */
    private initializeToken;
    /**
     * Get current token
     */
    getToken(): string | null;
    /**
     * Get token expiry
     */
    getTokenExpiry(): string | null;
    /**
     * Setup state subscriptions
     */
    private setupSubscriptions;
    /**
     * Setup WebSocket listeners for real-time kindness updates
     */
    private setupWebSocketListeners;
    /**
     * Join/leave post-specific rooms for WebSocket updates
     */
    private joinPostRoom;
    private leavePostRoom;
    /**
     * Set up cross-tab synchronization using localStorage and BroadcastChannel
     */
    private setupCrossTabSync;
    /**
     * Ensure we have a valid token for given post
     */
    ensureToken(postId: string): Promise<string | null>;
    /**
     * Optimistic kindness award logic:
     * - Immediately increments badge and animates for fast feedback
     * - Disables button to prevent double-award
     * - On API success: updates badge, broadcasts to other tabs, shows success toast
     * - On error: reverts badge, re-enables button, refocuses for accessibility, shows error toast
     */
    awardKindness(postId: string, buttonElement: HTMLButtonElement): Promise<void>;
    /**
     * Broadcast kindness update to other tabs
     */
    private broadcastKindnessUpdate;
    /**
     * Update kindness display for a post
     */
    updateKindnessDisplay(postId: string, newCount: number): void;
    /**
     * Show toast notification (will be replaced with proper ToastManager later)
     */
    private showToast;
    /**
     * Get current token status
     */
    getTokenStatus(): {
        hasToken: boolean;
        expiry: number | null;
        isValid: boolean;
    };
    /**
     * Clear all token data
     */
    clearTokens(): void;
    /**
     * Cleanup subscriptions and event listeners
     */
    destroy(): void;
    /**
     * Get current session state
     */
    getSessionState(): SessionState;
    /**
     * Subscribe to WebSocket updates for all visible posts
     */
    subscribeToVisiblePosts(): void;
    /**
     * Unsubscribe from all post rooms
     */
    unsubscribeFromAllPosts(): void;
    /**
     * Check if user can award kindness to a post
     */
    canAwardKindness(_postId: string): boolean;
}
export default KindnessManager;
export { KindnessManager };
