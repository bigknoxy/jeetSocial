const fs = require('fs');

// Read the new screenshots
const homepagePath = '/tmp/playwright-mcp-output/1763478100531/homepage.png';
const aboutPath = '/tmp/playwright-mcp-output/1763478100531/about.png';

// Check if files exist
if (fs.existsSync(homepagePath)) {
  const homepageData = fs.readFileSync(homepagePath);
  fs.writeFileSync('/root/code/jeet/e2e/homepage.png', homepageData);
  console.log('Homepage screenshot updated successfully');
} else {
  console.log('Homepage screenshot not found at:', homepagePath);
}

if (fs.existsSync(aboutPath)) {
  const aboutData = fs.readFileSync(aboutPath);
  fs.writeFileSync('/root/code/jeet/e2e/about.png', aboutData);
  console.log('About screenshot updated successfully');
} else {
  console.log('About screenshot not found at:', aboutPath);
}