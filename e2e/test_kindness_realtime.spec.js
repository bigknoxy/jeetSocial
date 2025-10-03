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
    test.setTimeout(120000); // increase timeout for this E2E scenario

    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    // Attach console and network listeners early to capture client logs
    pageA.on('console', msg => console.log('[PAGE A console]', msg.text()));
    pageB.on('console', msg => console.log('[PAGE B console]', msg.text()));

    pageA.on('request', req => {
      if (req.url().includes('/api/kindness')) console.log('[PAGE A request]', req.method(), req.url());
    });
    pageB.on('request', req => {
      if (req.url().includes('/api/kindness')) console.log('[PAGE B request]', req.method(), req.url());
    });

    pageA.on('response', async resp => {
      if (resp.url().includes('/api/kindness')) {
        console.log('[PAGE A response]', resp.status(), resp.url());
        try {
          const json = await resp.json();
          console.log('[PAGE A response body]', JSON.stringify(json));
        } catch (e) {
          console.log('[PAGE A response body] could not parse JSON');
        }
      }
    });
    pageB.on('response', async resp => {
      if (resp.url().includes('/api/kindness')) {
        console.log('[PAGE B response]', resp.status(), resp.url());
        try {
          const json = await resp.json();
          console.log('[PAGE B response body]', JSON.stringify(json));
        } catch (e) {
          console.log('[PAGE B response body] could not parse JSON');
        }
      }
    });

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
    await pageA.waitForSelector(`[data-id="${postId}"]`, { timeout: 7000 });
    await pageB.waitForSelector(`[data-id="${postId}"]`, { timeout: 7000 });

    // Read initial kindness counts on both pages (avoid assuming they are identical)
    const initialTextA = await pageA.locator(`[data-kindness-count="${postId}"]`).innerText();
    const initialCountA = parseInt(initialTextA.replace(/[^0-9]/g, '')) || 0;
    const initialTextB = await pageB.locator(`[data-kindness-count="${postId}"]`).innerText();
    const initialCountB = parseInt(initialTextB.replace(/[^0-9]/g, '')) || 0;
    console.log('[INITIAL COUNTS]', { postId, initialCountA, initialCountB });

    // On page A: request token for the post and store it in sessionStorage for pageA
    const tokenResp = await pageA.request.post('http://localhost:5000/api/kindness/token', {
      data: JSON.stringify({ post_id: postId }),
      headers: { 'Content-Type': 'application/json' }
    });
    const tokenData = await tokenResp.json();
    await pageA.evaluate(({ t, e }) => {
      sessionStorage.setItem('kindness_token', t);
      sessionStorage.setItem('kindness_token_expiry', String(Date.now() + (e * 1000)));
    }, { t: tokenData.token, e: tokenData.expires_in });

    // Confirm sessionStorage token is present before clicking
    const stored = await pageA.evaluate(() => ({
      token: sessionStorage.getItem('kindness_token'),
      expiry: sessionStorage.getItem('kindness_token_expiry')
    }));
    console.log('[SESSIONSTORAGE]', stored);

    // Inspect button state prior to clicking
    const buttonInfo = await pageA.evaluate((id) => {
      const btn = document.querySelector(`button[data-post-id="${id}"]`);
      if (!btn) return { found: false };
      return { found: true, disabled: btn.disabled, text: btn.innerText };
    }, postId);
    console.log('[BUTTON BEFORE CLICK]', buttonInfo);

    // Click kindness button on pageA
    await pageA.locator(`button[data-post-id="${postId}"]`).click();

    // Wait for the server redeem response to ensure backend processed the kindness award and log it
    try {
      const redeemResp = await pageA.waitForResponse(resp => resp.url().includes('/api/kindness/redeem'), { timeout: 10000 });
      console.log('[OBSERVED redeem response] status=', redeemResp.status(), 'url=', redeemResp.url());
      try {
        const json = await redeemResp.json();
        console.log('[redeem body]', JSON.stringify(json));
      } catch (e) {
        console.log('[redeem body] could not parse as JSON');
      }
    } catch (err) {
      console.log('Did not observe redeem response within timeout, proceeding to UI checks');
    }

    // Short pause and immediate diagnostics to see current DOM state on pageA
    await pageA.waitForTimeout(200);
    const immediateA = await pageA.locator(`[data-kindness-count="${postId}"]`).innerText().catch(() => null);
    console.log('[IMMEDIATE PAGE A COUNT]', immediateA);
    const immediateHtml = await pageA.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? el.outerHTML : null;
    }, `[data-kindness-count="${postId}"]`);
    console.log('[IMMEDIATE PAGE A OUTERHTML]', immediateHtml);
    const btnStateAfter = await pageA.evaluate((id) => {
      const b = document.querySelector(`button[data-post-id="${id}"]`);
      return b ? { disabled: b.disabled, ariaPressed: b.getAttribute('aria-pressed'), innerHTML: b.innerHTML } : null;
    }, postId);
    console.log('[BUTTON AFTER CLICK]', btnStateAfter);

    // Wait for pageA optimistic/UI update by checking its own kindness count increased
    const expectedA = initialCountA + 1;
    await expect(pageA.locator(`[data-kindness-count="${postId}"]`)).toContainText(String(expectedA), { timeout: 20000 });
    console.log('[PAGE A] observed expected kindness count >=', expectedA);

    // On pageB: wait for kindness count to increase without reload (allow more time for cross-tab propagation)
    const expectedB = initialCountB + 1;
    await expect(pageB.locator(`[data-kindness-count="${postId}"]`)).toContainText(String(expectedB), { timeout: 20000 });
    console.log('[PAGE B] observed expected kindness count >=', expectedB);

    // Final assertion
    const finalText = await pageB.locator(`[data-kindness-count="${postId}"]`).innerText();
    const finalCount = parseInt(finalText.replace(/[^0-9]/g, '')) || 0;
    console.log('[FINAL COUNTS]', { postId, finalCount });
    expect(finalCount).toBeGreaterThanOrEqual(expectedB);

    await context.close();
  }, { timeout: 120000 });
});
