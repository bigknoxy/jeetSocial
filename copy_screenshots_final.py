#!/usr/bin/env python3
import os
import shutil
import base64


def copy_screenshots():
    """Copy new screenshots to e2e directory"""

    # Source and destination paths
    source_dir = "/tmp/playwright-mcp-output/1763478100531"
    target_dir = "/root/code/jeet/e2e"

    # Files to copy
    files_to_copy = [
        ("homepage_new.png", "homepage.png"),
        ("about_new.png", "about.png"),
    ]

    print("Starting screenshot update...")
    print(f"Source directory: {source_dir}")
    print(f"Target directory: {target_dir}")

    # Check if directories exist
    if not os.path.exists(source_dir):
        print(f"ERROR: Source directory does not exist: {source_dir}")
        return False

    if not os.path.exists(target_dir):
        print(f"ERROR: Target directory does not exist: {target_dir}")
        return False

    success = True

    for source_file, target_file in files_to_copy:
        source_path = os.path.join(source_dir, source_file)
        target_path = os.path.join(target_dir, target_file)

        print(f"\nProcessing {source_file} -> {target_file}")

        if os.path.exists(source_path):
            try:
                # Copy the file
                shutil.copy2(source_path, target_path)
                print(f"✓ Successfully copied to {target_path}")

                # Verify the copy
                source_size = os.path.getsize(source_path)
                target_size = os.path.getsize(target_path)
                print(f"  Source size: {source_size} bytes")
                print(f"  Target size: {target_size} bytes")
                print(f"  Sizes match: {source_size == target_size}")

            except Exception as e:
                print(f"✗ Error copying {source_file}: {e}")
                success = False
        else:
            print(f"✗ Source file not found: {source_path}")
            success = False

    if success:
        print("\n✓ All screenshots updated successfully!")
    else:
        print("\n✗ Some screenshots failed to update.")

    return success


if __name__ == "__main__":
    copy_screenshots()
