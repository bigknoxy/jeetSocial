/**
 * ApiService.ts
 *
 * Centralized API communication service including:
 * - HTTP request handling
 * - Error handling and retry logic
 * - Request/response interceptors
 * - CSRF token management
 * - Response normalization
 */
import type { ApiServiceOptions, RequestConfig, ApiResponse, PostsResponse, CreatePostResponse, KindnessToken, KindnessRedemption } from '../types/index.js';
/**
 * API service for handling HTTP requests to jeetSocial backend
 */
declare class ApiService {
    private baseURL;
    private defaultHeaders;
    private timeout;
    private retryAttempts;
    private retryDelay;
    constructor(options?: ApiServiceOptions);
    /**
     * Make HTTP request with error handling and retry logic
     */
    request<T = any>(url: string, options?: RequestConfig): Promise<ApiResponse<T>>;
    /**
     * Build full URL
     */
    private buildURL;
    /**
     * Delay helper for retry logic
     */
    private delay;
    /**
     * GET request
     */
    get<T = any>(url: string, options?: RequestConfig): Promise<ApiResponse<T>>;
    /**
     * POST request
     */
    post<T = any>(url: string, data?: any, options?: RequestConfig): Promise<ApiResponse<T>>;
    /**
     * PUT request
     */
    put<T = any>(url: string, data?: any, options?: RequestConfig): Promise<ApiResponse<T>>;
    /**
     * DELETE request
     */
    delete<T = any>(url: string, options?: RequestConfig): Promise<ApiResponse<T>>;
    /**
     * POST request with query parameters (for compatibility)
     */
    postWithQuery<T = any>(url: string, params: Record<string, string | number>, options?: RequestConfig): Promise<ApiResponse<T>>;
    /**
     * Get posts from API
     */
    getPosts(page?: number, limit?: number, view?: 'latest' | 'top'): Promise<PostsResponse>;
    /**
     * Create a new post
     */
    createPost(message: string): Promise<CreatePostResponse>;
    /**
     * Get kindness token for a post
     */
    getKindnessToken(postId: string): Promise<KindnessToken>;
    /**
     * Redeem kindness token for a post
     */
    redeemKindness(postId: string, token: string): Promise<KindnessRedemption>;
    /**
     * Get top posts (last 24 hours)
     */
    getTopPosts(page?: number, limit?: number): Promise<PostsResponse>;
    /**
     * Set default headers
     */
    setDefaultHeaders(headers: Record<string, string>): void;
    /**
     * Set CSRF token for all requests
     */
    setCSRFToken(token: string): void;
    /**
     * Get CSRF token from cookies or meta tags
     */
    getCSRFToken(): string | null;
    /**
     * Initialize CSRF protection
     */
    initCSRF(): void;
    /**
     * Check if online
     */
    isOnline(): boolean;
    /**
     * Wait for network connection
     */
    waitForConnection(): Promise<void>;
    /**
     * Cancel ongoing request
     */
    cancelRequest(): void;
    /**
     * Get current configuration
     */
    getConfig(): {
        baseURL: string;
        timeout: number;
        retryAttempts: number;
        retryDelay: number;
        headers: Record<string, string>;
    };
    /**
     * Update configuration
     */
    updateConfig(options: Partial<ApiServiceOptions>): void;
}
export default ApiService;
export { ApiService };
