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

// Initial load
window.addEventListener('DOMContentLoaded', () => {
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
    const resp = await fetch(`/api/posts?page=1&limit=${pageLimit}`);
    const data = await resp.json();
    const newPosts = data.posts;
    // Debug: log incoming posts payload for E2E visibility
    try { console.debug('[LiveFeed] /api/posts payload', newPosts); } catch(e) {}
    const feed = document.getElementById('feed');
    const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
    // Get existing post IDs in DOM
    const existingIds = Array.from(feed.children).map(node => node.dataset && node.dataset.id);
    let inserted = false;
newPosts.forEach((post, i) => {
      const postIdStr = post.id.toString();
        // Defensive normalization of incoming post object
        // Ensure kindness_points is a finite number; otherwise coerce to 0
        if (typeof post.kindness_points !== 'number' || !Number.isFinite(post.kindness_points)) {
          const coerced = Number(post.kindness_points);
          post.kindness_points = Number.isFinite(coerced) ? coerced : 0;
        }

        if (!existingIds.includes(postIdStr)) {
        // Create post node
        const div = document.createElement('div');
        div.className = 'post new-post';
        div.style.animation = 'fadeIn 1s';
        div.style.borderLeft = `6px solid ${accentColors[i % accentColors.length]}`;
        div.setAttribute('data-id', post.id);
        // Compute an explicit numeric kindness value to avoid rendering non-numeric values
        const displayKp = Number.isFinite(Number(post.kindness_points)) ? Number(post.kindness_points) : 0;
        div.innerHTML = `
          <span class="username" style="color:${accentColors[i % accentColors.length]}">${post.username}</span>
undefined
    // Animate new posts
    if (inserted) {
      // Optionally, preserve scroll position if user is not at top
      if (window.scrollY > 0) {
        // Show "New posts available" banner
        showNewPostsBanner();
      }
    }
  } catch {
    console.log('[LiveFeed] Butter-smooth update error');
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
    const resp = await fetch(`/api/posts?page=${page}&limit=${pageLimit}`);
    const data = await resp.json();
    const posts = data.posts;
    // Debug: log incoming posts payload for E2E visibility
    try { console.debug('[FetchFeed] /api/posts payload', posts); } catch(e) {}
    const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
    // Remove skeleton loader and show posts
    // Defensive normalization of posts array to ensure kindness_points is numeric
    const normalizedPosts = posts.map(p => {
      try {
        if (typeof p.kindness_points !== 'number' || !Number.isFinite(p.kindness_points)) {
          const coerced = Number(p.kindness_points);
          p.kindness_points = Number.isFinite(coerced) ? coerced : 0;
        }
      } catch (e) {
        p.kindness_points = 0;
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
             <button class="kindness-btn rainbow-btn" data-post-id="${post.id}">Kindness +1</button>
             <span class="kindness-count" data-kindness-count="${post.id}">🌈 ${displayKp}</span>
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
  } catch {
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
  } catch {
    errorDiv.textContent = 'Network error.';
  }
}

document.getElementById('post-form').addEventListener('submit', postMessage);
// window.addEventListener('DOMContentLoaded', fetchFeed); // Disabled to prevent feed overwrite

// Enter to Post Toggle Integration
function setupEnterToPost() {
  const textarea = document.getElementById('message');
  const enterToggle = document.getElementById('enter-to-post');
  const postForm = document.getElementById('post-form');

  textarea.addEventListener('keydown', function(e) {
    if (
      enterToggle && enterToggle.checked &&
      e.key === 'Enter' && !e.shiftKey && !e.ctrlKey
    ) {
      e.preventDefault();
      postForm.requestSubmit();
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
        document.getElementById('post-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  });
}

window.addEventListener('DOMContentLoaded', setupCharacterCounter);

// Kindness Points Manager
class KindnessManager {
    constructor() {
        this.token = sessionStorage.getItem('kindness_token');
        this.tokenExpiry = sessionStorage.getItem('kindness_token_expiry');
        this._lastAppliedKindnessTs = 0; // timestamp of last applied storage event
        console.log('[KINDNESS-CLIENT] constructor - initial token present?', !!this.token, 'expiry=', this.tokenExpiry);

        // Listen for cross-tab kindness updates broadcast via localStorage
        window.addEventListener('storage', (e) => {
            try {
                // Log raw event for E2E debugging
                console.debug('[KINDNESS-CLIENT] storage event received', { key: e.key, newValue: e.newValue, oldValue: e.oldValue });
                if (!e.key || e.key !== 'jeet_kindness_update') return;
                // If the key was removed (newValue === null) ignore the removal event
                if (e.newValue === null) {
                    console.debug('[KINDNESS-CLIENT] storage event: key removed, ignoring');
                    return;
                }
                const payload = JSON.parse(e.newValue);
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
                this._bc.addEventListener('message', (ev) => {
                    try {
                        const payload = ev.data;
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
        } catch (e) {
            console.debug('[KINDNESS-CLIENT] unable to read sessionStorage:', e);
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
        } catch (error) {
            console.error('Failed to get kindness token:', error);
            return null;
        }
    }
    
    async awardKindness(postId, buttonElement) {
        const token = await this.ensureToken(postId);
        if (!token) {
            alert('Unable to get kindness token');
            return;
        }
        try {
            // Redeem via query params as fallback to avoid body parsing issues
            console.log('[KINDNESS-CLIENT] POST /api/kindness/redeem via query params post_id=', postId);
            const response = await fetch(`/api/kindness/redeem?post_id=${encodeURIComponent(postId)}&token=${encodeURIComponent(token)}`, {
                method: 'POST'
            });
            const data = await response.json();
            if (response.ok && data.success) {
                // Update UI optimistically
                this.updateKindnessDisplay(postId, data.new_points);
                // Broadcast to other open tabs/windows via localStorage
                try {
                    const payload = { post_id: postId, new_points: data.new_points, ts: Date.now() };
                    // Use setItem -> removeItem trick to ensure storage event fires across browsers and for repeated identical payloads
                        try {
                        localStorage.setItem('jeet_kindness_update', JSON.stringify(payload));
                        // Also post via BroadcastChannel if available for immediate delivery
                        try {
                            if (this._bc) {
                                this._bc.postMessage(payload);
                            }
                        } catch (bcErr) {
                            console.debug('[KINDNESS-CLIENT] BroadcastChannel post error:', bcErr);
                        }
                        // Small timeout to allow other tabs to receive the set event, then remove to allow future identical payloads
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

                // Update button state in this tab only
                if (buttonElement) {
                    buttonElement.disabled = true;
                    buttonElement.textContent = 'Kindness Given!';
                }

                // Clear used token
                sessionStorage.removeItem('kindness_token');
                sessionStorage.removeItem('kindness_token_expiry');
                this.token = null;
            } else {
                alert(data.error || 'Failed to award kindness');
            }
        } catch (error) {
            console.error('Failed to award kindness:', error);
            alert('Network error');
        }
    }
    
    updateKindnessDisplay(postId, newCount) {
        const countElement = document.querySelector(`[data-kindness-count="${postId}"]`);
        if (countElement) {
            // Coerce to explicit numeric value and avoid 'undefined' or non-numeric strings
            const displayKp = Number.isFinite(Number(newCount)) ? Number(newCount) : 0;
            // Keep display format consistent with initial render: emoji + number
            countElement.textContent = `🌈 ${displayKp}`;
        }
    }
}

// Initialize kindness manager
const kindnessManager = new KindnessManager();

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
        if (e.target.classList && e.target.classList.contains('kindness-btn')) {
            const postId = parseInt(e.target.dataset.postId);
            kindnessManager.awardKindness(postId, e.target);
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

