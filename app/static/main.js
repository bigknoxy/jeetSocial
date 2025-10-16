/*
main.js

Frontend logic for jeetSocial:
- Live feed polling and updates
- Paging controls
- Post submission and moderation
- Kindness mission UI/UX
- Emoji picker integration
*/


// Paging state
let currentPage = 1;
let totalPages = 1;
let pageLimit = 20;
let currentView = 'latest';

// Initial load
console.debug('[main.js] loaded');
window.addEventListener('DOMContentLoaded', () => {
  console.debug('[main.js] DOMContentLoaded - fetching feed and starting live polling');
  fetchFeedPage(1);
  startLiveFeedPolling();
});

let liveFeedInterval = null;
function startLiveFeedPolling() {
  if (liveFeedInterval) clearInterval(liveFeedInterval);
  liveFeedInterval = setInterval(() => {
    console.log('[LiveFeed] Polling interval fired. currentPage:', currentPage);
    if (currentPage === 1) butterSmoothLiveUpdate();
  }, 15000); // 15 seconds
}

// Butter-smooth live update function
async function butterSmoothLiveUpdate() {
  try {
    const viewParam = currentView !== 'latest' ? `&view=${currentView}` : '';
    const resp = await fetch(`/api/posts?page=1&limit=${pageLimit}${viewParam}`);
    const data = await resp.json();
    const newPosts = Array.isArray(data.posts) ? data.posts : [];
     // Debug: log incoming posts payload for E2E visibility
     try { console.debug('[LiveFeed] /api/posts payload', newPosts); } catch { /* ignore */ }
    const feed = document.getElementById('feed');
    if (!feed) return;
    const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
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
        div.style.borderLeft = `6px solid ${accentColors[i % accentColors.length]}`;
        div.setAttribute('data-id', post.id);

        div.innerHTML = `
          <span class="username" style="color:${accentColors[i % accentColors.length]}">${post.username}</span>
          <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
          <div class="post-content">${escapeHtml(post.message)}</div>
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

    // Animate new posts
    if (inserted) {
      // Optionally, preserve scroll position if user is not at top
      if (window.scrollY > 0) {
        // Show "New posts available" banner
        showNewPostsBanner();
      }
    }
   } catch (err) {
     console.log('[LiveFeed] Butter-smooth update error', err);
  }
}


function showNewPostsBanner() {
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
    };
  }
}

function stopLiveFeedPolling() {
  if (liveFeedInterval) clearInterval(liveFeedInterval);
  liveFeedInterval = null;
}


// Paging controls
function renderPagingControls() {
  // Pause live polling if not on page 1
  if (currentPage === 1) {
    startLiveFeedPolling();
  } else {
    stopLiveFeedPolling();
  }

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
  pagingDiv.innerHTML = `
    <button id="prev-page" class="rainbow-btn" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
    <span style="color:#ffe347;font-weight:bold;">Page ${currentPage} of ${totalPages}</span>
    <button id="next-page" class="rainbow-btn" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
  `;
  document.getElementById('prev-page').onclick = () => {
    if (currentPage > 1) fetchFeedPage(currentPage - 1);
  };
  document.getElementById('next-page').onclick = () => {
    if (currentPage < totalPages) fetchFeedPage(currentPage + 1);
  };
}

async function fetchFeedPage(page) {
  const feed = document.getElementById('feed');
  // Show skeleton loader while loading
  feed.innerHTML = `
    <div class="skeleton-loader" id="skeleton-loader">
      <div class="skeleton-post"><div class="skeleton-animate"></div></div>
      <div class="skeleton-post"><div class="skeleton-animate"></div></div>
      <div class="skeleton-post"><div class="skeleton-animate"></div></div>
    </div>
  `;
   try {
     const viewParam = currentView !== 'latest' ? `&view=${currentView}` : '';
     const resp = await fetch(`/api/posts?page=${page}&limit=${pageLimit}${viewParam}`);
     const data = await resp.json();
    const posts = data.posts;
     // Debug: log incoming posts payload for E2E visibility
     try { console.debug('[FetchFeed] /api/posts payload', posts); } catch { /* ignore */ }
    const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
    // Remove skeleton loader and show posts
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
      const color = accentColors[index % accentColors.length];
      // Explicit numeric display value for kindness points
      const displayKp = Number.isFinite(Number(post.kindness_points)) ? Number(post.kindness_points) : 0;
    return `
        <div class="post" style="border-left: 6px solid ${color};" data-id="${post.id}">
          <span class="username" style="color:${color}">${post.username}</span>
          <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
            <div class="post-content">${escapeHtml(post.message)}</div>
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
    currentPage = data.page;
    totalPages = Math.max(1, Math.ceil(data.total_count / pageLimit));
    renderPagingControls();
   } catch (err) {
     console.log('[FetchFeed] Error loading feed', err);
    feed.innerHTML = '<em>Error loading feed.</em>';
  }
}

// Rainbow button style
const style = document.createElement('style');
style.innerHTML += `.rainbow-btn {
  background: linear-gradient(90deg, #ff4b5c, #ffb26b, #ffe347, #43e97b, #3fa7d6, #7c4dff, #c86dd7);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.5em 1.5em;
  font-weight: bold;
  cursor: pointer;
  transition: box-shadow 0.2s;
  font-size: 1em;
}
.rainbow-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.rainbow-btn:hover:not(:disabled) {
  box-shadow: 0 0 8px #43e97b;
}`;
document.head.appendChild(style);

// Optional: highlight new posts
const animationStyle = document.createElement('style');
animationStyle.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .new-post { background: #23232b; box-shadow: 0 0 8px #ffe347; }`;
document.head.appendChild(animationStyle);


function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  // Convert line breaks to <br> after escaping
  return div.innerHTML.replace(/\n/g, '<br>');
}

async function postMessage(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = '';
  const message = document.getElementById('message').value.trim();
  if (!message) {
    errorDiv.textContent = 'Message required.';
    return;
  }
  try {
    const resp = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (resp.status === 201) {
      const textarea = document.getElementById('message');
      textarea.value = '';
      // Reset character counter after post
      const counter = document.getElementById('char-count');
      if (counter) counter.textContent = '0/280';
      fetchFeedPage(currentPage);
      butterSmoothLiveUpdate();
    } else {
      try {
        const data = await resp.json();
        errorDiv.textContent = data.error || `Error posting (status ${resp.status}).`;
      } catch {
        if (resp.status === 429) {
          errorDiv.textContent = 'You are posting too quickly. Please wait a minute before posting again. This helps keep jeetSocial spam-free and fair for everyone.';
        } else {
          errorDiv.textContent = `Error posting (status ${resp.status}).`;
        }
      }
    }
   } catch (err) {
    console.log('[PostMessage] Network error', err);
    errorDiv.textContent = 'Network error.';
  }
}

// Attach post handler defensively
(function attachPostHandler() {
  try {
    const postForm = document.getElementById('post-form');
    if (postForm && !postForm._hasSubmitHandler) {
      postForm.addEventListener('submit', postMessage);
      postForm._hasSubmitHandler = true;
      console.debug('[main.js] post-form submit handler attached');
    }
   } catch (err) {
    console.debug('[main.js] attachPostHandler error', err);
  }
})();

// Enter to Post Toggle Integration
function setupEnterToPost() {
  const textarea = document.getElementById('message');
  const enterToggle = document.getElementById('enter-to-post');
  const postForm = document.getElementById('post-form');

  if (!textarea) return;

  textarea.addEventListener('keydown', function(e) {
    if (
      enterToggle && enterToggle.checked &&
      e.key === 'Enter' && !e.shiftKey && !e.ctrlKey
    ) {
      e.preventDefault();
      if (postForm && typeof postForm.requestSubmit === 'function') postForm.requestSubmit();
    }
  });
}
window.addEventListener('DOMContentLoaded', setupEnterToPost);

// Character Counter
function setupCharacterCounter() {
  const textarea = document.getElementById('message');
  const counter = document.getElementById('char-count');
  const postBtn = document.getElementById('post-btn');
  const errorDiv = document.getElementById('error');

  if (!textarea || !counter || !postBtn || !errorDiv) {
    console.debug('[main.js] setupCharacterCounter: missing elements', { textarea: !!textarea, counter: !!counter, postBtn: !!postBtn, errorDiv: !!errorDiv });
    return;
  }

  function updateCounter() {
    const length = textarea.value.length;
    counter.textContent = `${length}/280`;
    // Color logic: muted <240, orange 240-279, red 280+
    if (length > 280) {
      counter.style.color = '#ff4b5c'; // error
      postBtn.disabled = true;
      postBtn.style.opacity = '0.6';
      errorDiv.textContent = "Your message is a bit too long. Let's keep it kind and concise!";
      errorDiv.style.opacity = '1';
    } else if (length >= 240) {
      counter.style.color = '#ffb26b'; // warning
      postBtn.disabled = false;
      postBtn.style.opacity = '1';
      errorDiv.textContent = '';
      errorDiv.style.opacity = '0';
    } else if (length === 0) {
      counter.style.color = '#888';
      postBtn.disabled = true;
      postBtn.style.opacity = '0.6';
      errorDiv.textContent = "Share something uplifting to brighten someone's day!";
      errorDiv.style.opacity = '1';
    } else {
      counter.style.color = '#888';
      postBtn.disabled = false;
      postBtn.style.opacity = '1';
      errorDiv.textContent = '';
      errorDiv.style.opacity = '0';
    }
  }

  textarea.addEventListener('input', updateCounter);
  updateCounter(); // Initial update

  // Mobile usability: scroll form into view when keyboard opens
  textarea.addEventListener('focus', function() {
    if (window.innerWidth < 600) {
      setTimeout(function() {
        const pf = document.getElementById('post-form');
        if (pf && typeof pf.scrollIntoView === 'function') pf.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  });
}

window.addEventListener('DOMContentLoaded', setupCharacterCounter);

// Kindness Points Manager
// Toast notification helper
function showToast(message, type = '', duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = '';
    if (type) toast.classList.add(type);
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.remove('error');
        toast.classList.remove('success');
    }, duration);
}

class KindnessManager {
    constructor() {
        this.token = sessionStorage.getItem('kindness_token');
        this.tokenExpiry = sessionStorage.getItem('kindness_token_expiry');
        this._lastAppliedKindnessTs = 0; // timestamp of last applied storage event
        console.log('[KINDNESS-CLIENT] constructor - initial token present?', !!this.token, 'expiry=', this.tokenExpiry);

        // Listen for cross-tab kindness updates broadcast via localStorage
        window.addEventListener('storage', (event) => {
            try {
                // Log raw event for E2E debugging
                console.debug('[KINDNESS-CLIENT] storage event received', { key: event.key, newValue: event.newValue, oldValue: event.oldValue });
                if (!event.key || event.key !== 'jeet_kindness_update') return;
                // If the key was removed (newValue === null) ignore the removal event
                if (event.newValue === null) {
                    console.debug('[KINDNESS-CLIENT] storage event: key removed, ignoring');
                    return;
                }
                const payload = JSON.parse(event.newValue);
                if (!payload || !payload.post_id || typeof payload.new_points === 'undefined' || !payload.ts) {
                    console.debug('[KINDNESS-CLIENT] storage event: payload invalid', payload);
                    return;
                }
                // Ignore older events
                if (payload.ts <= this._lastAppliedKindnessTs) return;
                this._lastAppliedKindnessTs = payload.ts;
                console.debug('[KINDNESS-CLIENT] storage event – updating kindness for', payload.post_id, 'to', payload.new_points);
                this.updateKindnessDisplay(payload.post_id, payload.new_points);
            } catch (err) {
                console.debug('[KINDNESS-CLIENT] storage handler error:', err);
            }
        });

        // BroadcastChannel fallback for more reliable cross-tab messaging
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                this._bc = new BroadcastChannel('jeet_kindness');
                this._bc.addEventListener('message', (event) => {
                    try {
                        const payload = event.data;
                        console.debug('[KINDNESS-CLIENT] BroadcastChannel message received', payload);
                        if (!payload || !payload.post_id || typeof payload.new_points === 'undefined' || !payload.ts) return;
                        if (payload.ts <= this._lastAppliedKindnessTs) return;
                        this._lastAppliedKindnessTs = payload.ts;
                        this.updateKindnessDisplay(payload.post_id, payload.new_points);
                    } catch (err) {
                        console.debug('[KINDNESS-CLIENT] BroadcastChannel handler error:', err);
                    }
                });
            }
        } catch (err) {
            console.debug('[KINDNESS-CLIENT] BroadcastChannel init error:', err);
        }
    }
    
    async ensureToken(postId) {
        // Always refresh from sessionStorage in case a token was set after page load
        try {
            const ssToken = sessionStorage.getItem('kindness_token');
            const ssExpiry = sessionStorage.getItem('kindness_token_expiry');
            if (ssToken) this.token = ssToken;
            if (ssExpiry) this.tokenExpiry = ssExpiry;
         } catch (err) {
            console.debug('[KINDNESS-CLIENT] unable to read sessionStorage:', err);
        }

        // Debug logging to help E2E visibility
        console.debug('[KINDNESS-CLIENT] ensureToken start - this.token present?', !!this.token, 'this.tokenExpiry=', this.tokenExpiry);

        // Check if current token is valid
        if (this.token && this.tokenExpiry && Date.now() < parseInt(this.tokenExpiry)) {
            console.debug('[KINDNESS-CLIENT] using existing token from sessionStorage');
            return this.token;
        }

        // Request new token (include postId to satisfy server requirement)
        try {
            // Use query parameter fallback to avoid issues with empty request bodies
            console.log('[KINDNESS-CLIENT] POST /api/kindness/token via query param post_id=', postId);
            const response = await fetch(`/api/kindness/token?post_id=${encodeURIComponent(postId)}`, {
                method: 'POST'
            });
            if (!response.ok) {
                const bodyText = await response.text().catch(() => '<no body>');
                console.error('[KINDNESS-CLIENT] token endpoint returned', response.status, bodyText);
                throw new Error('Token request failed');
            }
            const data = await response.json();
            this.token = data.token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            sessionStorage.setItem('kindness_token', this.token);
            sessionStorage.setItem('kindness_token_expiry', this.tokenExpiry);
            console.log('[KINDNESS-CLIENT] received token, expiry=', this.tokenExpiry);
            return this.token;
        } catch (err) {
            console.error('Failed to get kindness token:', err);
            return null;
        }
    }
    
    /**
 * Optimistic kindness award logic:
 * - Immediately increments badge and animates for fast feedback
 * - Disables button to prevent double-award
 * - On API success: updates badge, broadcasts to other tabs, shows success toast
 * - On error: reverts badge, re-enables button, refocuses for accessibility, shows error toast
 */
    async awardKindness(postId, buttonElement) {
    // Optimistic UI: increment count, animate, disable button
    const countElement = document.querySelector(`[data-kindness-count="${postId}"]`);
    let originalCount = 0;
    if (countElement) {
        const text = (countElement.textContent || '').trim();
        const match = text.match(/(\d+)/);
        originalCount = match ? parseInt(match[1], 10) : 0;
        // Update ARIA live region for screen readers with optimistic announcement
        const liveRegion = document.getElementById('kindness-live');
        if (liveRegion) liveRegion.textContent = `Kindness Given for post ${postId}. New count ${originalCount + 1}`;
        countElement.textContent = `🌈 ${originalCount + 1}`;
        countElement.classList.add('bump');
        setTimeout(() => countElement.classList.remove('bump'), 350);
    }
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.setAttribute('aria-pressed', 'true');
    }
    let token;
     try {
         token = await this.ensureToken(postId);
     } catch {
         showToast('Unable to get kindness token', 'error');
         if (countElement) countElement.textContent = `🌈 ${originalCount}`;
         if (buttonElement) {
             buttonElement.disabled = false;
             buttonElement.setAttribute('aria-pressed', 'false');
         }
         return;
     }
    if (!token) {
        showToast('Unable to get kindness token', 'error');
        if (countElement) countElement.textContent = `🌈 ${originalCount}`;
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.setAttribute('aria-pressed', 'false');
        }
        return;
    }
    try {
        const response = await fetch(`/api/kindness/redeem?post_id=${encodeURIComponent(postId)}&token=${encodeURIComponent(token)}`, {
            method: 'POST'
        });
        const data = await response.json();
        if (response.ok && data.success) {
            this.updateKindnessDisplay(postId, data.new_points);
            // Broadcast to other open tabs/windows via localStorage
            try {
                const payload = { post_id: postId, new_points: data.new_points, ts: Date.now() };
                try {
                    localStorage.setItem('jeet_kindness_update', JSON.stringify(payload));
                    if (this._bc) {
                        this._bc.postMessage(payload);
                    }
                    setTimeout(() => {
                        try {
                            localStorage.removeItem('jeet_kindness_update');
                        } catch (remErr) {
                            console.debug('[KINDNESS-CLIENT] error removing kindness broadcast key:', remErr);
                        }
                    }, 200);
                } catch (err) {
                    console.debug('[KINDNESS-CLIENT] unable to write kindness broadcast to localStorage:', err);
                }
            } catch (err) {
                console.debug('[KINDNESS-CLIENT] unable to write kindness broadcast to localStorage:', err);
            }
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.setAttribute('aria-pressed', 'true');
            }
            sessionStorage.removeItem('kindness_token');
            sessionStorage.removeItem('kindness_token_expiry');
            this.token = null;
            showToast('Kindness Given!', 'success');
        } else {
            showToast(data.error || 'Failed to award kindness', 'error');
            if (countElement) countElement.textContent = `🌈 ${originalCount}`;
 if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.setAttribute('aria-pressed', 'false');
            // Accessibility: refocus button on error for keyboard users
            if (typeof buttonElement.focus === 'function') buttonElement.focus();
        }
        }
    } catch (error) {
        console.error('Failed to award kindness:', error);
        showToast('Network error', 'error');
        if (countElement) countElement.textContent = `🌈 ${originalCount}`;
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.setAttribute('aria-pressed', 'false');
        }
    }
}


    
    updateKindnessDisplay(postId, newCount) {
        const countElement = document.querySelector(`[data-kindness-count="${postId}"]`);
        if (countElement) {
            // Coerce to explicit numeric value and avoid 'undefined' or non-numeric strings
            const displayKp = Number.isFinite(Number(newCount)) ? Number(newCount) : 0;
            // Keep display format consistent with initial render: emoji + number
            countElement.textContent = `🌈 ${displayKp}`;
            // Announce change to offscreen live region for screen readers
            try {
                const liveRegion = document.getElementById('kindness-live');
                if (liveRegion) {
                    liveRegion.textContent = `Kindness count for post ${postId} is now ${displayKp}`;
                }
             } catch {
                 console.debug('[KINDNESS-CLIENT] updateKindnessDisplay aria announcement failed');
             }
        }
    }
}

// Initialize kindness manager
const kindnessManager = new KindnessManager();

// Accessible tooltip implementation and first-time toast explaining 🌈 points
(function setupKindnessUxExtras() {
  // Tooltip element (re-used)
  const tooltip = document.createElement('div');
  tooltip.className = 'kindness-tooltip';
  tooltip.setAttribute('role','tooltip');
  document.body.appendChild(tooltip);

  let tooltipTimeout = null;
  function showTooltipFromElement(el) {
    try {
      const text = el.dataset && el.dataset.tooltip ? el.dataset.tooltip : el.getAttribute('aria-label') || 'Award kindness';
      tooltip.textContent = text;
      const rect = el.getBoundingClientRect();
      // Position above the element centered
      const left = rect.left + (rect.width/2) - (tooltip.offsetWidth/2);
      const top = rect.top - tooltip.offsetHeight - 8;
      tooltip.style.left = Math.max(8, left) + 'px';
      tooltip.style.top = Math.max(8, top) + 'px';
      tooltip.classList.add('show');
      if (tooltipTimeout) clearTimeout(tooltipTimeout);
      // Auto-hide after 2.5s
      tooltipTimeout = setTimeout(() => tooltip.classList.remove('show'), 2500);
    } catch (err) {
      console.debug('[KINDNESS-UX] showTooltip error', err);
    }
  }
  function hideTooltip() { tooltip.classList.remove('show'); }

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest && e.target.closest('.kindness-btn');
    if (el) showTooltipFromElement(el);
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest && e.target.closest('.kindness-btn');
    if (el) showTooltipFromElement(el);
  });
  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest && e.target.closest('.kindness-btn');
    if (el) hideTooltip();
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target.closest && e.target.closest('.kindness-btn');
    if (el) hideTooltip();
  });

  // First-time toast: explain 🌈 points and cross-tab behavior
  try {
    if (!sessionStorage.getItem('jeet_kindness_toast_shown')) {
      // Show toast once after a small delay so it doesn't compete with page load
      setTimeout(() => {
        showToast('Kindness points (🌈) are shared across open tabs. Awarding grants 1 🌈 point to the post.', '', 6000);
        sessionStorage.setItem('jeet_kindness_toast_shown', '1');
      }, 1500);
    }
  } catch (err) {
    console.debug('[KINDNESS-UX] first-time toast failed', err);
  }
})();


document.addEventListener('DOMContentLoaded', function() {
    // Delegated click handler: support clicks on the icon/span inside the button
    document.addEventListener('click', function(e) {
        // Walk up the DOM to find the kindness button if inner element clicked
        let target = e.target;
        while (target && target !== document.body) {
            if (target.classList && target.classList.contains('kindness-btn')) break;
            target = target.parentNode;
        }
        if (target && target.classList && target.classList.contains('kindness-btn')) {
            const postId = parseInt(target.dataset.postId, 10);
            if (!Number.isFinite(postId)) return;
            kindnessManager.awardKindness(postId, target);
        }
    });
});

// Emoji Picker Integration
function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

window.addEventListener('DOMContentLoaded', function() {
  const emojiBtn = document.getElementById('emoji-btn');
  const emojiPicker = document.getElementById('emoji-picker');
  const textarea = document.getElementById('message');

  // Hide emoji button and 'Post on Enter' toggle on mobile devices
  if (isMobileDevice()) {
    if (emojiBtn) emojiBtn.style.display = 'none';
    if (emojiPicker) emojiPicker.style.display = 'none';
    const enterToggleLabel = document.querySelector('.toggle-switch');
    if (enterToggleLabel) enterToggleLabel.style.display = 'none';
    return;
  }

  // Position picker above button to avoid covering post button
  function positionPicker() {
    const rect = emojiBtn.getBoundingClientRect();
    emojiPicker.style.left = rect.left + 'px';
    emojiPicker.style.top = (rect.top + window.scrollY - 10) + 'px';
    emojiPicker.style.transform = 'translateY(-100%)';
  }

  emojiBtn.addEventListener('click', function(e) {
    e.preventDefault();
    positionPicker();
    emojiPicker.style.display = 'block';
  });

  emojiPicker.addEventListener('emoji-click', function(event) {
    const emoji = event.detail.unicode;
    // Insert emoji at cursor position
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.slice(0, start) + emoji + value.slice(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    emojiPicker.style.display = 'none';
  });

   // Hide picker if clicking outside
   document.addEventListener('click', function(e) {
     if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
       emojiPicker.style.display = 'none';
     }
   });
 });

 // View Toggle
 function setupViewToggle() {
   const recentBtn = document.getElementById('view-toggle-recent');
   const topBtn = document.getElementById('view-toggle-top');
   if (!recentBtn || !topBtn) return;

   function setActive(view) {
     if (view === 'top') {
       recentBtn.classList.remove('active');
       topBtn.classList.add('active');
       recentBtn.setAttribute('aria-selected', 'false');
       topBtn.setAttribute('aria-selected', 'true');
       recentBtn.setAttribute('tabindex', '-1');
       topBtn.setAttribute('tabindex', '0');
       topBtn.focus();
     } else {
       recentBtn.classList.add('active');
       topBtn.classList.remove('active');
       recentBtn.setAttribute('aria-selected', 'true');
       topBtn.setAttribute('aria-selected', 'false');
       recentBtn.setAttribute('tabindex', '0');
       topBtn.setAttribute('tabindex', '-1');
       recentBtn.focus();
     }
   }

   recentBtn.addEventListener('click', function() {
     if (currentView !== 'latest') {
       currentView = 'latest';
       setActive('latest');
       // Update URL
       const url = new URL(window.location);
       url.searchParams.delete('view');
       window.history.pushState({}, '', url);
       // Refetch feed
       fetchFeedPage(currentPage);
     }
   });

   topBtn.addEventListener('click', function() {
     if (currentView !== 'top') {
       currentView = 'top';
       setActive('top');
       // Update URL
       const url = new URL(window.location);
       url.searchParams.set('view', 'top');
       window.history.pushState({}, '', url);
       // Refetch feed
       fetchFeedPage(currentPage);
     }
   });

   // Keyboard navigation
   const tabs = [recentBtn, topBtn];
   tabs.forEach((btn, index) => {
     btn.addEventListener('keydown', function(e) {
       if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
         e.preventDefault();
         const nextIndex = e.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : (index + 1) % tabs.length;
         tabs[nextIndex].focus();
         tabs[nextIndex].click();
       }
     });
   });
 }

 // On page load, check URL for view
 window.addEventListener('DOMContentLoaded', function() {
   const urlParams = new URLSearchParams(window.location.search);
   const viewParam = urlParams.get('view');
   if (viewParam === 'top') {
     currentView = 'top';
   }
   setupViewToggle();
 });


// Bootstrap: ensure setup functions run even if DOMContentLoaded fired before script execution
(function bootstrap() {
  function safeCall(fn) {
    try {
      if (typeof fn === 'function') fn();
   } catch (err) {
    console.debug('[main.js] bootstrap safeCall error', err);
  }
  }

   const runSetupNow = () => {
     console.debug('[main.js] bootstrap - running setup functions');
     safeCall(setupEnterToPost);
     safeCall(setupCharacterCounter);
     safeCall(setupViewToggle);
     // Ensure feed is loaded and polling started
     safeCall(() => fetchFeedPage(1));
     safeCall(startLiveFeedPolling);
   };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // DOMContentLoaded may have already fired; run setups immediately
    setTimeout(runSetupNow, 0);
  } else {
    window.addEventListener('DOMContentLoaded', runSetupNow);
  }
})();
