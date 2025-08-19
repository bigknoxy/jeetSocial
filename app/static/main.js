let latestTimestamp = null;

async function fetchFeed(initial = false) {
  const feed = document.getElementById('feed');
  if (initial) feed.innerHTML = '<em>Loading...</em>';
  try {
    let url = '/api/posts';
    if (!initial && latestTimestamp) {
      url += `?since=${encodeURIComponent(latestTimestamp)}`;
    }
    const resp = await fetch(url);
    const posts = await resp.json();
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
            <div class="post new-post" style="border-left: 6px solid ${color}; animation: fadeIn 1s;">
              <span class="username" style="color:${color}">${post.username}</span>
              <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
              <div>${escapeHtml(post.message)}</div>
            </div>
          `;
        }).join('');
        feed.insertAdjacentHTML('afterbegin', newPostsHtml);
      }
    }
  } catch (e) {
    if (initial) feed.innerHTML = '<em>Error loading feed.</em>';
  }
}

// Initial load
window.addEventListener('DOMContentLoaded', () => fetchFeed(true));

// Poll for new posts every 15 seconds
setInterval(() => fetchFeed(false), 15000);

// Optional: highlight new posts
const style = document.createElement('style');
style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .new-post { background: #23232b; box-shadow: 0 0 8px #ffe347; }`;
document.head.appendChild(style);


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
      fetchFeed();
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
window.addEventListener('DOMContentLoaded', fetchFeed);

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

