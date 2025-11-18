const fs = require('fs');
const path = require('path');

// Source and destination paths
const sourceDir = '/tmp/playwright-mcp-output/1763478100531';
const targetDir = '/root/code/jeet/e2e';

// Files to copy
const files = [
  { source: 'homepage_new.png', target: 'homepage.png' },
  { source: 'about_new.png', target: 'about.png' }
];

console.log('Starting screenshot update...');
console.log('Source directory:', sourceDir);
console.log('Target directory:', targetDir);

// Check if source directory exists
if (!fs.existsSync(sourceDir)) {
  console.error('Source directory does not exist:', sourceDir);
  process.exit(1);
}

// Check if target directory exists
if (!fs.existsSync(targetDir)) {
  console.error('Target directory does not exist:', targetDir);
  process.exit(1);
}

// Copy each file
files.forEach(file => {
  const sourcePath = path.join(sourceDir, file.source);
  const targetPath = path.join(targetDir, file.target);
  
  console.log(`\nProcessing ${file.source} -> ${file.target}`);
  
  if (fs.existsSync(sourcePath)) {
    // Read the source file
    const sourceData = fs.readFileSync(sourcePath);
    console.log(`Source file size: ${sourceData.length} bytes`);
    
    // Write to target
    fs.writeFileSync(targetPath, sourceData);
    console.log(`Successfully copied to ${targetPath}`);
    
    // Verify the copy
    const targetData = fs.readFileSync(targetPath);
    console.log(`Target file size: ${targetData.length} bytes`);
    console.log(`File sizes match: ${sourceData.length === targetData.length}`);
  } else {
    console.error(`Source file not found: ${sourcePath}`);
  }
});

console.log('\nScreenshot update complete!');