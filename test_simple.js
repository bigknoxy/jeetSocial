const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log('CONSOLE:', msg.text());
  });
  
  await page.goto('http://localhost:5678');
  
  // Wait for page to load completely
  await page.waitForLoadState('networkidle');
  
  // Wait for modules to load
  await page.waitForTimeout(5000);
  
  // Test polling fallback directly
  const result = await page.evaluate(() => {
    // Start polling manually since WebSocket fails
    if (typeof startLiveFeedPolling === 'function') {
      console.log('Starting polling manually...');
      startLiveFeedPolling();
      return 'Polling started manually';
    } else {
      return 'startLiveFeedPolling function not found';
    }
  });
  
  console.log('Result:', result);
  
  await browser.close();
})();