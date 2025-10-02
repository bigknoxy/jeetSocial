// E2E: Kindness real-time updates between two pages
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

test.describe('Kindness real-time', () => {
  test('updates kindness on other page without reload', async ({ browser }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();

    const pageB = await context.newPage();

    // Ensure the app is reachable
    await pageA.goto('http://localhost:5000');
    await pageB.goto('http://localhost:5000');

    // Create a deterministic post via direct API on page A
    const postId = await (async () => {
      const resp = await pageA.request.post('http://localhost:5000/api/posts', {
        data: JSON.stringify({ message: 'E2E kindness realtime test ' + Date.now() }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await resp.json();
      return (data && data.post && data.post.id) ? data.post.id : (data && data.id ? data.id : null);
    })();

    // Trigger feed refresh on both pages so the newly created post is rendered immediately
    await pageA.evaluate(() => { if (window.fetchFeedPage) fetchFeedPage(1); });
    await pageB.evaluate(() => { if (window.fetchFeedPage) fetchFeedPage(1); });
    // Wait until both pages have the post rendered
    await pageA.waitForSelector(`[data-id="${postId}"]`, { timeout: 5000 });
    await pageB.waitForSelector(`[data-id="${postId}"]`, { timeout: 5000 });

    // Read initial kindness count on page B
    const initialText = await pageB.locator(`[data-kindness-count="${postId}"]`).innerText();
    const initialCount = parseInt(initialText.replace(/[^0-9]/g, '')) || 0;

    // On page A: request token and click kindness button
    // Request token via API to ensure token is set in sessionStorage for pageA
    const tokenResp = await pageA.request.post('http://localhost:5000/api/kindness/token', {
      data: JSON.stringify({ post_id: postId }),
      headers: { 'Content-Type': 'application/json' }
    });
    const tokenData = await tokenResp.json();
    // Store token in pageA's sessionStorage for client flow
    await pageA.evaluate(({ t, e }) => {
      sessionStorage.setItem('kindness_token', t);
      sessionStorage.setItem('kindness_token_expiry', String(Date.now() + (e * 1000)));
    }, { t: tokenData.token, e: tokenData.expires_in });

    // Click kindness button on pageA
    await pageA.locator(`button[data-post-id="${postId}"]`).click();

    // Wait for pageA optimistic UI update
    await pageA.waitForSelector(`text=Kindness Given!`, { timeout: 3000 });

    // On pageB: wait for kindness count to increase without reload
    const expected = initialCount + 1;
    await pageB.waitForFunction((selector, expected) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const n = parseInt(el.textContent.replace(/[^0-9]/g, '')) || 0;
      return n >= expected;
    }, `[data-kindness-count="${postId}"]`, expected, { timeout: 5000 });

    // Final assertion
    const finalText = await pageB.locator(`[data-kindness-count="${postId}"]`).innerText();
    const finalCount = parseInt(finalText.replace(/[^0-9]/g, '')) || 0;
    expect(finalCount).toBeGreaterThanOrEqual(expected);

    await contextA.close();
    await contextB.close();
  });
});
