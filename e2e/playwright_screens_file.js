const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const basePath = path.resolve('app/static');
  try {
    const indexUrl = 'file://' + path.join(basePath, 'index.html');
    await page.goto(indexUrl, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'e2e/homepage.png', fullPage: true });
    console.log('Captured e2e/homepage.png (file)');
  } catch (e) { console.error('Homepage capture failed (file):', e.message); }
  try {
    const aboutUrl = 'file://' + path.join(basePath, 'about.html');
    await page.goto(aboutUrl, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'e2e/about.png', fullPage: true });
    console.log('Captured e2e/about.png (file)');
  } catch (e) { console.error('About capture failed (file):', e.message); }
  await browser.close();
})();
