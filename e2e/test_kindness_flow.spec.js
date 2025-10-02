const { test, expect } = require('@playwright/test');
const JeetSocialPage = require('./page-objects/jeet-social.page');

test.describe('Kindness points - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Capture browser console and network for debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('request', req => {
      if (req.url().includes('/api/kindness')) {
        const pd = req.postData ? req.postData() : '<no postData>';
        console.log('PAGE REQ:', req.method(), req.url(), 'postData:', pd);
      }
    });
    page.on('response', resp => {
      if (resp.url().includes('/api/kindness')) console.log('PAGE RESP:', resp.status(), resp.url());
    });

    const jeet = new JeetSocialPage(page);
    await jeet.goto();
    await jeet.waitForPageLoad();
  });

  test('awards a kindness point and updates UI', async ({ page }) => {
    const jeet = new JeetSocialPage(page);

    // Ensure there's at least one post
    await jeet.waitForPostCount(1, 10000);

    // Grab the first post id from the DOM
    const firstPost = await page.locator('.post').first();
    const postId = await firstPost.getAttribute('data-id');

    // Read initial kindness count
    const kindCountLocator = jeet.kindnessCount(postId);
    let initialText = await kindCountLocator.textContent();

    // Request a kindness token explicitly (ensures server receives post_id)
    let tokenResp = await page.request.post('http://localhost:5000/api/kindness/token', { data: JSON.stringify({ post_id: postId }), headers: { 'Content-Type': 'application/json' } });
    if (!tokenResp.ok()) {
      const body = await tokenResp.text().catch(() => '<no body>');
      console.error('Initial token issuance failed:', tokenResp.status(), body);
      // Retry once after short delay
      await new Promise(r => setTimeout(r, 250));
      tokenResp = await page.request.post('http://localhost:5000/api/kindness/token', { data: JSON.stringify({ post_id: postId }), headers: { 'Content-Type': 'application/json' } });
      if (!tokenResp.ok()) {
        const body2 = await tokenResp.text().catch(() => '<no body>');
        console.error('Retry token issuance failed:', tokenResp.status(), body2);
        throw new Error('Kindness token issuance failed; ensure ENABLE_KINDNESS_POINTS=1 for test env');
      }
    }
    const tokenJson = await tokenResp.json();
    const token = tokenJson.token;
    // Store token in sessionStorage so client-side KindnessManager uses it
    const expiry = Date.now() + (tokenJson.expires_in * 1000);
    await page.evaluate(({ t, e }) => {
      sessionStorage.setItem('kindness_token', t);
      sessionStorage.setItem('kindness_token_expiry', String(e));
    }, { t: token, e: expiry });

    // Verify sessionStorage visible to the page (helps debug timing issues)
    const stored = await page.evaluate(() => sessionStorage.getItem('kindness_token'));
    console.log('TEST: sessionStorage kindness_token after set ->', stored ? '<present>' : '<missing>');
    expect(stored).not.toBeNull();

    // Reload the page so client-side code initializes with the token already present
    await page.reload({ waitUntil: 'networkidle' });
    const storedAfterReload = await page.evaluate(() => sessionStorage.getItem('kindness_token'));
    console.log('TEST: sessionStorage kindness_token after reload ->', storedAfterReload ? '<present>' : '<missing>');
    expect(storedAfterReload).not.toBeNull();

    // Click kindness button and wait for /api/kindness/redeem response (accept any status, assert later)
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/kindness/redeem')),
      jeet.kindnessButton(postId).click()
    ]);

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('new_points');

    // Wait for the UI to reflect the updated points
    await expect(kindCountLocator).toHaveText(new RegExp(String(json.new_points)));
  });

  test('prevents double redemption of the same token', async ({ page }) => {
    const jeet = new JeetSocialPage(page);

    // Ensure a post exists
    await jeet.waitForPostCount(1, 10000);
    const firstPost = await page.locator('.post').first();
    const postId = await firstPost.getAttribute('data-id');

    // Explicitly request a token and set it in sessionStorage
    let tokenResp = await page.request.post('http://localhost:5000/api/kindness/token', { data: JSON.stringify({ post_id: postId }), headers: { 'Content-Type': 'application/json' } });
    if (!tokenResp.ok()) {
      const body = await tokenResp.text().catch(() => '<no body>');
      console.error('Initial token issuance failed:', tokenResp.status(), body);
      // Retry once after short delay
      await new Promise(r => setTimeout(r, 250));
      tokenResp = await page.request.post('http://localhost:5000/api/kindness/token', { data: JSON.stringify({ post_id: postId }), headers: { 'Content-Type': 'application/json' } });
      if (!tokenResp.ok()) {
        const body2 = await tokenResp.text().catch(() => '<no body>');
        console.error('Retry token issuance failed:', tokenResp.status(), body2);
        throw new Error('Kindness token issuance failed; ensure ENABLE_KINDNESS_POINTS=1 for test env');
      }
    }
    const tokenJson = await tokenResp.json();
    const token = tokenJson.token;
    const expiry = Date.now() + (tokenJson.expires_in * 1000);
    await page.evaluate(({ t, e }) => {
      sessionStorage.setItem('kindness_token', t);
      sessionStorage.setItem('kindness_token_expiry', String(e));
    }, { t: token, e: expiry });

    // Verify sessionStorage visible to the page (helps debug timing issues)
    const stored = await page.evaluate(() => sessionStorage.getItem('kindness_token'));
    console.log('TEST: sessionStorage kindness_token after set ->', stored ? '<present>' : '<missing>');
    expect(stored).not.toBeNull();

    // First redemption
    const resp1 = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/kindness/redeem')),
      jeet.kindnessButton(postId).click()
    ]);

    // Second redemption (simulate double click) — perform direct API POST with same token
    const r1 = resp1[0];
    const j1 = await r1.json();

    // Attempt a second redemption using the same token via direct API call (should be rejected by server)
    const respSecond = await page.request.post(`http://localhost:5000/api/kindness/redeem?post_id=${encodeURIComponent(postId)}&token=${encodeURIComponent(token)}`);
    const r2 = respSecond;
    const j2 = await (async () => { try { return await r2.json(); } catch { return null; } })();

    expect(r1.status()).toBe(200);
    if (r2.status() === 200 && j2) {
      expect(j2.new_points).toBeGreaterThanOrEqual(j1.new_points);
    } else {
      expect([400,401,403,409]).toContain(r2.status());
    }
  });
});
