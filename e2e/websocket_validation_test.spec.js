const { test, expect } = require('@playwright/test');

test.describe('WebSocket Validation Test', () => {
  test('should validate connection and start polling when needed', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:5678');
    
    // Wait for the page to load
    await page.waitForSelector('#feed', { timeout: 10000 });
    
    // Wait for FeedManager to initialize
    await page.waitForTimeout(3000);
    
    // Check console logs for validation messages
    const logs = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });
    
    // Wait for validation to run
    await page.waitForTimeout(6000);
    
    // Check if validation messages are present
    const validationLogs = logs.filter(log => 
      log.includes('[FeedManager] Validation check') ||
      log.includes('[FeedManager] Starting periodic connection validation')
    );
    
    console.log('Validation logs found:', validationLogs);
    
    // Should have at least one validation log
    expect(validationLogs.length).toBeGreaterThan(0);
    
    // Check if FeedManager has the validation methods
    const hasValidationMethod = await page.evaluate(() => {
      return window.feedManager && 
             typeof window.feedManager.validateConnectionManually === 'function' &&
             typeof window.feedManager.startConnectionValidation === 'function';
    });
    
    expect(hasValidationMethod).toBe(true);
    
    console.log('✅ FeedManager validation methods are available');
  });
});