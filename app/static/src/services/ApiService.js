/**
 * ApiService.js
 * 
 * Centralized API communication service including:
 * - HTTP request handling
 * - Error handling and retry logic
 * - Request/response interceptors
 * - CSRF token management
 * - Response normalization
 */

class ApiService {
  constructor(options = {}) {
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
  async request(url, options = {}) {
    const config = {
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

    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(fullUrl, config);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Handle different response types
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        return {
          data,
          status: response.status,
          headers: response.headers,
          ok: response.ok
        };
        
      } catch (error) {
        lastError = error;
        console.warn(`[ApiService] Request attempt ${attempt} failed:`, error.message);
        
        // Don't retry on abort or 4xx errors
        if (error.name === 'AbortError' || 
            (error.message.includes('HTTP 4') && attempt === 1)) {
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
  buildURL(url) {
    if (url.startsWith('http')) {
      return url;
    }
    return `${this.baseURL}${url}`;
  }

  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT request
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * POST request with query parameters (for compatibility)
   */
  async postWithQuery(url, params, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;
    return this.request(fullUrl, { ...options, method: 'POST' });
  }

  /**
   * Get posts from API
   */
  async getPosts(page = 1, limit = 20, view = 'latest') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (view !== 'latest') {
      params.append('view', view);
    }
    
    const response = await this.get(`/api/posts?${params}`);
    return response.data;
  }

  /**
   * Create a new post
   */
  async createPost(message) {
    const response = await this.post('/api/posts', { message });
    return response.data;
  }

  /**
   * Get kindness token for a post
   */
  async getKindnessToken(postId) {
    const response = await this.postWithQuery('/api/kindness/token', { post_id: postId });
    return response.data;
  }

  /**
   * Redeem kindness token for a post
   */
  async redeemKindness(postId, token) {
    const response = await this.postWithQuery('/api/kindness/redeem', {
      post_id: postId,
      token
    });
    return response.data;
  }

  /**
   * Get top posts (last 24 hours)
   */
  async getTopPosts(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      view: 'top'
    });
    
    const response = await this.get(`/api/posts?${params}`);
    return response.data;
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Set CSRF token for all requests
   */
  setCSRFToken(token) {
    this.defaultHeaders['X-CSRFToken'] = token;
  }

  /**
   * Get CSRF token from cookies or meta tags
   */
  getCSRFToken() {
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
  initCSRF() {
    const token = this.getCSRFToken();
    if (token) {
      this.setCSRFToken(token);
    }
  }

  /**
   * Check if online
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Wait for network connection
   */
  async waitForConnection() {
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiService;
} else {
  window.ApiService = ApiService;
}