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

import type {
  ApiServiceOptions,
  RequestConfig,
  ApiResponse,
  PostsResponse,
  CreatePostResponse,
  KindnessToken,
  KindnessRedemption
} from '../types/index.js';

/**
 * API service for handling HTTP requests to jeetSocial backend
 */
class ApiService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(options: ApiServiceOptions = {}) {
    this.baseURL = options.baseURL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    this.timeout = options.timeout || 10000; // 10 seconds default
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  async request<T = any>(url: string, options: RequestConfig = {}): Promise<ApiResponse<T>> {
    const config: RequestConfig = {
      method: 'GET',
      headers: { ...this.defaultHeaders },
      ...options
    };

    // Build full URL
    const fullUrl = this.buildURL(url);

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(fullUrl, config);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Handle different response types
        const contentType = response.headers.get('content-type');
        let data: T;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json() as T;
        } else {
          data = await response.text() as unknown as T;
        }
        
        return {
          data,
          status: response.status,
          headers: response.headers,
          ok: response.ok
        };
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`[ApiService] Request attempt ${attempt} failed:`, lastError.message);
        
        // Don't retry on abort or 4xx errors
        if (lastError.name === 'AbortError' || 
            (lastError.message.includes('HTTP 4') && attempt === 1)) {
          break;
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    clearTimeout(timeoutId);
    throw lastError || new Error('Request failed after all retry attempts');
  }

  /**
   * Build full URL
   */
  private buildURL(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    return `${this.baseURL}${url}`;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, options: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, options: RequestConfig = {}): Promise<ApiResponse<T>> {
    const config: RequestConfig = {
      ...options,
      method: 'POST'
    };
    
    if (data) {
      config.body = JSON.stringify(data);
    }
    
    return this.request<T>(url, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, options: RequestConfig = {}): Promise<ApiResponse<T>> {
    const config: RequestConfig = {
      ...options,
      method: 'PUT'
    };
    
    if (data) {
      config.body = JSON.stringify(data);
    }
    
    return this.request<T>(url, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * POST request with query parameters (for compatibility)
   */
  async postWithQuery<T = any>(
    url: string, 
    params: Record<string, string | number>, 
    options: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    const fullUrl = `${url}?${queryString}`;
    return this.request<T>(fullUrl, { ...options, method: 'POST' });
  }

  /**
   * Get posts from API
   */
  async getPosts(page: number = 1, limit: number = 20, view: 'latest' | 'top' = 'latest'): Promise<PostsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (view !== 'latest') {
      params.append('view', view);
    }
    
    const response = await this.get<PostsResponse>(`/api/posts?${params}`);
    return response.data;
  }

  /**
   * Create a new post
   */
  async createPost(message: string): Promise<CreatePostResponse> {
    const response = await this.post<CreatePostResponse>('/api/posts', { message });
    return response.data;
  }

  /**
   * Get kindness token for a post
   */
  async getKindnessToken(postId: string): Promise<KindnessToken> {
    const response = await this.postWithQuery<KindnessToken>('/api/kindness/token', { post_id: postId });
    return response.data;
  }

  /**
   * Redeem kindness token for a post
   */
  async redeemKindness(postId: string, token: string): Promise<KindnessRedemption> {
    const response = await this.postWithQuery<KindnessRedemption>('/api/kindness/redeem', {
      post_id: postId,
      token
    });
    return response.data;
  }

  /**
   * Get top posts (last 24 hours)
   */
  async getTopPosts(page: number = 1, limit: number = 20): Promise<PostsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      view: 'top'
    });
    
    const response = await this.get<PostsResponse>(`/api/posts?${params}`);
    return response.data;
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Set CSRF token for all requests
   */
  setCSRFToken(token: string): void {
    this.defaultHeaders['X-CSRFToken'] = token;
  }

  /**
   * Get CSRF token from cookies or meta tags
   */
  getCSRFToken(): string | null {
    // Try meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
    
    // Try cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf_token') {
        return decodeURIComponent(value);
      }
    }
    
    return null;
  }

  /**
   * Initialize CSRF protection
   */
  initCSRF(): void {
    const token = this.getCSRFToken();
    if (token) {
      this.setCSRFToken(token);
    }
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Wait for network connection
   */
  async waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isOnline()) {
        resolve();
        return;
      }
      
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve();
      };
      
      window.addEventListener('online', handleOnline);
    });
  }

  /**
   * Cancel ongoing request
   */
  cancelRequest(): void {
    // This would need to be implemented with request tracking
    // For now, it's a placeholder for future enhancement
  }

  /**
   * Get current configuration
   */
  getConfig(): {
    baseURL: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    headers: Record<string, string>;
  } {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
      headers: { ...this.defaultHeaders }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(options: Partial<ApiServiceOptions>): void {
    if (options.baseURL !== undefined) {
      this.baseURL = options.baseURL;
    }
    if (options.timeout !== undefined) {
      this.timeout = options.timeout;
    }
    if (options.retryAttempts !== undefined) {
      this.retryAttempts = options.retryAttempts;
    }
    if (options.retryDelay !== undefined) {
      this.retryDelay = options.retryDelay;
    }
    if (options.headers !== undefined) {
      this.setDefaultHeaders(options.headers);
    }
  }
}

// Export for use in other modules
export default ApiService;

// Also export as named export for consistency
export { ApiService };

// Global export for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).ApiService = ApiService;
}