const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(msg.text());
    console.log('CONSOLE:', msg.text());
  });
  
  await page.goto('http://localhost:5678');
  
  // Wait for page to load completely
  await page.waitForLoadState('networkidle');
  
  // Wait for modules to load (check for FeedManager)
  await page.waitForFunction(() => window.feedManager !== undefined, { timeout: 10000 });
  
  // Wait a bit more for FeedManager to fully initialize
  await page.waitForTimeout(3000);
  
  console.log('Page loaded, waiting for polling to start...');
  
  // Wait for polling check timeout (1 second + buffer)
  await page.waitForTimeout(2000);
  
  // Check if polling started
  const pollingStarted = consoleMessages.some(msg => 
    msg.includes('WebSocket not connected, starting polling fallback') ||
    msg.includes('FeedManager not available, starting polling') ||
    msg.includes('Starting HTTP polling fallback')
  );
  
  console.log('Polling started:', pollingStarted);
  console.log('Console messages:');
  consoleMessages.forEach(msg => console.log('  ', msg));
  
  // Check WebSocket status
  const wsStatus = await page.evaluate(() => {
    if (!window.feedManager) return 'FeedManager not available';
    
    // Check what methods are available
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(window.feedManager));
    console.log('Available FeedManager methods:', methods);
    
    // Check constructor source
    console.log('FeedManager constructor:', window.feedManager.constructor.toString());
    
    // Try to call method directly
    try {
      const result = window.feedManager.getWebSocketStatus();
      console.log('getWebSocketStatus() returned:', result);
      return result;
    } catch (error) {
      console.log('Error calling getWebSocketStatus():', error.message);
      return 'Error: ' + error.message;
    }
  });
  
  console.log('WebSocket status:', wsStatus);
  
  await browser.close();
  
  if (pollingStarted) {
    console.log('✅ Polling fallback is working');
    process.exit(0);
  } else {
    console.log('❌ Polling fallback is NOT working');
    process.exit(1);
  }
})();