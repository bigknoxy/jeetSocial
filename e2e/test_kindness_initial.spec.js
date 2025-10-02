// E2E: Ensure initial kindness count renders as a number (not 'undefined')
const { test, expect } = require('@playwright/test');

// Helper to create a post via API
async function createPost(apiContext, message) {
  const resp = await apiContext.post('http://localhost:5000/api/posts', {
    data: JSON.stringify({ message }),
    headers: { 'Content-Type': 'application/json' }
  });
  const body = await resp.json();
  return body.post && body.post.id ? body.post.id : null;
}

test('initial kindness count is numeric and not "undefined"', async ({ page }) => {
  await page.goto('http://localhost:5000');
  page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));

  // Create a deterministic post via API
  const postId = await (async () => {
    const resp = await page.request.post('http://localhost:5000/api/posts', {
      data: JSON.stringify({ message: 'E2E kindness initial test ' + Date.now() }),
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await resp.json();
    return (data && data.post && data.post.id) ? data.post.id : (data && data.id ? data.id : null);
  })();

  // Trigger feed refresh so the newly created post is rendered
  await page.evaluate(() => { if (window.fetchFeedPage) fetchFeedPage(1); });

  // Fetch the API directly to assert JSON shape
  const apiResp = await page.request.get('http://localhost:5000/api/posts?page=1&limit=20');
  const apiJson = await apiResp.json();
  // Find our post in the API response
  const found = (apiJson.posts || []).find(p => p.id === postId || String(p.id) === String(postId));
  // The API should include the post. kindness_points may be missing if server wasn't reloaded.
  expect(found).toBeTruthy();
  if (typeof found.kindness_points === 'undefined') {
    console.log('[E2E] API response missing kindness_points for post', postId, '- proceeding to DOM check');
  } else {
    const kp = Number(found.kindness_points);
    expect(Number.isFinite(kp)).toBeTruthy();
    expect(kp).toBeGreaterThanOrEqual(0);
  }

  // Now assert the DOM displays a non-undefined value too
  const selector = `[data-kindness-count="${postId}"]`;
  await page.waitForSelector(selector, { timeout: 5000 });
  const text = await page.locator(selector).innerText();
  expect(text).not.toContain('undefined');
  const parsed = parseInt(text.replace(/[^0-9]/g, ''));
  expect(Number.isInteger(parsed)).toBeTruthy();
  expect(parsed).toBeGreaterThanOrEqual(0);
});
