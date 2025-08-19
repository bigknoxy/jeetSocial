let latestTimestamp = null;

async function fetchFeed(initial = false) {
  console.log('[LiveFeed] fetchFeed called. initial:', initial, 'latestTimestamp:', latestTimestamp);

  const feed = document.getElementById('feed');
  if (initial) feed.innerHTML = '<em>Loading...</em>';
  try {
    let url = '/api/posts';
    if (!initial && latestTimestamp) {
      url += `?since=${encodeURIComponent(latestTimestamp)}`;
    }
    console.log('[LiveFeed] Fetching URL:', url);
    const resp = await fetch(url);
    const posts = await resp.json();
    console.log('[LiveFeed] API response:', posts);
    const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
    if (initial) {
      feed.innerHTML = posts.map((post, i) => {
        const color = accentColors[i % accentColors.length];
        return `
          <div class="post" style="border-left: 6px solid ${color};">
            <span class="username" style="color:${color}">${post.username}</span>
            <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
            <div>${escapeHtml(post.message)}</div>
          </div>
        `;
      }).join('');
      if (posts.length > 0) {
        latestTimestamp = posts[0].timestamp;
      }
    } else {
      // Only append new posts
      if (posts.length > 0) {
        latestTimestamp = posts[0].timestamp;
        const newPostsHtml = posts.map((post, i) => {
          const color = accentColors[Math.floor(Math.random() * accentColors.length)];
          return `
            <div class="post new-post" style="border-left: 6px solid ${color}; animation: fadeIn 1s;" data-id="${post.id}">
              <span class="username" style="color:${color}">${post.username}</span>
              <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
              <div>${escapeHtml(post.message)}</div>
            </div>
          `;
        }).join('');
        console.log('[LiveFeed] Inserting new posts:', posts);
        feed.insertAdjacentHTML('afterbegin', newPostsHtml);
      }
    }
  } catch (e) {
    if (initial) feed.innerHTML = '<em>Error loading feed.</em>';
  }
}

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
    const feed = document.getElementById('feed');
    const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
    // Get existing post IDs in DOM
    const existingIds = Array.from(feed.children).map(node => node.dataset && node.dataset.id);
    let inserted = false;
    newPosts.forEach((post, i) => {
      if (!existingIds.includes(post.id.toString())) {
        // Create post node
        const div = document.createElement('div');
        div.className = 'post new-post';
div.style.animation = 'fadeIn 1s';
        div.style.borderLeft = `6px solid ${accentColors[i % accentColors.length]}`;
        div.setAttribute('data-id', post.id);
        div.innerHTML = `
          <span class="username" style="color:${accentColors[i % accentColors.length]}">${post.username}</span>
          <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
          <div>${escapeHtml(post.message)}</div>
        `;
        feed.insertBefore(div, feed.firstChild);
        inserted = true;
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
  } catch (e) {
    console.log('[LiveFeed] Butter-smooth update error:', e);
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
  feed.innerHTML = '<em>Loading...</em>';
  try {
    const resp = await fetch(`/api/posts?page=${page}&limit=${pageLimit}`);
    const data = await resp.json();
    const posts = data.posts;
    const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
    feed.innerHTML = posts.map((post, i) => {
      const color = accentColors[i % accentColors.length];
      return `
        <div class="post" style="border-left: 6px solid ${color};" data-id="${post.id}">
          <span class="username" style="color:${color}">${post.username}</span>
          <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
          <div>${escapeHtml(post.message)}</div>
        </div>
      `;
    }).join('');
// After full reload, remove new-post banner if present
const banner = document.getElementById('new-posts-banner');
if (banner) banner.remove();
    currentPage = data.page;
    totalPages = Math.max(1, Math.ceil(data.total_count / pageLimit));
    renderPagingControls();
  } catch (e) {
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
  return div.innerHTML;
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
      document.getElementById('message').value = '';
      fetchFeedPage(currentPage);
      butterSmoothLiveUpdate();
    } else {
      try {
        const data = await resp.json();
        errorDiv.textContent = data.error || `Error posting (status ${resp.status}).`;
      } catch (err) {
        if (resp.status === 429) {
          errorDiv.textContent = 'You are posting too quickly. Please wait a minute before posting again. This helps keep jeetSocial spam-free and fair for everyone.';
        } else {
          errorDiv.textContent = `Error posting (status ${resp.status}).`;
        }
      }
    }
  } catch (e) {
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


// Emoji Picker Integration
function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

window.addEventListener('DOMContentLoaded', function() {
  const emojiBtn = document.getElementById('emoji-btn');
  const emojiPicker = document.getElementById('emoji-picker');
  const textarea = document.getElementById('message');

  // Hide emoji button on mobile devices
  if (emojiBtn && isMobileDevice()) {
    emojiBtn.style.display = 'none';
    if (emojiPicker) emojiPicker.style.display = 'none';
    return;
  }

  // Position picker below button
  function positionPicker() {
    const rect = emojiBtn.getBoundingClientRect();
    emojiPicker.style.left = rect.left + 'px';
    emojiPicker.style.top = (rect.bottom + window.scrollY) + 'px';
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

