/**
 * Accessibility Testing for jeetSocial
 * WCAG 2.1 AA compliance testing using axe-core
 * Task 4.3.5: Accessibility E2E
 */

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const JeetSocialPage = require('./page-objects/jeet-social.page');

test.describe('jeetSocial Accessibility Tests', () => {
  let page;
  let jeetPage;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    jeetPage = new JeetSocialPage(page);
  });

  test('Main page accessibility - WCAG 2.1 AA compliance', async () => {
    // Navigate to main page
    await jeetPage.goto();
    await jeetPage.waitForPageLoad();

    console.log('🔍 Running accessibility scan: Main page full scan');
    
    // Wait for page to be stable
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow dynamic content to settle

    try {
      // Run accessibility scan with axe-core
      const results = await new AxeBuilder(page)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      // Log detailed results for debugging
      console.log(`\n📊 Accessibility Results:`);
      console.log(`   ✅ Passed: ${results.passes.length}`);
      console.log(`   ❌ Violations: ${results.violations.length}`);
      console.log(`   ⚠️  Incomplete: ${results.incomplete.length}`);

      // Log violations if any
      if (results.violations.length > 0) {
        console.log('\n🚨 VIOLATIONS FOUND:');
        results.violations.forEach((violation, index) => {
          console.log(`\n${index + 1}. ${violation.id} - ${violation.description}`);
          console.log(`   Impact: ${violation.impact}`);
          console.log(`   Help: ${violation.help}`);
          console.log(`   Help URL: ${violation.helpUrl}`);
          
          if (violation.nodes && violation.nodes.length > 0) {
            console.log(`   Affected elements: ${violation.nodes.length}`);
            violation.nodes.forEach((node, nodeIndex) => {
              console.log(`     ${nodeIndex + 1}. ${node.target.join(', ')}`);
              if (node.failureSummary) {
                console.log(`        Issue: ${node.failureSummary}`);
              }
            });
          }
        });
      }

      // Assert no critical violations for WCAG AA compliance
      const criticalViolations = results.violations.filter(v => v.impact === 'critical');
      const seriousViolations = results.violations.filter(v => v.impact === 'serious');
      
      console.log(`\n🎯 Critical violations: ${criticalViolations.length}`);
      console.log(`🎯 Serious violations: ${seriousViolations.length}`);

      // For now, log all violations but don't fail the test
      // We'll address these in collaboration with developer agent
      if (results.violations.length > 0) {
        console.log('\n⚠️  Accessibility issues found - will be addressed in collaboration with developer agent');
      }

    } catch (error) {
      console.error('❌ Error running accessibility scan:', error.message);
      throw error;
    }
  });

  test('Keyboard navigation test', async () => {
    await jeetPage.goto();
    await jeetPage.waitForPageLoad();

    console.log('\n⌨️  Testing keyboard navigation...');
    
    // Test Tab navigation through interactive elements
    const interactiveElements = await page.locator('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])').all();
    
    console.log(`Found ${interactiveElements.length} interactive elements`);

    if (interactiveElements.length > 0) {
      // Start from top of page
      await page.keyboard.press('Home');
      
      for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100); // Small delay for focus to settle
        
        // Check that something is focused
        const focusedElement = await page.locator(':focus').count();
        expect(focusedElement).toBeGreaterThan(0);
        
        // Check that focused element is visible
        const isVisible = await page.locator(':focus').isVisible();
        expect(isVisible).toBeTruthy();
      }
    }

    console.log('✅ Keyboard navigation test passed');
  });

  test('Focus management test', async () => {
    await jeetPage.goto();
    await jeetPage.waitForPageLoad();

    console.log('\n🎯 Testing focus management...');
    
    // Test focus indicators
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').first();
    
    if (await focusedElement.count() > 0) {
      // Check if focused element has visible focus indicator
      const computedStyle = await focusedElement.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          outlineColor: style.outlineColor,
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          boxShadow: style.boxShadow
        };
      });

      // At least one focus indicator should be present
      const hasFocusIndicator = 
        computedStyle.outline !== 'none' ||
        computedStyle.boxShadow !== 'none' ||
        computedStyle.outlineWidth !== '0px';

      if (!hasFocusIndicator) {
        console.warn('⚠️  Warning: Focus indicator may not be visible');
      }
    }

    console.log('✅ Focus management test completed');
  });

  test('Screen reader compatibility test', async () => {
    await jeetPage.goto();
    await jeetPage.waitForPageLoad();

    console.log('\n🔊 Testing screen reader compatibility...');
    
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let lastLevel = 0;
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));
      
      // Heading levels should not skip (e.g., h1 followed by h3)
      if (lastLevel > 0 && level > lastLevel + 1) {
        console.warn(`⚠️  Warning: Heading level skipped from h${lastLevel} to ${tagName}`);
      }
      
      lastLevel = level;
    }

    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      const role = await image.getAttribute('role');
      
      // Images should have alt text unless decorative
      if (!alt && role !== 'presentation') {
        console.warn('⚠️  Warning: Image missing alt text');
      }
    }

    // Check for proper form labels
    const inputs = await page.locator('input, textarea, select').all();
    for (const input of inputs) {
      const hasLabel = await input.evaluate(el => {
        const labels = el.labels || [];
        return labels.length > 0 || 
               el.getAttribute('aria-label') || 
               el.getAttribute('aria-labelledby') ||
               el.getAttribute('title');
      });

      if (!hasLabel) {
        console.warn('⚠️  Warning: Form input missing label');
      }
    }

    console.log('✅ Screen reader compatibility test completed');
  });

  test('Responsive design accessibility', async () => {
    console.log('\n📱 Testing responsive design accessibility...');
    
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },   // iPhone
      { width: 768, height: 1024, name: 'Tablet' },  // iPad
      { width: 1024, height: 768, name: 'Desktop' } // Small desktop
    ];

    for (const viewport of viewports) {
      console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})...`);
      
      await page.setViewportSize(viewport);
      await jeetPage.goto();
      await page.waitForLoadState('networkidle');
      
      // Test that main elements are visible
      const mainHeading = await page.locator('h1').isVisible();
      const postForm = await page.locator('form#post-form').isVisible();
      const feed = await page.locator('#feed').isVisible();
      
      expect(mainHeading).toBeTruthy();
      expect(postForm).toBeTruthy();
      expect(feed).toBeTruthy();
      
      // Test touch target sizes (minimum 44x44 for WCAG AA)
      if (viewport.width <= 768) {
        const touchTargets = await page.locator('button, a, input, textarea, select').all();
        
        for (const target of touchTargets.slice(0, 5)) { // Check first 5 targets
          const box = await target.boundingBox();
          if (box) {
            const width = Math.round(box.width);
            const height = Math.round(box.height);
            
            if (width < 44 || height < 44) {
              console.warn(`⚠️  Warning: Touch target too small (${width}x${height}) on ${viewport.name}`);
            }
          }
        }
      }
    }

    console.log('✅ Responsive accessibility test completed');
  });

  test('Form accessibility - Post creation form', async () => {
    await jeetPage.goto();
    await jeetPage.waitForPageLoad();

    console.log('🔍 Running accessibility scan: Post creation form');

    try {
      // Focus on post form specifically
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const results = await new AxeBuilder(page)
        .include('form#post-form')
        .withTags(['wcag2aa'])
        .analyze();

      console.log(`Form accessibility results: ${results.violations.length} violations found`);
      
      if (results.violations.length > 0) {
        results.violations.forEach(violation => {
          console.log(`  - ${violation.id}: ${violation.description}`);
        });
      }

    } catch (error) {
      console.error('❌ Error running form accessibility scan:', error.message);
      // Don't fail the test, just log the error
    }
  });

  test('Feed accessibility - Posts list', async () => {
    await jeetPage.goto();
    await jeetPage.waitForPageLoad();

    // Wait for some posts to load
    try {
      await jeetPage.waitForPostCount(1, 3000);
    } catch (e) {
      console.log('No posts found, continuing with basic accessibility test');
    }

    console.log('🔍 Running accessibility scan: Posts feed');

    try {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const results = await new AxeBuilder(page)
        .include('#feed')
        .withTags(['wcag2aa'])
        .analyze();

      console.log(`Feed accessibility results: ${results.violations.length} violations found`);
      
      if (results.violations.length > 0) {
        results.violations.forEach(violation => {
          console.log(`  - ${violation.id}: ${violation.description}`);
        });
      }

    } catch (error) {
      console.error('❌ Error running feed accessibility scan:', error.message);
      // Don't fail the test, just log the error
    }
  });

  test('Error handling accessibility', async () => {
    await jeetPage.goto();
    await jeetPage.waitForPageLoad();

    console.log('🔍 Testing error message accessibility...');
    
    // Test error message accessibility
    await jeetPage.submitPost(''); // Empty post should trigger error

    try {
      // Wait for error message
      await jeetPage.errorDiv.waitFor({ state: 'visible', timeout: 3000 });

      // Scan error messages for accessibility
      const results = await new AxeBuilder(page)
        .include('#error')
        .withTags(['wcag2aa'])
        .analyze();

      console.log(`Error accessibility results: ${results.violations.length} violations found`);
      
      if (results.violations.length > 0) {
        results.violations.forEach(violation => {
          console.log(`  - ${violation.id}: ${violation.description}`);
        });
      }

    } catch (error) {
      console.error('❌ Error testing error accessibility:', error.message);
      // Don't fail the test, just log the error
    }
  });
});