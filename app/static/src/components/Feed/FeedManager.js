/**
 * FeedManager.js
 * 
 * Manages feed functionality including:
 * - Live feed polling and updates
 * - Paging controls
 * - Post rendering and updates
 * - New post notifications
 */

class FeedManager {
  constructor(store) {
    this.store = store || window.Store;
    this.accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
    
    // Subscribe to state changes
    this.unsubscribeFunctions = [];
    this.setupSubscriptions();
  }

  /**
   * Setup state subscriptions
   */
  setupSubscriptions() {
    // Subscribe to pagination changes
    const unsubscribePagination = this.store.subscribe('pagination', (newPagination, oldPagination) => {
      if (newPagination.currentPage !== oldPagination.currentPage) {
        this.handlePageChange(newPagination.currentPage, oldPagination.currentPage);
      }
    }, { id: 'feedManager-pagination' });
    
    this.unsubscribeFunctions.push(unsubscribePagination);
  }
  
  /**
   * Handle page changes
   */
  handlePageChange(newPage, oldPage) {
    if (newPage === 1) {
      this.startLiveFeedPolling();
    } else {
      this.stopLiveFeedPolling();
    }
  }

  /**
   * Start live feed polling for real-time updates
   */
  startLiveFeedPolling() {
    const state = this.store.getState();
    if (state.polling.intervalId) {
      clearInterval(state.polling.intervalId);
    }
    
    const intervalId = setInterval(() => {
      const currentState = this.store.getState();
      console.log('[LiveFeed] Polling interval fired. currentPage:', currentState.pagination.currentPage);
      if (currentState.pagination.currentPage === 1) {
        this.butterSmoothLiveUpdate();
      }
    }, state.polling.interval);
    
    this.store.setState({
      polling: {
        ...state.polling,
        intervalId,
        isActive: true
      }
    }, 'FeedManager.startLiveFeedPolling');
  }

  /**
   * Stop live feed polling
   */
  stopLiveFeedPolling() {
    const state = this.store.getState();
    if (state.polling.intervalId) {
      clearInterval(state.polling.intervalId);
    }
    
    this.store.setState({
      polling: {
        ...state.polling,
        intervalId: null,
        isActive: false
      }
    }, 'FeedManager.stopLiveFeedPolling');
  }

  /**
   * Butter-smooth live update function for real-time feed updates
   */
  async butterSmoothLiveUpdate() {
    try {
      const state = this.store.getState();
      const viewParam = state.pagination.currentView !== 'latest' ? `&view=${state.pagination.currentView}` : '';
      const resp = await fetch(`/api/posts?page=1&limit=${state.pagination.pageLimit}${viewParam}`);
      const data = await resp.json();
      const newPosts = Array.isArray(data.posts) ? data.posts : [];
      
      // Update store with new posts
      this.store.setState({
        feed: {
          ...state.feed,
          posts: newPosts,
          lastUpdated: Date.now()
        }
      }, 'FeedManager.butterSmoothLiveUpdate');
      
      // Debug: log incoming posts payload for E2E visibility
      try { console.debug('[LiveFeed] /api/posts payload', newPosts); } catch { /* ignore */ }
      
      const feed = document.getElementById('feed');
      if (!feed) return;
      
      // Get existing post IDs in DOM
      const existingIds = Array.from(feed.children).map(node => node.dataset && node.dataset.id);
      let inserted = false;

      newPosts.forEach((post, i) => {
        const postIdStr = String(post.id);

        // Defensive normalization of incoming post object
        if (typeof post.kindness_points !== 'number' || !Number.isFinite(post.kindness_points)) {
          const coerced = Number(post.kindness_points);
          post.kindness_points = Number.isFinite(coerced) ? coerced : 0;
        }

        const displayKp = Number.isFinite(Number(post.kindness_points)) ? Number(post.kindness_points) : 0;

        if (!existingIds.includes(postIdStr)) {
          // Create post node
          const div = document.createElement('div');
          div.className = 'post new-post';
          div.style.animation = 'fadeIn 1s';
          div.style.borderLeft = `6px solid ${this.accentColors[i % this.accentColors.length]}`;
          div.setAttribute('data-id', post.id);

          div.innerHTML = `
            <span class="username" style="color:${this.accentColors[i % this.accentColors.length]}">${post.username}</span>
            <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
            <div class="post-content">${this.escapeHtml(post.message)}</div>
            <div class="kindness-row">
              <span class="kindness-badge kindness-count" data-kindness-count="${post.id}" aria-live="polite">🌈 ${displayKp}</span>
              <button class="kindness-btn kindness-icon-btn" data-post-id="${post.id}" aria-label="Award kindness to this post" aria-pressed="false" data-tooltip="Award kindness (gives 1 kindness point)"><span class="icon" aria-hidden="true">❤️</span></button>
            </div>
          `;

          // Prepend newest posts to top of feed
          try {
            feed.insertBefore(div, feed.firstChild);
          } catch {
            feed.appendChild(div);
          }

          inserted = true;
        } else {
          // Update existing post kindness badge so cross-device updates become visible
          try {
            const countEl = document.querySelector(`[data-kindness-count="${post.id}"]`);
            if (countEl) {
              countEl.textContent = `🌈 ${displayKp}`;
              // Small visual feedback for change
              countEl.classList.add('bump');
              setTimeout(() => countEl.classList.remove('bump'), 350);
            }
          } catch (err) {
            console.debug('[LiveFeed] failed to update existing kindness badge', err);
          }
        }
      });

      // Update UI state for new posts banner
      if (inserted) {
        this.store.setState({
          ui: {
            ...state.ui,
            newPostsBannerVisible: window.scrollY > 0
          }
        }, 'FeedManager.newPostsDetected');
        
        // Optionally, preserve scroll position if user is not at top
        if (window.scrollY > 0) {
          // Show "New posts available" banner
          this.showNewPostsBanner();
        }
      }
    } catch (err) {
      console.log('[LiveFeed] Butter-smooth update error', err);
    }
  }

  /**
   * Show "New posts available" banner
   */
  showNewPostsBanner() {
    let banner = document.getElementById('new-posts-banner');
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
  async fetchFeedPage(page) {
    const feed = document.getElementById('feed');
    
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
      const normalizedPosts = posts.map(p => {
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

      feed.innerHTML = normalizedPosts.map((post, index) => {
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
  renderPagingControls() {
    const state = this.store.getState();
    const { currentPage, totalPages } = state.pagination;

    const feed = document.getElementById('feed');
    let pagingDiv = document.getElementById('paging-controls');
    if (!pagingDiv) {
      pagingDiv = document.createElement('div');
      pagingDiv.id = 'paging-controls';
      pagingDiv.style.display = 'flex';
      pagingDiv.style.justifyContent = 'center';
      pagingDiv.style.alignItems = 'center';
      pagingDiv.style.gap = '1em';
      pagingDiv.style.margin = '1em 0';
      feed.parentNode.insertBefore(pagingDiv, feed.nextSibling);
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
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    // Convert line breaks to <br> after escaping
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  /**
   * Set the current view (latest or top)
   */
  setView(view) {
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
  getState() {
    return this.store.getState();
  }
  
  /**
   * Cleanup subscriptions
   */
  destroy() {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.stopLiveFeedPolling();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeedManager;
} else {
  window.FeedManager = FeedManager;
}