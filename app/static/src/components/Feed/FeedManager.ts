/**
 * FeedManager.ts
 * 
 * Manages feed functionality including:
 * - Live feed polling and updates
 * - Paging controls
 * - Post rendering and updates
 * - New post notifications
 */

import type { 
  Post, 
  AppState, 
  PaginationState
} from '../../types/index.js';

import { wsService, type NewPostEvent } from '../../services/WebSocketService.js';

// Import Store type for global reference
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
class FeedManager {
  private store: any;
  private accentColors: string[];
  private unsubscribeFunctions: (() => void)[];
  private isWebSocketEnabled: boolean = false;

  constructor(store?: any) {
    this.store = store || window.Store || window.store;
    this.accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
    
    // Subscribe to state changes
    this.unsubscribeFunctions = [];
    this.setupSubscriptions();
    this.setupWebSocket();
    
    // Start periodic connection validation to catch silent disconnects
    this.startConnectionValidation();
    
    // Fallback: Force validation after 3 seconds to catch any initialization issues
    setTimeout(() => {
      console.log('[FeedManager] Running fallback validation check');
      this.validateConnectionManually();
    }, 3000);
  }

  /**
   * Setup state subscriptions
   */
  private setupSubscriptions(): void {
    // Guard against Store not being available
    if (!this.store || typeof this.store.subscribe !== 'function') {
      console.warn('[FeedManager] Store not available, skipping subscriptions');
      return;
    }
    
    // Subscribe to pagination changes
    const unsubscribePagination = this.store.subscribe(
      'pagination', 
      (newPagination: PaginationState, oldPagination: PaginationState) => {
        if (newPagination.currentPage !== oldPagination.currentPage) {
          this.handlePageChange(newPagination.currentPage);
        }
      }, 
      { id: 'feedManager-pagination' }
    );
    
    this.unsubscribeFunctions.push(unsubscribePagination);
  }

  /**
   * Setup WebSocket for real-time updates with polling fallback
   */
  private setupWebSocket(): void {
    // Setup WebSocket event listeners
    wsService.on('new_post', (data: NewPostEvent) => {
      this.handleNewPost(data);
    });

    wsService.on('connection_status_change', (status: string) => {
      console.log(`[FeedManager] WebSocket connection status: ${status}`);
      if (status === 'connected') {
        // Double-check actual connection state before enabling
        if (wsService.isConnected()) {
          this.isWebSocketEnabled = true;
          this.joinFeedRoom();
          this.stopPolling(); // Stop polling when WebSocket connects
        } else {
          console.warn('[FeedManager] Received connected status but socket not actually connected - ignoring');
        }
      } else if (status === 'disconnected') {
        this.isWebSocketEnabled = false;
        this.startPolling(); // Start polling when WebSocket disconnects
      }
    });

    // Connect to WebSocket
    wsService.connect().catch((error) => {
      console.error('[FeedManager] Failed to connect WebSocket:', error);
      this.isWebSocketEnabled = false;
      this.startPolling(); // Start polling as fallback
    });
  }

  /**
   * Join feed room for new post updates
   */
  private joinFeedRoom(): void {
    if (this.isWebSocketEnabled) {
      wsService.joinFeedRoom();
    }
  }

  /**
   * Handle new post from WebSocket
   */
  private handleNewPost(postData: NewPostEvent): void {
    const state = this.store.getState();
    
    // Only handle new posts if we're on the first page
    if (state.pagination.currentPage !== 1) {
      return;
    }

    console.log('[FeedManager] New post via WebSocket:', postData);

    // Convert WebSocket event to Post format
    const post: Post = {
      id: postData.id.toString(),
      username: postData.username,
      message: postData.content,
      timestamp: postData.created_at,
      created_at: postData.created_at,
      kindness_points: postData.kindness_points
    };

    // Update store with new post
    const currentPosts = state.feed.posts || [];
    const existingIds = currentPosts.map((p: Post) => p.id);
    
    if (!existingIds.includes(post.id)) {
      const newPosts = [post, ...currentPosts];
      
      this.store.setState({
        feed: {
          ...state.feed,
          posts: newPosts,
          lastUpdated: Date.now()
        }
      }, 'FeedManager.newPostWebSocket');

      // Update DOM
      this.insertNewPostInDOM(post);
      
      // Show new posts banner if not at top
      if (window.scrollY > 0) {
        this.showNewPostsBanner();
      }
    }
  }

  /**
   * Insert new post in DOM with animation
   */
  private insertNewPostInDOM(post: Post): void {
    const feed = document.getElementById('feed');
    if (!feed) return;

    const existingIds = Array.from(feed.children).map(node => 
      (node as HTMLElement).dataset?.id
    );

    const postIdStr = String(post.id);
    if (!existingIds.includes(postIdStr)) {
      const div = document.createElement('div');
      div.className = 'post new-post';
      div.style.animation = 'fadeIn 1s';
      div.style.borderLeft = `6px solid ${this.accentColors[0]}`; // Use first color for new posts
      div.setAttribute('data-id', post.id);

      const displayKp = Number.isFinite(Number(post.kindness_points)) ? Number(post.kindness_points) : 0;

      div.innerHTML = `
        <span class="username" style="color:${this.accentColors[0]}">${post.username}</span>
        <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
        <div class="post-content">${this.escapeHtml(post.message)}</div>
        <div class="kindness-row">
          <span class="kindness-badge kindness-count" data-kindness-count="${post.id}" aria-live="polite">🌈 ${displayKp}</span>
          <button class="kindness-btn kindness-icon-btn" data-post-id="${post.id}" aria-label="Award kindness to this post" aria-pressed="false" data-tooltip="Award kindness (gives 1 kindness point)"><span class="icon" aria-hidden="true">❤️</span></button>
        </div>
      `;

      // Prepend to top of feed
      try {
        feed.insertBefore(div, feed.firstChild);
      } catch {
        feed.appendChild(div);
      }
    }
  }
  
  /**
   * Handle page changes
   */
  private handlePageChange(newPage: number): void {
    if (newPage === 1) {
      // Join feed room when on first page
      if (this.isWebSocketEnabled) {
        this.joinFeedRoom();
      }
    } else {
      // Leave feed room when not on first page
      if (this.isWebSocketEnabled) {
        wsService.leaveFeedRoom();
      }
    }
  }

  /**
   * Show "New posts available" banner
   */
  private showNewPostsBanner(): void {
    let banner = document.getElementById('new-posts-banner') as HTMLElement;
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'new-posts-banner';
      banner.textContent = 'New posts available! Click to view.';
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '50%';
      banner.style.transform = 'translateX(-50%)';
      banner.style.background = '#ffe347';
      banner.style.color = '#23232b';
      banner.style.fontWeight = 'bold';
      banner.style.padding = '0.5em 2em';
      banner.style.borderRadius = '0 0 8px 8px';
      banner.style.zIndex = '9999';
      banner.style.cursor = 'pointer';
      document.body.appendChild(banner);
      
      banner.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        banner.remove();
        
        // Update store state
        this.store.setState({
          ui: {
            ...this.store.getState().ui,
            newPostsBannerVisible: false
          }
        }, 'FeedManager.bannerClicked');
      };
    }
  }

  /**
   * Fetch a specific page of posts
   */
  async fetchFeedPage(page: number): Promise<void> {
    const feed = document.getElementById('feed');
    if (!feed) return;
    
    // Update loading state
    this.store.setState({
      feed: {
        ...this.store.getState().feed,
        isLoading: true
      }
    }, 'FeedManager.fetchFeedPage.start');
    
    // Show skeleton loader while loading
    feed.innerHTML = `
      <div class="skeleton-loader" id="skeleton-loader">
        <div class="skeleton-post"><div class="skeleton-animate"></div></div>
        <div class="skeleton-post"><div class="skeleton-animate"></div></div>
        <div class="skeleton-post"><div class="skeleton-animate"></div></div>
      </div>
    `;
    
    try {
      const state = this.store.getState();
      const viewParam = state.pagination.currentView !== 'latest' ? `&view=${state.pagination.currentView}` : '';
      const resp = await fetch(`/api/posts?page=${page}&limit=${state.pagination.pageLimit}${viewParam}`);
      const data = await resp.json();
      const posts = data.posts;
      
      // Debug: log incoming posts payload for E2E visibility
      try { console.debug('[FetchFeed] /api/posts payload', posts); } catch { /* ignore */ }
      
      // Defensive normalization of posts array to ensure kindness_points is numeric
      const normalizedPosts = posts.map((p: Post) => {
        try {
          if (typeof p.kindness_points !== 'number' || !Number.isFinite(p.kindness_points)) {
            const coerced = Number(p.kindness_points);
            p.kindness_points = Number.isFinite(coerced) ? coerced : 0;
          }
        } catch {
          console.debug('[KINDNESS-CLIENT] storage handler error');
        }
        return p;
      });

      feed.innerHTML = normalizedPosts.map((post: Post, index: number) => {
        const color = this.accentColors[index % this.accentColors.length];
        // Explicit numeric display value for kindness points
        const displayKp = Number.isFinite(Number(post.kindness_points)) ? Number(post.kindness_points) : 0;
        return `
          <div class="post" style="border-left: 6px solid ${color};" data-id="${post.id}">
            <span class="username" style="color:${color}">${post.username}</span>
            <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
            <div class="post-content">${this.escapeHtml(post.message)}</div>
            <div class="kindness-row">
              <span class="kindness-badge kindness-count" data-kindness-count="${post.id}" aria-live="polite">🌈 ${displayKp}</span>
              <button class="kindness-btn kindness-icon-btn" data-post-id="${post.id}" aria-label="Award kindness to this post" aria-pressed="false" data-tooltip="Award kindness (gives 1 kindness point)"><span class="icon" aria-hidden="true">❤️</span></button>
            </div>
          </div>
        `;
      }).join('');

      // After full reload, remove new-post banner if present
      const banner = document.getElementById('new-posts-banner');
      if (banner) banner.remove();
      
      // Update store with new pagination state
      const totalPages = Math.max(1, Math.ceil(data.total_count / state.pagination.pageLimit));
      this.store.setState({
        pagination: {
          ...state.pagination,
          currentPage: data.page,
          totalPages
        },
        feed: {
          ...state.feed,
          posts: normalizedPosts,
          isLoading: false,
          lastUpdated: Date.now()
        },
        ui: {
          ...state.ui,
          newPostsBannerVisible: false
        }
      }, 'FeedManager.fetchFeedPage.success');
      
      this.renderPagingControls();
    } catch (err) {
      console.log('[FetchFeed] Error loading feed', err);
      feed.innerHTML = '<em>Error loading feed.</em>';
      
      // Update store with error state
      this.store.setState({
        feed: {
          ...this.store.getState().feed,
          isLoading: false
        }
      }, 'FeedManager.fetchFeedPage.error');
    }
  }

  /**
   * Render paging controls
   */
  private renderPagingControls(): void {
    const state = this.store.getState();
    const { currentPage, totalPages } = state.pagination;

    const feed = document.getElementById('feed');
    if (!feed) return;
    
    let pagingDiv = document.getElementById('paging-controls') as HTMLElement;
    if (!pagingDiv) {
      pagingDiv = document.createElement('div');
      pagingDiv.id = 'paging-controls';
      pagingDiv.style.display = 'flex';
      pagingDiv.style.justifyContent = 'center';
      pagingDiv.style.alignItems = 'center';
      pagingDiv.style.gap = '1em';
      pagingDiv.style.margin = '1em 0';
      feed.parentNode?.insertBefore(pagingDiv, feed.nextSibling);
    }

    // Build pagination HTML
    let html = '';
    
    // Previous button
    if (currentPage > 1) {
      html += `<button class="rainbow-btn" onclick="feedManager.fetchFeedPage(${currentPage - 1})">← Previous</button>`;
    } else {
      html += `<button class="rainbow-btn" disabled>← Previous</button>`;
    }

    // Page info
    html += `<span>Page ${currentPage} of ${totalPages}</span>`;

    // Next button
    if (currentPage < totalPages) {
      html += `<button class="rainbow-btn" onclick="feedManager.fetchFeedPage(${currentPage + 1})">Next →</button>`;
    } else {
      html += `<button class="rainbow-btn" disabled>Next →</button>`;
    }

    pagingDiv.innerHTML = html;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    // Convert line breaks to <br> after escaping
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  /**
   * Set the current view (latest or top)
   */
  setView(view: 'latest' | 'top'): void {
    this.store.setState({
      pagination: {
        ...this.store.getState().pagination,
        currentView: view,
        currentPage: 1 // Reset to first page when changing view
      }
    }, 'FeedManager.setView');
    
    this.fetchFeedPage(1);
  }

  /**
   * Get current state
   */
  getState(): AppState {
    return this.store.getState();
  }
  
  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    
    // Cleanup WebSocket
    wsService.off('new_post');
    wsService.off('connection_status_change');
    wsService.leaveFeedRoom();
    
    // Cleanup polling
    this.stopPolling();
  }

  /**
   * Get accent colors for posts
   */
  getAccentColors(): string[] {
    return [...this.accentColors];
  }

  /**
   * Get WebSocket connection status
   */
  getWebSocketStatus(): boolean {
    return this.isWebSocketEnabled;
  }

  /**
   * Start periodic connection validation to catch silent disconnects
   */
  private startConnectionValidation(): void {
    console.log('[FeedManager] Starting periodic connection validation');
    // Check connection every 5 seconds to catch silent disconnects
    setInterval(() => {
      this.validateConnectionManually();
    }, 5000);
  }

  /**
   * Manual validation check for connection state
   */
  private validateConnectionManually(): void {
    const managerEnabled = this.isWebSocketEnabled;
    const serviceConnected = wsService.isConnected();
    const connectionStatus = wsService.getConnectionStatus();
    
    console.log(`[FeedManager] Validation check - Manager: ${managerEnabled}, Service: ${serviceConnected}, Status: ${connectionStatus}`);
    
    if (managerEnabled && !serviceConnected) {
      console.warn('[FeedManager] Detected silent WebSocket disconnect - updating status');
      this.isWebSocketEnabled = false;
      this.startPolling();
    }
  }

  /**
   * Initialize WebSocket connection and setup polling fallback
   * This should be called after all modules are loaded
   */
  initializeRealTime(): void {
    if (this.isWebSocketEnabled) {
      console.log('[FeedManager] WebSocket already enabled');
      return;
    }

    // Setup WebSocket if not already done
    if (!wsService.isConnected()) {
      this.setupWebSocket();
    }
  }

  /**
   * Set accent colors for posts
   */
  setAccentColors(colors: string[]): void {
    this.accentColors = [...colors];
  }

  /**
   * Start HTTP polling for new posts when WebSocket is unavailable
   */
  private startPolling(): void {
    // Stop any existing polling
    this.stopPolling();
    
    const state = this.store.getState();
    if (state.polling.isActive) {
      return; // Already polling
    }

    console.log('[FeedManager] Starting HTTP polling fallback');
    
    // Set polling state
    this.store.setState({
      polling: {
        ...state.polling,
        isActive: true,
        intervalId: setInterval(() => {
          this.pollForNewPosts();
        }, state.polling.interval)
      }
    }, 'FeedManager.startPolling');
  }

  /**
   * Stop HTTP polling
   */
  private stopPolling(): void {
    const state = this.store.getState();
    if (state.polling.intervalId) {
      console.log('[FeedManager] Stopping HTTP polling');
      clearInterval(state.polling.intervalId);
      
      this.store.setState({
        polling: {
          ...state.polling,
          isActive: false,
          intervalId: null
        }
      }, 'FeedManager.stopPolling');
    }
  }

  /**
   * Poll for new posts via HTTP
   */
  private async pollForNewPosts(): Promise<void> {
    const state = this.store.getState();
    
    // Only poll when on first page of latest view
    if (state.pagination.currentPage !== 1 || state.pagination.currentView !== 'latest') {
      return;
    }

    try {
      // Get the timestamp of the most recent post
      const lastPost = state.feed.posts[0];
      if (!lastPost) {
        return; // No posts to compare against
      }

      const lastTimestamp = new Date(lastPost.created_at || lastPost.timestamp).getTime();
      const now = Date.now();
      
      // Don't poll if last update was less than 5 seconds ago
      if (now - lastTimestamp < 5000) {
        return;
      }

      // Fetch latest posts
      const resp = await fetch('/api/posts?page=1&limit=5');
      const data = await resp.json();
      const latestPosts = data.posts || [];

      // Check for new posts
      const newPosts = latestPosts.filter((post: Post) => {
        const postTime = new Date(post.created_at || post.timestamp).getTime();
        return postTime > lastTimestamp && !state.feed.posts.some((existing: Post) => existing.id === post.id);
      });

      // Process new posts
      if (newPosts.length > 0) {
        console.log(`[FeedManager] Found ${newPosts.length} new posts via polling`);
        
        // Add new posts to the beginning of the feed
        const updatedPosts = [...newPosts, ...state.feed.posts];
        
        this.store.setState({
          feed: {
            ...state.feed,
            posts: updatedPosts,
            lastUpdated: Date.now(),
            hasNewPosts: true
          }
        }, 'FeedManager.polling.newPosts');

        // Update DOM for each new post
        newPosts.forEach((post: Post) => {
          this.insertNewPostInDOM(post);
        });

        // Show new posts banner if not at top
        if (window.scrollY > 0) {
          this.showNewPostsBanner();
        }
      }
    } catch (error) {
      console.error('[FeedManager] Error polling for new posts:', error);
    }
  }
}

// Export for use in other modules
export default FeedManager;

// Also export as named export for consistency
export { FeedManager };

// Global export for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).FeedManager = FeedManager;
}