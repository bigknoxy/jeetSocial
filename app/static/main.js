async function fetchFeed() {
  const feed = document.getElementById('feed');
  feed.innerHTML = '<em>Loading...</em>';
  try {
    const resp = await fetch('/api/posts');
    const posts = await resp.json();
    const accentColors = ["#ff4b5c", "#ffb26b", "#ffe347", "#43e97b", "#3fa7d6", "#7c4dff", "#c86dd7"];
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
  } catch (e) {
    feed.innerHTML = '<em>Error loading feed.</em>';
  }
}

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
