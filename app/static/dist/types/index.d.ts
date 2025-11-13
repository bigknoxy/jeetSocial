/**
 * Core TypeScript interfaces for jeetSocial
 * Defines the data structures used throughout the application
 */
/**
 * Represents a single post in the jeetSocial feed
 */
export interface Post {
    id: string;
    message: string;
    username: string;
    timestamp: string;
    kindness_points?: number;
    kindness_tokens_remaining?: number;
    user_redeemed_token?: boolean;
    created_at?: string;
    updated_at?: string;
}
/**
 * API response wrapper for consistent response handling
 */
export interface ApiResponse<T = any> {
    data: T;
    status: number;
    headers: Headers;
    ok: boolean;
}
/**
 * Kindness token for rewarding positive posts
 */
export interface KindnessToken {
    token: string;
    post_id: string;
    expires_at?: string;
    redeemed?: boolean;
}
/**
 * Kindness redemption response
 */
export interface KindnessRedemption {
    success: boolean;
    message: string;
    kindness_points_awarded?: number;
    total_kindness_points?: number;
}
/**
 * Pagination state configuration
 */
export interface PaginationState {
    currentPage: number;
    totalPages: number;
    pageLimit: number;
    currentView: 'latest' | 'top';
}
/**
 * Feed state containing posts and loading status
 */
export interface FeedState {
    posts: Post[];
    isLoading: boolean;
    lastUpdated: string | null;
    hasNewPosts: boolean;
}
/**
 * Live polling configuration and state
 */
export interface PollingState {
    intervalId: number | null;
    isActive: boolean;
    interval: number;
}
/**
 * UI state for user interface elements
 */
export interface UIState {
    newPostsBannerVisible: boolean;
    characterCount: number;
    isSubmitting: boolean;
}
/**
 * User session state
 */
export interface SessionState {
    username: string | null;
    kindnessPoints: number;
    kindnessToken?: string | null;
    kindnessTokenExpiry?: number | null;
}
/**
 * Real-time connection state
 */
export interface RealtimeState {
    connected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
}
/**
 * Complete application state
 */
export interface AppState {
    pagination: PaginationState;
    feed: FeedState;
    polling: PollingState;
    ui: UIState;
    session: SessionState;
    realtime: RealtimeState;
}
/**
 * Configuration options for ApiService
 */
export interface ApiServiceOptions {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}
/**
 * HTTP request configuration
 */
export interface RequestConfig {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
}
/**
 * Posts API response with pagination
 */
export interface PostsResponse {
    posts: Post[];
    pagination: {
        current_page: number;
        total_pages: number;
        total_posts: number;
        has_next: boolean;
        has_prev: boolean;
    };
}
/**
 * Create post request payload
 */
export interface CreatePostRequest {
    message: string;
}
/**
 * Create post response
 */
export interface CreatePostResponse {
    post: Post;
    message: string;
}
/**
 * Character counter configuration
 */
export interface CharacterCounterOptions {
    maxLength: number;
    warningThreshold: number;
    showCount: boolean;
    container: HTMLElement;
}
/**
 * Character counter state
 */
export interface CharacterCounterState {
    currentLength: number;
    maxLength: number;
    isOverLimit: boolean;
    isNearLimit: boolean;
}
/**
 * Emoji picker configuration
 */
export interface EmojiPickerOptions {
    container: HTMLElement;
    target: HTMLElement;
    onEmojiSelect: (emoji: string) => void;
}
/**
 * View toggle configuration
 */
export interface ViewToggleOptions {
    container: HTMLElement;
    onViewChange: (view: 'latest' | 'top') => void;
    initialView?: 'latest' | 'top';
}
/**
 * Store subscription options
 */
export interface SubscriptionOptions {
    id?: string;
}
/**
 * Store subscription metadata
 */
export interface Subscription {
    path: string;
    callback: (newValue: any, prevValue: any, metadata: SubscriptionMetadata) => void;
    options: SubscriptionOptions;
    lastValue: any;
}
/**
 * Subscription callback metadata
 */
export interface SubscriptionMetadata {
    path: string;
    source: string;
    timestamp: number;
}
/**
 * State update function type
 */
export type StateUpdateFunction = (state: AppState) => void;
/**
 * State update object type
 */
export type StateUpdateObject = Partial<AppState>;
/**
 * State update type (function or object)
 */
export type StateUpdate = StateUpdateFunction | StateUpdateObject;
/**
 * Storage service configuration
 */
export interface StorageServiceOptions {
    prefix?: string;
    storage?: 'localStorage' | 'sessionStorage';
}
/**
 * Storage item metadata
 */
export interface StorageItem {
    value: any;
    timestamp: number;
    expires?: number;
    ttl?: number;
}
/**
 * Error handling interface
 */
export interface JeetError {
    message: string;
    code?: string;
    details?: any;
    timestamp: number;
}
/**
 * Debug information interface
 */
export interface DebugInfo {
    subscriberCount: number;
    stateKeys: number;
    pollingActive: boolean;
    realtimeConnected: boolean;
    postsCount: number;
    currentPage: number;
}
/**
 * Custom event types used throughout the application
 */
export interface JeetEventMap {
    'post:created': Post;
    'post:updated': Post;
    'feed:updated': Post[];
    'pagination:changed': PaginationState;
    'ui:characterCount': CharacterCounterState;
    'session:updated': SessionState;
    'realtime:connected': boolean;
    'realtime:disconnected': boolean;
}
/**
 * Event listener interface
 */
export interface EventListener<T = any> {
    (event: T): void;
}
/**
 * Type guard for API responses
 */
export declare function isApiResponse<T>(obj: any): obj is ApiResponse<T>;
/**
 * Type guard for Post objects
 */
export declare function isPost(obj: any): obj is Post;
/**
 * Type guard for KindnessToken objects
 */
export declare function isKindnessToken(obj: any): obj is KindnessToken;
