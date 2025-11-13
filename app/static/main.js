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

// Wait for modules to be loaded by module-bootstrap
function waitForModules() {
  return new Promise((resolve) => {
    const checkModules = () => {
      if (typeof window.kindnessManager !== 'undefined') {
        console.debug('[main.js] Modules loaded, proceeding');
        resolve();
      } else {
        console.debug('[main.js] Waiting for modules...');
        setTimeout(checkModules, 100);
      }
    };
    checkModules();
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  console.debug('[main.js] DOMContentLoaded - waiting for modules');
  await waitForModules();
  console.debug('[main.js] Modules ready - initializing WebSocket and fetching feed');
  
  // NOTE: WebSocket management is now handled exclusively by FeedManager
  // This prevents race conditions and connection interference
  console.log('[main.js] WebSocket management delegated to FeedManager');
  
  fetchFeedPage(1);
  // Note: startLiveFeedPolling() will be replaced by WebSocket updates
});

// WebSocket-based new post handler (replaces polling)
function handleNewPostFromWebSocket(post) {
  // Only handle new posts if we're on page 1 (latest view)
  if (currentPage !== 1 || currentView !== 'latest') return;
  
  const feed = document.getElementById('feed');
  if (!feed) return;
  
  // Check if post already exists
  const existingPost = feed.querySelector(`[data-id="${post.id}"]`);
  if (existingPost) return;
  
  const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
  const colorIndex = Math.floor(Math.random() * accentColors.length);
  
  // Defensive normalization of incoming post object
  if (typeof post.kindness_points !== 'number' || !Number.isFinite(post.kindness_points)) {
    const coerced = Number(post.kindness_points);
    post.kindness_points = Number.isFinite(coerced) ? coerced : 0;
  }
  
  const displayKp = Number.isFinite(Number(post.kindness_points)) ? Number(post.kindness_points) : 0;
  
  // Create post node
  const div = document.createElement('div');
  div.className = 'post new-post';
  div.style.animation = 'fadeIn 1s';
  div.style.borderLeft = `6px solid ${accentColors[colorIndex]}`;
  div.setAttribute('data-id', post.id);
  
  div.innerHTML = `
    <span class="username" style="color:${accentColors[colorIndex]}">${post.username}</span>
    <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
    <div class="post-content">${escapeHtml(post.message)}</div>
    <div class="kindness-row">
      <span class="kindness-badge kindness-count" data-kindness-count="${post.id}" aria-live="polite">🌈 ${displayKp}</span>
      <button class="kindness-btn kindness-icon-btn" data-post-id="${post.id}" aria-label="Award kindness to this post" aria-pressed="false" data-tooltip="Award kindness (gives 1 kindness point)"><span class="icon" aria-hidden="true">❤️</span></button>
    </div>
  `;
  
  // Prepend newest post to top of feed
  try {
    feed.insertBefore(div, feed.firstChild);
  } catch {
    feed.appendChild(div);
  }
  
  // Show new posts banner if user is not at top
  if (window.scrollY > 0) {
    showNewPostsBanner();
  }
  
  // NOTE: WebSocket room management is now handled by FeedManager
  // This prevents race conditions between multiple WebSocket managers
}

// Polling fallback function when WebSocket fails
let pollingInterval = null;

function startLiveFeedPolling() {
  // Stop any existing polling
  stopLiveFeedPolling();
  
  console.log('[LiveFeed] Starting HTTP polling fallback');
  
  // Poll every 15 seconds
  pollingInterval = setInterval(async () => {
    // Only poll when on first page of latest view
    if (currentPage !== 1 || currentView !== 'latest') {
      return;
    }

    try {
      // Get the most recent post from the current feed
      const feed = document.getElementById('feed');
      if (!feed || !feed.firstChild) {
        return;
      }

      const firstPost = feed.firstChild;
      // Ensure firstPost is an element with getAttribute method
      if (!firstPost || typeof firstPost.getAttribute !== 'function') {
        return;
      }
      const firstPostId = firstPost.getAttribute('data-id');
      if (!firstPostId) {
        return;
      }

      // Fetch latest posts
      const resp = await fetch('/api/posts?page=1&limit=5');
      const data = await resp.json();
      const latestPosts = data.posts || [];

      // Check for new posts
      const newPosts = latestPosts.filter(post => {
        // Check if this post is newer than our first post
        const firstPostTime = new Date(firstPost.querySelector('.timestamp')?.textContent || 0).getTime();
        const postTime = new Date(post.timestamp).getTime();
        return postTime > firstPostTime && post.id !== firstPostId;
      });

      // Process new posts
      if (newPosts.length > 0) {
        console.log(`[LiveFeed] Found ${newPosts.length} new posts via polling`);
        
        const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
        
        // Add new posts to the beginning of the feed
        newPosts.reverse().forEach(post => {
          // Defensive normalization of incoming post object
          if (typeof post.kindness_points !== 'number' || !Number.isFinite(post.kindness_points)) {
            const coerced = Number(post.kindness_points);
            post.kindness_points = Number.isFinite(coerced) ? coerced : 0;
          }
          
          const displayKp = Number.isFinite(Number(post.kindness_points)) ? Number(post.kindness_points) : 0;
          const colorIndex = Math.floor(Math.random() * accentColors.length);
          
          // Create post node
          const div = document.createElement('div');
          div.className = 'post new-post';
          div.style.animation = 'fadeIn 1s';
          div.style.borderLeft = `6px solid ${accentColors[colorIndex]}`;
          div.setAttribute('data-id', post.id);
          
          div.innerHTML = `
            <span class="username" style="color:${accentColors[colorIndex]}">${post.username}</span>
            <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
            <div class="post-content">${escapeHtml(post.message)}</div>
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
        });

        // Show new posts banner if user is not at top
        if (window.scrollY > 0) {
          showNewPostsBanner();
        }
      }
    } catch (error) {
      console.error('[LiveFeed] Error polling for new posts:', error);
    }
  }, 15000); // Poll every 15 seconds
}

function stopLiveFeedPolling() {
  if (pollingInterval) {
    console.log('[LiveFeed] Stopping HTTP polling');
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// butterSmoothLiveUpdate() replaced by WebSocket handleNewPostFromWebSocket()


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

// stopLiveFeedPolling() no longer needed - WebSocket handles real-time updates


// Paging controls
function renderPagingControls() {
  // NOTE: WebSocket room management is now handled by FeedManager
  // This prevents race conditions between multiple WebSocket managers

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
     
      // NOTE: WebSocket room management is now handled by FeedManager
      // This prevents race conditions between multiple WebSocket managers
     
     // Initialize KindnessManager subscriptions for visible posts
     if (typeof window.kindnessManager !== 'undefined') {
       setTimeout(() => {
         try {
           window.kindnessManager.subscribeToVisiblePosts();
         } catch (err) {
           console.debug('[main.js] Failed to initialize KindnessManager subscriptions', err);
         }
       }, 100);
     }
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
      
      // For page 1, WebSocket will handle the new post automatically
      // For other pages, refresh the current page
      if (currentPage !== 1) {
        fetchFeedPage(currentPage);
      }
      // Note: butterSmoothLiveUpdate() is no longer needed - WebSocket handles real-time updates
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

// Toast notification helper (used by new TypeScript KindnessManager)
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
            
            // Use new TypeScript KindnessManager if available
            console.debug('[main.js] KindnessManager available?', typeof window.kindnessManager !== 'undefined');
            if (typeof window.kindnessManager !== 'undefined') {
                try {
                    console.debug('[main.js] Using existing KindnessManager');
                    window.kindnessManager.awardKindness(postId.toString(), target);
                } catch (err) {
                    console.debug('[main.js] Failed to use TypeScript KindnessManager', err);
                    // Fallback to legacy behavior could go here if needed
                }
            } else {
                console.error('[main.js] KindnessManager not available!');
            }
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
      const heading = document.getElementById('feed-heading');
      if (view === 'top') {
        recentBtn.classList.remove('active');
        topBtn.classList.add('active');
        recentBtn.setAttribute('aria-selected', 'false');
        topBtn.setAttribute('aria-selected', 'true');
        recentBtn.setAttribute('tabindex', '-1');
        topBtn.setAttribute('tabindex', '0');
        topBtn.focus();
        if (heading) heading.textContent = 'Top Posts — last 24 hours';
      } else {
        recentBtn.classList.add('active');
        topBtn.classList.remove('active');
        recentBtn.setAttribute('aria-selected', 'true');
        topBtn.setAttribute('aria-selected', 'false');
        recentBtn.setAttribute('tabindex', '0');
        topBtn.setAttribute('tabindex', '-1');
        recentBtn.focus();
        if (heading) heading.textContent = 'Recent Posts';
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
     // Ensure feed is loaded (WebSocket handles real-time updates)
     safeCall(() => fetchFeedPage(1));
     // Note: startLiveFeedPolling() replaced by WebSocket
   };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // DOMContentLoaded may have already fired; run setups immediately
    setTimeout(runSetupNow, 0);
  } else {
    window.addEventListener('DOMContentLoaded', runSetupNow);
  }
})();
