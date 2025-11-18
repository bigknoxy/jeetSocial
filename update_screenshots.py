#!/usr/bin/env python3
import shutil
import os

# Paths
homepage_source = "/tmp/playwright-mcp-output/1763478100531/homepage.png"
about_source = "/tmp/playwright-mcp-output/1763478100531/about.png"
homepage_dest = "/root/code/jeet/e2e/homepage.png"
about_dest = "/root/code/jeet/e2e/about.png"

# Copy homepage screenshot
if os.path.exists(homepage_source):
    shutil.copy2(homepage_source, homepage_dest)
    print(f"Homepage screenshot copied to {homepage_dest}")
else:
    print(f"Homepage source file not found: {homepage_source}")

# Copy about screenshot
if os.path.exists(about_source):
    shutil.copy2(about_source, about_dest)
    print(f"About screenshot copied to {about_dest}")
else:
    print(f"About source file not found: {about_source}")

print("Screenshot update complete!")
