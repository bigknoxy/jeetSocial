const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const base = 'http://localhost:5000/static';
  try {
    await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'e2e/homepage.png', fullPage: true });
    console.log('Captured e2e/homepage.png');
  } catch (e) { console.error('Homepage capture failed:', e.message); }
  try {
    await page.goto(base + '/about.html', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'e2e/about.png', fullPage: true });
    console.log('Captured e2e/about.png');
  } catch (e) { console.error('About capture failed:', e.message); }
  await browser.close();
})();
